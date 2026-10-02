/**
 * backfill-job-workplace.js — give demo jobs a workplace type.
 *
 * The recruitment seed only sets the `remote` flag, so jobs.location_workplace_type
 * stays NULL and the "On-site / Hybrid / Remote" filters match nothing. This sets it
 * for every job that has none: remote jobs -> "remote", the rest split between "hybrid"
 * and "onsite" by a stable hash of the id. Idempotent; only touches NULL rows.
 *
 * Run:  node scripts/backfill-job-workplace.js
 */

const { pool, close } = require("../modules/_shared/pool");

(async () => {
  const result = await pool.query(`
    UPDATE jobs
       SET location_workplace_type = CASE
         WHEN location_remote IS TRUE THEN 'remote'
         WHEN (length(id) + ascii(right(id, 1))) % 3 = 0 THEN 'hybrid'
         ELSE 'onsite'
       END
     WHERE location_workplace_type IS NULL`);
  console.log(`Set a workplace type on ${result.rowCount} jobs.`);
  await close();
})().catch((error) => { console.error(error); process.exit(1); });
