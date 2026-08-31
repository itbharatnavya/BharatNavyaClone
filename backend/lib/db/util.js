/**
 * util.js — shared helpers for the relational mapper layer (lib/db/*).
 *
 * Column type tags: "text" | "int" | "numeric" | "bool" | "timestamptz" | "textArray" | "jsonb"
 * node-postgres accepts JS values (string/number/boolean/array/null) directly as query
 * params for all of these except timestamptz reads, which come back as JS Date objects
 * and must be converted back to the ISO strings the app's JSON docs originally held.
 */

function toParam(value, type) {
  // Array columns are NOT NULL DEFAULT '{}' — an absent/optional array field in the
  // source doc (e.g. a user with no `interests`) means "empty", not "unknown".
  if (type === "textArray" && (value === undefined || value === null)) return [];
  if (value === undefined) return null;
  if (type === "timestamptz") {
    if (value === null) return null;
    // Accept either an ISO string (as stored in the JSON docs) or a Date.
    return value instanceof Date ? value : new Date(value);
  }
  // jsonb: node-postgres's default param serialization turns a bare JS array into a
  // Postgres ARRAY literal ("{...}"), not a JSON array — wrong for a jsonb column, and
  // silently so (Postgres would try to parse it as JSON text and fail, or mangle it).
  // Must be JSON.stringify'd explicitly on the way in; reads come back already-parsed
  // (node-postgres parses jsonb columns automatically), so fromColumn needs no symmetric case.
  if (type === "jsonb") {
    if (value === null) return null;
    return JSON.stringify(value === undefined ? null : value);
  }
  return value;
}

function fromColumn(value, type) {
  if (value === null || value === undefined) return null;
  if (type === "timestamptz") return value instanceof Date ? value.toISOString() : value;
  // node-postgres returns NUMERIC/DECIMAL and BIGINT as strings by default (avoids
  // precision loss); the original JSON docs held these as JS numbers, so convert back.
  if (type === "numeric" || type === "bigint") return typeof value === "string" ? Number(value) : value;
  return value;
}

/** doc[jsKey] -> row[col], per a { jsKey: { col, type } } column config. */
function docToRow(doc, columns) {
  const row = {};
  for (const [jsKey, spec] of Object.entries(columns)) {
    row[spec.col] = toParam(doc[jsKey], spec.type);
  }
  return row;
}

/** row[col] -> doc[jsKey], per the same column config. Omits keys absent from the row. */
function rowToDoc(row, columns) {
  const doc = {};
  for (const [jsKey, spec] of Object.entries(columns)) {
    if (!(spec.col in row)) continue;
    doc[jsKey] = fromColumn(row[spec.col], spec.type);
  }
  return doc;
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Build "col1, col2, ..." and "$1, $2, ..." plus the ordered param array from a row object. */
function insertParts(row) {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => row[c]);
  return { colsSql: cols.map(quoteIdent).join(", "), placeholdersSql: placeholders.join(", "), values, cols };
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** INSERT ... ON CONFLICT (idCol) DO UPDATE SET ... — upsert-in-place, never delete+reinsert
 *  (rows here are commonly referenced by FK from other tables; replacing the row would
 *  cascade-delete unrelated data). */
async function upsertRow(client, table, idCol, row) {
  const { colsSql, placeholdersSql, values, cols } = insertParts(row);
  const updates = cols.filter((c) => c !== idCol).map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`);
  const sql = `INSERT INTO ${quoteIdent(table)} (${colsSql}) VALUES (${placeholdersSql})
    ON CONFLICT (${quoteIdent(idCol)}) DO UPDATE SET ${updates.join(", ")}
    RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0];
}

/** DELETE all rows for parentId then bulk-INSERT the replacements. Safe for child/owned
 *  tables (nothing outside the owning doc's subtree references these rows). */
async function replaceChildRows(client, table, parentCol, parentId, rows) {
  await client.query(`DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(parentCol)} = $1`, [parentId]);
  for (const row of rows) {
    const { colsSql, placeholdersSql, values } = insertParts(row);
    await client.query(`INSERT INTO ${quoteIdent(table)} (${colsSql}) VALUES (${placeholdersSql})`, values);
  }
}

/** Flatten doc[spec.docKey][subKey] into row[col] for each nested-object spec. */
function nestedToRow(doc, nestedSpecs, row) {
  for (const spec of nestedSpecs || []) {
    const sub = doc[spec.docKey] || {};
    for (const [subKey, colSpec] of Object.entries(spec.fields)) {
      row[colSpec.col] = sub[subKey] === undefined ? null : sub[subKey];
    }
  }
}

/** Reconstruct doc[spec.docKey] = { subKey: ... } from row[col] for each nested-object spec.
 *  Null-valued fields are omitted (matches the source data's per-type key variability). */
function nestedFromRow(row, nestedSpecs, doc) {
  for (const spec of nestedSpecs || []) {
    const sub = {};
    for (const [subKey, colSpec] of Object.entries(spec.fields)) {
      const v = row[colSpec.col];
      if (v !== null && v !== undefined) sub[subKey] = fromColumn(v, colSpec.type);
    }
    doc[spec.docKey] = sub;
  }
}

module.exports = {
  docToRow, rowToDoc, quoteIdent, insertParts, withTransaction, upsertRow, replaceChildRows,
  toParam, fromColumn, nestedToRow, nestedFromRow,
};
