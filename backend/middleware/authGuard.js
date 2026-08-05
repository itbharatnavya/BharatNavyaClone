/**
 * authGuard.js — request authentication + authorization middleware.
 *
 * Replaces the legacy "no auth at all" backend. Reads a Bearer token (or `token`
 * cookie), verifies it, loads the fresh user record (so role/permission changes take
 * effect immediately), and attaches it as req.user.
 */

const auth = require("../lib/auth");
const store = require("../lib/store");

function extractToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

async function loadUser(payload) {
  if (!payload || !payload.sub) return null;
  return store.getById("users.json", payload.sub);
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
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Soft gate: attaches req.user if a valid token is present, else null. Never blocks. */
async function optionalAuth(req, res, next) {
  try {
    const payload = auth.verifyToken(extractToken(req));
    req.user = (await loadUser(payload)) || null;
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
