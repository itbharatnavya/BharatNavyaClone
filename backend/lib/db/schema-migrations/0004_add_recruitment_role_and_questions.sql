-- Recruitment enhancement pass (see repo-root "Recruitment — Additional Product Improvements
-- & Flow Enhancements.md" and RECRUITMENT.md's dated entry for this pass).
--
-- recruitment_role/recruitment_role_locked_at: today a single user can hold both an
-- employerProfile and a candidateProfile at once with nothing distinguishing "which side of
-- Recruitment are they" — this adds an explicit, lockable role so a recruiter can never apply
-- and a candidate can never post a job once they've committed to one side.
--
-- jobs.questions / applications.answers: recruiter-defined per-job screening questions,
-- following the same jsonb-column precedent already used for applications.status_history
-- (small, append-style JSON, never filtered/queried on its own — a child table would only
-- cost an extra query per read for no benefit).
ALTER TABLE users ADD COLUMN IF NOT EXISTS recruitment_role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recruitment_role_locked_at TIMESTAMPTZ;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_recruitment_role_check;
ALTER TABLE users ADD CONSTRAINT users_recruitment_role_check
  CHECK (recruitment_role IS NULL OR recruitment_role IN ('candidate', 'recruiter'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
