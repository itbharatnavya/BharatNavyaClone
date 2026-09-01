/**
 * application.repository.js — the applications collection's repository (Phase 4d).
 * Criteria-grammar repo over the `applications` table, replacing the
 * `store.*("applications.json")` calls in routes/applications.js. Proven row-for-row
 * equal to the legacy store in test/differential.test.js.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("applications.json");
