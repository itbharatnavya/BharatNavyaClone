/**
 * chat — public port for the dashboard chat domain (BACKEND-AUDIT.md Phase 8.8).
 *
 * Dormant feature (no buyer-facing entry point — CLAUDE.md §2), kept working.
 * Owns: `conversations` (the thread index), the append-only per-thread message
 * logs, and the per-thread read-state. The message log + read-state use the
 * `lib/db/chat.js` mapper wired here against `_shared/pool` — the same code the
 * legacy `store` dispatched to.
 */

const { pool } = require("../_shared/pool");
const { nextId } = require("../_shared/ids");
const { createChatSupport, isMessagesPath, isReadStatePath } = require("../../lib/db/chat");

const chatSupport = createChatSupport(pool);

// Per-key in-process mutex — mirrors the one lib/store/lib/pg-store provided for
// the get-or-create thread + advance-read-state read-modify-writes (single
// process today).
const _locks = new Map();
function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  _locks.set(key, next.then(() => {}, () => {}));
  return next;
}

module.exports = {
  conversationsRepo: require("./repository/conversation.repository"),
  chatSupport, // readMessages / appendMessage / writeMessages / readReadState / writeReadState
  isMessagesPath,
  isReadStatePath,
  withLock,
  nextId,
};
