/**
 * queryBuilder.js — turns a closed CRITERIA object into parameterized SQL
 * (BACKEND-AUDIT.md Phase 2 — "replaces the predicate with a closed criteria
 * grammar. Criteria are data, so they compile to SQL; predicates are code, so they
 * can't").
 *
 * where operators:  eq ne in notIn gt gte lt lte ilike contains isNull   plus  _or
 *   { status: "active" }                 -> "status" = $n
 *   { status: { ne: "closed" } }         -> "status" <> $n
 *   { id: { in: [...] } }                -> "id" = ANY($n)
 *   { id: { notIn: [...] } }             -> "id" <> ALL($n)
 *   { views: { gte: 10 } }               -> "views" >= $n
 *   { title: { ilike: "%steel%" } }      -> "title" ILIKE $n           (caller supplies wildcards)
 *   { title: { contains: "100%" } }      -> "title" ILIKE $n, value "%100\%%"  (wildcards ESCAPED — trap #1)
 *   { parentId: { isNull: true } }       -> "parent_id" IS NULL        (false -> IS NOT NULL)
 *   { _or: [ {a:1}, {b:2} ] }            -> ("a" = $n OR "b" = $n+1)
 * Multiple keys on one object are AND-joined.
 *
 * orderBy:  "createdAt" | "-createdAt" | [["createdAt","DESC"],["title","ASC"]]
 *   - every term gets NULLS LAST (matches the app's `Date.parse(x) || 0` intent —
 *     trap #3) and a trailing "id" ASC tiebreak is appended unless id is already a
 *     term (stable pagination — trap #2).
 *
 * `resolveCol(key)` maps a JS field name to its column; an unknown key is passed
 * through verbatim (so a raw column name also works). It never interpolates a value.
 */

const { quoteIdent } = require("../../lib/db/util");

const OPS = {
  eq: (c, p) => `${c} = ${p}`,
  ne: (c, p) => `${c} <> ${p}`,
  gt: (c, p) => `${c} > ${p}`,
  gte: (c, p) => `${c} >= ${p}`,
  lt: (c, p) => `${c} < ${p}`,
  lte: (c, p) => `${c} <= ${p}`,
  in: (c, p) => `${c} = ANY(${p})`,
  notIn: (c, p) => `${c} <> ALL(${p})`,
  ilike: (c, p) => `${c} ILIKE ${p}`,
};

const escapeLike = (s) => String(s).replace(/[\\%_]/g, "\\$&");

function identity(k) {
  return k;
}

/**
 * @returns {{ text: string, values: any[], nextIndex: number }} — `text` is "" when
 *          there is no filter.
 */
function buildWhere(where = {}, resolveCol = identity, startIndex = 1) {
  const values = [];
  let idx = startIndex;
  const param = () => `$${idx++}`;

  function clause(obj) {
    const parts = [];
    for (const [key, raw] of Object.entries(obj || {})) {
      if (key === "_or") {
        const ors = (raw || []).map((sub) => clause(sub)).filter(Boolean);
        if (ors.length) parts.push(`(${ors.join(" OR ")})`);
        continue;
      }
      const col = quoteIdent(resolveCol(key));

      if (raw === null) {
        parts.push(`${col} IS NULL`);
        continue;
      }
      if (typeof raw !== "object" || Array.isArray(raw)) {
        // shorthand: value -> eq  (array shorthand -> IN)
        if (Array.isArray(raw)) {
          values.push(raw);
          parts.push(OPS.in(col, param()));
        } else {
          values.push(raw);
          parts.push(OPS.eq(col, param()));
        }
        continue;
      }
      for (const [op, val] of Object.entries(raw)) {
        if (op === "isNull") {
          parts.push(`${col} IS ${val ? "" : "NOT "}NULL`);
          continue;
        }
        if (op === "contains") {
          values.push(`%${escapeLike(val)}%`);
          parts.push(`${col} ILIKE ${param()}`);
          continue;
        }
        const fn = OPS[op];
        if (!fn) throw new Error(`queryBuilder: unknown where operator "${op}" on "${key}"`);
        values.push(val);
        parts.push(fn(col, param()));
      }
    }
    return parts.length ? parts.join(" AND ") : "";
  }

  const text = clause(where);
  return { text, values, nextIndex: idx };
}

/** @returns {string} e.g. `ORDER BY "created_at" DESC NULLS LAST, "id" ASC` or "" */
function buildOrderBy(orderBy, resolveCol = identity) {
  if (!orderBy) return "";
  let terms;
  if (typeof orderBy === "string") {
    const desc = orderBy.startsWith("-");
    terms = [[desc ? orderBy.slice(1) : orderBy, desc ? "DESC" : "ASC"]];
  } else {
    terms = orderBy.map((t) => (Array.isArray(t) ? t : [t, "ASC"]));
  }
  const seen = new Set();
  const sql = [];
  for (const [key, dirRaw] of terms) {
    const dir = String(dirRaw).toUpperCase() === "DESC" ? "DESC" : "ASC";
    const col = resolveCol(key);
    seen.add(col);
    sql.push(`${quoteIdent(col)} ${dir} NULLS LAST`);
  }
  if (!seen.has("id")) sql.push(`${quoteIdent("id")} ASC`);
  return `ORDER BY ${sql.join(", ")}`;
}

module.exports = { buildWhere, buildOrderBy, escapeLike };
