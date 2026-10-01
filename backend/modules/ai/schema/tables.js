/**
 * ai/schema/tables.js — modules/ai owns NO Postgres tables
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * modules/ai is a pure orchestrator: modules/ai/routes/*.routes.js run
 * deterministic search + the `claude` CLI over the directory / identity public
 * ports and repoForCollection("categories.json"). It never owns storage. The empty
 * manifest makes that explicit and keeps test/architecture.test.js's ownership map
 * complete.
 */

module.exports = [];
