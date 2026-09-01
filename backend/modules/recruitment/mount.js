/**
 * mount.js — recruitment's route mounts as data (BACKEND-AUDIT.md Phase 4f).
 *
 * app.js's historical rule — "every /api/admin/* sub-API must be app.use()'d BEFORE
 * the blanket app.use('/api/admin', …)" (CLAUDE.md §5 "nested-admin-route pattern")
 * — was positional and file-order fragile. Modularization makes that worse: a module
 * can't guarantee its line lands above another file's. So the ordering is explicit
 * and named here — each entry declares its `phase`, and app.js mounts every
 * "admin-sub" entry, then /api/admin, then every "public" entry.
 *
 *   phase "admin-sub"  an /api/admin/* router guarded by its OWN authGuard +
 *                      requireRole. MUST be mounted before the /api/admin catch-all,
 *                      or the catch-all shadows it.
 *   phase "public"     a normal /api/* router.
 *
 * Requires the route files straight from routes/ — their physical move into
 * modules/recruitment/http/ is deferred (BACKEND-AUDIT.md "file moves last").
 * Imported by app.js directly (not via index.js) to avoid a load cycle:
 * routes/jobs.js already requires modules/recruitment.
 */

const MOUNTS = [
  { path: "/api/admin/job-functions", router: require("../../routes/adminJobFunctions"), phase: "admin-sub" },
  { path: "/api/admin/job-roles", router: require("../../routes/adminJobRoles"), phase: "admin-sub" },
  { path: "/api/admin/skills", router: require("../../routes/adminSkills"), phase: "admin-sub" },
  { path: "/api/admin/employers", router: require("../../routes/adminEmployers"), phase: "admin-sub" },
  { path: "/api/admin/jobs", router: require("../../routes/adminJobs"), phase: "admin-sub" },
  { path: "/api/job-functions", router: require("../../routes/jobFunctions"), phase: "public" },
  { path: "/api/job-roles", router: require("../../routes/jobRoles"), phase: "public" },
  { path: "/api/skills", router: require("../../routes/skills"), phase: "public" },
  { path: "/api/jobs", router: require("../../routes/jobs"), phase: "public" },
  { path: "/api/applications", router: require("../../routes/applications"), phase: "public" },
];

/** Mount every recruitment route of the given phase onto `app`, in declared order. */
function mountRecruitment(app, phase) {
  for (const m of MOUNTS) {
    if (m.phase === phase) app.use(m.path, m.router);
  }
}

module.exports = { MOUNTS, mountRecruitment };
