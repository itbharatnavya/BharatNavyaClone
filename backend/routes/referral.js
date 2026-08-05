/**
 * routes/referral.js — offline-credit referral program (monetization sibling).
 *
 * Like the rest of BharatSource monetization, credits are tracked offline: a
 * referrer earns +1 credit each time a NEW user redeems their code. No payment
 * rails — an admin/ops process later converts credits into perks.
 *
 * Referral row (in referrals.json):
 *   { id, userId, code, credits, invitedUserIds[], createdAt }
 *
 * The code is stable + deterministic per user: "BS" + last 4 of the (alphanumeric)
 * user id + a short sha1 hash of the id, so the same user always resolves to the
 * same code without a uniqueness scan.
 *
 *   GET  /api/referral/my-code → lazily generate + return { code, credits, invitedCount }
 *   POST /api/referral/redeem  { code } → credit the owner (not self); { ok, referrer }
 *   GET  /api/referral/        → my referral row (or null)
 *
 * NOTE FOR INTEGRATOR: mount with
 *   app.use("/api/referral", require("./routes/referral"));
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

const COLLECTION = "referrals.json";

/** Deterministic, stable referral code for a user id. */
function makeCode(userId) {
  const alnum = String(userId).replace(/[^a-zA-Z0-9]/g, "");
  const last4 = alnum.slice(-4).toUpperCase().padStart(4, "0");
  const hash = crypto
    .createHash("sha1")
    .update(String(userId))
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
  return `BS${last4}${hash}`;
}

/**
 * Find (or lazily create) the referral row for a user. Serialized on the
 * collection lock so two concurrent callers can't insert duplicate rows.
 * NOTE: uses readJson/writeJson directly (not store.insert) to avoid nesting
 * the same-key lock, which would deadlock.
 */
async function ensureRow(userId) {
  return store.withLock(COLLECTION, async () => {
    const rows = await store.readJson(COLLECTION, []);
    let row = rows.find((r) => r.userId === userId);
    if (row) return row;
    row = {
      id: await store.nextId("ref"),
      userId,
      code: makeCode(userId),
      credits: 0,
      invitedUserIds: [],
      createdAt: new Date().toISOString(),
    };
    rows.push(row);
    await store.writeJson(COLLECTION, rows);
    return row;
  });
}

// GET /my-code — lazily generate a stable code; return a compact summary.
router.get("/my-code", authGuard, async (req, res, next) => {
  try {
    const row = await ensureRow(req.user.id);
    return res.json({
      success: true,
      data: {
        code: row.code,
        credits: row.credits || 0,
        invitedCount: (row.invitedUserIds || []).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /redeem — attribute the redeeming user to the code's owner (+1 credit).
router.post("/redeem", authGuard, async (req, res, next) => {
  try {
    const raw = req.body && req.body.code;
    const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!code) {
      return res
        .status(400)
        .json({ success: false, error: "code is required" });
    }

    const result = await store.withLock(COLLECTION, async () => {
      const rows = await store.readJson(COLLECTION, []);
      const owner = rows.find((r) => String(r.code).toUpperCase() === code);
      if (!owner) return { error: 404, message: "Referral code not found" };
      if (owner.userId === req.user.id) {
        return { error: 400, message: "You cannot redeem your own referral code" };
      }
      owner.invitedUserIds = owner.invitedUserIds || [];
      if (!owner.invitedUserIds.includes(req.user.id)) {
        owner.invitedUserIds.push(req.user.id);
        owner.credits = (owner.credits || 0) + 1;
        await store.writeJson(COLLECTION, rows);
      }
      return { owner };
    });

    if (result.error) {
      return res
        .status(result.error)
        .json({ success: false, error: result.message });
    }

    const owner = result.owner;
    return res.json({
      success: true,
      data: {
        ok: true,
        referrer: {
          userId: owner.userId,
          code: owner.code,
          credits: owner.credits || 0,
          invitedCount: (owner.invitedUserIds || []).length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET / — my referral row (null if I haven't generated a code yet).
router.get("/", authGuard, async (req, res, next) => {
  try {
    const row = await store.findOne(COLLECTION, (r) => r.userId === req.user.id);
    return res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
