/**
 * searchTrends.repository.js — reads for the Directory "Trending searches" /
 * "Popular searches" homepage sections (BACKEND-AUDIT.md Phase 7 sweep-3).
 *
 * `readSearchEvents()` is the same all-rows read routes/searchTrends.js used to do
 * via `store.readJsonl("search-events.jsonl")` — it delegates to the existing
 * relational mapper (lib/db/search-events.js) created against the one shared pool,
 * so the route no longer imports lib/store. The 14-day-window / city-substring /
 * group-by passes stay in the route (JS) for now: pushing them into SQL is a
 * separate byte-identical-risk change and there is no golden for these endpoints
 * yet. `search-events.jsonl` is an append-only ledger — it never graduates onto
 * repoForCollection (flat collections only); this port is how the route reaches it.
 */

const { pool } = require("../../_shared/pool");
const { nextId } = require("../../_shared/ids");
const { createSearchEventsStore } = require("../../../lib/db/search-events");

const events = createSearchEventsStore(pool);

/**
 * readSearchEvents() -> Promise<Array<{ id, query, categorySlug, city, userId, createdAt }>>
 * All search events, created_at ASC — byte-identical to the old
 * `store.readJsonl("search-events.jsonl")` (same underlying mapper).
 */
function readSearchEvents() {
  return events.readAll();
}

/** Append one search event (fire-and-forget from routes/ai.js + POST /log).
 *  Mints `srch_<n>` unless `event.id` is set — same as the old
 *  `store.appendJsonl("search-events.jsonl", { id: store.nextId("srch"), … })`. */
async function appendSearchEvent(event) {
  const row = { id: event.id || (await nextId("srch")), ...event };
  return events.append(row);
}

module.exports = { readSearchEvents, appendSearchEvent };
