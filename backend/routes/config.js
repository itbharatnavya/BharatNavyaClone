/**
 * config.js — PUBLIC read of the admin-editable site config (settings.json).
 * The frontend loads this at runtime so branding, hero copy, featured categories,
 * and feature on/off flags are all driven by admin config (no code changes).
 * Admin writes it via PUT /api/admin/settings.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");

router.get("/", async (req, res, next) => {
  try {
    const s = await store.readJson("settings.json", {});
    // Public-safe subset (everything in settings.json is non-sensitive, but we shape it explicitly).
    res.json({
      success: true,
      data: {
        branding: s.branding || {},
        homepage: s.homepage || {},
        featureFlags: s.featureFlags || {},
        contact: s.contact || {},
        footer: s.footer || {},
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
