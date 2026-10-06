-- 0017 — OTP codes persisted in Postgres (was an in-process Map in lib/auth.js).
-- Serverless deploys run requests on different instances, so a code issued by one
-- instance could not be verified by another. One live code per mobile: re-sending
-- replaces the previous one. Expiry is compared against the database clock so app
-- and DB clock skew can't extend or shorten a code's life.
CREATE TABLE IF NOT EXISTS otp_codes (
  mobile      TEXT PRIMARY KEY,
  otp         TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes(expires_at);
