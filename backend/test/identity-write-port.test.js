/**
 * identity-write-port.test.js — routes/auth.js + routes/users.js + admin/
 * moderation user writes go through modules/identity's write-port
 * (createUser / updateUser), not store.insert/update("users.json")
 * (BACKEND-AUDIT.md Phase 8.4).
 *
 * Covers: POST /api/auth/register response shape byte-check + persistence,
 * POST /api/auth/verify-otp auto-create, and identity.updateUser round-trip.
 * Every user this test creates is removed in t.after.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const identity = require("../modules/identity");
const { pool } = require("../modules/_shared/pool");

test("identity write-port: register / verify-otp / updateUser (Phase 8.4)", async (t) => {
  const created = [];
  t.after(async () => {
    for (const id of created) await identity.removeUser(id).catch(() => {});
    await pool.end().catch(() => {});
  });

  // routes/auth.js must not require lib/store any more
  const authSrc = fs.readFileSync(path.join(__dirname, "../routes/auth.js"), "utf8");
  assert.ok(!/require\(["']\.\.\/lib\/store["']\)/.test(authSrc), "routes/auth.js must not require lib/store");

  const mobile = "9" + String(Date.now()).slice(-9);

  // --- register -----------------------------------------------------------------
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "QC Write Port", mobile, email: `qc${mobile}@example.com`, city: "Pune", state: "MH" });
  assert.equal(reg.status, 200);
  assert.ok(reg.body.data.token, "register returns a token");
  const u = reg.body.data.user;
  created.push(u.id);
  assert.match(u.id, /^usr_/);
  assert.equal(u.name, "QC Write Port");
  assert.equal(u.mobile, mobile);
  assert.deepEqual(u.roles, ["user"]);
  assert.equal(u.sellerProfile, null);
  assert.ok(!("passwordHash" in u), "passwordHash never leaves the API");
  // exact key set — the register response shape must not drift
  assert.deepEqual(
    Object.keys(u).sort(),
    ["avatarUrl", "city", "createdAt", "email", "id", "mobile", "name", "roles", "sellerProfile", "state"].sort()
  );

  // persisted + hydratable
  const fromDb = await identity.getAuthUser(u.id);
  assert.equal(fromDb.mobile, mobile);
  assert.equal(fromDb.name, "QC Write Port");

  // duplicate mobile → 409
  const dup = await request(app).post("/api/auth/register").send({ name: "x", mobile });
  assert.equal(dup.status, 409);

  // --- verify-otp auto-create -------------------------------------------------
  const mobile2 = "8" + String(Date.now()).slice(-9);
  const otpRes = await request(app).post("/api/auth/send-otp").send({ mobile: mobile2 });
  const otp = otpRes.body.data.otp; // dev returns it
  assert.ok(otp, "dev OTP present");
  const ver = await request(app).post("/api/auth/verify-otp").send({ mobile: mobile2, otp });
  assert.equal(ver.status, 200);
  created.push(ver.body.data.user.id);
  assert.match(ver.body.data.user.id, /^usr_/);
  assert.equal(ver.body.data.user.mobile, mobile2);

  // --- updateUser round-trip (plain fields — routes always pass FULL profile
  //     blocks, which carry their own NOT NULL columns like sellerProfile.slug) --
  const patched = await identity.updateUser(u.id, { city: "Mumbai", state: "MH", name: "QC Renamed" });
  assert.equal(patched.city, "Mumbai");
  assert.equal(patched.name, "QC Renamed");
  const rehydrated = await identity.getAuthUser(u.id);
  assert.equal(rehydrated.city, "Mumbai");
  assert.equal(rehydrated.name, "QC Renamed");
  assert.equal(rehydrated.mobile, mobile, "unpatched fields untouched");

  assert.equal(await identity.updateUser("usr_does_not_exist", { city: "x" }), null);
});
