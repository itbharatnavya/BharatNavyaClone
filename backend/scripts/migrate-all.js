/**
 * migrate-all.js — migrate every file under backend/DB/ into Postgres.
 *
 * Walks DB/ recursively (covers conversations/, messages/, read-state/ as well as
 * the top-level collections), migrates every file, then seeds counters LAST so the
 * counters table reflects the final state. Idempotent — safe to re-run.
 *
 * The relational schema has real FK constraints now, so cross-collection insert
 * order matters (e.g. listings.seller_id/category_id must reference rows that
 * already exist) — EARLY_ORDER below sequences the known dependencies; everything
 * else is independent of the others and can follow in any order.
 *
 * Usage: node scripts/migrate-all.js
 */

const EARLY_ORDER = [
  "users.json", // referenced by nearly everything
  "categories.json", // self-referencing (parentId) but FK is DEFERRABLE — fine standalone
  "ad-slots.json", // referenced by ad-bookings.json (alphabetically AFTER it otherwise)
  "listings.json", // needs users, categories
  "inquiries.json", // needs users, categories, listings
  "conversations/index.json", // needs users, listings
  "jobs.json", // needs users (employerId) — RECRUITMENT.md
  // applications.json needs users AND jobs; "applications.json" sorts alphabetically
  // BEFORE "jobs.json", so without this explicit ordering it would land in the
  // unordered "rest" bucket and could migrate before jobs.json exists, failing on the
  // job_id foreign key.
  "applications.json", // needs users, jobs — RECRUITMENT.md
];

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

const { migrateCollection } = require("./migrate-collection");

const DB_DIR = path.join(__dirname, "..", "DB");

async function walk(dir, base = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files = files.concat(await walk(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".json") || entry.name.endsWith(".jsonl")) {
      files.push(rel);
    }
  }
  return files;
}

async function main() {
  const all = await walk(DB_DIR);
  const countersFile = all.find((f) => f === "_counters.json");
  const rest = all.filter((f) => f !== "_counters.json" && !EARLY_ORDER.includes(f));
  // Known dependencies first (in order), then everything else (mutually independent), counters last.
  const files = [...EARLY_ORDER.filter((f) => all.includes(f)), ...rest];

  const failed = [];
  for (const file of files) {
    try {
      await migrateCollection(file);
    } catch (err) {
      console.error(`FAILED: ${file}`, err);
      failed.push(file);
    }
  }

  if (countersFile) {
    try {
      await migrateCollection(countersFile);
    } catch (err) {
      console.error(`FAILED: ${countersFile}`, err);
      failed.push(countersFile);
    }
  }

  console.log(`\nDone. ${files.length + (countersFile ? 1 : 0) - failed.length}/${all.length} files migrated.`);
  if (failed.length) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

main();
