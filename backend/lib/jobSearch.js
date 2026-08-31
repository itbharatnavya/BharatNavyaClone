/**
 * jobSearch.js — shared Recruitment job matching (mirrors lib/search.js's role
 * for Directory listings). Used by routes/jobs.js's public browse AND the chat
 * assistant's job-search intent (routes/assistant.js), so both stay in sync
 * instead of duplicating the "active job, approved employer" gating logic.
 */

const store = require("../lib/store");

// Query-matching stopwords: ordinary English stopwords plus job-search filler
// words that carry no discriminating signal on their own ("job"/"role"/"apply"
// appear in nearly every query by construction — the intent detector already
// used them to decide this IS a job search). Left in, they'd force every
// query to also literally contain the word "role"/"position" in a job's
// title/description, which real postings rarely phrase that way — dropping
// them and matching on the REMAINING content words (e.g. "developer") is
// what makes a natural chat sentence like "I want to apply for a developer
// role" actually find a "Developer" posting instead of matching nothing.
const QUERY_STOPWORDS = new Set([
  "a", "an", "the", "i", "im", "to", "in", "at", "near", "for", "of", "and",
  "or", "my", "me", "some", "any", "please", "want", "wanted", "looking",
  "look", "find", "get", "best", "top", "good", "with", "on", "is", "are",
  "who", "can", "someone", "somebody", "there", "please", "job", "jobs",
  "vacancy", "vacancies", "hiring", "career", "careers", "position",
  "positions", "opening", "openings", "role", "roles", "apply", "applying",
  "recruiter", "candidate", "candidates",
]);

/** Meaningful, deduped query tokens with job-search filler words stripped —
 *  empty when the query was ONLY filler (e.g. "any jobs?"), which callers
 *  should treat the same as no query (browse everything). */
function significantTokens(q) {
  const words = String(q || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return [...new Set(words.filter((w) => w.length >= 2 && !QUERY_STOPWORDS.has(w)))];
}

/** Public job-card employer info — never includes contact fields (those are
 *  only ever served from GET /api/employers/:slug). Mirrors routes/jobs.js. */
function employerMiniOf(user) {
  if (!user) return null;
  const ep = user.employerProfile || {};
  return {
    id: user.id,
    companyName: ep.companyName || user.name || null,
    slug: ep.slug || null,
    logo: ep.logo || user.avatarUrl || null,
    city: (ep.location && ep.location.city) || null,
    state: (ep.location && ep.location.state) || null,
    isVerified: !!ep.isVerified,
  };
}

/**
 * searchJobs({ q, filters, limit }) -> Promise<{ jobs: [...], total }>
 *
 * Only active jobs from approved employers are ever returned (public-browse
 * gating, same shape as Directory's approvedSellerIds gate). `filters` accepts
 * the same keys as GET /api/jobs: company, jobFunction, employmentType,
 * experienceLevel, city, state, remote, minSalary, maxSalary. `q` is matched
 * against title + description + jobFunction (a superset of the public route's
 * title+description match, so a natural-language chat query like "developer
 * jobs" also catches a jobFunction of "Software Development").
 */
async function searchJobs({ q, filters = {}, limit } = {}) {
  const f = filters || {};
  // Content words only (see significantTokens()) — matched with OR semantics
  // against title/description/jobFunction, since a real chat sentence mixes
  // many filler words with just one or two actual criteria.
  const queryTokens = significantTokens(q);
  const company = f.company ? String(f.company).trim().toLowerCase() : "";
  const city = f.city ? String(f.city).trim().toLowerCase() : "";
  const state = f.state ? String(f.state).trim().toLowerCase() : "";
  const remoteOnly = f.remote === true || f.remote === "true";
  const minSalary = f.minSalary != null && f.minSalary !== "" ? Number(f.minSalary) : null;
  const maxSalary = f.maxSalary != null && f.maxSalary !== "" ? Number(f.maxSalary) : null;

  const users = await store.all("users.json");
  const employerById = new Map(users.filter((u) => u.employerProfile).map((u) => [u.id, u]));

  let jobs = await store.findMany("jobs.json", (j) => {
    if (j.status !== "active") return false;
    const employer = employerById.get(j.employerId);
    if (!employer || employer.employerProfile.status !== "approved") return false;
    if (f.jobFunction && j.jobFunction !== f.jobFunction) return false;
    if (f.employmentType && j.employmentType !== f.employmentType) return false;
    if (f.experienceLevel && j.experienceLevel !== f.experienceLevel) return false;
    const loc = j.location || {};
    if (city && String(loc.city || "").toLowerCase() !== city) return false;
    if (state && String(loc.state || "").toLowerCase() !== state) return false;
    if (remoteOnly && !loc.remote) return false;
    const sr = j.salaryRange || {};
    if (minSalary !== null && (sr.max === null || sr.max === undefined || sr.max < minSalary)) return false;
    if (maxSalary !== null && (sr.min === null || sr.min === undefined || sr.min > maxSalary)) return false;
    if (queryTokens.length) {
      const hay = `${j.title || ""} ${j.description || ""} ${j.jobFunction || ""}`.toLowerCase();
      if (!queryTokens.some((t) => hay.includes(t))) return false;
    }
    if (company) {
      const companyName = (employer.employerProfile.companyName || "").toLowerCase();
      if (!companyName.includes(company)) return false;
    }
    return true;
  });

  jobs = jobs.slice().sort((a, b) => (Date.parse(b.postedAt) || 0) - (Date.parse(a.postedAt) || 0));
  const total = jobs.length;
  if (typeof limit === "number" && limit >= 0) jobs = jobs.slice(0, limit);

  const withEmployer = jobs.map((j) => ({ ...j, employer: employerMiniOf(employerById.get(j.employerId)) }));
  return { jobs: withEmployer, total };
}

module.exports = { searchJobs, employerMiniOf };
