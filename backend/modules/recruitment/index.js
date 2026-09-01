/**
 * recruitment — public port for the Recruitment domain (BACKEND-AUDIT.md Phase 4).
 *
 * The ONLY file other code (routes, other modules) may import from. Internals
 * (service/, repository/, schema/, http/) are private.
 *
 * Phase 4a is a pure move: the profile-gap helpers now live in
 * service/employerProfile.service.js; `searchJobs` / `employerMiniOf` are still
 * re-exported straight from lib/jobSearch.js and physically move in 4d (when they
 * also flip off the predicate store). Consumers already import from here so that
 * move is invisible to them.
 */

const { searchJobs, employerMiniOf } = require("../../lib/jobSearch"); // moves in 4d
const {
  candidateProfileGaps,
  employerProfileGaps,
} = require("./service/employerProfile.service");

module.exports = {
  searchJobs,
  employerMiniOf,
  candidateProfileGaps,
  employerProfileGaps,
};
