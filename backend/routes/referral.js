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

const { repoForCollection } = require("../modules/_shared");
const { authGuard } = require("../middleware/authGuard");

const referralsRepo = repoForCollection("referrals.json");

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
 * Find (or lazily create) the referral row for a user. The old in-process
 * `store.withLock` serialized concurrent callers; here the `referrals.code`
 * UNIQUE constraint is the real guard — `makeCode(userId)` is deterministic, so
 * a racing second insert hits that constraint; we swallow it and re-read.
 */
async function ensureRow(userId) {
  const existing = await referralsRepo.findOne({ where: { userId } });
  if (existing) return existing;
  try {
    return await referralsRepo.insert(
      {
        userId,
        code: makeCode(userId),
        credits: 0,
        invitedUserIds: [],
        createdAt: new Date().toISOString(),
      },
      "ref"
    );
  } catch (err) {
    const row = await referralsRepo.findOne({ where: { userId } });
    if (row) return row; // lost the insert race — the winner's row is fine
    throw err;
  }
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

    const found = await referralsRepo.findOne({ where: { code } });
    if (!found) {
      return res.status(404).json({ success: false, error: "Referral code not found" });
    }
    if (found.userId === req.user.id) {
      return res
        .status(400)
        .json({ success: false, error: "You cannot redeem your own referral code" });
    }

    let owner = found;
    const invited = found.invitedUserIds || [];
    if (!invited.includes(req.user.id)) {
      // Read-modify-write, as before (the old in-process lock never spanned
      // processes anyway); the referral feature is off by default.
      owner = await referralsRepo.updateById(found.id, {
        invitedUserIds: [...invited, req.user.id],
        credits: (found.credits || 0) + 1,
      });
    }
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
    const row = await referralsRepo.findOne({ where: { userId: req.user.id } });
    return res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
