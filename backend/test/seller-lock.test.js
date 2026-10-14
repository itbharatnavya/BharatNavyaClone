/**
 * seller-lock.test.js — suspended / rejected seller behaviour (accountStatus.js).
 *
 *   - account suspended (users.status): login 403 `account_suspended`, REST 403
 *   - seller suspended/rejected: seller write tools 403, public listing/profile pages
 *     404 `seller_unavailable` (owner still sees them), no new chat or enquiry
 *   - rejected seller may resubmit (-> pending); suspended seller may NOT (admin only)
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const identity = require("../modules/identity");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

const uniqMobile = () => "9" + String(Date.now()).slice(-8) + Math.floor(Math.random() * 10);

test("suspended / rejected seller lock", async (t) => {
  const createdUsers = [];
  t.after(async () => {
    for (const id of createdUsers) await store.remove("users.json", id).catch(() => {});
    await pool.end().catch(() => {});
  });

  const register = async (name) => {
    const r = await request(app)
      .post("/api/auth/register")
      .send({ name, mobile: uniqMobile(), password: "secret123" });
    assert.equal(r.status, 200, r.text);
    createdUsers.push(r.body.data.user.id);
    return { id: r.body.data.user.id, token: r.body.data.token };
  };
  const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });
  const setSellerStatus = async (id, status) => {
    const u = await identity.getAuthUser(id);
    await identity.updateUser(id, { sellerProfile: { ...u.sellerProfile, status } });
  };

  const seller = await register("Lock Seller");
  const buyer = await register("Lock Buyer");

  const become = await request(app)
    .post("/api/become-seller")
    .set(bearer(seller))
    .send({ companyName: `Lock Test Co ${Date.now()}` });
  assert.equal(become.status, 200, become.text);
  const slug = (await identity.getAuthUser(seller.id)).sellerProfile.slug;

  /* ---- rejected: tools locked, pages hidden, resubmit allowed ------------ */
  await setSellerStatus(seller.id, "rejected");
  const rejCreate = await request(app).post("/api/listings").set(bearer(seller)).send({});
  assert.equal(rejCreate.status, 403);
  assert.equal(rejCreate.body.code, "seller_rejected");

  const hiddenGuest = await request(app).get(`/api/sellers/${slug}`);
  assert.equal(hiddenGuest.status, 404);
  assert.equal(hiddenGuest.body.code, "seller_unavailable");
  const ownSeen = await request(app).get(`/api/sellers/${slug}`).set(bearer(seller));
  assert.equal(ownSeen.status, 200, "the owner still sees their own profile");

  const chat = await request(app)
    .post("/api/chat/conversations")
    .set(bearer(buyer))
    .send({ toUserId: seller.id });
  assert.equal(chat.status, 404);
  assert.equal(chat.body.code, "seller_unavailable");

  const resub = await request(app).post("/api/me/seller/resubmit").set(bearer(seller));
  assert.equal(resub.status, 200, resub.text);
  assert.equal((await identity.getAuthUser(seller.id)).sellerProfile.status, "pending");

  /* ---- pending again: tools unlocked (validation, not the lock, answers) -- */
  const pendCreate = await request(app).post("/api/listings").set(bearer(seller)).send({});
  assert.notEqual(pendCreate.status, 403, "a pending seller is not locked");

  /* ---- suspended: tools locked, resubmit refused (admin only) ----------- */
  await setSellerStatus(seller.id, "suspended");
  const susCreate = await request(app).post("/api/listings").set(bearer(seller)).send({});
  assert.equal(susCreate.status, 403);
  assert.equal(susCreate.body.code, "seller_suspended");

  const susResub = await request(app).post("/api/me/seller/resubmit").set(bearer(seller));
  assert.equal(susResub.status, 403);
  assert.equal(susResub.body.code, "seller_suspended");
  assert.equal(
    (await identity.getAuthUser(seller.id)).sellerProfile.status,
    "suspended",
    "resubmit must never lift a suspension"
  );

  // A suspended seller can still log in to see why (account itself is active).
  const stillIn = await request(app).get("/api/auth/me").set(bearer(seller));
  assert.equal(stillIn.status, 200);

  /* ---- approved again by admin: everything back --------------------------- */
  await setSellerStatus(seller.id, "approved");
  const back = await request(app).get(`/api/sellers/${slug}`);
  assert.equal(back.status, 200);

  /* ---- account suspended: no login, no authenticated call ---------------- */
  await identity.updateUser(seller.id, { status: "suspended" });
  const me = await request(app).get("/api/auth/me").set(bearer(seller));
  assert.equal(me.status, 403);
  assert.equal(me.body.code, "account_suspended");
  assert.match(me.body.error, /suspended/i);
  assert.ok(auth.signToken, "sanity: token helper present");
});
