/**
 * platform/mount.js — cross-cutting site/admin route mounts as data
 * (BACKEND-AUDIT.md Phase 8): public site config, the admin console, content
 * moderation + verification queue, notifications, the local upload primitive.
 * `admin.js` orchestrates across the other domains through their PUBLIC PORTS
 * only, never their repositories. Explicit-phase scheme, see
 * modules/recruitment/mount.js.
 *
 *   phase "early"      /api/config (public site config) — before recruitment.
 *   phase "admin-sub"  self-guarded /api/admin/* routers — before /api/admin.
 *   phase "admin"      the blanket /api/admin catch-all (authGuard+requireRole
 *                      inside). MUST come after every "admin-sub" of every module.
 *   phase "late"       /api/notifications, /api/uploads — after /api/admin.
 */

const MOUNTS = [
  { path: "/api/config", router: require("./routes/config.routes"), phase: "early" },
  { path: "/api/admin/moderation", router: require("./routes/moderation.routes"), phase: "admin-sub" },
  { path: "/api/admin/listings", router: require("./routes/adminListings.routes"), phase: "admin-sub" },
  { path: "/api/admin/inquiries", router: require("./routes/adminInquiries.routes"), phase: "admin-sub" },
  { path: "/api/admin", router: require("./routes/admin.routes"), phase: "admin" },
  { path: "/api/notifications", router: require("./routes/notifications.routes"), phase: "late" },
  { path: "/api/uploads", router: require("./routes/uploads.routes"), phase: "late" },
];

function mountPlatform(app, phase) {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountPlatform };
