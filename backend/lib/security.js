/**
 * security.js — cross-cutting HTTP hardening (BACKEND-AUDIT.md Phase 1, §1c/1d/1g).
 *
 * Exposes helmet + three rate limiters, mounted in app.js. Every limiter returns the
 * standard { success:false, error } envelope with a `code:"rate_limited"` and HTTP
 * 429 — a status this API did not previously emit, so the frontend gained a 429 branch
 * in the same phase (see the Frontend Fix Register).
 *
 * The app runs behind Next.js's single-origin /api rewrite, so `req.ip` is only
 * meaningful once `trust proxy` is set (done in app.js). The auth limiter additionally
 * keys on the submitted mobile/email so one abuser can't lock out an entire NAT.
 *
 * express-rate-limit's IPv6 key validation is disabled (`validate:false`): the key
 * generators here are deliberate and the deployment is a trusted single origin.
 */

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");

const MIN = 60 * 1000;

function jsonTooMany(req, res) {
  res.status(429).json({
    success: false,
    error: "Too many requests — please wait a minute and try again.",
    code: "rate_limited",
  });
}

function makeLimiter({ windowMs, max, keyGenerator, skip }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    skip: (req) => !config.RATE_LIMIT_ENABLED || Boolean(skip && skip(req)),
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: jsonTooMany,
  });
}

// Coarse abuse guard across the whole API surface.
const globalLimiter = makeLimiter({
  windowMs: 15 * MIN,
  max: config.RL_GLOBAL_MAX,
});

// Credential + OTP brute-force guard. Keyed on IP + the identifier being tried so
// a shared IP doesn't lock everyone out and a single mobile can't be hammered.
const authLimiter = makeLimiter({
  windowMs: 15 * MIN,
  max: config.RL_AUTH_MAX,
  keyGenerator: (req) => {
    const b = req.body || {};
    return `${req.ip}|${b.mobile || b.email || ""}`;
  },
  // Only credential attempts (POST login / register / OTP) count. GET /api/auth/me runs on
  // every full page load of a signed-in user; throttling it signed people out after ~10
  // reloads, and everyone behind one office IP shared that budget.
  skip: (req) => req.method === "GET",
});

// AI endpoints each spawn the `claude` CLI (2-permit semaphore) — throttle per
// authenticated user, falling back to IP for guests.
const aiLimiter = makeLimiter({
  windowMs: 60 * MIN,
  max: config.RL_AI_MAX,
  keyGenerator: (req) => (req.user && req.user.id) || req.ip,
});

// Helmet defaults are aimed at HTML apps; this process only ever returns JSON and
// uploaded assets are served by Next, not here. Keep the useful headers, relax CORP
// so a proxied asset response is never blocked.
const helmetMw = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

module.exports = { helmetMw, globalLimiter, authLimiter, aiLimiter };
