/**
 * Pure-function unit tests for the Recruitment application service + policy
 * (modules/recruitment/service/application.service.js + policy.js, extracted from
 * routes/applications.js in Phase 4b). No DB, no server — run with `npm test`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { candidateMiniOf, jobMiniOf, canViewApplication, VALID_STATUSES } =
  require("../modules/recruitment");

test("VALID_STATUSES is the full pipeline in order", () => {
  assert.deepEqual(VALID_STATUSES, ["applied", "viewed", "shortlisted", "interview", "rejected", "hired"]);
});

test("candidateMiniOf returns null for a missing user, never throws", () => {
  assert.equal(candidateMiniOf(null), null);
  assert.equal(candidateMiniOf(undefined), null);
});

test("candidateMiniOf includes contact fields unconditionally (candidate already applied)", () => {
  const user = {
    id: "usr_cand1", name: "Priya Sharma", avatarUrl: null, email: "priya@example.com",
    candidateProfile: {
      headline: "Backend Engineer", experienceYears: 5, skills: ["Node.js"],
      contactPhone: "9876500011", contactEmail: null,
    },
  };
  const mini = candidateMiniOf(user);
  assert.equal(mini.contactPhone, "9876500011");
  // Falls back to the base user's email when candidateProfile.contactEmail is unset.
  assert.equal(mini.contactEmail, "priya@example.com");
  assert.equal(mini.headline, "Backend Engineer");
});

test("jobMiniOf exposes only the display-safe subset of a job, including questions for the candidate's own answer display", () => {
  const job = {
    id: "job_1", title: "Backend Engineer", jobFunction: "engineering", status: "active", employerId: "usr_emp1",
    questions: [{ id: "q_0", text: "Willing to relocate?", required: true }],
  };
  assert.deepEqual(jobMiniOf(job), {
    id: "job_1", title: "Backend Engineer", jobFunction: "engineering", status: "active",
    questions: [{ id: "q_0", text: "Willing to relocate?", required: true }],
  });
});

test("jobMiniOf defaults questions to an empty array when the job has none", () => {
  const job = { id: "job_2", title: "Designer", jobFunction: "design", status: "active", employerId: "usr_emp1" };
  assert.deepEqual(jobMiniOf(job), { id: "job_2", title: "Designer", jobFunction: "design", status: "active", questions: [] });
});

test("canViewApplication: candidate owner, job's employer, and admin can all view; a stranger cannot", () => {
  const application = { candidateId: "usr_cand1", jobId: "job_1" };
  const job = { employerId: "usr_emp1" };
  assert.equal(canViewApplication({ id: "usr_cand1", roles: [] }, application, job), true);
  assert.equal(canViewApplication({ id: "usr_emp1", roles: [] }, application, job), true);
  assert.equal(canViewApplication({ id: "usr_stranger", roles: ["admin"] }, application, job), true);
  assert.equal(canViewApplication({ id: "usr_stranger", roles: [] }, application, job), false);
  assert.equal(canViewApplication(null, application, job), false);
});
