/**
 * setup-test-db.js — (re)build the disposable database that `npm test` runs against
 * (BACKEND-AUDIT.md Phase 0 — "Dedicated PG_URL_TEST database with a pinned seed").
 *
 * Why a separate DB: the golden-response harness (test/golden.test.js) and the
 * pagination edge-case tests assert on EXACT response bodies / id sets. Run against
 * the working dev DB those drift every time you touch the app. A frozen copy makes
 * them deterministic; refresh it on purpose by re-running this script.
 *
 * Modes:
 *   node scripts/setup-test-db.js              # default: clone PG_URL db -> PG_URL_TEST db
 *   node scripts/setup-test-db.js --template   # (explicit) same as default
 *   node scripts/setup-test-db.js --fresh      # empty DB: schema.sql + all schema-migrations, NO data
 *
 * --template gives the golden/pagination tests real data to assert on. It needs NO
 * open connections to the source db — stop `node index.js` first if it's running
 * against PG_URL, or the clone fails with a clear message.
 *
 * --fresh is enough for tests that seed their own fixtures (architecture.test.js needs
 * no DB at all; the recruitment integration test inserts + cleans up its own rows).
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("../lib/config"); // side effect: parses backend/.env into process.env

const SOURCE_URL = process.env.PG_URL || process.env.DATABASE_URL || null;
const TEST_URL = process.env.PG_URL_TEST || process.env.DATABASE_URL_TEST || null;
const MODE = process.argv.includes("--fresh") ? "fresh" : "template";

if (!TEST_URL) {
  console.error(
    "PG_URL_TEST is not set in backend/.env — nothing to build.\n" +
      "Add e.g.  PG_URL_TEST=postgresql://USER:PASS@localhost:5432/bharatsource_test"
  );
  process.exit(1);
}

/** postgresql://u:p@host:5432/NAME  ->  { name, admin } where admin points at the
 *  server's default `postgres` maintenance DB (can't drop/create while connected to
 *  the target itself). */
function parse(url) {
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.replace(/^\//, ""));
  const admin = new URL(url);
  admin.pathname = "/postgres";
  return { name, admin: admin.toString() };
}

async function withAdmin(fn) {
  const { admin } = parse(TEST_URL);
  const client = new Client({ connectionString: admin });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function applySqlFiles(client) {
  const schemaPath = path.join(__dirname, "..", "lib", "db", "schema.sql");
  await client.query(fs.readFileSync(schemaPath, "utf-8"));
  console.log("  schema.sql applied");

  const migDir = path.join(__dirname, "..", "lib", "db", "schema-migrations");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(migDir, f), "utf-8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING", [f]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${f} failed: ${err.message}`);
    }
  }
  console.log(`  ${files.length} schema-migrations applied`);
}

async function main() {
  const { name: testName } = parse(TEST_URL);

  if (MODE === "template") {
    if (!SOURCE_URL) {
      console.error("--template needs PG_URL set (the database to clone). Use --fresh for an empty schema-only DB.");
      process.exit(1);
    }
    const { name: srcName } = parse(SOURCE_URL);
    if (srcName === testName) {
      console.error(`Refusing to run: PG_URL and PG_URL_TEST point at the same database (${srcName}).`);
      process.exit(1);
    }
    console.log(`Cloning "${srcName}" -> "${testName}" ...`);
    await withAdmin(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`);
      try {
        await client.query(`CREATE DATABASE "${testName}" TEMPLATE "${srcName}"`);
      } catch (err) {
        if (/being accessed by other users|source database.*in use/i.test(err.message)) {
          console.error(
            `\nCannot clone: "${srcName}" has open connections.\n` +
              "Stop the backend (`node index.js`) and anything else connected to it, then re-run.\n"
          );
          process.exit(1);
        }
        throw err;
      }
    });
  } else {
    console.log(`Building empty "${testName}" (schema + migrations, no data) ...`);
    await withAdmin(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${testName}"`);
    });
    const client = new Client({ connectionString: TEST_URL });
    await client.connect();
    try {
      await applySqlFiles(client);
    } finally {
      await client.end();
    }
  }

  // Sanity: connect to the finished DB and report a couple of counts.
  const check = new Client({ connectionString: TEST_URL });
  await check.connect();
  try {
    const tables = await check.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'"
    );
    let rows = "";
    try {
      const u = await check.query("SELECT count(*)::int AS n FROM users");
      const l = await check.query("SELECT count(*)::int AS n FROM listings");
      const j = await check.query("SELECT count(*)::int AS n FROM jobs");
      rows = ` — users:${u.rows[0].n} listings:${l.rows[0].n} jobs:${j.rows[0].n}`;
    } catch {
      /* --fresh: tables exist but empty, or names differ — counts are best-effort */
    }
    console.log(`Done. "${testName}" ready: ${tables.rows[0].n} public tables${rows}`);
  } finally {
    await check.end();
  }
}

main().catch((err) => {
  console.error("setup-test-db failed:", err.message);
  process.exit(1);
});
