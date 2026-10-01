/**
 * logger.js — the one structured logger (BACKEND-AUDIT.md Phase 1 §1e / C5).
 *
 * Replaces the scattered `console.*` calls. JSON to stdout in production (one line
 * per event, ready for a log pipeline); pretty-printed in development; silent under
 * `NODE_ENV=test` so the suite output stays readable. Level overridable with
 * `LOG_LEVEL` (trace|debug|info|warn|error|fatal|silent).
 */

const pino = require("pino");
const config = require("./config");

const level =
  process.env.LOG_LEVEL ||
  (config.NODE_ENV === "test" ? "silent" : config.NODE_ENV === "production" ? "info" : "debug");

const options = { level };

// Pretty output only in dev — the transport spins a worker thread, which we don't
// want in prod (adds a moving part) or in tests (complicates clean exit).
if (config.NODE_ENV === "development" && level !== "silent") {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
  };
}

const logger = pino(options);

module.exports = logger;
