/**
 * routes/oauth.routes.js — social login endpoints, one per provider.
 *
 * Only /google is implemented — no developer credentials available yet for the
 * others (Apple requires a paid $99/yr Apple Developer account before any key
 * can even be generated; Facebook deferred). Each handler here does ONLY the
 * provider-specific part (verify that provider's token, extract a normalized
 * profile); the shared find-or-create/session logic lives once in
 * ./oauthShared.js's finishOauthLogin(). Adding Facebook or Apple later is:
 *   1. that provider's migration (nullable `<provider>_id` column, same shape
 *      as 0016_add_google_oauth.sql) + one line in identity/index.js's
 *      OAUTH_PROVIDERS.
 *   2. a `router.post("/facebook", validate(schemas.facebookOauth), async (req,
 *      res, next) => { verify with their SDK; await finishOauthLogin(res, {
 *      provider: "facebook", providerId, email, emailVerified, name,
 *      avatarUrl }); })` block below — no other file changes.
 */

const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");

const config = require("../../../lib/config");
const { validate, schemas } = require("../../../lib/validate");
const { finishOauthLogin } = require("./oauthShared");

// Built once at boot from GOOGLE_CLIENT_ID. null when unset — every request
// then gets a clean 503 instead of a confusing runtime failure deep in
// google-auth-library.
const googleClient = config.GOOGLE_CLIENT_ID ? new OAuth2Client(config.GOOGLE_CLIENT_ID) : null;

// POST /api/auth/oauth/google — body { idToken }: the credential JWT Google
// Identity Services hands the frontend. Verified here against Google's public
// keys + our client id — never trusted as-is (the whole point of the check).
router.post("/google", validate(schemas.googleOauth), async (req, res, next) => {
  try {
    if (!googleClient) {
      return res.status(503).json({
        success: false,
        error: "Google login is not configured on this server",
        code: "oauth_disabled",
      });
    }

    const { idToken } = req.body;
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ success: false, error: "Invalid Google token" });
    }
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ success: false, error: "Invalid Google token" });
    }

    await finishOauthLogin(res, {
      provider: "google",
      providerId: payload.sub,
      email: payload.email,
      emailVerified: !!payload.email_verified,
      name: payload.name,
      avatarUrl: payload.picture,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
