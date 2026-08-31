/**
 * search-events.js — relational mapping for DB/search-events.jsonl (append-only,
 * fixed shape { id, query, categorySlug, city, userId, createdAt }).
 */

function fromRow(r) {
  return {
    id: r.id,
    query: r.query,
    categorySlug: r.category_slug,
    city: r.city,
    userId: r.user_id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

function createSearchEventsStore(pool) {
  return {
    async readAll() {
      const res = await pool.query(`SELECT * FROM search_events ORDER BY created_at ASC`);
      return res.rows.map(fromRow);
    },
    async append(event) {
      await pool.query(
        `INSERT INTO search_events (id, query, category_slug, city, user_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          event.id, event.query, event.categorySlug ?? null, event.city ?? null,
          event.userId ?? null, event.createdAt ?? new Date().toISOString(),
        ]
      );
    },
  };
}

module.exports = { createSearchEventsStore };
