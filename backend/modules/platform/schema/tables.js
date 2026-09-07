/**
 * platform/schema/tables.js — the Postgres tables modules/platform owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * Boundary contract enforced by test/architecture.test.js: only platform code may
 * name these in raw SQL. `settings` is the site-config singleton; `notifications`
 * is written through lib/notify.js; `verification_requests` is the trust queue.
 */

module.exports = [
  "settings",
  "notifications",
  "verification_requests",
];
