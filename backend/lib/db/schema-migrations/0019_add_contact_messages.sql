-- 0019 — Contact page form (frontend app/contact/page.tsx). Public "contact us" messages,
-- read and closed by admins (GET/PATCH /api/admin/contact-messages).
CREATE TABLE IF NOT EXISTS contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  topic       TEXT,
  message     TEXT NOT NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);
