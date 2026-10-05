/**
 * identity — the read-port every other module goes through to touch `users`
 * (BACKEND-AUDIT.md Phase 3). `users` is the one table shared by all domains; this
 * module is the single, named, greppable seam onto it.
 *
 * Reads (Phase 3):
 *   - getAuthUser(id) returns the FULL hydrated user doc, byte-identical to the
 *     legacy store.getById("users.json", id).
 *   - the get*Card(s) readers return the narrow, contact-free shapes other modules
 *     need. Batched variants exist so a list endpoint never loops per row.
 *
 * Writes (Phase 8.4 — the identity write-port):
 *   - createUser(doc)         mints usr_* and inserts (register / verify-otp).
 *   - updateUser(id, patch)   shallow-merge patch on the composite doc
 *                             (sellerProfile / employerProfile / candidateProfile /
 *                             recruitmentRole / plain fields) — the one write path
 *                             routes/users.js, routes/auth.js, routes/admin.js and
 *                             routes/moderation.js use. Byte-identical to the old
 *                             store.update("users.json", …).
 *   - setEmployerApproval     the recruitment-facing employer-status write.
 *
 * Internals use the users composite mapper (lib/db/users.js) directly — never
 * lib/store — so the architecture test stays green.
 */

// Import the pool + id-generator leaves directly (not the _shared barrel) — the
// barrel pulls in crudRouter, which requires middleware/authGuard, which requires
// this module: a cycle. The kernel's leaves are importable at any depth.
const { pool } = require("../_shared/pool");
const { nextId } = require("../_shared/ids");
const { createUsersStore } = require("../../lib/db/users");

const usersStore = createUsersStore(pool, nextId);

/**
 * The hydrated user document middleware/authGuard.js puts on `req.user`.
 *
 * Phase 6d: `passwordHash` is stripped here so it never rides on `req.user` into
 * any authed handler — no route reads `req.user.passwordHash` (verified by a
 * codebase-wide grep), and `GET /api/auth/me` already `sanitizeUser`s it out, so
 * this is defence-in-depth: a future `res.json(req.user)` slip can't leak the
 * hash. Everything else stays — routes read `sellerProfile` / `employerProfile` /
 * `candidateProfile` / `roles` / `recruitmentRole*` / `name` / `mobile` / `email`
 * / `city` / `state` off `req.user`, and `/me` echoes the rest of the sanitized
 * doc, so deeper projection-narrowing has no consumer and is deliberately not done.
 * The password-verification paths (login) use `getUserByEmail`, which keeps the
 * hash — this narrowing is scoped to `req.user` only.
 */
async function getAuthUser(id) {
  if (!id) return null;
  const user = await usersStore.getById(id);
  if (user && "passwordHash" in user) delete user.passwordHash;
  return user;
}

/* --------------------------------------------------------------- cards ------ */
// Narrow, public-safe projections. NEVER include contact fields (contactMobile /
// contactEmail / phone) — those are only ever served from the dedicated
// GET /api/sellers/:slug and GET /api/employers/:slug handlers.

/** Public job-card employer info. Same shape as lib/jobSearch.js `employerMiniOf`
 *  (which becomes a thin call to this in Phase 4). */
function employerCardOf(user) {
  if (!user) return null;
  const ep = user.employerProfile || {};
  return {
    id: user.id,
    companyName: ep.companyName || user.name || null,
    slug: ep.slug || null,
    logo: ep.logo || user.avatarUrl || null,
    city: (ep.location && ep.location.city) || null,
    state: (ep.location && ep.location.state) || null,
    isVerified: !!ep.isVerified,
  };
}

function sellerCardOf(user) {
  if (!user) return null;
  const sp = user.sellerProfile || {};
  return {
    id: user.id,
    companyName: sp.companyName || user.name || null,
    slug: sp.slug || null,
    logo: sp.logo || user.avatarUrl || null,
    city: sp.location && sp.location.city ? sp.location.city : user.city || null,
    state: sp.location && sp.location.state ? sp.location.state : user.state || null,
    isVerified: !!sp.isVerified,
    rating: sp.rating ?? null,
    planTier: sp.planTier || "free",
  };
}

function candidateCardOf(user) {
  if (!user) return null;
  const cp = user.candidateProfile || {};
  return {
    id: user.id,
    name: user.name || null,
    headline: cp.headline || "",
    skills: cp.skills || [],
    city: user.city || null,
    state: user.state || null,
  };
}

const mapCard = (fn) => async (id) => fn(await getAuthUser(id));
// TODO Phase 4: replace the per-id fan-out with one query over the
// identity_*_cards views (BACKEND-AUDIT.md Phase 3 — "BATCH mandatory").
const mapCards = (fn) => async (ids = []) =>
  Promise.all([...new Set(ids)].map(async (id) => fn(await getAuthUser(id))));

const getEmployerCard = mapCard(employerCardOf);
const getEmployerCards = mapCards(employerCardOf);
const getSellerCard = mapCard(sellerCardOf);
const getSellerCards = mapCards(sellerCardOf);
const getCandidateCard = mapCard(candidateCardOf);
const getCandidateCards = mapCards(candidateCardOf);

/* ------------------------------------------------- directory browse reads --- */
// Targeted reads for routes/listings.js's public browse (BACKEND-AUDIT.md Phase
// 5c) — they replace a `store.all("users.json")` full composite hydrate of every
// user (9 child tables) done just to (a) get the approved-seller allow-list and
// (b) build a seller mini-card for the ~12 listings on the page.

/** ids of every seller whose sellerProfile.status === "approved", user_id-ASC —
 *  the same order `store.all("users.json")` (id-ASC) then a JS approved-filter
 *  yielded, so a caller's later stable JS sort breaks ties identically. */
async function getApprovedSellerIds() {
  const { rows } = await pool.query(
    `SELECT user_id FROM seller_profiles WHERE status = 'approved' ORDER BY user_id ASC`
  );
  return rows.map((r) => r.user_id);
}

/** Approved sellers whose company name matches any of the given tokens (ILIKE),
 *  public fields only (never contact details) — the Ask Navya agent's company
 *  lookup. Best match first = most tokens hit, then rating. Tokens are bound
 *  parameters; `%`/`_` are escaped so user text can't widen the pattern. */
async function searchApprovedSellersByName(tokens = [], limit = 3) {
  const toks = [...new Set(tokens.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length >= 3))].slice(0, 6);
  if (!toks.length) return [];
  const pats = toks.map((t) => `%${t.replace(/[\\%_]/g, "\\$&")}%`);
  const { rows } = await pool.query(
    `SELECT u.id, sp.company_name, sp.slug, sp.location_city, sp.location_state,
            sp.is_verified, sp.rating, sp.review_count,
            (SELECT count(*)::int FROM unnest($1::text[]) p WHERE sp.company_name ILIKE p) AS hits
       FROM seller_profiles sp JOIN users u ON u.id = sp.user_id
      WHERE sp.status = 'approved' AND sp.slug IS NOT NULL
        AND sp.company_name ILIKE ANY($1::text[])
      ORDER BY hits DESC, sp.rating DESC NULLS LAST
      LIMIT $2`,
    [pats, Math.max(1, Math.min(10, limit))]
  );
  return rows.map((r) => ({
    id: r.id,
    companyName: r.company_name,
    slug: r.slug,
    city: r.location_city || null,
    state: r.location_state || null,
    isVerified: !!r.is_verified,
    rating: r.rating == null ? 0 : Number(r.rating),
    reviewCount: r.review_count == null ? 0 : Number(r.review_count),
  }));
}

/** { sellers, experts } platform totals — routes/assistant.js's `buildStatsReply`
 *  "how many sellers / experts" answer, was `store.all("users.json")` (full
 *  composite hydrate of EVERY user, 9 child tables) + two JS `.filter().length`.
 *  `experts` = users with an `expert_profiles` row (FK to `seller_profiles`), i.e.
 *  the old `u.sellerProfile && u.sellerProfile.expert`. */
async function directoryCounts() {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*)::int FROM seller_profiles) AS sellers,
            (SELECT count(*)::int FROM expert_profiles) AS experts`
  );
  return { sellers: rows[0].sellers, experts: rows[0].experts };
}

/** Of the given user ids, the subset that actually have a seller_profiles row —
 *  replaces `store.all("users.json").filter(u => u.sellerProfile)` seller-existence
 *  checks (routes/adminInquiries.js's forward validation). Any status. */
async function filterSellerIds(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return [];
  const { rows } = await pool.query(
    `SELECT user_id FROM seller_profiles WHERE user_id = ANY($1)`,
    [uniq]
  );
  return rows.map((r) => r.user_id);
}

/** Is this slug already used by a seller / employer profile? (uniqueSlug helpers
 *  in routes/users.js — replaces a `store.all("users.json")` slug-set build.) */
async function sellerSlugTaken(slug) {
  const { rows } = await pool.query(
    `SELECT 1 FROM seller_profiles WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  return rows.length > 0;
}
async function employerSlugTaken(slug) {
  const { rows } = await pool.query(
    `SELECT 1 FROM employer_profiles WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  return rows.length > 0;
}

/* ------------------------------------------------ recruitment-admin reads --- */

/** user_ids of every employer (optionally filtered by employerProfile.status),
 *  user_id-ASC — for routes/adminEmployers.js's list/pending, which was a
 *  `store.findMany("users.json", u => !!u.employerProfile)` full composite scan.
 *  The caller hydrates these via hydrateUsersByIds and keeps its own row-map/sort. */
async function getEmployerUserIds(status) {
  const rows = status
    ? (await pool.query(
        `SELECT user_id FROM employer_profiles WHERE status = $1 ORDER BY user_id ASC`,
        [status]
      )).rows
    : (await pool.query(
        `SELECT user_id FROM employer_profiles ORDER BY user_id ASC`
      )).rows;
  return rows.map((r) => r.user_id);
}

/** Map<userId, { companyName, status }> from the identity_employer_cards view —
 *  for routes/adminJobs.js's per-row `employerCompany`/`employerStatus` and its
 *  company-name `q` filter (was `store.all("users.json")` + a JS employer map). */
async function getEmployerStatusCards(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT user_id, company_name, status FROM identity_employer_cards WHERE user_id = ANY($1)`,
    [uniq]
  );
  return new Map(rows.map((r) => [r.user_id, { companyName: r.company_name || null, status: r.status || null }]));
}

/**
 * Map<sellerId, card> for the given ids — the exact flat shape routes/listings.js
 * stamped onto each browse card:
 *   { id, name, companyName, slug, city, state, logo, isVerified,
 *     rating, reviewCount, responseRate }
 * INNER JOIN: every browse-page listing belongs to an approved seller, so a
 * seller_profiles row is guaranteed.
 */
async function getSellerBrowseCards(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.avatar_url,
            sp.company_name, sp.slug, sp.logo, sp.location_city, sp.location_state,
            sp.is_verified, sp.rating, sp.review_count, sp.response_rate
       FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE u.id = ANY($1)`,
    [uniq]
  );
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, {
      id: r.id,
      name: r.name,
      companyName: r.company_name || r.name || null,
      slug: r.slug || null,
      city: r.location_city || null,
      state: r.location_state || null,
      logo: r.logo || r.avatar_url || null,
      isVerified: !!r.is_verified,
      rating: r.rating == null ? 0 : Number(r.rating),
      reviewCount: r.review_count == null ? 0 : Number(r.review_count),
      responseRate: r.response_rate == null ? 0 : Number(r.response_rate),
    });
  }
  return m;
}

/** Map<userId, { company, name }> — seller company-name lookup for the admin
 *  listing queue (routes/adminListings.js). Replaces a `store.all("users.json")`
 *  full composite hydrate done for one string per seller. LEFT JOIN so a listing
 *  owner without a seller_profiles row still resolves (company falls back to name),
 *  matching the old `(sp && sp.companyName) || u.name || null`. */
async function getSellerCompanyNames(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT u.id, u.name, sp.company_name, sp.status AS seller_status
       FROM users u
       LEFT JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE u.id = ANY($1)`,
    [uniq]
  );
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, { company: r.company_name || r.name || null, name: r.name || null, sellerStatus: r.seller_status || null });
  }
  return m;
}

/** Map<userId, { company, name, type }> — company + account-type lookup for the
 *  moderation queue (routes/moderation.js), which resolves a blog/story/verification
 *  author who may be a seller OR a Recruitment employer. Matches the old
 *  authorLookup(): company = sellerCompany ?? employerCompany ?? name; type =
 *  "seller" if a seller_profiles row exists, else "employer", else null. */
async function getAccountCards(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT u.id, u.name,
            sp.company_name AS seller_company,
            ep.company_name AS employer_company,
            (sp.user_id IS NOT NULL) AS is_seller,
            (ep.user_id IS NOT NULL) AS is_employer
       FROM users u
       LEFT JOIN seller_profiles sp ON sp.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.id = ANY($1)`,
    [uniq]
  );
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, {
      company: r.seller_company || r.employer_company || r.name || null,
      name: r.name || null,
      type: r.is_seller ? "seller" : r.is_employer ? "employer" : null,
    });
  }
  return m;
}

/** Map<sellerId, priorityTier> for lib/ranking.js's paid-boost blend — replaces
 *  another `store.all("users.json")` done for one string per seller. Missing /
 *  NULL / "" tier normalizes to "none" (same as the old code). */
async function getSellerPriorityTiers(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT user_id, priority_tier FROM seller_profiles WHERE user_id = ANY($1)`,
    [uniq]
  );
  return new Map(rows.map((r) => [r.user_id, r.priority_tier || "none"]));
}

/* ------------------------------------------------ homepage review feeds ----- */
// Targeted read for routes/reviews.js's GET /recent + GET /recruitment-recent
// (BACKEND-AUDIT.md Phase 5 loose end). Those feeds did `store.all("users.json")`
// — a full composite hydrate of EVERY user (9 child tables) — to look up, per
// review, the reviewed seller's / employer's public business fields plus the
// reviewer's name/avatar. One `WHERE id = ANY($1)` over just the ids the feed
// touches, returning only the columns those two handlers read.

/**
 * Map<userId, party> for the ids given. `party` carries:
 *   { id, name, avatarUrl, mobile, city,
 *     sellerProfile: { companyName, slug, logo, coverImage, contactMobile,
 *                      location:{ city } } | null,
 *     employerProfile: { companyName, slug, logo } | null }
 * LEFT JOINs — a user with neither profile still resolves (both null), matching
 * the old `usersById.get(id)` + `seller.sellerProfile` / `employer.employerProfile`
 * truthiness gate.
 */
async function getReviewFeedParties(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.avatar_url, u.mobile, u.city,
            sp.user_id        AS sp_uid,
            sp.company_name    AS sp_company,
            sp.slug            AS sp_slug,
            sp.logo            AS sp_logo,
            sp.cover_image     AS sp_cover,
            sp.contact_mobile  AS sp_contact_mobile,
            sp.location_city   AS sp_city,
            ep.user_id        AS ep_uid,
            ep.company_name    AS ep_company,
            ep.slug            AS ep_slug,
            ep.logo            AS ep_logo
       FROM users u
       LEFT JOIN seller_profiles sp ON sp.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.id = ANY($1)`,
    [uniq]
  );
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, {
      id: r.id,
      name: r.name || null,
      avatarUrl: r.avatar_url || null,
      mobile: r.mobile || null,
      city: r.city || null,
      sellerProfile: r.sp_uid
        ? {
            companyName: r.sp_company || null,
            slug: r.sp_slug || null,
            logo: r.sp_logo || null,
            coverImage: r.sp_cover || null,
            contactMobile: r.sp_contact_mobile || null,
            location: { city: r.sp_city || null },
          }
        : null,
      employerProfile: r.ep_uid
        ? {
            companyName: r.ep_company || null,
            slug: r.ep_slug || null,
            logo: r.ep_logo || null,
          }
        : null,
    });
  }
  return m;
}

/* ------------------------------------------------ admin user directory ------ */
// GET /api/admin/users (routes/admin.js) did `store.all("users.json")` — a full
// composite hydrate of EVERY user with all 9 child tables — then ran scope / type /
// status / planTier / featured / q filtering, the 7 summary counts, the createdAt
// sort and the page slice in JS. `adminUserPage` pushes all of that into two
// indexed SQL statements (scope+summary; filtered page ids + filtered total); the
// route then hydrates ONLY the <=100 page ids via `hydrateUsersByIds` and maps
// them through its own `adminUserRow` (presentation stays in the route).
// (BACKEND-AUDIT.md Phase 6a — golden-guarded by the 17 admin-users fixtures.)

/** Batch-hydrate the given user ids to full composite docs, in the given order. */
async function hydrateUsersByIds(ids = []) {
  return usersStore.hydrateManyByIds(ids);
}

/** EVERY user as a full composite doc, id-ASC — byte-identical to the legacy
 *  `store.all("users.json")`. Only the admin analytics + admin sellers-list
 *  endpoints legitimately need the whole population; everything else is scoped. */
async function allUsers() {
  const { rows } = await pool.query(`SELECT id FROM users ORDER BY id ASC`);
  return usersStore.hydrateManyByIds(rows.map((r) => r.id));
}

/* --------------------------------------------------------------- writes ----- */
// The identity write-port (BACKEND-AUDIT.md Phase 8.4). These delegate straight
// to the composite mapper — byte-identical to the legacy
// store.insert/update("users.json", …) they replace.

/** Insert a new user, minting `usr_<n>` unless `doc.id` is already set. */
async function createUser(doc) {
  return usersStore.insert(doc, "usr");
}

/** Shallow-merge `patch` onto the user's composite doc; null if the id is unknown. */
async function updateUser(id, patch) {
  return usersStore.update(id, patch);
}

/** Delete a user (admin only). true when a row was removed. */
async function removeUser(id) {
  return usersStore.remove(id);
}

// LEFT JOINs shared by both statements; every hat test is `<child>.user_id IS [NOT] NULL`.
const ADMIN_USERS_FROM = `
  FROM users u
  LEFT JOIN seller_profiles sp    ON sp.user_id = u.id
  LEFT JOIN employer_profiles ep  ON ep.user_id = u.id
  LEFT JOIN candidate_profiles cp ON cp.user_id = u.id`;

function adminScopeSql(scope) {
  if (scope === "directory") {
    // isSeller(u) || (!isEmployer(u) && !isCandidate(u))
    return `(sp.user_id IS NOT NULL OR (ep.user_id IS NULL AND cp.user_id IS NULL))`;
  }
  if (scope === "recruitment") {
    return `(ep.user_id IS NOT NULL OR cp.user_id IS NOT NULL)`;
  }
  return `TRUE`; // global
}

/**
 * @param {{scope:string,type:string,status?:string,planTier?:string,
 *          featured?:string,q?:string,page:number,limit:number}} p
 * @returns {Promise<{pageIds:string[], total:number, summary:object}>}
 *   `total` is the FILTERED count (for paging); `summary` counts are over the
 *   SCOPED set before type/status/etc, exactly like the old route.
 */
async function adminUserPage(p) {
  const scopeSql = adminScopeSql(p.scope);

  // --- summary + scoped total (one pass over the scoped population) ----------
  const summaryRes = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE sp.user_id IS NULL AND ep.user_id IS NULL AND cp.user_id IS NULL)::int AS buyers,
       count(*) FILTER (WHERE sp.user_id IS NOT NULL)::int AS sellers,
       count(*) FILTER (WHERE ep.user_id IS NOT NULL)::int AS employers,
       count(*) FILTER (WHERE cp.user_id IS NOT NULL)::int AS candidates,
       count(*) FILTER (WHERE 'admin' = ANY(u.roles))::int AS admins,
       count(*) FILTER (WHERE u.status = 'suspended')::int AS suspended
     ${ADMIN_USERS_FROM}
     WHERE ${scopeSql}`
  );
  const s = summaryRes.rows[0];
  const summary = {
    total: s.total,
    buyers: s.buyers,
    sellers: s.sellers,
    employers: s.employers,
    candidates: s.candidates,
    admins: s.admins,
    suspended: s.suspended,
  };

  // --- filtered page ids + filtered total -----------------------------------
  const where = [scopeSql];
  const args = [];
  const add = (v) => args.push(v) && `$${args.length}`;

  const type = p.type || "all";
  if (type === "seller") where.push(`sp.user_id IS NOT NULL`);
  else if (type === "employer") where.push(`ep.user_id IS NOT NULL`);
  else if (type === "candidate") where.push(`cp.user_id IS NOT NULL`);
  else if (type === "admin") where.push(`'admin' = ANY(u.roles)`);
  else if (type === "buyer" || type === "user")
    where.push(`sp.user_id IS NULL AND ep.user_id IS NULL AND cp.user_id IS NULL`);

  if (p.status && p.status !== "all") {
    const col = p.scope === "recruitment" ? "ep.status" : "sp.status";
    where.push(`${col} = ${add(p.status)}`);
  }
  if (p.planTier && p.planTier !== "all") {
    where.push(`sp.user_id IS NOT NULL AND COALESCE(NULLIF(sp.plan_tier, ''), 'free') = ${add(p.planTier)}`);
  }
  if (p.featured === "yes" || p.featured === "no") {
    where.push(`sp.user_id IS NOT NULL AND COALESCE(sp.is_featured_seller, false) = ${add(p.featured === "yes")}`);
  }
  if (p.q) {
    const esc = String(p.q).replace(/[\\%_]/g, "\\$&");
    const like = add(`%${esc}%`);
    where.push(
      `(u.name ILIKE ${like} ESCAPE '\\' OR u.email ILIKE ${like} ESCAPE '\\' OR ` +
        `u.mobile ILIKE ${like} ESCAPE '\\' OR sp.company_name ILIKE ${like} ESCAPE '\\' OR ` +
        `ep.company_name ILIKE ${like} ESCAPE '\\' OR cp.headline ILIKE ${like} ESCAPE '\\')`
    );
  }

  const limit = add(p.limit);
  const offset = add((p.page - 1) * p.limit);
  const pageRes = await pool.query(
    `WITH filtered AS (
       SELECT u.id, u.created_at
       ${ADMIN_USERS_FROM}
       WHERE ${where.join(" AND ")}
     )
     SELECT
       (SELECT count(*)::int FROM filtered) AS total,
       (SELECT array_agg(id ORDER BY created_at DESC NULLS LAST, id ASC)
          FROM (SELECT id, created_at FROM filtered
                ORDER BY created_at DESC NULLS LAST, id ASC
                LIMIT ${limit} OFFSET ${offset}) pg) AS page_ids`,
    args
  );
  const row = pageRes.rows[0];
  return { pageIds: row.page_ids || [], total: row.total, summary };
}

/* ---------------------------------------------- public profile by slug ------ */
// routes/users.js's GET /api/sellers/:slug and GET /api/employers/:slug did
// `store.findOne("users.json", u => u.<profile>.slug === slug)` — a full composite
// hydrate of EVERY user just to find one by a slug that lives on the profile
// child table. `<profile>_profiles.slug` is `UNIQUE NOT NULL` and indexed, so this
// is one index probe + a single-id composite hydrate. (BACKEND-AUDIT.md Phase 6b.)

async function getSellerBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT user_id FROM seller_profiles WHERE slug = $1`,
    [slug]
  );
  if (!rows[0]) return null;
  const [doc] = await usersStore.hydrateManyByIds([rows[0].user_id]);
  return doc || null;
}

async function getEmployerBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT user_id FROM employer_profiles WHERE slug = $1`,
    [slug]
  );
  if (!rows[0]) return null;
  const [doc] = await usersStore.hydrateManyByIds([rows[0].user_id]);
  return doc || null;
}

/* --------------------------------------------- auth-path user lookups ------- */
// routes/auth.js's register / verify-otp / login did
// `store.findOne("users.json", u => u.mobile|email === x)` — a full composite
// hydrate of EVERY user then `.find`. `users.mobile` / `users.email` are both
// indexed; `ORDER BY id ASC LIMIT 1` reproduces `store.findOne`'s first-match-in-
// id-order, then one single-row composite hydrate. (BACKEND-AUDIT.md Phase 6c.)

async function getUserByMobile(mobile) {
  if (!mobile) return null;
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE mobile = $1 ORDER BY id ASC LIMIT 1`,
    [mobile]
  );
  return rows[0] ? usersStore.getById(rows[0].id) : null;
}

async function getUserByEmail(email) {
  if (!email) return null;
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE email = $1 ORDER BY id ASC LIMIT 1`,
    [email]
  );
  return rows[0] ? usersStore.getById(rows[0].id) : null;
}

/**
 * Social login (0016_add_google_oauth.sql and whatever each future provider's
 * own migration adds). One provider-id column per linked provider; this map is
 * the single place a new provider gets wired in — add its migration (a nullable
 * `<provider>_id TEXT` column + partial unique index, same shape as
 * users_google_id_idx) and one line here, and getUserByOauthId/linkOauthId/
 * oauthDraftFields all pick it up with no new SQL. routes/oauthShared.js's
 * finishOauthLogin() is the provider-agnostic find-or-create/session logic that
 * uses these — a new provider route file only verifies that provider's token
 * and calls it.
 */
const OAUTH_PROVIDERS = {
  google: { column: "google_id", docKey: "googleId" },
  // facebook: { column: "facebook_id", docKey: "facebookId" }, // add with its own migration when wired
  // apple:    { column: "apple_id",    docKey: "appleId" },    // add with its own migration when wired (needs a paid Apple Developer account first)
};

/** id of the user linked to this provider account, or null (unknown provider,
 *  no providerId, or no match). */
async function getUserByOauthId(provider, providerId) {
  const spec = OAUTH_PROVIDERS[provider];
  if (!spec || !providerId) return null;
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE ${spec.column} = $1 LIMIT 1`,
    [providerId]
  );
  return rows[0] ? usersStore.getById(rows[0].id) : null;
}

/** Link a provider account onto an existing user (the email-matched fallback
 *  path in finishOauthLogin — an account that registered via OTP/password
 *  signing in with a provider for the first time). */
async function linkOauthId(userId, provider, providerId) {
  const spec = OAUTH_PROVIDERS[provider];
  if (!spec) throw new Error(`Unknown oauth provider: ${provider}`);
  return updateUser(userId, { [spec.docKey]: providerId });
}

/** The one field a new-user draft needs to carry the provider link, keyed to
 *  whatever doc key that provider's column maps to. */
function oauthDraftFields(provider, providerId) {
  const spec = OAUTH_PROVIDERS[provider];
  if (!spec) throw new Error(`Unknown oauth provider: ${provider}`);
  return { [spec.docKey]: providerId };
}

/* --------------------------------------------------------------- writes ----- */

/** The one write this port exposes. Not yet wired — routes/adminEmployers.js still
 *  patches employerProfile.status directly until Phase 4. */
async function setEmployerApproval(userId, status, actorId) {
  const user = await getAuthUser(userId);
  if (!user || !user.employerProfile) return null;
  return usersStore.update(userId, {
    employerProfile: {
      ...user.employerProfile,
      status,
      statusDecidedBy: actorId || null,
      statusDecidedAt: new Date().toISOString(),
    },
  });
}

/* --------------------------------------------------------- FCM push tokens -- */
// Web-push device tokens (0017_add_fcm_tokens.sql) — one row per browser/device,
// keyed on the token itself so re-registering upserts instead of duplicating.
// lib/fcm.js reads these to know who to push to; never exposed in any API
// response (a device token is bearer-credential-adjacent — treat it like one).

/** Upsert a token for a user — same token re-registered (same browser, maybe a
 *  different logged-in user) reassigns user_id and bumps last_seen_at. */
async function registerFcmToken(userId, token, platform = "web") {
  await pool.query(
    `INSERT INTO fcm_tokens (token, user_id, platform, created_at, last_seen_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now()`,
    [token, userId, platform]
  );
}

/** Drop a token (logout, or the browser's push subscription expired). */
async function unregisterFcmToken(token) {
  await pool.query(`DELETE FROM fcm_tokens WHERE token = $1`, [token]);
}

/** Every token currently registered for a user — lib/fcm.js sends to all of them
 *  (a user may have chat open on more than one device/browser). */
async function getFcmTokensForUser(userId) {
  const { rows } = await pool.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.token);
}

/** Drop tokens Firebase reported as invalid/unregistered — called from
 *  lib/fcm.js's send result, keeps the table from accumulating dead tokens. */
async function pruneFcmTokens(tokens = []) {
  if (!tokens.length) return;
  await pool.query(`DELETE FROM fcm_tokens WHERE token = ANY($1)`, [tokens]);
}

module.exports = {
  getAuthUser,
  getEmployerCard, getEmployerCards,
  getSellerCard, getSellerCards,
  getCandidateCard, getCandidateCards,
  getApprovedSellerIds, filterSellerIds, directoryCounts, searchApprovedSellersByName, getSellerBrowseCards, getSellerPriorityTiers,
  sellerSlugTaken, employerSlugTaken,
  getSellerCompanyNames, getAccountCards,
  getReviewFeedParties,
  hydrateUsersByIds, allUsers, adminUserPage,
  getSellerBySlug, getEmployerBySlug,
  getUserByMobile, getUserByEmail,
  getUserByOauthId, linkOauthId, oauthDraftFields,
  getEmployerUserIds, getEmployerStatusCards,
  setEmployerApproval,
  createUser, updateUser, removeUser,
  registerFcmToken, unregisterFcmToken, getFcmTokensForUser, pruneFcmTokens,
};
