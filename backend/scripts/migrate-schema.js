/**
 * migrate-schema.js — apply pending SCHEMA (DDL) migrations to Postgres.
 *
 * NOT to be confused with migrate-users.js / migrate-sellers-listings.js / migrate-all.js
 * (those move DATA from backend/DB/*.json into Postgres, one-time, per collection).
 * This script evolves the Postgres TABLE STRUCTURE itself as the app's data model
 * changes over time.
 *
 * How it works:
 *   - lib/db/schema.sql is the BASELINE — `npm run setup-pg-schema` applies it once
 *     to bootstrap a brand-new, empty database (every statement is CREATE ... IF NOT
 *     EXISTS, so it's also harmless to re-run).
 *   - Every schema change AFTER that baseline gets its own numbered file in
 *     lib/db/schema-migrations/ (e.g. 0001_add_listing_verification.sql). This script
 *     runs each one exactly once, in filename order, inside a transaction, and
 *     records it in a `schema_migrations` table — so re-running is always safe: only
 *     migrations that haven't been applied to THIS database yet actually execute.
 *
 * Usage:
 *   node scripts/migrate-schema.js            # apply all pending migrations
 *   node scripts/migrate-schema.js --status    # list applied/pending, don't run anything
 *
 * Adding a new schema change: create lib/db/schema-migrations/NNNN_description.sql
 * (next number, zero-padded), and ALSO update the matching CREATE TABLE in
 * lib/db/schema.sql so a brand-new install gets the same end state without needing
 * every historical migration replayed.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const config = require("../lib/config");

const MIGRATIONS_DIR = path.join(__dirname, "..", "lib", "db", "schema-migrations");

if (!config.PG_URL) {
  console.error("PG_URL (or DATABASE_URL) is not set in backend/.env — nothing to migrate.");
  process.exitCode = 1;
  process.exit();
}

async function ensureTrackingTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         BIGSERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // zero-padded numeric prefixes (0001_, 0002_, ...) sort in apply order
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  const pool = new Pool({ connectionString: config.PG_URL });
  try {
    await ensureTrackingTable(pool);
    const { rows } = await pool.query(`SELECT name FROM schema_migrations`);
    const applied = new Set(rows.map((r) => r.name));
    const files = listMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (statusOnly) {
      if (files.length === 0) {
        console.log("No migrations in lib/db/schema-migrations/ yet.");
        return;
      }
      console.log(`${applied.size} applied, ${pending.length} pending:\n`);
      for (const f of files) console.log(`  [${applied.has(f) ? "x" : " "}] ${f}`);
      return;
    }

    if (pending.length === 0) {
      console.log("Database schema is up to date — no pending migrations.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed — rolled back: ${err.message}`);
      } finally {
        client.release();
      }
    }
    console.log(`\nDone — applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
