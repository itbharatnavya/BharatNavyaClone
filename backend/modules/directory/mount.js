/**
 * directory/mount.js — the Directory domain's route mounts as data
 * (BACKEND-AUDIT.md Phase 8). Explicit-phase scheme, see
 * modules/recruitment/mount.js.
 *
 *   phase "admin-sub"  /api/admin/* routers, each self-guarded — mounted BEFORE
 *                      the blanket /api/admin catch-all.
 *   phase "public"     normal /api/* routers.
 *
 * Route files still live in routes/ — physical move into
 * modules/directory/routes/ is a later sub-phase.
 */

const MOUNTS = [
  // admin-sub — guarded inside each router; before /api/admin
  { path: "/api/admin/categories", router: require("../../routes/adminCategories"), phase: "admin-sub" },
  { path: "/api/admin/collections", router: require("../../routes/collections"), phase: "admin-sub" },
  { path: "/api/admin/boosts", router: require("../../routes/boosts"), phase: "admin-sub" },

  // public
  { path: "/api/category-suggestions", router: require("../../routes/categorySuggestions"), phase: "public" },
  { path: "/api/categories", router: require("../../routes/categories"), phase: "public" },
  { path: "/api/brands", router: require("../../routes/brands"), phase: "public" },
  { path: "/api/collections", router: require("../../routes/collections"), phase: "public" },
  { path: "/api/listings", router: require("../../routes/listings"), phase: "public" },
  { path: "/api/reviews", router: require("../../routes/reviews"), phase: "public" },
  { path: "/api/inquiries", router: require("../../routes/inquiries"), phase: "public" },
  { path: "/api/boosts", router: require("../../routes/boosts"), phase: "public" },
  { path: "/api/search", router: require("../../routes/searchTrends"), phase: "public" },
  { path: "/api/blogs", router: require("../../routes/blogs"), phase: "public" },
  { path: "/api/stories", router: require("../../routes/stories"), phase: "public" },
  { path: "/api/follow", router: require("../../routes/follow"), phase: "public" },
  { path: "/api/shortlist", router: require("../../routes/shortlist"), phase: "public" },
  { path: "/api/experts", router: require("../../routes/experts"), phase: "public" },
  { path: "/api/consultations", router: require("../../routes/consultations"), phase: "public" },
];

function mountDirectory(app, phase) {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountDirectory };
