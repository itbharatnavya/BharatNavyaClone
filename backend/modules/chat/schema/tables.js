/**
 * chat/schema/tables.js — the Postgres tables modules/chat owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * Boundary contract enforced by test/architecture.test.js: only chat code may name
 * these in raw SQL. The dashboard Socket.IO chat is dormant-but-alive (CLAUDE.md
 * "Contact & chat") — it still owns its tables so a future revival stays inside the
 * module.
 */

module.exports = [
  "conversations",
  "conversation_read_state",
  "messages",
];
