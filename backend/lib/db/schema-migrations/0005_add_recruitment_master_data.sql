-- Recruitment master-data taxonomies (RECRUITMENT.md §2 companion to job_functions):
-- job_roles (predefined job-title picklist, tagged to a job_functions.slug) and skills
-- (predefined skill picklist, optionally tagged to a job function; skills with no
-- particular function, e.g. "Communication", carry a null job_function). Flat and
-- admin-editable, same shape as job_functions — no FK on the job_function text column,
-- same reasoning as job_functions/jobs.job_function: a taxonomy edit must not
-- retroactively invalidate rows that already reference the old slug.
CREATE TABLE IF NOT EXISTS job_roles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  job_function  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS job_roles_job_function_idx ON job_roles(job_function);

CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  job_function  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS skills_job_function_idx ON skills(job_function);
