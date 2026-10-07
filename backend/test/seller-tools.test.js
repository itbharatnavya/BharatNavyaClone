/**
 * seller-tools.test.js — regression tests for the Directory seller-tools fixes
 * (CHANGES-SELLER-TOOLS.md): blogs, boosts, ad placements, listing edit re-verification,
 * bulk upload. Runs against the disposable PG_URL_TEST database (`npm run test:setup`,
 * then `NODE_ENV=test node scripts/migrate-schema.js` once if 0018 isn't there yet).
 *
 * Forces the deterministic verification path (no `claude` CLI): a listing can then never
 * be auto-approved, which is exactly what makes "did this edit re-queue the listing?"
 * observable and fast.
 *
 * Every row the tests create is removed again in the `after` hook.
 */

process.env.AI_CLI_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const identity = require("../modules/identity");
const { pool } = require("../modules/_shared/pool");
const { PLACEMENT_KEYS } = require("../lib/adPlacements");

const SELLER_EMAIL = "sales@arvindtextiles.example.com";
const TAG = "ZZ-SELLERTOOLS";

let seller;
let admin;
let H; // seller headers
let A; // admin headers
const made = { listings: [], blogs: [], ads: [], boosts: [] };

test.before(async () => {
  seller = await identity.getUserByEmail(SELLER_EMAIL);
  assert.ok(seller, `seed seller ${SELLER_EMAIL} missing — run \`npm run test:setup\``);
  admin = await identity.getAuthUser("usr_admin");
  assert.ok(admin, "seed admin usr_admin missing");
  H = { Authorization: `Bearer ${auth.signToken(seller)}` };
  A = { Authorization: `Bearer ${auth.signToken(admin)}` };
});

test.after(async () => {
  const del = (sql, ids) => (ids.length ? pool.query(sql, [ids]).catch(() => {}) : null);
  await del("DELETE FROM boost_requests WHERE id = ANY($1)", made.boosts);
  await del("DELETE FROM ad_bookings WHERE id = ANY($1)", made.ads);
  await del("DELETE FROM blogs WHERE id = ANY($1)", made.blogs);
  await del("DELETE FROM listings WHERE id = ANY($1)", made.listings);
  await pool.query("DELETE FROM listings WHERE title LIKE $1", [`${TAG}%`]).catch(() => {});
  await pool.end().catch(() => {});
});

// --------------------------------------------------------------------------------------
// shared fixtures
// --------------------------------------------------------------------------------------
async function firstCategory() {
  const r = await request(app).get("/api/categories");
  const list = r.body.data;
  const leaf = list.find((c) => c.slug && c.id && (c.type === "product" || !c.type)) || list[0];
  return leaf;
}

/** Create an ACTIVE listing for the seller (create route → pending without AI, so an admin
 *  approval flips it live, same as production). */
async function liveListing(extra = {}) {
  const cat = await firstCategory();
  const r = await request(app)
    .post("/api/listings")
    .set(H)
    .send({
      type: "product",
      title: `${TAG} widget ${Date.now()}${Math.floor(Math.random() * 1000)}`,
      description: "A sturdy test widget used only by the automated test suite.",
      categoryId: cat.id,
      panIndia: true,
      media: [{ type: "image", url: "/demo/machinery-1.jpg" }],
      product: { price: 100, unitOfMeasure: "piece", moq: 1, condition: "new" },
      ...extra,
    });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const id = r.body.data.id;
  made.listings.push(id);
  const ap = await request(app).post(`/api/admin/listings/${id}/approve`).set(A);
  assert.equal(ap.status, 200, JSON.stringify(ap.body));
  const got = await request(app).get(`/api/listings/${id}`);
  assert.equal(got.body.data.status, "active");
  return got.body.data;
}

// --------------------------------------------------------------------------------------
// 1. blogs
// --------------------------------------------------------------------------------------
test("blog: a draft stays a draft, private to its author, with the excerpt stored", async () => {
  const c = await request(app)
    .post("/api/blogs")
    .set(H)
    .send({ title: `${TAG} draft post`, body: "body text", status: "draft", excerpt: "  short summary  ", tags: ["a"] });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  made.blogs.push(c.body.data.id);
  const blog = c.body.data;
  assert.equal(blog.status, "draft");
  assert.equal(blog.excerpt, "short summary");
  assert.equal(blog.publishedAt, null);

  // not in the public list, not fetchable by slug as a guest
  const pub = await request(app).get("/api/blogs");
  assert.ok(!pub.body.data.some((b) => b.id === blog.id), "draft leaked into the public list");
  assert.equal((await request(app).get(`/api/blogs/${blog.slug}`)).status, 404);

  // visible to the author (mine + slug preview), and to nobody else signed in
  const mine = await request(app).get("/api/blogs/mine").set(H);
  assert.ok(mine.body.data.some((b) => b.id === blog.id), "author can't see own draft");
  assert.equal((await request(app).get(`/api/blogs/${blog.slug}`).set(H)).status, 200);
  const other = { Authorization: `Bearer ${auth.signToken(await identity.getUserByEmail("info@mumbaipackaging.example.com"))}` };
  assert.equal((await request(app).get(`/api/blogs/${blog.slug}`).set(other)).status, 404);

  // publishing stamps the date and exposes it
  const up = await request(app).put(`/api/blogs/${blog.id}`).set(H).send({ status: "published" });
  assert.equal(up.status, 200);
  assert.equal(up.body.data.status, "published");
  assert.ok(up.body.data.publishedAt, "publishing should stamp publishedAt");
  assert.equal((await request(app).get(`/api/blogs/${blog.slug}`)).status, 200);
});

test("blog: omitted status still publishes (API default), bad status is refused", async () => {
  const c = await request(app).post("/api/blogs").set(H).send({ title: `${TAG} default post`, body: "x" });
  assert.equal(c.status, 201);
  made.blogs.push(c.body.data.id);
  assert.equal(c.body.data.status, "published");

  const bad = await request(app).post("/api/blogs").set(H).send({ title: `${TAG} bad`, body: "x", status: "<script>" });
  assert.equal(bad.status, 400);
  const badPut = await request(app).put(`/api/blogs/${c.body.data.id}`).set(H).send({ status: "nonsense" });
  assert.equal(badPut.status, 400);
});

test("blog: an owner can't hide, or un-hide, a post — a moderator hide is final until an admin acts", async () => {
  const c = await request(app).post("/api/blogs").set(H).send({ title: `${TAG} hide me`, body: "x" });
  const id = c.body.data.id;
  made.blogs.push(id);

  // owner can't self-apply "hidden"
  assert.equal((await request(app).put(`/api/blogs/${id}`).set(H).send({ status: "hidden" })).status, 400);

  // admin hides it; owner can't lift it, public can't see it
  const hid = await request(app).put(`/api/blogs/${id}`).set(A).send({ status: "hidden" });
  assert.equal(hid.status, 200);
  assert.equal(hid.body.data.status, "hidden");
  const lift = await request(app).put(`/api/blogs/${id}`).set(H).send({ status: "published" });
  assert.equal(lift.status, 403);
  assert.equal((await request(app).get(`/api/blogs/${c.body.data.slug}`)).status, 404);
  // owner can still see it in their own list, marked hidden
  const mine = await request(app).get("/api/blogs/mine").set(H);
  assert.equal(mine.body.data.find((b) => b.id === id).status, "hidden");
  // admin can restore
  assert.equal((await request(app).put(`/api/blogs/${id}`).set(A).send({ status: "published" })).body.data.status, "published");
});

// --------------------------------------------------------------------------------------
// 2. boosts
// --------------------------------------------------------------------------------------
test("boost: validation, one pending request per listing+type, approve/reject only once", async () => {
  const l = await liveListing();

  const bad = (body) => request(app).post("/api/boosts").set(H).send({ listingId: l.id, boostType: "rank", days: 7, ...body });
  assert.equal((await bad({ days: 0 })).status, 400);
  assert.equal((await bad({ days: 2.5 })).status, 400);
  assert.equal((await bad({ days: 9999 })).status, 400);
  assert.equal((await bad({ boostType: "bogus" })).status, 400);

  const ok = await bad({});
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  made.boosts.push(ok.body.data.id);
  assert.equal((await bad({})).status, 409, "second pending request for the same boost must be refused");
  // a different boost type on the same listing is fine
  const other = await bad({ boostType: "feature" });
  assert.equal(other.status, 201);
  made.boosts.push(other.body.data.id);

  const approve = () => request(app).post(`/api/admin/boosts/admin/${ok.body.data.id}/approve`).set(A);
  const first = await approve();
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.status, "active");
  assert.ok(first.body.data.expiresAt, "approved boost should record when it ends");
  assert.equal((await approve()).status, 409, "approving twice would apply the boost twice");
  const rej = await request(app).post(`/api/admin/boosts/admin/${ok.body.data.id}/reject`).set(A);
  assert.equal(rej.status, 409, "an approved boost can't be rejected afterwards");

  const after = await request(app).get(`/api/listings/${l.id}`);
  assert.equal(Number(after.body.data.rankBoostScore), 25);
  assert.ok(after.body.data.rankBoostEndDate, "rank boost must carry an end date");
  const days = (Date.parse(after.body.data.rankBoostEndDate) - Date.now()) / 86400000;
  assert.ok(days > 6.9 && days < 7.1, `end date should be ~7 days out, got ${days}`);
});

test("boost: only a live listing can be boosted; an elapsed boost reads as expired and stops ranking", async () => {
  const cat = await firstCategory();
  const pending = await request(app).post("/api/listings").set(H).send({
    type: "product", title: `${TAG} not live ${Date.now()}`, description: "not live yet", categoryId: cat.id, panIndia: true,
    media: [{ type: "image", url: "/demo/machinery-1.jpg" }], product: { price: 5 },
  });
  made.listings.push(pending.body.data.id);
  assert.equal(pending.body.data.status, "pending");
  const r = await request(app).post("/api/boosts").set(H).send({ listingId: pending.body.data.id, boostType: "rank", days: 3 });
  assert.equal(r.status, 400);

  // expiry: an approved boost whose window passed is reported "expired"
  const l = await liveListing();
  const b = await request(app).post("/api/boosts").set(H).send({ listingId: l.id, boostType: "feature", days: 1 });
  made.boosts.push(b.body.data.id);
  await request(app).post(`/api/admin/boosts/admin/${b.body.data.id}/approve`).set(A);
  await pool.query("UPDATE boost_requests SET expires_at = now() - interval '1 day' WHERE id = $1", [b.body.data.id]);
  const mine = await request(app).get("/api/boosts").set(H);
  assert.equal(mine.body.data.find((x) => x.id === b.body.data.id).status, "expired");

  // ranking ignores a lapsed rank boost but keeps a no-end-date (admin/legacy) one
  const { rankListings } = require("../lib/ranking");
  const base = { id: "x", sellerId: "s", title: "t", rating: 0, reviewCount: 0, createdAt: new Date().toISOString() };
  const ranked = await rankListings(
    [
      { ...base, id: "lapsed", rankBoostScore: 100, rankBoostEndDate: new Date(Date.now() - 86400000).toISOString() },
      { ...base, id: "none", rankBoostScore: 0 },
      { ...base, id: "legacy", rankBoostScore: 100, rankBoostEndDate: null },
      { ...base, id: "running", rankBoostScore: 100, rankBoostEndDate: new Date(Date.now() + 86400000).toISOString() },
    ],
    { query: "", categorySlug: null, tierBySeller: new Map() }
  );
  const byId = Object.fromEntries(ranked.map((x) => [x.id, x]));
  assert.ok(byId.legacy.isSponsored && byId.running.isSponsored, "no-end-date and still-running boosts apply");
  assert.ok(!byId.lapsed.isSponsored, "a lapsed boost must not rank or be labelled sponsored");
  assert.equal(byId.lapsed._finalScore, byId.none._finalScore, "lapsed behaves exactly like no boost");
});

// --------------------------------------------------------------------------------------
// 3. ad placements
// --------------------------------------------------------------------------------------
test("ads: backend and frontend placement lists are identical", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "lib", "adPlacements.ts"), "utf8");
  const block = src.slice(src.indexOf("export const AD_PLACEMENTS"));
  const fe = [...block.matchAll(/value:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepEqual(fe, PLACEMENT_KEYS);
});

test("ads: self-serve validates placement and requires a link; listing ads default to the listing page", async () => {
  const base = { creativeImageUrl: "/demo/machinery-1.jpg", headline: `${TAG} ad`, targetUrl: "/directory" };
  const post = (b) => request(app).post("/api/my-ads").set(H).send({ ...base, ...b });

  for (const bad of ["listing_detail", "recruitment_search", "brand_top", "nonsense"]) {
    assert.equal((await post({ placementType: bad })).status, 400, `${bad} must be refused`);
  }
  assert.equal((await post({ placementType: "search_top", targetUrl: "" })).status, 400, "no link, no listing → refused");

  const withLink = await post({ placementType: "search_top" });
  assert.equal(withLink.status, 201, JSON.stringify(withLink.body));
  made.ads.push(withLink.body.data.id);
  assert.equal(withLink.body.data.status, "pending");

  const l = await liveListing();
  const forListing = await post({ placementType: "category_top", targetUrl: "", listingId: l.id });
  assert.equal(forListing.status, 201);
  made.ads.push(forListing.body.data.id);
  assert.equal(forListing.body.data.targetUrl, `/listing/${l.id}`);

  // editing can't blank the link
  const blank = await request(app).put(`/api/my-ads/${withLink.body.data.id}`).set(H).send({ targetUrl: "  " });
  assert.equal(blank.status, 400);
});

test("ads: admin bookings reject unknown placements and can't go live without a link; serving honours category paths", async () => {
  const post = (b) =>
    request(app).post("/api/admin/ad-bookings").set(A).send({ headline: `${TAG} booking`, creativeImageUrl: "/demo/machinery-1.jpg", ...b });

  assert.equal((await post({ placementType: "listing_detail", targetUrl: "/x", status: "active" })).status, 400);
  assert.equal((await post({ placementType: "search_top", status: "active" })).status, 400, "active needs a link");

  const draft = await post({ placementType: "category_top", status: "pending", categoryIds: ["zz-cat-a"] });
  assert.equal(draft.status, 201, JSON.stringify(draft.body));
  made.ads.push(draft.body.data.id);
  const go = await request(app).put(`/api/admin/ad-bookings/${draft.body.data.id}`).set(A).send({ status: "active" });
  assert.equal(go.status, 400, "can't activate a link-less campaign");
  const ok = await request(app)
    .put(`/api/admin/ad-bookings/${draft.body.data.id}`)
    .set(A)
    .send({ status: "active", targetUrl: "/directory" });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));

  const ids = async (qs) => (await request(app).get(`/api/ads?placement=category_top${qs}`)).body.data.map((a) => a.id);
  assert.ok((await ids("&category=zz-cat-x,zz-cat-a")).includes(draft.body.data.id), "matches anywhere on the path");
  assert.ok(!(await ids("&category=zz-cat-x")).includes(draft.body.data.id), "other category must not match");
});

// --------------------------------------------------------------------------------------
// 4. listing edit → re-verification
// --------------------------------------------------------------------------------------
test("listing edit: price/status edits keep the approval; changing photos re-queues; admin edits don't", async () => {
  const l = await liveListing();

  const price = await request(app).put(`/api/listings/${l.id}`).set(H).send({ title: l.title, description: l.description, product: { ...l.product, price: 250 } });
  assert.equal(price.status, 200);
  assert.equal(price.body.data.status, "active", "price-only edit must not re-queue");

  const off = await request(app).put(`/api/listings/${l.id}`).set(H).send({ status: "inactive" });
  assert.equal(off.body.data.status, "inactive");
  const on = await request(app).put(`/api/listings/${l.id}`).set(H).send({ status: "active" });
  assert.equal(on.status, 200);
  assert.equal(on.body.data.status, "active");

  // a new photo is a material change → held for review
  const photo = await request(app).put(`/api/listings/${l.id}`).set(H).send({ media: [{ type: "image", url: "/demo/textiles-1.jpg" }] });
  assert.equal(photo.status, 200);
  assert.equal(photo.body.data.status, "pending", "changed photos must send the listing back for review");
  assert.equal(photo.body.data.verification.status, "needs_review");
  assert.equal(photo.body.data.verification.reverifiedAfterEdit, true);
  assert.equal(photo.body.data.media[0].url, "/demo/textiles-1.jpg");

  // still pending → the seller can't self-activate
  const self = await request(app).put(`/api/listings/${l.id}`).set(H).send({ status: "active" });
  assert.equal(self.status, 403);

  // admin edit of a live listing is trusted: no re-queue
  await request(app).post(`/api/admin/listings/${l.id}/approve`).set(A);
  const adm = await request(app).put(`/api/listings/${l.id}`).set(A).send({ title: `${l.title} (admin)` });
  assert.equal(adm.status, 200);
  assert.equal(adm.body.data.status, "active");
});

test("listing edit: taking a listing down while changing it is respected; category + location persist", async () => {
  const l = await liveListing();
  const down = await request(app).put(`/api/listings/${l.id}`).set(H).send({ status: "inactive", description: "A completely rewritten description for this widget." });
  assert.equal(down.body.data.status, "inactive");
  assert.equal(down.body.data.verification.status, "needs_review");

  const loc = await request(app)
    .put(`/api/listings/${l.id}`)
    .set(H)
    .send({ panIndia: false, serviceCities: [], location: { city: "Pune", state: "Maharashtra" } });
  assert.equal(loc.status, 200, JSON.stringify(loc.body));
  assert.equal(loc.body.data.location.city, "Pune");
  assert.ok(loc.body.data.location.lat, "coordinates are stamped on a raw location edit");
  assert.ok(!loc.body.data.panIndia);
});

// --------------------------------------------------------------------------------------
// 5. bulk upload
// --------------------------------------------------------------------------------------
test("bulk upload: rows are held for review with deterministic checks, bad rows are reported", async () => {
  const cat = await firstCategory();
  const r = await request(app)
    .post("/api/listings/bulk")
    .set(H)
    .send({
      rows: [
        { title: `${TAG} bulk good`, type: "product", category_slug: cat.slug, price: 10, unit: "kg", moq: 2, brand: "Z", description: "bulk row", city: "Pune", state: "Maharashtra" },
        { title: `${TAG} bulk bad`, category_slug: "no-such-category", price: 10 },
      ],
    });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.created, 1);
  assert.equal(r.body.data.errors.length, 1);
  assert.equal(r.body.data.errors[0].row, 2);

  const mine = await request(app).get("/api/me/listings").set(H);
  const list = Array.isArray(mine.body.data) ? mine.body.data : mine.body.data.listings;
  const row = list.find((x) => x.title === `${TAG} bulk good`);
  assert.ok(row, "bulk listing not found");
  made.listings.push(row.id);
  assert.equal(row.status, "pending", "bulk rows must not go live without review");
  assert.equal(row.verification.status, "needs_review");
  assert.equal(row.verification.source, "bulk");
  assert.ok(Array.isArray(row.verification.deterministicChecks) && row.verification.deterministicChecks.length > 0);

  // an admin can approve it through the normal queue
  const ap = await request(app).post(`/api/admin/listings/${row.id}/approve`).set(A);
  assert.equal(ap.status, 200);
  assert.equal((await request(app).get(`/api/listings/${row.id}`)).body.data.status, "active");
});

// --------------------------------------------------------------------------------------
// 6. ad serving returns EVERY approved ad (the page rotates through all of them)
// --------------------------------------------------------------------------------------
test("ads: serving returns all approved ads for a placement, `limit` only caps the payload", async () => {
  const ids = [];
  for (let i = 0; i < 7; i++) {
    const r = await request(app)
      .post("/api/admin/ad-bookings")
      .set(A)
      .send({
        placementType: "home_hero",
        status: "active",
        headline: `${TAG} rotation ${i}`,
        creativeImageUrl: "/demo/machinery-1.jpg",
        targetUrl: "/directory",
        priority: 1000 - i,
      });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    ids.push(r.body.data.id);
    made.ads.push(r.body.data.id);
  }
  const all = await request(app).get("/api/ads?placement=home_hero");
  const mine = all.body.data.filter((a) => ids.includes(a.id));
  assert.equal(mine.length, 7, "all 7 approved ads must be served (no cap at 5)");
  // priority order is kept (highest first)
  assert.deepEqual(mine.map((a) => a.id), ids);

  const capped = await request(app).get("/api/ads?placement=home_hero&limit=3");
  assert.equal(capped.body.data.length, 3);
  const bad = await request(app).get("/api/ads?placement=home_hero&limit=-4");
  assert.ok(bad.body.data.length >= 7, "a nonsense limit falls back to the default instead of emptying the slot");
});
