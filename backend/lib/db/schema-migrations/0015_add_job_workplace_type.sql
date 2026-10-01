-- 0015 — real workplace type (on-site / hybrid / remote) for jobs, replacing the
-- boolean-only location_remote as the source of truth. RECRUITMENT.md /
-- WEB-REDESIGN.md 2026-09-11: the redesigned Recruitment search UI exposes an
-- On-site/Hybrid/Remote filter that location_remote (true/false only) cannot
-- represent — there is no way to express "hybrid" today.
--
-- Uses the same free-text convention already established for this exact concept on
-- Directory listings (listings.service_mode, "onsite"/"hybrid"/"remote" — see
-- routes/listings.js) rather than inventing a new naming style.
--
-- location_remote is KEPT, not dropped: every existing reader (jobSearch's
-- remoteOnly filter, admin/dashboard job cards, lib/recruitmentDesign.ts) keeps
-- working unmodified. job.service.js's buildLocation() now derives it FROM
-- workplaceType on every write, so the two columns never drift apart going forward.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_workplace_type TEXT;

-- Backfill from the existing boolean so every current row has a real value instead
-- of NULL (NULL is still tolerated on read — see job.service.js's buildLocation()
-- fallback — this backfill just avoids every pre-existing job silently reading as
-- "on-site" only because no one has re-saved it since this migration).
UPDATE jobs
   SET location_workplace_type = CASE WHEN location_remote IS TRUE THEN 'remote' ELSE 'onsite' END
 WHERE location_workplace_type IS NULL;

CREATE INDEX IF NOT EXISTS jobs_workplace_type_idx ON jobs(location_workplace_type);
