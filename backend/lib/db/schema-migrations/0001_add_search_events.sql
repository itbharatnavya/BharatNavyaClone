-- Adds search_events (append-only, backs DB/search-events.jsonl) for the
-- Directory homepage's Trending/Popular searches sections.
CREATE TABLE IF NOT EXISTS search_events (
  id             TEXT PRIMARY KEY,
  query          TEXT NOT NULL,
  category_slug  TEXT,
  city           TEXT,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_events_created_idx ON search_events(created_at);
