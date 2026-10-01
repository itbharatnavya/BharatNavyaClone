/**
 * recruitment/schema/tables.js — the Postgres tables modules/recruitment owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * Boundary contract enforced by test/architecture.test.js: only recruitment code
 * may name these in raw SQL. Candidate / employer PROFILE tables belong to
 * modules/identity (they hang off the user record) — recruitment reads those
 * through the identity port and JOINs the `identity_employer_cards` view.
 */

module.exports = [
  "jobs",
  "applications",
  "job_functions",
  "job_roles",
  "skills",
];
