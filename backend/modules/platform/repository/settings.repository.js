/**
 * settings.repository.js — the `settings` singleton (admin-editable site config:
 * ranking scalars + branding/homepage/featureFlags/contact/footer blocks).
 * Owned by modules/platform (BACKEND-AUDIT.md Phase 8).
 *
 * Was reached as `store.readJson/writeJson/withLock("settings.json")`. This wraps
 * the SAME row<->doc mapper (`lib/db/settings.js`) against `_shared/pool`, plus a
 * per-key in-process mutex mirroring the one `lib/store`/`lib/pg-store` provided
 * for the admin PUT's read-modify-write (single-process today; a real advisory
 * lock is a later concern if the API ever runs multi-process for writes).
 */

const { pool } = require("../../_shared/pool");
const { createSettingsStore } = require("../../../lib/db/settings");

const _store = createSettingsStore(pool);
const _locks = new Map();

function _withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  _locks.set(key, next.then(() => {}, () => {}));
  return next;
}

module.exports = {
  /** The full config doc, or `fallback` when the row isn't seeded yet. */
  read: (fallback = {}) => _store.read(fallback),
  /** Replace the singleton row (UPSERT). */
  write: (data) => _store.write(data),
  /** Serialize a read-modify-write against the singleton. */
  withLock: (fn) => _withLock("settings", fn),
};
