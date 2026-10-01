-- 0016 — Google social login. Stores the Google account's stable subject id
-- (payload.sub from the verified id_token) so a returning Google sign-in maps
-- straight to a user without re-matching on email. Nullable — most existing
-- users never link Google; partial unique index (WHERE NOT NULL) so many NULLs
-- coexist but no two users can claim the same Google account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id) WHERE google_id IS NOT NULL;
