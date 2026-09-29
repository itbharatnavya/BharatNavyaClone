/**
 * identity/mount.js — identity's route mounts as data (BACKEND-AUDIT.md Phase 8).
 *
 * Same explicit-phase scheme as modules/recruitment/mount.js: app.js calls
 * `mountIdentity(app, phase)` in a fixed order so the "/api/admin/* sub-APIs
 * before the blanket /api/admin" rule and "the broad /api catch-all last" rule
 * are guaranteed regardless of file order.
 *
 *   phase "early"  specific-prefix routers mounted before recruitment.
 *   phase "late"   specific-prefix routers mounted after /api/admin.
 *   phase "users"  the broad app.use("/api", …) — MUST be last of everything.
 *
 * Route files still live in routes/ for now — their physical move into
 * modules/identity/routes/ lands as its own sub-phase (BACKEND-AUDIT.md
 * "file moves as they graduate").
 */

const MOUNTS = [
  { path: "/api/auth", router: require("./routes/auth.routes"), phase: "early" },
  { path: "/api/auth/oauth", router: require("./routes/oauth.routes"), phase: "early" },
  { path: "/api/referral", router: require("./routes/referral.routes"), phase: "late" },
  // The broad catch-all — /api/sellers/:slug, /api/become-seller, /api/me/*, etc.
  { path: "/api", router: require("./routes/users.routes"), phase: "users" },
];

function mountIdentity(app, phase) {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountIdentity };
