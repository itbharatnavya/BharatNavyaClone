/**
 * _env.js — loaded via `node --test --require ./test/_env.js` (see package.json).
 *
 * Runs before any test file (and before lib/config.js is first required), so it is
 * the one place that flips NODE_ENV to "test". config.js then prefers PG_URL_TEST
 * over PG_URL, pointing the whole suite at the disposable test database that
 * `npm run test:setup` builds (BACKEND-AUDIT.md Phase 0).
 *
 * If PG_URL_TEST is unset the suite still runs — config.js falls back to PG_URL, i.e.
 * exactly the pre-Phase-0 behaviour.
 */

process.env.NODE_ENV = "test";

// Limiters off by default for the suite; phase1-security.test.js re-enables them
// with tiny ceilings in its own process (node --test isolates each file).
if (process.env.RATE_LIMIT_ENABLED === undefined) {
  process.env.RATE_LIMIT_ENABLED = "false";
}
