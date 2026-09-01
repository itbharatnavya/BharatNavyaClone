/**
 * job.repository.js — the jobs collection's repository (BACKEND-AUDIT.md Phase 4d).
 * A criteria-grammar repo over the `jobs` table, replacing the predicate-store calls
 * (`store.*("jobs.json")`) in routes/jobs.js. Backed by the shared pool + the one
 * flat-mapping source. `test/differential.test.js` proves it row-for-row equal to the
 * legacy store for the queries the routes use, ordered and unordered.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("jobs.json");
