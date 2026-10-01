/**
 * routes/fcm.js — register/unregister this browser's FCM push token.
 *
 * A device token is bearer-credential-adjacent (whoever has it can be pushed
 * to) — it is only ever written here, never read back in any API response.
 *
 *   POST   /api/fcm/token { token, platform? } → upsert onto req.user.id
 *   DELETE /api/fcm/token { token }             → drop it (logout)
 */

const express = require("express");
const router = express.Router();

const { authGuard } = require("../../../middleware/authGuard");
const identity = require("../index");

router.post("/token", authGuard, async (req, res, next) => {
  try {
    const token = req.body && req.body.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, error: "token is required" });
    }
    const platform =
      req.body && typeof req.body.platform === "string" ? req.body.platform : "web";
    await identity.registerFcmToken(req.user.id, token, platform);
    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.delete("/token", authGuard, async (req, res, next) => {
  try {
    const token = req.body && req.body.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, error: "token is required" });
    }
    await identity.unregisterFcmToken(token);
    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
