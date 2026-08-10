/**
 * setup-pg-schema.js — apply lib/db/schema.sql to Postgres. Idempotent (IF NOT EXISTS
 * throughout) — safe to re-run any time the schema file changes.
 *
 * Usage: node scripts/setup-pg-schema.js
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const config = require("../lib/config");

if (!config.PG_URL) {
  console.error("PG_URL (or DATABASE_URL) is not set in backend/.env — nothing to apply the schema to.");
  process.exitCode = 1;
  process.exit();
}

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "lib", "db", "schema.sql"), "utf-8");
  const pool = new Pool({ connectionString: config.PG_URL });
  try {
    await pool.query(sql);
    console.log("Schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Schema setup failed:", err);
  process.exitCode = 1;
});
