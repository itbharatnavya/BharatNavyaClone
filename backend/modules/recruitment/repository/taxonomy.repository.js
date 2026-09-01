/**
 * taxonomy.repository.js — repositories for the three flat recruitment master-data
 * collections (Phase 4d): job-functions, job-roles, skills. Small admin-editable
 * lists; the routers keep their existing filter/sort/dedupe logic in JS and just
 * swap the predicate-store calls for these.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = {
  jobFunctionsRepo: repoForCollection("job-functions.json"),
  jobRolesRepo: repoForCollection("job-roles.json"),
  skillsRepo: repoForCollection("skills.json"),
};
