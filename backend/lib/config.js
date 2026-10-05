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
// Only these NODE_ENV values get dev conveniences (insecure JWT_SECRET default,
// the "123456" OTP bypass, OTP echoed back in API responses — see lib/auth.js,
// routes/auth.js). Anything else — "production", a typo, an unrecognized value
// like "staging" — is treated as NOT dev, so a misconfigured deploy fails loud
// instead of silently running with a well-known secret and a universal OTP.
const RECOGNIZED_DEV_ENVS = ["development", "test"];
const isDev = RECOGNIZED_DEV_ENVS.includes(NODE_ENV);

const JWT_SECRET =
  process.env.JWT_SECRET || (isDev ? "dev-insecure-secret-change-me" : null);
if (!JWT_SECRET) {
  throw new Error(
    NODE_ENV === "production"
      ? "JWT_SECRET must be set in production (see backend/.env)"
      : `JWT_SECRET must be set explicitly when NODE_ENV="${NODE_ENV}" — only ` +
        `NODE_ENV=development/test get the insecure dev default (see backend/.env)`
  );
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

  // --- Rate limiting (lib/security.js, Phase 1 §1c/1d) ---
  // Set RATE_LIMIT_ENABLED=false to disable all limiters (used by the test suite).
  // The three maxes are per-window; windows are fixed in lib/security.js
  // (global 15min, auth 15min, AI 1hr).
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== "false",
  RL_GLOBAL_MAX: parseInt(process.env.RL_GLOBAL_MAX || "1000", 10),
  RL_AUTH_MAX: parseInt(process.env.RL_AUTH_MAX || "10", 10),
  RL_AI_MAX: parseInt(process.env.RL_AI_MAX || "30", 10),
  // Max characters accepted for a free-text AI prompt (need / query / message).
  AI_PROMPT_MAX: parseInt(process.env.AI_PROMPT_MAX || "4000", 10),

  // --- Postgres pool hardening (lib/pg-store.js, Phase 1 §1e) ---
  PG_STATEMENT_TIMEOUT_MS: parseInt(process.env.PG_STATEMENT_TIMEOUT_MS || "10000", 10),
  PG_CONNECT_TIMEOUT_MS: parseInt(process.env.PG_CONNECT_TIMEOUT_MS || "5000", 10),
  PG_IDLE_TIMEOUT_MS: parseInt(process.env.PG_IDLE_TIMEOUT_MS || "30000", 10),
  // Set PG_SSL=true for a managed Postgres that requires TLS (most cloud providers).
  PG_SSL: process.env.PG_SSL === "true",
  // Present only once the AI phase is configured; guarded at point of use.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || null,
  // When there's no API key, the AI paths fall back to the locally authenticated
  // `claude` CLI. Set AI_CLI_ENABLED=false to force the pure deterministic path.
  AI_CLI_ENABLED: process.env.AI_CLI_ENABLED !== "false",
  // Ask Navya agent (POST /api/assistant/agent): max `claude` CLI answers per hour
  // across ALL users (the CLI runs on one shared subscription). Over the cap the
  // agent still answers, from retrieved in-app data only (no model call).
  AGENT_AI_PER_HOUR: parseInt(process.env.AGENT_AI_PER_HOUR || "40", 10),
  // In the test env (NODE_ENV=test — set by test/_env.js), PG_URL_TEST takes
  // precedence so `npm test` runs against a dedicated, disposable database
  // (scripts/setup-test-db.js builds it) and never the working dev DB. Falls back
  // to the normal PG_URL when PG_URL_TEST is unset, so a machine without a test DB
  // still runs the suite the way it did before (BACKEND-AUDIT.md Phase 0).
  PG_URL:
    (NODE_ENV === "test" &&
      (process.env.PG_URL_TEST || process.env.DATABASE_URL_TEST)) ||
    process.env.PG_URL ||
    process.env.DATABASE_URL ||
    null,

  // --- File uploads (backend/lib/uploadStorage.js) ---
  // "local" (default, dev) writes into frontend/public/uploads/, served as a static
  // asset. "s3" uploads to an S3 bucket instead — flip this one var on a production
  // deploy, no code change. See HANDOVER.md "File storage" for the full switch-over
  // checklist.
  UPLOAD_STORAGE: (process.env.UPLOAD_STORAGE || "local").toLowerCase(),
  AWS_REGION: process.env.AWS_REGION || null,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || null,
  // Optional — omit to use the AWS SDK's default credential chain (IAM role, shared
  // config file, etc.), which is the recommended approach in production. Only set
  // these for local testing against a real bucket.
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || null,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || null,
  // Optional custom domain in front of the bucket (e.g. a CloudFront distribution) —
  // when set, uploaded-file URLs use this instead of the raw *.s3.amazonaws.com host.
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || null,

  // --- Social login (Google) ---
  // POST /api/auth/oauth/google verifies the Google id_token against this client
  // id (google-auth-library). Unset (default) leaves the route disabled (503) —
  // no fake/placeholder client id is ever accepted. Get one free from
  // console.cloud.google.com (OAuth client ID, Web application) — no billing
  // account needed. Use a SEPARATE client per environment (dev/staging/prod),
  // same var name, different value in each deploy's own .env.
  // Facebook and Apple are NOT wired yet (Apple requires a paid $99/yr Apple
  // Developer account; Facebook deferred) — add the same shape when credentials
  // exist.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,

  // --- Recruitment go-live gate (RECRUITMENT.md §5) ---
  // Unset (default) defers to the admin-editable featureFlags.recruitmentLive in
  // settings.json (GET /api/config, edited via /admin). Set to "true"/"false" to force
  // the value from the environment instead — the simplest production switch (flip the
  // env var, restart, no admin-panel step, no redeploy). Env wins over the DB value
  // whenever it's explicitly set; see routes/config.js.
  RECRUITMENT_LIVE:
    process.env.RECRUITMENT_LIVE === "true"
      ? true
      : process.env.RECRUITMENT_LIVE === "false"
        ? false
        : null,

  // --- Consultations go-live gate (same mechanism as RECRUITMENT_LIVE above) ---
  // Consultations isn't a promoted suite product this phase — unset (default)
  // defers to the admin-editable featureFlags.consultationsLive in
  // settings.json; set the env var to force it, env wins when explicitly set.
  CONSULTATIONS_LIVE:
    process.env.CONSULTATIONS_LIVE === "true"
      ? true
      : process.env.CONSULTATIONS_LIVE === "false"
        ? false
        : null,

  // --- FCM push (lib/fcm.js) ---
  // Path to a Firebase service account JSON (never the JSON itself — see
  // .env.example). Unset (default) leaves push disabled; lib/fcm.js no-ops
  // rather than throwing, same pattern as GOOGLE_CLIENT_ID above.
  FCM_SERVICE_ACCOUNT_PATH: process.env.FCM_SERVICE_ACCOUNT_PATH || null,
};

if (module.exports.UPLOAD_STORAGE === "s3" && !isDev && !module.exports.AWS_S3_BUCKET) {
  throw new Error("AWS_S3_BUCKET must be set when UPLOAD_STORAGE=s3 in production (see backend/.env)");
}

// Postgres is the only backend as of the Phase 8 demolition (the file-DB fallback
// and lib/store.js dispatch layer are gone) — fail fast at boot with a clear
// message instead of a confusing pool error on the first query.
if (!module.exports.PG_URL) {
  throw new Error(
    NODE_ENV === "test"
      ? "PG_URL_TEST (or PG_URL) must be set for the test suite — run `npm run test:setup` (see BACKEND-AUDIT.md Phase 0)"
      : "PG_URL (or DATABASE_URL) must be set — Postgres is required (see backend/.env / POSTGRES-MIGRATION.md)"
  );
}
