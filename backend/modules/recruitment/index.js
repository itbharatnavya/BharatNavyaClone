/**
 * recruitment — public port for the Recruitment domain (BACKEND-AUDIT.md Phase 4).
 *
 * The ONLY file other code (routes, other modules) may import from. Internals
 * (service/, repository/, schema/, http/, policy.js) are private.
 *
 * Phase 4a moved the profile-gap helpers here; 4b adds the job + application
 * normalizers (service/*.service.js) and the who-may-do-what predicates
 * (policy.js). `searchJobs` / `employerMiniOf` are still re-exported from
 * lib/jobSearch.js and physically move in 4d (when they flip off the predicate store).
 */

const { searchJobs, employerMiniOf } = require("../../lib/jobSearch"); // moves in 4e
const {
  candidateProfileGaps,
  employerProfileGaps,
} = require("./service/employerProfile.service");
const jobService = require("./service/job.service");
const applicationService = require("./service/application.service");
const policy = require("./policy");
const jobsRepo = require("./repository/job.repository");

module.exports = {
  searchJobs,
  employerMiniOf,
  candidateProfileGaps,
  employerProfileGaps,
  jobsRepo,
  ...jobService,
  ...applicationService,
  ...policy,
};
