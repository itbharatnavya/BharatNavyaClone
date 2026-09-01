/**
 * golden.test.js — response-shape regression net for the modular-monolith migration
 * (BACKEND-AUDIT.md Phase 0). Every phase must leave these byte-identical (after the
 * harness's timestamp/token normalization) for non-security endpoints.
 *
 * Runs against the frozen PG_URL_TEST database — build it first:  npm run test:setup
 * Regenerate fixtures on a deliberate shape change:               npm run goldens:update
 *
 * Coverage: public Directory reads, public Recruitment reads, and — the part that is
 * impossible to reconstruct after the Phase 6 admin rewrite — GET /api/admin/users
 * across its scope/type/status/q/plan/featured/paging branches.
 *
 * Admin/employer/candidate tokens are MINTED locally with auth.signToken against
 * ids that the standard seed makes deterministic (usr_admin, usr_s007, usr_emp4,
 * usr_000026) — no password needed, and authGuard re-loads the real row anyway.
 */

const test = require("node:test");
const auth = require("../lib/auth");
const store = require("../lib/store");
const { golden } = require("./golden/_harness");

// Deterministic ids/slugs/values from the standard seed (present in the cloned test DB).
const IDS = {
  admin: "usr_admin",
  seller: "usr_s007",
  employer: "usr_emp4",
  candidate: "usr_000026",
};
const FIX = {
  categorySlug: "accounting",
  listingId: "lst_000003",
  sellerSlug: "agripure-traders",
  employerSlug: "acme-testing-pvt-ltd",
  jobId: "job_000011",       // active, job_function = "engineering"
  jobFunction: "engineering",
  qFragment: "textile",
  reviewTarget: "usr_s002",  // seed seller with 2 directory reviews
  brandSlug: "bosch",        // seed brand (15 active listings)
};

const tokens = {};

test("golden fixtures", async (t) => {
  for (const [role, id] of Object.entries(IDS)) {
    const u = await store.getById("users.json", id);
    if (!u) {
      throw new Error(
        `seed user ${id} missing from the test DB — run \`npm run test:setup\` (it clones PG_URL). ` +
          `Cannot mint the ${role} token.`
      );
    }
    tokens[role] = auth.signToken(u);
  }
  const bearer = (r, role) => (role ? r.set("Authorization", `Bearer ${tokens[role]}`) : r);

  /* ------------------------------------------------ public Directory reads -- */
  await golden(t, "config", (r) => r.get("/api/config"));
  await golden(t, "features", (r) => r.get("/api/features"));
  await golden(t, "entitlements", (r) => r.get("/api/entitlements"));
  await golden(t, "categories", (r) => r.get("/api/categories"));
  await golden(t, "category-detail", (r) => r.get(`/api/categories/${FIX.categorySlug}`));
  await golden(t, "brands", (r) => r.get("/api/brands"));
  await golden(t, "brand-detail", (r) => r.get(`/api/brands/${FIX.brandSlug}`));
  await golden(t, "collections", (r) => r.get("/api/collections"));
  await golden(t, "listings-browse", (r) => r.get("/api/listings?limit=12"));
  await golden(t, "listings-page2", (r) => r.get("/api/listings?limit=12&page=2"));
  await golden(t, "listing-detail", (r) => r.get(`/api/listings/${FIX.listingId}`));
  await golden(t, "sellers-featured", (r) => r.get("/api/sellers/featured"));
  await golden(t, "seller-detail", (r) => r.get(`/api/sellers/${FIX.sellerSlug}`));
  await golden(t, "reviews-for-seller", (r) => r.get(`/api/reviews?targetUserId=${FIX.reviewTarget}&context=directory`));

  /* --------------------------------------------- public Recruitment reads -- */
  await golden(t, "job-functions", (r) => r.get("/api/job-functions"));
  await golden(t, "job-roles", (r) => r.get("/api/job-roles"));
  await golden(t, "skills", (r) => r.get("/api/skills"));
  await golden(t, "jobs-browse", (r) => r.get("/api/jobs?limit=12"));
  await golden(t, "jobs-page2", (r) => r.get("/api/jobs?limit=12&page=2"));
  await golden(t, "jobs-filter-function", (r) => r.get(`/api/jobs?jobFunction=${FIX.jobFunction}&limit=12`));
  await golden(t, "job-detail", (r) => r.get(`/api/jobs/${FIX.jobId}`));
  await golden(t, "employer-detail", (r) => r.get(`/api/employers/${FIX.employerSlug}`));

  /* ------- authed Recruitment reads — the Phase 4d net (store -> repository) -- */
  await golden(t, "jobs-mine", (r) => bearer(r.get("/api/jobs/mine"), "employer"));
  await golden(t, "applications-received", (r) => bearer(r.get("/api/applications"), "employer"));
  await golden(t, "applications-mine", (r) => bearer(r.get("/api/applications/mine"), "candidate"));

  /* --------------------- GET /api/admin/users — branch matrix (Phase 6 net) -- */
  const AU = "/api/admin/users";
  const au = (name, qs) => golden(t, `admin-users-${name}`, (r) => bearer(r.get(qs ? `${AU}?${qs}` : AU), "admin"));
  await au("default", "");
  await au("scope-directory", "scope=directory");
  await au("scope-recruitment", "scope=recruitment");
  await au("type-seller", "type=seller");
  await au("type-employer", "type=employer");
  await au("type-candidate", "type=candidate");
  await au("type-admin", "type=admin");
  await au("type-buyer", "type=buyer");
  await au("status-approved-directory", "status=approved");
  await au("status-approved-recruitment", "scope=recruitment&status=approved");
  await au("plantier-free", "planTier=free");
  await au("featured-yes", "featured=yes");
  await au("featured-no", "featured=no");
  await au("q-fragment", `q=${FIX.qFragment}`);
  await au("page2-limit10", "page=2&limit=10");
  await au("limit5", "limit=5");
  await au("compound", "scope=recruitment&type=employer&status=approved");
});
