/**
 * Pure-function unit tests for routes/applications.js's helpers.
 * No DB, no server — run with `npm test` (node:test).
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { candidateMiniOf, jobMiniOf, canViewApplication, VALID_STATUSES } =
  require("../routes/applications")._internal;

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

test("jobMiniOf exposes only the display-safe subset of a job", () => {
  const job = { id: "job_1", title: "Backend Engineer", jobFunction: "engineering", status: "active", employerId: "usr_emp1" };
  assert.deepEqual(jobMiniOf(job), { id: "job_1", title: "Backend Engineer", jobFunction: "engineering", status: "active" });
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
