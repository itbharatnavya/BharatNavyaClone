/**
 * inquiries.querycount.test.js — routes/inquiries.js off lib/store
 * (BACKEND-AUDIT.md Phase 7 sweep-12, closes the Phase 5 loose end).
 *
 * resolveTargets() did `store.all("listings.json")` (full composite hydrate of
 * EVERY listing) + `store.all("users.json")` (all 9 child tables of EVERY user)
 * just to fan a broad RFQ out to <=6 approved sellers. GET / and /mine and the
 * contact endpoint read the leads-ledger + `inquiries.json` + all users the same
 * way. Now: `directory.rfqMatchListingsLean()` / `directory.listingOwner()` /
 * `identity.getApprovedSellerIds()` / `identity.hydrateUsersByIds()` /
 * `repoForCollection("inquiries.json")` / `lib/leads`'s `readLedger` + `updateLead`.
 * Request / response shapes unchanged (frontend postInquiry / getRfqDeliveries /
 * getMyRfqs / contactLead).
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

test("inquiries: broad + specific fan-out and lists read via module ports (Phase 7 sweep-12)", async (t) => {
  const createdInquiryIds = [];
  t.after(async () => {
    if (createdInquiryIds.length) {
      await pool
        .query(`DELETE FROM leads_ledger WHERE inquiry_id = ANY($1)`, [createdInquiryIds])
        .catch(() => {});
      await pool
        .query(`DELETE FROM inquiries WHERE id = ANY($1)`, [createdInquiryIds])
        .catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../modules/directory/routes/inquiries.routes.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/inquiries.js must not require lib/store"
  );

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const hit = (re) => seen.some((s) => re.test(s));

  try {
    // --- broad RFQ: unmatched body -> lean listings scan + approved-seller query,
    //     never a full users hydrate ---------------------------------------------
    seen.length = 0;
    const broad = await request(app)
      .post("/api/inquiries")
      .send({ productName: "zzzznomatch qqqx unmatched probe", buyerName: "QC", buyerMobile: "9990001111" });
    assert.equal(broad.status, 200);
    assert.ok(broad.body.data && broad.body.data.inquiry, "response has data.inquiry");
    assert.ok(Array.isArray(broad.body.data.leads), "response has data.leads[]");
    assert.equal(broad.body.data.leadsCreated, broad.body.data.leads.length);
    assert.equal(broad.body.data.inquiry.unmatched, true);
    createdInquiryIds.push(broad.body.data.inquiry.id);

    assert.ok(hit(/FROM\s+listings\s+WHERE\s+status\s*=\s*'active'/i), "broad path issues the lean active-listings read");
    assert.ok(hit(/FROM\s+seller_profiles\s+WHERE\s+status\s*=\s*'approved'/i), "broad path reads approved seller ids via SQL");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+users\s+ORDER\s+BY/i), "broad path must NOT hydrate every user");
    assert.ok(!hit(/FROM\s+listing_media\s+WHERE\s+listing_id\s+IN/i), "broad path must NOT composite-hydrate every listing");

    // --- specific-listing RFQ: listingOwner probe, no broad scan ---------------
    const anyListing = (await store.all("listings.json")).find((l) => l.status === "active");
    assert.ok(anyListing, "seed has at least one active listing");
    seen.length = 0;
    const spec = await request(app)
      .post("/api/inquiries")
      .send({ listingId: anyListing.id, productName: "QC specific probe", buyerName: "QC", buyerMobile: "9990002222" });
    assert.equal(spec.status, 200);
    createdInquiryIds.push(spec.body.data.inquiry.id);
    assert.equal(spec.body.data.inquiry.sellerId, anyListing.sellerId);
    assert.ok(hit(/FROM\s+listings\s+WHERE\s+id\s*=\s*\$1/i), "specific path probes listings by id");
    assert.ok(!hit(/FROM\s+listings\s+WHERE\s+status\s*=\s*'active'\s+ORDER\s+BY/i), "specific path must NOT run the broad lean scan");

    // --- GET / (seller RFQ table): inquiries repo + ledger, no user scan ------
    const seller = await store.getById("users.json", "usr_s001");
    seen.length = 0;
    const list = await request(app)
      .get("/api/inquiries")
      .set({ Authorization: `Bearer ${auth.signToken(seller)}` });
    assert.equal(list.status, 200);
    assert.ok(list.body.data && Array.isArray(list.body.data.items), "GET / envelope shape");
    assert.ok(hit(/FROM\s+"?inquiries"?/i), "GET / reads inquiries via SQL");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+users\s+ORDER\s+BY/i), "GET / must NOT hydrate every user");

    // --- GET /mine (buyer): filtered inquiries + only referenced sellers ------
    const buyer = await store.getById("users.json", "usr_s003");
    seen.length = 0;
    const mine = await request(app)
      .get("/api/inquiries/mine")
      .set({ Authorization: `Bearer ${auth.signToken(buyer)}` });
    assert.equal(mine.status, 200);
    assert.ok(Array.isArray(mine.body.data), "GET /mine returns an array");
    assert.ok(hit(/FROM\s+"?inquiries"?\s+WHERE/i), "GET /mine filters inquiries by buyerId in SQL");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+users\s+ORDER\s+BY/i), "GET /mine must NOT hydrate every user");
  } finally {
    pool.query = orig;
  }
});
