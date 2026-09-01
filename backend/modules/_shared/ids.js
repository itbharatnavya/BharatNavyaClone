/**
 * ids.js — monotonic, prefixed id generation (job_000123, usr_000456, …), backed by
 * the `counters` table. Moved here from lib/pg-store.js in Phase 4d so a module
 * repository can mint ids without importing the legacy store (the architecture test
 * forbids that). lib/pg-store.js now re-exports these.
 */

const { pool } = require("./pool");

async function ensureCountersTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0)`
  );
}

async function nextId(prefix) {
  await ensureCountersTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(`SELECT value FROM counters WHERE key = $1 FOR UPDATE`, [prefix]);
    const current = res.rowCount ? Number(res.rows[0].value) : 0;
    const next = current + 1;
    if (res.rowCount) {
      await client.query(`UPDATE counters SET value = $1 WHERE key = $2`, [next, prefix]);
    } else {
      await client.query(`INSERT INTO counters(key, value) VALUES($1, $2)`, [prefix, next]);
    }
    await client.query("COMMIT");
    return `${prefix}_${String(next).padStart(6, "0")}`;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Seed a counter's floor (raises only — GREATEST) so post-migration ids never
 *  collide with ids already present in the migrated data. */
async function seedCounter(prefix, value) {
  await ensureCountersTable();
  await pool.query(
    `INSERT INTO counters(key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = GREATEST(counters.value, EXCLUDED.value)`,
    [prefix, value]
  );
}

module.exports = { nextId, seedCounter };
