/**
 * job.schema.js — zod body for PUT /api/jobs/:id (BACKEND-AUDIT.md Phase 4c).
 *
 * `.strip()` makes this schema the write allowlist: it structurally replaces the
 * hand-written `JOB_EDITABLE` Set in routes/jobs.js (BACKEND-AUDIT.md 1a — "the
 * schema IS the allowlist"). Unknown keys — id / employerId / postedAt / viewCount /
 * applicationCount / any ranking or monetization field — are dropped exactly as the
 * Set dropped them (contract-neutral: unknown fields ignored, not rejected).
 *
 * Field VALUES stay `z.any()` — the router still runs buildLocation /
 * buildSalaryRange / normalizeStringList / normalizeQuestions and the status /
 * employmentType / experienceLevel enum checks on the parsed body, unchanged. This
 * pass only moves the allowlist, not the normalization.
 *
 * POST /api/jobs and the application endpoints keep their inline field-by-field
 * reads (they never spread the body, so there is no allowlist there to replace) —
 * folding those into schemas is a later step, once it can be done without shifting a
 * single 400 message.
 */

const { z } = require("zod");

const opt = z.any().optional();

// Exactly the fields routes/jobs.js's PUT handler reads when building `patch`.
const updateJob = z
  .object({
    title: opt,
    description: opt,
    jobFunction: opt,
    employmentType: opt,
    experienceLevel: opt,
    location: opt,
    salaryRange: opt,
    skills: opt,
    responsibilities: opt,
    requirements: opt,
    benefits: opt,
    questions: opt,
    openings: opt,
    status: opt,
    expiresAt: opt,
    qualification: opt,
  })
  .strip();

module.exports = { updateJob };
