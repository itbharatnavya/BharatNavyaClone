-- 0001_add_listing_verification.sql
--
-- Adds the AI-verification gate (backend/lib/listingVerification.js): every listing
-- now carries a `verification` object — { status, score, aiRan, deterministicChecks,
-- ai, summary, reviewedBy, reviewedAt, ... } — round-tripped as JSONB, same shape as
-- the file-DB doc.
--
-- Safe to re-run (IF NOT EXISTS) — but under the migrate-schema.js runner this only
-- ever executes once per database; it's tracked in `schema_migrations`.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS verification JSONB;
