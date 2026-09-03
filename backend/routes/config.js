/**
 * config.js — PUBLIC read of the admin-editable site config (settings.json).
 * The frontend loads this at runtime so branding, hero copy, featured categories,
 * and feature on/off flags are all driven by admin config (no code changes).
 * Admin writes it via PUT /api/admin/settings.
 */

const express = require("express");
const router = express.Router();
const settingsRepo = require("../modules/platform/repository/settings.repository");
const config = require("../lib/config");

router.get("/", async (req, res, next) => {
  try {
    const s = await settingsRepo.read({});
    const featureFlags = { ...(s.featureFlags || {}) };
    // RECRUITMENT_LIVE env var, when explicitly set, overrides whatever's stored in
    // settings.json — the production go-live switch (flip the env var + restart, no
    // admin-panel step). Unset (null) defers to the DB-stored admin flag as usual.
    if (config.RECRUITMENT_LIVE !== null) {
      featureFlags.recruitmentLive = config.RECRUITMENT_LIVE;
    }
    // Same override mechanism for Consultations (not a promoted product this phase).
    if (config.CONSULTATIONS_LIVE !== null) {
      featureFlags.consultationsLive = config.CONSULTATIONS_LIVE;
    }
    // Public-safe subset (everything in settings.json is non-sensitive, but we shape it explicitly).
    res.json({
      success: true,
      data: {
        branding: s.branding || {},
        homepage: s.homepage || {},
        featureFlags,
        contact: s.contact || {},
        footer: s.footer || {},
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
