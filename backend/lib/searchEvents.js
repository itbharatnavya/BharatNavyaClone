/**
 * lib/searchEvents.js — shared append for search-events.jsonl.
 *
 * Feeds GET /api/search/trending and /popular (routes/searchTrends.js).
 * Written from two places: routes/ai.js (every /ai/search call, any
 * category-slug confidence) and routes/searchTrends.js's POST /log
 * (Directory suggestion picks only, always a validated categorySlug).
 * Trending/Popular's own aggregation only counts events with a categorySlug
 * — see routes/searchTrends.js's aggregate() — so low-confidence /ai/search
 * events are still logged here but never surface there.
 *
 * Fire-and-forget: never allowed to affect the caller's response — any
 * failure here is swallowed.
 */

const store = require("./store");

async function logSearchEvent({ query, categorySlug, city, userId }) {
  try {
    const q = String(query || "").trim();
    if (!q) return;
    await store.appendJsonl("search-events.jsonl", {
      id: await store.nextId("srch"),
      query: q,
      categorySlug: categorySlug || null,
      city: city || null,
      userId: userId || null,
      createdAt: new Date().toISOString(),
    });
  } catch (_err) {
    // Logging must never break search — silently drop.
  }
}

module.exports = { logSearchEvent };
