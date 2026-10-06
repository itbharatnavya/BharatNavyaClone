/**
 * otp-store.test.js — OTP codes live in Postgres (0017_add_otp_codes.sql).
 *
 * Guards: a code is single-use, a wrong code doesn't spend the live one, re-sending
 * replaces the previous code, expired and never-issued codes are rejected, racing
 * verifies spend one code exactly once, the code is in the database (not process
 * memory — serverless instances don't share memory), and the dev master code only
 * works when isDev.
 *
 * Runs against the PG_URL_TEST database (`npm run test:setup`, then
 * `PG_URL=$PG_URL_TEST npm run migrate-schema` for this migration on an existing one).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

const uniqMobile = () => "9" + String(Date.now()).slice(-8) + Math.floor(Math.random() * 10);
const send = (mobile) => request(app).post("/api/auth/send-otp").send({ mobile });
const verify = (mobile, otp) => request(app).post("/api/auth/verify-otp").send({ mobile, otp });

test("OTP codes persist in Postgres (0017)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  await t.test("issue then verify succeeds, and the code is then spent", async () => {
    const m = uniqMobile();
    const s = await send(m);
    assert.equal(s.status, 200);
    const otp = s.body.data.otp;
    assert.match(otp, /^\d{6}$/);

    const ok = await verify(m, otp);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.token, "verify issues a JWT");

    const again = await verify(m, otp);
    assert.equal(again.status, 401, "a used code must not verify twice");
  });

  await t.test("a wrong code is rejected and leaves the live code usable", async () => {
    const m = uniqMobile();
    const otp = (await send(m)).body.data.otp;
    const wrong = otp === "000000" ? "111111" : "000000";

    assert.equal((await verify(m, wrong)).status, 401);
    assert.equal((await verify(m, otp)).status, 200);
  });

  await t.test("re-sending replaces the previous code", async () => {
    const m = uniqMobile();
    const first = (await send(m)).body.data.otp;
    let second = (await send(m)).body.data.otp;
    while (second === first) second = (await send(m)).body.data.otp;

    assert.equal((await verify(m, first)).status, 401, "old code must be dead after resend");
    assert.equal((await verify(m, second)).status, 200, "new code must work");
  });

  await t.test("verify without a prior send is rejected", async () => {
    assert.equal((await verify(uniqMobile(), "424242")).status, 401);
  });

  await t.test("an expired code is rejected", async () => {
    const m = uniqMobile();
    const otp = (await send(m)).body.data.otp;
    await pool.query(
      `UPDATE otp_codes SET expires_at = now() - interval '1 second' WHERE mobile = $1`,
      [m]
    );
    assert.equal((await verify(m, otp)).status, 401);
  });

  await t.test("racing verifies with one code spend it exactly once", async () => {
    const m = uniqMobile();
    const otp = (await send(m)).body.data.otp;
    const results = await Promise.all(Array.from({ length: 6 }, () => verify(m, otp)));
    const statuses = results.map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 200).length, 1, `statuses: ${statuses}`);
    assert.equal(statuses.filter((s) => s === 401).length, 5, `statuses: ${statuses}`);
  });

  await t.test("the live code is stored in Postgres with a DB-clock expiry", async () => {
    const m = uniqMobile();
    const otp = (await send(m)).body.data.otp;
    const { rows } = await pool.query(
      `SELECT otp, expires_at > now() AS live FROM otp_codes WHERE mobile = $1`,
      [m]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].otp, otp);
    assert.equal(rows[0].live, true);
  });

  await t.test("dev master code 123456 is accepted when isDev", async () => {
    assert.equal((await verify(uniqMobile(), "123456")).status, 200);
  });
});
