/**
 * conversation.repository.js — the `conversations` collection (the dashboard chat
 * thread index). Owned by modules/chat (BACKEND-AUDIT.md Phase 8.8).
 *
 * Flat repository over `conversations` — was reached as
 * `store.readJson/getById/update/writeJson("conversations/index.json")`.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("conversations/index.json");
