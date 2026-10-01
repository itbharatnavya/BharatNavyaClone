/**
 * application.service.js — status vocabulary + display projections for candidate
 * applications, extracted verbatim from routes/applications.js in Phase 4b (no logic
 * change). The `canView*` predicate lives in policy.js.
 *
 * Still reads/writes via the predicate store through the router — the store→repository
 * flip is Phase 4d.
 */

// Employer-settable statuses via POST /:id/status — "withdrawn" is deliberately NOT
// in this set (candidate-only transition via POST /:id/withdraw).
const VALID_STATUSES = ["applied", "viewed", "shortlisted", "interview", "rejected", "hired"];
const VALID_STATUS_SET = new Set(VALID_STATUSES);
// Every status an application can hold — used only to validate the GET / ?status=
// filter (an employer can filter on withdrawn applications too).
const ALL_STATUSES_SET = new Set([...VALID_STATUSES, "withdrawn"]);

function candidateMiniOf(user) {
  if (!user) return null;
  const cp = user.candidateProfile || {};
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    headline: cp.headline || null,
    experienceYears: cp.experienceYears ?? null,
    currentRole: cp.currentRole || null,
    currentCompany: cp.currentCompany || null,
    skills: cp.skills || [],
    resumeUrl: cp.resumeUrl || null,
    // The candidate initiated this relationship by applying, so — unlike the public
    // candidate-directory gating on GET /api/candidates/:id — contact fields are
    // included here unconditionally, the same way a Directory lead carries the
    // buyer's contact info once delivered.
    contactPhone: cp.contactPhone || null,
    contactEmail: cp.contactEmail || user.email || null,
  };
}

function jobMiniOf(job) {
  if (!job) return null;
  // questions included so the candidate's My Applications view can show each answer
  // next to its actual question text — same array already shown during apply.
  return { id: job.id, title: job.title, jobFunction: job.jobFunction, status: job.status, questions: job.questions || [] };
}

module.exports = {
  VALID_STATUSES,
  VALID_STATUS_SET,
  ALL_STATUSES_SET,
  candidateMiniOf,
  jobMiniOf,
};
