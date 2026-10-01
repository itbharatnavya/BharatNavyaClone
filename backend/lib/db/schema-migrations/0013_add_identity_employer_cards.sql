-- 0013 — identity_employer_cards view (BACKEND-AUDIT.md Phase 3, first consumed in Phase 4e).
--
-- The public job browse (GET /api/jobs, modules/recruitment) needs the "active job
-- from an APPROVED employer" gate to be a JOIN, not a post-filter over every
-- hydrated user + all 9 child tables. This view is the single named seam other
-- modules JOIN against instead of touching users / employer_profiles directly
-- (architecture.test.js rule 4). Columns are exactly what identity.employerCardOf()
-- needs to build a public, contact-free employer card:
--   company_name / name  -> display-name fallback (ep.companyName || user.name)
--   logo / avatar_url     -> logo fallback (ep.logo || user.avatarUrl)
--   slug, location_city, location_state, is_verified
--   status                -> the approval gate

CREATE OR REPLACE VIEW identity_employer_cards AS
  SELECT
    u.id             AS user_id,
    ep.company_name  AS company_name,
    ep.slug          AS slug,
    ep.status        AS status,
    ep.is_verified   AS is_verified,
    ep.logo          AS logo,
    ep.location_city AS location_city,
    ep.location_state AS location_state,
    u.name           AS name,
    u.avatar_url     AS avatar_url
  FROM users u
  JOIN employer_profiles ep ON ep.user_id = u.id;
