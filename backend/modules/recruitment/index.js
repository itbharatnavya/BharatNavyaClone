/**
 * recruitment — public port for the Recruitment domain (BACKEND-AUDIT.md Phase 4).
 *
 * The ONLY file other code (routes, other modules) may import from. Internals
 * (service/, repository/, schema/, http/, policy.js) are private.
 *
 * Phase 4a moved the profile-gap helpers here; 4b adds the job + application
 * normalizers (service/*.service.js) and the who-may-do-what predicates
 * (policy.js). Phase 4e moved `searchJobs` off lib/jobSearch.js (deleted) into
 * service/jobSearch.service.js + repository/jobSearch.repository.js — one indexed
 * SQL query instead of 11.
 */

const { searchJobs, employerMiniOf } = require("./service/jobSearch.service");
const {
  candidateProfileGaps,
  employerProfileGaps,
} = require("./service/employerProfile.service");
const jobService = require("./service/job.service");
const applicationService = require("./service/application.service");
const policy = require("./policy");
const jobsRepo = require("./repository/job.repository");
const appsRepo = require("./repository/application.repository");
const { jobFunctionsRepo, jobRolesRepo, skillsRepo } = require("./repository/taxonomy.repository");

module.exports = {
  searchJobs,
  employerMiniOf,
  candidateProfileGaps,
  employerProfileGaps,
  jobsRepo,
  appsRepo,
  jobFunctionsRepo,
  jobRolesRepo,
  skillsRepo,
  ...jobService,
  ...applicationService,
  ...policy,
};
