/**
 * jobSearch.repository.js — the ONE SQL statement behind the public job browse
 * (GET /api/jobs) and the chat assistant's job-search intent (routes/assistant.js).
 *
 * Replaces lib/jobSearch.js's "load every user + all 9 child tables, load every
 * job, filter + sort in JS" (11 queries, 2 full table scans) with a single indexed
 * query that JOINs `jobs` to the `identity_employer_cards` view for the
 * approved-employer gate (BACKEND-AUDIT.md Phase 4e). Driven by jobs_status_idx /
 * jobs_posted_at_idx / jobs_job_function_idx / employer_profiles_status_idx — all
 * of which already existed and were dead.
 *
 * Three behaviour-preservation traps carried over from the JS version:
 *   - significantTokens() matched with JS String.includes, which treats % and _
 *     literally. ILIKE/LIKE do not — every token is escaped before the pattern.
 *   - Array.prototype.sort is stable; ORDER BY is not. The old pre-sort order was
 *     `store.all()` = id ASC, so equal postedAt kept id-ascending → `, j.id ASC`.
 *   - Date.parse(undefined) || 0 sorted a missing postedAt last; Postgres DESC puts
 *     NULLs first → NULLS LAST.
 *
 * Row -> doc goes through the SAME FlatCollectionStore._fromRow the legacy store
 * uses (anti-divergence mechanism #2) — never a hand-picked projection.
 */

const { pool } = require("../../_shared/pool");
const { FlatCollectionStore, buildFlatConfigs } = require("../../_shared/mappings/flat.mappings");
const { nextId } = require("../../_shared/ids");

const jobsConfig = buildFlatConfigs(nextId).find((c) => c.file === "jobs.json");
const jobsFlat = new FlatCollectionStore(pool, jobsConfig);

/** LIKE-pattern escape — JS `includes` treats %/_/\ literally, LIKE doesn't. */
function likeContains(token) {
  return `%${String(token).replace(/[\\%_]/g, "\\$&")}%`;
}

/** Public employer card from the joined identity_employer_cards columns — the same
 *  shape as lib/jobSearch.js employerMiniOf() / identity.employerCardOf():
 *  { id, companyName, slug, logo, city, state, isVerified }. Never any contact field. */
function employerFromRow(row) {
  return {
    id: row.employer_id,
    companyName: row.emp_company_name || row.emp_name || null,
    slug: row.emp_slug || null,
    logo: row.emp_logo || row.emp_avatar_url || null,
    city: row.emp_location_city || null,
    state: row.emp_location_state || null,
    isVerified: !!row.emp_is_verified,
  };
}

/**
 * browseActiveJobs(criteria) -> Promise<{ jobs: [{ ...jobDoc, employer }], total }>
 *
 * Only active jobs from approved employers. `total` is the FULL match count,
 * independent of `limit` (count(*) OVER()), matching the old `total = jobs.length`
 * taken before the `.slice(0, limit)`.
 *
 * criteria (all optional; already normalized by the service):
 *   tokens[]         content words, OR-matched against title+description+jobFunction
 *   company          lowercased substring match on employer company_name
 *   jobFunction / employmentType / experienceLevel   exact match
 *   city / state     lowercased exact match (null column -> "")
 *   remoteOnly       true -> only location_remote = true
 *   minSalary        keep only rows whose salary_max is set and >= minSalary
 *   maxSalary        keep only rows whose salary_min is set and <= maxSalary
 *   limit            number >= 0 -> SQL LIMIT (matches the old jobs.slice(0, limit))
 */
async function browseActiveJobs({
  tokens = [],
  company = "",
  jobFunction = "",
  employmentType = "",
  experienceLevel = "",
  city = "",
  state = "",
  remoteOnly = false,
  minSalary = null,
  maxSalary = null,
  limit,
} = {}) {
  const params = [];
  const where = ["j.status = 'active'", "e.status = 'approved'"];

  if (jobFunction) { params.push(jobFunction); where.push(`j.job_function = $${params.length}`); }
  if (employmentType) { params.push(employmentType); where.push(`j.employment_type = $${params.length}`); }
  if (experienceLevel) { params.push(experienceLevel); where.push(`j.experience_level = $${params.length}`); }
  if (city) { params.push(city); where.push(`lower(coalesce(j.location_city, '')) = $${params.length}`); }
  if (state) { params.push(state); where.push(`lower(coalesce(j.location_state, '')) = $${params.length}`); }
  if (remoteOnly) { where.push("j.location_remote IS TRUE"); }
  if (minSalary !== null) {
    params.push(minSalary);
    where.push(`j.salary_max IS NOT NULL AND j.salary_max >= $${params.length}`);
  }
  if (maxSalary !== null) {
    params.push(maxSalary);
    where.push(`j.salary_min IS NOT NULL AND j.salary_min <= $${params.length}`);
  }

  if (tokens.length) {
    const hay =
      "lower(coalesce(j.title, '') || ' ' || coalesce(j.description, '') || ' ' || coalesce(j.job_function, ''))";
    const ors = tokens.map((tok) => {
      params.push(likeContains(tok));
      return `${hay} LIKE $${params.length} ESCAPE '\\'`;
    });
    where.push(`(${ors.join(" OR ")})`);
  }
  if (company) {
    params.push(likeContains(company));
    where.push(`lower(coalesce(e.company_name, '')) LIKE $${params.length} ESCAPE '\\'`);
  }

  let sql = `
    SELECT j.*, count(*) OVER()::int AS __total,
           e.company_name    AS emp_company_name,
           e.slug            AS emp_slug,
           e.logo            AS emp_logo,
           e.is_verified     AS emp_is_verified,
           e.location_city   AS emp_location_city,
           e.location_state  AS emp_location_state,
           e.name            AS emp_name,
           e.avatar_url      AS emp_avatar_url
      FROM jobs j
      JOIN identity_employer_cards e ON e.user_id = j.employer_id
     WHERE ${where.join(" AND ")}
     ORDER BY j.posted_at DESC NULLS LAST, j.id ASC`;

  if (typeof limit === "number" && limit >= 0) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  const res = await pool.query(sql, params);
  const total = res.rows.length ? res.rows[0].__total : 0;
  const jobs = res.rows.map((row) => ({ ...jobsFlat._fromRow(row), employer: employerFromRow(row) }));
  return { jobs, total };
}

module.exports = { browseActiveJobs };
