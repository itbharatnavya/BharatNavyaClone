/**
 * authGuard.js — request authentication + authorization middleware.
 *
 * Replaces the legacy "no auth at all" backend. Reads a Bearer token (or `token`
 * cookie), verifies it, loads the fresh user record (so role/permission changes take
 * effect immediately), and attaches it as req.user.
 */

const auth = require("../lib/auth");
const { ACCOUNT_SUSPENDED_MESSAGE } = require("../lib/accountStatus");
const identity = require("../modules/identity");

function extractToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

async function loadUser(payload) {
  if (!payload || !payload.sub) return null;
  // Phase 3 read-port — identity.getAuthUser returns the full hydrated user doc,
  // byte-identical to store.getById("users.json", id). Narrowing is a Phase 6 step.
  return identity.getAuthUser(payload.sub);
}

/** Hard gate: 401 unless a valid token resolves to a real user. */
async function authGuard(req, res, next) {
  try {
    const payload = auth.verifyToken(extractToken(req));
    const user = await loadUser(payload);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }
    // Account-level suspend (ADMIN-CONSOLE.md) — a suspended account keeps its token
    // but cannot make any authenticated request.
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: ACCOUNT_SUSPENDED_MESSAGE,
        code: "account_suspended",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Soft gate: attaches req.user if a valid token is present, else null. Never blocks.
 *  A suspended account degrades to guest (req.user = null) rather than 403 — public
 *  pages stay readable, but nothing treats it as logged in. */
async function optionalAuth(req, res, next) {
  try {
    const payload = auth.verifyToken(extractToken(req));
    const user = await loadUser(payload);
    req.user = user && user.status !== "suspended" ? user : null;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate (use after authGuard): 403 unless req.user has the given role. */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !(req.user.roles || []).includes(role)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authGuard, optionalAuth, requireRole };
