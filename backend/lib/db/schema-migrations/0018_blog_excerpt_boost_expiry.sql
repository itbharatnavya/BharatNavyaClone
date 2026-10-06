-- 0018 — three small gaps found in the Directory seller-tools audit (see CHANGES-SELLER-TOOLS.md):
--  * blogs.excerpt   — the dashboard form and /blog list both use an excerpt, but it was never stored.
--  * blogs.created_at — drafts have no publish date; the dashboard needs something to show.
--  * listings.rank_boost_end_date — "rank" / "category_top" boosts ignored their `days` and lasted
--    forever; ranking now zeroes rankBoostScore once this date has passed (NULL = no expiry, which
--    keeps admin-set and legacy boosts exactly as they were).
--  * boost_requests.rejected_at / expires_at — the reject route already tried to write rejectedAt;
--    expires_at records when an approved boost stops applying.
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE blogs SET created_at = COALESCE(published_at, created_at);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rank_boost_end_date TIMESTAMPTZ;
ALTER TABLE boost_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE boost_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
