/**
 * config.js — central runtime configuration.
 *
 * Loads backend/.env (a tiny parser, so we don't need a dotenv dependency) into
 * process.env, then exposes typed/defaulted settings. Fail fast in production if a
 * required secret is missing; permissive dev defaults otherwise.
 */

const fs = require("fs");
const path = require("path");

(function loadEnv() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      // strip optional surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env file — rely on real process.env / defaults */
  }
})();

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV !== "production";

const JWT_SECRET =
  process.env.JWT_SECRET || (isDev ? "dev-insecure-secret-change-me" : null);
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production (see backend/.env)");
}

module.exports = {
  NODE_ENV,
  isDev,
  PORT: parseInt(process.env.PORT || "4000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
  OTP_TTL_MS: parseInt(process.env.OTP_TTL_MS || String(5 * 60 * 1000), 10),
  // Present only once the AI phase is configured; guarded at point of use.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || null,
  // When there's no API key, the AI paths fall back to the locally authenticated
  // `claude` CLI. Set AI_CLI_ENABLED=false to force the pure deterministic path.
  AI_CLI_ENABLED: process.env.AI_CLI_ENABLED !== "false",
};
