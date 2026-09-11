/**
 * job.service.js — validation + normalization for job create/update, extracted
 * verbatim from routes/jobs.js in Phase 4b (no logic change). The router is now
 * thin glue; these are the pure helpers it composes.
 *
 * Still reads/writes via the predicate store through the router — the store→repository
 * flip is Phase 4d.
 */

const { paginationOf } = require("../../_shared/pagination");

const DEFAULT_LIMIT = 12;
// Hard cap regardless of what a client asks for — an unbounded ?limit= could force a
// huge in-memory sort/slice and a huge JSON response.
const MAX_LIMIT = 50;

// "draft" — a job saved but not yet published. Only POST / (create) may set it
// directly; PUT /:id also allows transitioning a draft to any other status.
const VALID_JOB_STATUSES = new Set(["active", "paused", "closed", "draft"]);
const VALID_EMPLOYMENT_TYPES = new Set(["full-time", "part-time", "contract", "internship", "freelance"]);
const VALID_EXPERIENCE_LEVELS = new Set(["entry", "mid", "senior", "lead", "executive"]);
// Same free-text convention as Directory's listings.serviceMode ("onsite"/"hybrid"/"remote").
const VALID_WORKPLACE_TYPES = new Set(["onsite", "hybrid", "remote"]);

/** Cap + floor a client-supplied page/limit pair for the job browse. */
function jobsPaginationOf(query) {
  return paginationOf(query, { defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT });
}

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  return v === true || v === "true";
}

/** Recruiter-defined screening questions: [{id, text, required}]. Validates + caps;
 *  assigns stable ids server-side so applications.answers can reference them without
 *  trusting client-supplied ids. */
function normalizeQuestions(input, max = 20) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (let i = 0; i < input.length && out.length < max; i++) {
    const raw = input[i] || {};
    const text = String(raw.text ?? "").trim().slice(0, 300);
    if (!text) continue;
    out.push({ id: raw.id && typeof raw.id === "string" ? raw.id : `q_${out.length}`, text, required: !!raw.required });
  }
  return out;
}

/** workplaceType is the source of truth going forward; `remote` is derived from it
 *  so every existing boolean-only reader (jobSearch's remoteOnly filter, admin/
 *  dashboard job cards) keeps working unmodified. A client that only sends the old
 *  `remote` boolean (no workplaceType) still gets a sensible value: true -> "remote",
 *  false/absent -> "onsite" — never "hybrid", since nothing before this migration
 *  could express that. Caller validates workplaceType against VALID_WORKPLACE_TYPES
 *  before calling this (same pattern as employmentType/experienceLevel) — an
 *  already-invalid value here falls back the same way as if none were given. */
function buildLocation(input = {}) {
  const workplaceType = VALID_WORKPLACE_TYPES.has(input.workplaceType)
    ? input.workplaceType
    : (toBool(input.remote) ? "remote" : "onsite");
  return {
    city: input.city ? String(input.city).trim() : "",
    state: input.state ? String(input.state).trim() : "",
    remote: workplaceType === "remote",
    workplaceType,
  };
}

function buildSalaryRange(input = {}) {
  return {
    min: toNumberOrNull(input.min),
    max: toNumberOrNull(input.max),
    currency: input.currency ? String(input.currency).trim() : "INR",
    // Default true (show the range) unless the employer explicitly opts out.
    isDisclosed: input.isDisclosed === undefined ? true : toBool(input.isDisclosed),
  };
}

/** Cap a client-supplied string array at a sane length; trims + drops blanks. */
function normalizeStringList(input, max = 30) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  VALID_JOB_STATUSES,
  VALID_EMPLOYMENT_TYPES,
  VALID_EXPERIENCE_LEVELS,
  VALID_WORKPLACE_TYPES,
  jobsPaginationOf,
  toNumberOrNull,
  toBool,
  normalizeQuestions,
  buildLocation,
  buildSalaryRange,
  normalizeStringList,
};
