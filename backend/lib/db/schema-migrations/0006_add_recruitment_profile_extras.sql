-- Recruitment dashboard/flow build plan, Phase 1 (see repo-root "Recruitment —
-- Dashboard, Flow & Feature Build Plan.md" §10 for the full field-by-field rationale).
--
-- employer_profiles: three fields the company-profile UI needs and never had anywhere
-- in the stack (schema, backend, or UI) — employee_count (text range string, same
-- convention as seller_profiles.employee_count, e.g. "11-50"), benefits (company-level,
-- deliberately distinct from the existing per-job jobs.benefits text[]), working_hours
-- (plain text, e.g. "Mon-Fri, 9:30 AM-6:30 PM" — no structured day/time schema unless a
-- real need for it emerges later).
--
-- jobs.qualification: education/qualification requirement, plain text (e.g. "Bachelor's
-- degree", "Any graduate", "Not required") — a job posting field, distinct from
-- experience_level.
ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS working_hours TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qualification TEXT;
