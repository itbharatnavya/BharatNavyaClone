/**
 * migrate-collection.js — copy one backend/DB/<file> into Postgres.
 *
 * Always targets Postgres directly (not the store.js indirection) so this script
 * can never silently no-op if PG_URL isn't set. Idempotent: safe to re-run — arrays
 * and jsonl logs are cleared before being re-inserted, and _counters.json only ever
 * raises counters (GREATEST), never lowers them.
 *
 * Usage: node scripts/migrate-collection.js <filename>
 *   node scripts/migrate-collection.js users.json
 *   node scripts/migrate-collection.js leads-ledger.jsonl
 *   node scripts/migrate-collection.js _counters.json
 */

const fs = require("fs/promises");
const path = require("path");
const config = require("../lib/config");

if (!config.PG_URL) {
  console.error(
    "PG_URL (or DATABASE_URL) is not set in backend/.env — refusing to run, " +
    "since without it there is nothing to migrate into."
  );
  process.exitCode = 1;
  process.exit();
}

const pgStore = require("../lib/pg-store");

async function migrateCounters(name) {
  const filePath = path.join(__dirname, "..", "DB", name);
  const raw = await fs.readFile(filePath, "utf-8");
  const counters = JSON.parse(raw);
  const entries = Object.entries(counters);
  for (const [prefix, value] of entries) {
    await pgStore.seedCounter(prefix, Number(value));
  }
  console.log(`Seeded ${entries.length} counters from ${name} (existing values only raised, never lowered)`);
}

async function migrateCollection(name) {
  if (name === "_counters.json") {
    return migrateCounters(name);
  }

  const filePath = path.join(__dirname, "..", "DB", name);
  const raw = await fs.readFile(filePath, "utf-8");

  if (name.endsWith(".jsonl")) {
    const items = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    await pgStore.writeJsonl(name, items);
    const check = await pgStore.readJsonl(name);
    if (check.length !== items.length) {
      throw new Error(`Verification failed for ${name}: source has ${items.length} lines, Postgres has ${check.length}`);
    }
    console.log(`Migrated ${items.length} entries from ${name} into Postgres (verified)`);
    return;
  }

  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    await pgStore.writeJson(name, data);
    console.log(`Migrated JSON document ${name} into Postgres`);
    return;
  }

  await pgStore.writeJson(name, data);
  const check = await pgStore.all(name);
  if (check.length !== data.length) {
    throw new Error(`Verification failed for ${name}: source has ${data.length} rows, Postgres has ${check.length}`);
  }
  console.log(`Migrated ${data.length} rows from ${name} into Postgres (verified)`);
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: node scripts/migrate-collection.js <filename>");
    process.exitCode = 1;
    return;
  }

  try {
    await migrateCollection(name);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  }
}

module.exports = { migrateCollection };

if (require.main === module) {
  main();
}
