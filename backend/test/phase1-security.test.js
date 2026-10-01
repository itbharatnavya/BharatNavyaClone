/**
 * phase1-security.test.js — regression tests for BACKEND-AUDIT.md Phase 1.
 *
 * Covers: mass-assignment allowlists (S1), self-review guard (S2), rate limiting
 * (S3), AI prompt cap + guest access on /api/ai/rfq (S4), and the dependency-aware
 * /health probe (§1e). These assert the holes stay closed — keep them permanently
 * (BACKEND-AUDIT.md "Verification").
 *
 * Env is set before requiring the app so config picks up small rate-limit ceilings
 * (node --test runs each file in its own process).
 */

process.env.RATE_LIMIT_ENABLED = "true";
process.env.RL_AUTH_MAX = "3";
process.env.RL_AI_MAX = "6";
process.env.RL_GLOBAL_MAX = "100000";
process.env.AI_PROMPT_MAX = "4000";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const store = require("../lib/pg-store");

const uniqMobile = () => String(Date.now()).slice(-9) + Math.floor(Math.random() * 10);
const created = { listings: [], jobs: [], users: [] };

async function register() {
  const mobile = uniqMobile();
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Phase1 Test", mobile, password: "secret123" });
  assert.equal(res.status, 200, `register failed: ${res.text}`);
  created.users.push(res.body.data.user.id);
  return { token: res.body.data.token, user: res.body.data.user, mobile };
}

const authed = (req, token) => req.set("Authorization", `Bearer ${token}`);

test.after(async () => {
  for (const id of created.listings) try { await store.remove("listings.json", id); } catch {}
  for (const id of created.jobs) try { await store.remove("jobs.json", id); } catch {}
  for (const id of created.users) try { await store.remove("users.json", id); } catch {}
});

/* --------------------------------------------------------------- §1e /health */

test("GET /health reports db up", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, "ok");
});

test("GET / keeps its legacy shape (contract unchanged)", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.version, 2);
});

/* ----------------------------------------------------------- S2 self-review */

test("POST /api/reviews — cannot review yourself (403)", async () => {
  const { token, user } = await register();
  const res = await authed(
    request(app).post("/api/reviews"),
    token
  ).send({ targetUserId: user.id, rating: 5, reviewText: "great, me" });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test("POST /api/reviews — target must exist (404)", async () => {
  const { token } = await register();
  const res = await authed(
    request(app).post("/api/reviews"),
    token
  ).send({ targetUserId: "usr_000000", rating: 5 });
  assert.equal(res.status, 404);
});

/* ------------------------------------------------------- S1 mass assignment */

test("PUT /api/listings/:id — privileged fields are ignored", async () => {
  const { token } = await register();
  const createRes = await authed(request(app).post("/api/listings"), token).send({
    type: "product",
    title: "Phase1 Test Widget",
    description: "a plain test listing",
  });
  assert.equal(createRes.status, 200, `create failed: ${createRes.text}`);
  const id = createRes.body.data.id;
  created.listings.push(id);

  const putRes = await authed(request(app).put(`/api/listings/${id}`), token).send({
    title: "Phase1 Test Widget (edited)",
    isFeatured: true,
    isSponsored: true,
    rankBoostScore: 999,
    manualPinRank: 1,
    isVerifiedSeller: true,
    rating: 5,
    reviewCount: 42,
    verification: { status: "admin_approved" },
  });
  assert.equal(putRes.status, 200);

  const got = (await request(app).get(`/api/listings/${id}`)).body.data;
  assert.equal(got.title, "Phase1 Test Widget (edited)", "allowed field must still update");
  assert.equal(got.isFeatured, false);
  assert.equal(got.isSponsored, false);
  assert.equal(got.rankBoostScore, 0);
  assert.equal(got.manualPinRank, null);
  assert.equal(got.isVerifiedSeller, false);
  assert.equal(got.rating, 0);
  assert.equal(got.reviewCount, 0);
  assert.notEqual(got.verification && got.verification.status, "admin_approved");
});

test("PUT /api/jobs/:id — employerId and unknown fields are ignored", async () => {
  const { token, user } = await register();
  const job = await store.insert(
    "jobs.json",
    {
      employerId: user.id,
      title: "Phase1 Test Role",
      description: "test",
      status: "active",
      openings: 1,
      viewCount: 0,
      applicationCount: 0,
      postedAt: new Date().toISOString(),
    },
    "job"
  );
  created.jobs.push(job.id);

  const putRes = await authed(request(app).put(`/api/jobs/${job.id}`), token).send({
    title: "Phase1 Test Role (edited)",
    employerId: "usr_hacker",
    viewCount: 99999,
    applicationCount: 500,
    someBogusField: "x",
  });
  assert.equal(putRes.status, 200, putRes.text);

  const got = await store.getById("jobs.json", job.id);
  assert.equal(got.title, "Phase1 Test Role (edited)");
  assert.equal(got.employerId, user.id);
  assert.equal(got.viewCount, 0);
  assert.equal(got.applicationCount, 0);
  assert.equal(got.someBogusField, undefined);
});

/* --------------------------------------------------------- S3 rate limiting */

test("POST /api/auth/send-otp — 429 after RL_AUTH_MAX in a window", async () => {
  const mobile = uniqMobile();
  let last;
  for (let i = 0; i < 4; i++) {
    last = await request(app).post("/api/auth/send-otp").send({ mobile });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.code, "rate_limited");
  assert.equal(last.body.success, false);
});

/* ------------------------------------------------- S4 AI: guest + prompt cap */

test("POST /api/ai/rfq — works for a guest, never crashes", async () => {
  const res = await request(app).post("/api/ai/rfq").send({ need: "need 100 steel lamps in Pune" });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("POST /api/ai/rfq — rejects an over-long prompt (400)", async () => {
  const res = await request(app)
    .post("/api/ai/rfq")
    .send({ need: "x".repeat(5000) });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});
