-- 0017 — FCM (Firebase Cloud Messaging) web-push device tokens. token is the
-- primary key so re-registering the same browser upserts onto the same row
-- instead of accumulating duplicates; ON DELETE CASCADE so a deleted user's
-- tokens are cleaned up automatically.
CREATE TABLE IF NOT EXISTS fcm_tokens (
  token         TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL DEFAULT 'web',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fcm_tokens_user_idx ON fcm_tokens(user_id);
