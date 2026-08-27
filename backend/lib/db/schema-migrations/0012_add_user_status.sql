-- Account-level suspend (ADMIN-CONSOLE.md — user management pass).
-- NULL = active (legacy rows), 'suspended' blocks login + all authenticated requests.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT;
