/**
 * repository.js — the data-access seam that replaces store.js's JavaScript-predicate
 * interface (BACKEND-AUDIT.md Phase 2). A repository speaks the closed criteria
 * grammar from queryBuilder.js, so filtering / sorting / paging compile to SQL and
 * finally use the indexes in lib/db/schema.sql.
 *
 *   createRepository({ pool, mapping }) -> {
 *     findById, findOne, findMany,      // { where, orderBy, limit, offset }
 *     count, page,                      // page(): items + total in ONE round trip (count(*) OVER())
 *     insert, updateById, updateWhere,
 *     incrementById,                    // atomic  SET col = COALESCE(col,0) + n   -> fixes C2
 *     deleteById, deleteWhere, withTx,  // deleteWhere: bulk delete by criteria (empty where refused)
 *   }
 *
 * `mapping` is one entry from buildFlatConfigs() (flat.mappings.js). Row<->doc
 * translation is delegated to FlatCollectionStore's own _toRow/_fromRow — the SAME
 * code the legacy store uses — so the two engines cannot diverge on shape
 * (anti-divergence mechanism #2). No cache in here (mechanism #4).
 */

const { FlatCollectionStore, buildFlatConfigs } = require("./mappings/flat.mappings");
const { withTransaction, quoteIdent } = require("../../lib/db/util");
const { buildWhere, buildOrderBy } = require("./queryBuilder");
const { pool: sharedPool } = require("./pool");
const { nextId } = require("./ids");

function createRepository({ pool, mapping }) {
  if (!pool) throw new Error("createRepository: pool is required");
  if (!mapping || !mapping.table) throw new Error("createRepository: mapping.table is required");

  const flat = new FlatCollectionStore(pool, mapping);
  const TABLE = quoteIdent(mapping.table);
  const fromRow = (row) => flat._fromRow(row);
  const resolveCol = (key) => (mapping.columns[key] && mapping.columns[key].col) || key;

  function whereSql(where) {
    const w = buildWhere(where || {}, resolveCol, 1);
    return { clause: w.text ? ` WHERE ${w.text}` : "", values: w.values, nextIndex: w.nextIndex };
  }

  async function findMany({ where, orderBy, limit, offset } = {}) {
    const w = whereSql(where);
    const values = [...w.values];
    let sql = `SELECT * FROM ${TABLE}${w.clause}`;
    const ob = buildOrderBy(orderBy, resolveCol);
    sql += ` ${ob || `ORDER BY ${quoteIdent("id")} ASC`}`;
    if (limit != null) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }
    if (offset != null) {
      values.push(offset);
      sql += ` OFFSET $${values.length}`;
    }
    const res = await pool.query(sql, values);
    return res.rows.map(fromRow);
  }

  async function findOne(criteria = {}) {
    const rows = await findMany({ ...criteria, limit: 1 });
    return rows[0] || null;
  }

  /** Single-row hydrate — delegates to the legacy path (N=1, no criteria needed). */
  async function findById(id) {
    return flat.getById(id);
  }

  async function count({ where } = {}) {
    const w = whereSql(where);
    const res = await pool.query(`SELECT count(*)::int AS n FROM ${TABLE}${w.clause}`, w.values);
    return res.rows[0].n;
  }

  /** items + total in one round trip via count(*) OVER() (BACKEND-AUDIT.md Phase 2). */
  async function page({ where, orderBy, page: pageNum = 1, limit = 20 } = {}) {
    const p = Math.max(1, parseInt(pageNum, 10) || 1);
    const lim = Math.max(1, parseInt(limit, 10) || 20);
    const w = whereSql(where);
    const values = [...w.values];
    const ob = buildOrderBy(orderBy, resolveCol) || `ORDER BY ${quoteIdent("id")} ASC`;
    values.push(lim);
    const limP = `$${values.length}`;
    values.push((p - 1) * lim);
    const offP = `$${values.length}`;
    const sql = `SELECT *, count(*) OVER()::int AS __total FROM ${TABLE}${w.clause} ${ob} LIMIT ${limP} OFFSET ${offP}`;
    const res = await pool.query(sql, values);
    const total = res.rows.length ? res.rows[0].__total : await count({ where });
    // __total isn't in mapping.columns, so fromRow ignores it — no need to strip.
    const items = res.rows.map(fromRow);
    return { items, total, page: p, totalPages: Math.max(1, Math.ceil(total / lim)) };
  }

  async function insert(doc, idPrefix) {
    return flat.insert(doc, idPrefix || mapping.idPrefix || undefined);
  }

  async function updateById(id, patch) {
    return flat.update(id, patch);
  }

  /** Bulk patch — same scalar `patch` applied to every row matching `where`.
   *  Returns the number of rows updated. Values only; never structural. */
  async function updateWhere({ where }, patch) {
    const cols = Object.keys(patch || {});
    if (!cols.length) return 0;
    const sets = [];
    const values = [];
    for (const key of cols) {
      values.push(patch[key]);
      sets.push(`${quoteIdent(resolveCol(key))} = $${values.length}`);
    }
    const w = buildWhere(where || {}, resolveCol, values.length + 1);
    values.push(...w.values);
    const sql = `UPDATE ${TABLE} SET ${sets.join(", ")}${w.text ? ` WHERE ${w.text}` : ""}`;
    const res = await pool.query(sql, values);
    return res.rowCount;
  }

  /** Atomic counter bump — the fix for the lost-update race (C2). */
  async function incrementById(id, field, by = 1) {
    const col = quoteIdent(resolveCol(field));
    const res = await pool.query(
      `UPDATE ${TABLE} SET ${col} = COALESCE(${col}, 0) + $2 WHERE id = $1 RETURNING *`,
      [id, by]
    );
    return res.rowCount ? fromRow(res.rows[0]) : null;
  }

  async function deleteById(id) {
    return flat.remove(id);
  }

  /** Bulk delete — every row matching `where`. Returns the rows deleted (rowCount).
   *  An empty `where` is refused (never a delete-all by accident); pass an explicit
   *  criterion. Mirror of updateWhere — values only, no structural input. */
  async function deleteWhere({ where } = {}) {
    if (!where || !Object.keys(where).length) {
      throw new Error("deleteWhere: refusing to run with an empty where");
    }
    const w = buildWhere(where, resolveCol, 1);
    const sql = `DELETE FROM ${TABLE}${w.text ? ` WHERE ${w.text}` : ""}`;
    const res = await pool.query(sql, w.values);
    return res.rowCount;
  }

  async function withTx(fn) {
    return withTransaction(pool, fn);
  }

  return {
    findById, findOne, findMany, count, page,
    insert, updateById, updateWhere, incrementById, deleteById, deleteWhere, withTx,
  };
}

/**
 * repoForCollection("jobs.json") — a repository over a flat collection, using the
 * shared pool and the ONE flat-mapping source. The convenience a module wants:
 *   const jobs = repoForCollection("jobs.json");
 * instead of re-plumbing pool + buildFlatConfigs + createRepository each time.
 * Composite collections (users.json, listings.json) are not flat — not available here.
 */
let _flatConfigs;
function repoForCollection(file) {
  if (!_flatConfigs) {
    _flatConfigs = Object.fromEntries(buildFlatConfigs(nextId).map((c) => [c.file, c]));
  }
  const mapping = _flatConfigs[file];
  if (!mapping) throw new Error(`repoForCollection: no flat mapping for "${file}"`);
  return createRepository({ pool: sharedPool, mapping });
}

module.exports = { createRepository, repoForCollection };
