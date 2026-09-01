/**
 * pool.js — THE Postgres connection pool for the whole backend.
 *
 * Moved here from lib/pg-store.js as the modular-monolith kernel's single owner of
 * the pool (BACKEND-AUDIT.md Phase 2 — "One pool. Single place for timeouts and
 * drain."). lib/pg-store.js now imports `pool` / `ping` / `close` from here, so the
 * legacy store and every module repository share one pool, one set of timeouts, and
 * one drain path.
 *
 * Config is unchanged from the Phase 1 §1e hardening: a hung query can't pin a
 * connection forever, a dead DB fails fast instead of hanging the request, idle
 * clients are recycled, `ssl` is opt-in for managed Postgres.
 */

const { Pool } = require("pg");
const config = require("../../lib/config");
const logger = require("../../lib/logger");

const pool = new Pool({
  connectionString: config.PG_URL,
  max: 10,
  statement_timeout: config.PG_STATEMENT_TIMEOUT_MS,
  connectionTimeoutMillis: config.PG_CONNECT_TIMEOUT_MS,
  idleTimeoutMillis: config.PG_IDLE_TIMEOUT_MS,
  ssl: config.PG_SSL ? { rejectUnauthorized: false } : undefined,
});

// An error on an idle client (DB restart, network blip) would otherwise crash the
// process — log it and let the pool replace the client.
pool.on("error", (err) => {
  logger.error({ err }, "pg pool: idle client error");
});

/** Liveness probe for GET /health — throws if Postgres is unreachable. */
async function ping() {
  await pool.query("SELECT 1");
}

/** Graceful shutdown — drain the pool so in-flight queries finish (index.js SIGTERM). */
async function close() {
  await pool.end();
}

module.exports = { pool, ping, close };
