/**
 * monetization/mount.js — revenue-lever route mounts as data (BACKEND-AUDIT.md
 * Phase 8): features catalog, entitlements matrix, ad slots/bookings, seller
 * self-serve ads, payment/report records. Explicit-phase scheme, see
 * modules/recruitment/mount.js.
 *
 *   phase "early"      specific-prefix routers before recruitment.
 *   phase "admin-sub"  /api/admin/* routers — before the blanket /api/admin.
 *   phase "public"     normal /api/* routers mounted in the early block.
 *   phase "late"       specific-prefix routers after /api/admin.
 */

const MOUNTS = [
  { path: "/api/features", router: require("../../routes/features"), phase: "early" },
  { path: "/api/admin/entitlements", router: require("../../routes/entitlements"), phase: "admin-sub" },
  { path: "/api/entitlements", router: require("../../routes/entitlements"), phase: "public" },
  { path: "/api/ads", router: require("../../routes/ads"), phase: "late" },
  { path: "/api/reports", router: require("../../routes/reports"), phase: "late" },
  { path: "/api/my-ads", router: require("../../routes/myAds"), phase: "late" },
];

function mountMonetization(app, phase) {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountMonetization };
