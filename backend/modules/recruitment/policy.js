/**
 * policy.js — pure who-may-do-what predicates for the Recruitment domain
 * (BACKEND-AUDIT.md Phase 4b). No I/O, no req/res — the callers (routers now,
 * services later) pass in the already-loaded documents.
 */

function isAdmin(user) {
  return !!user && (user.roles || []).includes("admin");
}

/** Owner (the job's employer) or an admin may edit/delete a job. */
function isJobOwnerOrAdmin(user, job) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return !!job && job.employerId === user.id;
}

/** A candidate may see their own application; the job's employer and an admin may
 *  see any application on that job. */
function canViewApplication(user, application, job) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (application && application.candidateId === user.id) return true;
  return !!job && !!application && job.employerId === user.id;
}

module.exports = { isAdmin, isJobOwnerOrAdmin, canViewApplication };
