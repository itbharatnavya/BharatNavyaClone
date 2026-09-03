/**
 * auth.behavior.test.js — behavioural net for routes/auth.js (BACKEND-AUDIT.md
 * Phase 6c). The golden harness deliberately skips security endpoints, so the
 * credential path (register / send-otp / verify-otp / login / me) gets its own
 * assertions here — run BEFORE the 6c refactor that moves the three
 * `store.findOne("users.json", …)` lookups onto indexed `identity` helpers.
 *
 * Guards: passwordHash never leaves the API, JWT issued on every success,
 * duplicate-mobile 409, login is enumeration-safe (same 401 + message for a
 * wrong password and an unknown email), suspended accounts are blocked.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

const uniqMobile = () => "9" + String(Date.now()).slice(-8) + Math.floor(Math.random() * 10);
const uniqEmail = () => `auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

test("routes/auth.js credential path (Phase 6c)", async (t) => {
  const createdUsers = [];
  t.after(async () => {
    for (const id of createdUsers) await store.remove("users.json", id).catch(() => {});
    await pool.end().catch(() => {});
  });

  const noHash = (obj, where) => {
    assert.ok(obj && typeof obj === "object", `${where}: expected a user object`);
    assert.equal(obj.passwordHash, undefined, `${where}: passwordHash must never be in the response`);
  };

  /* ---- register: happy path ------------------------------------------- */
  const mobile = uniqMobile();
  const email = uniqEmail();
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Auth Test", mobile, email, password: "secret123" });
  assert.equal(reg.status, 200, reg.text);
  assert.ok(reg.body.data.token, "register issues a JWT");
  assert.equal(reg.body.data.user.roles.join(","), "user");
  noHash(reg.body.data.user, "register");
  createdUsers.push(reg.body.data.user.id);

  /* ---- register: duplicate mobile → 409 ----------------------------- */
  const dup = await request(app)
    .post("/api/auth/register")
    .send({ name: "Dup", mobile, password: "secret123" });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.success, false);

  /* ---- login: correct / wrong / unknown --------------------------- */
  const okLogin = await request(app).post("/api/auth/login").send({ email, password: "secret123" });
  assert.equal(okLogin.status, 200, okLogin.text);
  assert.ok(okLogin.body.data.token);
  noHash(okLogin.body.data.user, "login");

  const wrongPw = await request(app).post("/api/auth/login").send({ email, password: "WRONG" });
  const unknownEmail = await request(app)
    .post("/api/auth/login")
    .send({ email: uniqEmail(), password: "secret123" });
  assert.equal(wrongPw.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(
    wrongPw.body.error,
    unknownEmail.body.error,
    "wrong-password and unknown-email must return an identical message (no user enumeration)"
  );

  /* ---- OTP: send + verify (fresh mobile auto-creates) ------------ */
  const otpMobile = uniqMobile();
  const send = await request(app).post("/api/auth/send-otp").send({ mobile: otpMobile });
  assert.equal(send.status, 200);
  assert.ok(send.body.data.otp, "dev/test env echoes the OTP");

  const verify = await request(app)
    .post("/api/auth/verify-otp")
    .send({ mobile: otpMobile, otp: send.body.data.otp });
  assert.equal(verify.status, 200, verify.text);
  assert.ok(verify.body.data.token);
  noHash(verify.body.data.user, "verify-otp");
  createdUsers.push(verify.body.data.user.id);

  const badOtp = await request(app)
    .post("/api/auth/verify-otp")
    .send({ mobile: otpMobile, otp: "000001" });
  assert.equal(badOtp.status, 401);

  /* ---- GET /api/auth/me ---------------------------------------- */
  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${okLogin.body.data.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.id, reg.body.data.user.id);
  noHash(me.body.data.user, "me");

  const meAnon = await request(app).get("/api/auth/me");
  assert.equal(meAnon.status, 401);

  /* ---- suspended account is blocked at login ------------------ */
  await store.update("users.json", reg.body.data.user.id, { status: "suspended" });
  const suspended = await request(app).post("/api/auth/login").send({ email, password: "secret123" });
  assert.equal(suspended.status, 403);
  assert.equal(suspended.body.code, "account_suspended");
});
