-- Recruitment product (RECRUITMENT.md): employer/candidate profiles, jobs, applications,
-- and the job-functions lookup list. Mirrors the seller_profiles / expert_profiles shape
-- for the two new 1:1 profile tables; jobs/applications have no child tables of their own
-- (simple string lists are text[] columns; applications.status_history is a small,
-- never-individually-queried structured log, kept as jsonb rather than a child table).

-- 1:1, present only when the user has become an employer.
CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name       TEXT NOT NULL,
  slug               TEXT UNIQUE NOT NULL,
  about              TEXT,
  logo               TEXT,
  cover_image        TEXT,
  industry           TEXT,
  company_size       TEXT,
  website            TEXT,
  contact_mobile     TEXT,
  contact_email      TEXT,
  location_city      TEXT,
  location_state     TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  is_verified        BOOLEAN NOT NULL DEFAULT false,
  plan_tier          TEXT,
  job_post_limit     INTEGER,
  application_quota  INTEGER
  -- No created_at here — mirrors seller_profiles, which also has none; the account's
  -- own users.created_at already answers "when was this account created". (An earlier
  -- draft of this migration had one, NOT NULL with no writer ever populating it — every
  -- real become-employer call would have failed the constraint. Caught by
  -- test/recruitment-store.integration.test.js before this ever ran against real data.)
);
CREATE INDEX IF NOT EXISTS employer_profiles_slug_idx ON employer_profiles(slug);
CREATE INDEX IF NOT EXISTS employer_profiles_status_idx ON employer_profiles(status);

-- 1:1, present only when the user has a candidate profile (no approval gate — see
-- RECRUITMENT.md §2). skills/preferredLocations/preferredJobTypes are simple string
-- lists (text[], GIN-indexed on skills so a future "search candidates by skill" query
-- can use it directly).
CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline             TEXT,
  summary              TEXT,
  resume_url           TEXT,
  skills               TEXT[] NOT NULL DEFAULT '{}',
  experience_years     INTEGER,
  -- named current_position, not current_role — CURRENT_ROLE is a reserved SQL keyword
  -- (returns the active DB role) and can't be used as a plain column name.
  current_position     TEXT,
  current_company      TEXT,
  expected_salary      NUMERIC(12,2),
  preferred_locations  TEXT[] NOT NULL DEFAULT '{}',
  preferred_job_types  TEXT[] NOT NULL DEFAULT '{}',
  contact_phone        TEXT,
  contact_email        TEXT,
  is_open_to_work      BOOLEAN NOT NULL DEFAULT true
  -- No created_at here either — same reasoning as employer_profiles above.
);
CREATE INDEX IF NOT EXISTS candidate_profiles_skills_idx ON candidate_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS candidate_profiles_open_idx ON candidate_profiles(is_open_to_work);

-- child array: candidateProfile.education[]
CREATE TABLE IF NOT EXISTS candidate_education (
  id           SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  degree       TEXT,
  institution  TEXT,
  year         INTEGER,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS candidate_education_candidate_idx ON candidate_education(candidate_id);

-- child array: candidateProfile.workHistory[]
CREATE TABLE IF NOT EXISTS candidate_work_history (
  id           SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  company      TEXT,
  role         TEXT,
  duration     TEXT,
  description  TEXT,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS candidate_work_history_candidate_idx ON candidate_work_history(candidate_id);

-- Flat, admin-editable job taxonomy — deliberately NOT a nested tree like categories.
-- job_function on jobs below stores this list's slug as plain text, no FK: mirrors the
-- documented reasoning for inquiries.category_id having no FK (RECRUITMENT.md / the
-- schema's own precedent) — a job posting is not retroactively invalidated by a
-- taxonomy edit.
CREATE TABLE IF NOT EXISTS job_functions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Job postings. No child tables — skills/responsibilities/requirements/benefits are
-- simple string lists (text[]), same convention as blogs.tags / categories.facets.
-- Indexed on every column GET /api/jobs filters or sorts by, so the schema is ready for
-- SQL-level WHERE-pushdown when that pass happens (RECRUITMENT.md notes this is deferred,
-- same as Directory's own listings browse — see POSTGRES-MIGRATION.md).
CREATE TABLE IF NOT EXISTS jobs (
  id                    TEXT PRIMARY KEY,
  employer_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  job_function          TEXT,
  employment_type       TEXT,
  experience_level      TEXT,
  location_city         TEXT,
  location_state        TEXT,
  -- location_remote / salary_is_disclosed are nullable (not NOT NULL DEFAULT) even
  -- though they're logically booleans: they're written via the generic nested-object
  -- flattening helper (nestedToRow, lib/db/util.js), which assigns an omitted field as
  -- SQL NULL rather than substituting a default — a NOT NULL column would then reject
  -- the insert. Route code treats NULL as "false"/"true" respectively on read (see
  -- routes/jobs.js). Same nullable convention already used by seller_profiles' nested
  -- `performance` columns above.
  location_remote       BOOLEAN,
  salary_min            NUMERIC(12,2),
  salary_max            NUMERIC(12,2),
  salary_currency       TEXT,
  salary_is_disclosed   BOOLEAN,
  skills                TEXT[] NOT NULL DEFAULT '{}',
  responsibilities      TEXT[] NOT NULL DEFAULT '{}',
  requirements          TEXT[] NOT NULL DEFAULT '{}',
  benefits              TEXT[] NOT NULL DEFAULT '{}',
  openings              INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'pending',
  view_count            INTEGER NOT NULL DEFAULT 0,
  application_count     INTEGER NOT NULL DEFAULT 0,
  posted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS jobs_employer_idx ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_job_function_idx ON jobs(job_function);
CREATE INDEX IF NOT EXISTS jobs_employment_type_idx ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS jobs_experience_level_idx ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS jobs_city_idx ON jobs(location_city);
CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS jobs_skills_idx ON jobs USING GIN(skills);

-- Applications. status_history is a small append-only log of {status, note, changedAt}
-- entries — never filtered/queried on its own, so it's a plain jsonb column (inline on
-- the row, zero extra queries to read) rather than a child table (which would cost one
-- extra batched query on every read for no querying benefit).
--
-- UNIQUE(job_id, candidate_id): a candidate can apply to a given job exactly once,
-- enforced at the DB level (not just an app-level check) so a rapid double-submit can't
-- race past an app-level "already applied?" read and create two rows.
CREATE TABLE IF NOT EXISTS applications (
  id               TEXT PRIMARY KEY,
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_url       TEXT,
  cover_note       TEXT,
  status           TEXT NOT NULL DEFAULT 'applied',
  status_history   JSONB NOT NULL DEFAULT '[]',
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_candidate_uniq ON applications(job_id, candidate_id);
CREATE INDEX IF NOT EXISTS applications_employer_idx ON applications(employer_id);
CREATE INDEX IF NOT EXISTS applications_candidate_idx ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
