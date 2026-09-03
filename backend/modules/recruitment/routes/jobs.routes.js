/**
 * routes/jobs.js — Recruitment: public job browse + job CRUD (RECRUITMENT.md §3).
 *
 * GET  /            public browse (filters + pagination) — active jobs from approved
 *                    employers only, same gating shape as Directory's listings browse
 * GET  /mine         the calling employer's own jobs, any status (authGuard)
 * GET  /:id          single job + public employer mini-info; increments viewCount
 * POST /             create a job (authGuard; requires an existing employerProfile —
 *                    see the Recruitment role-lock enhancement pass; no longer
 *                    lazily stubs one, since that would bypass role selection)
 * PUT  /:id          merge-update (authGuard; owner or admin)
 * DELETE /:id        delete (authGuard; owner or admin)
 *
 * Response envelope: { success, data } / { success:false, error } — mirrors every
 * other route file (CLAUDE.md §5).
 *
 * Deliberately separate from routes/listings.js — see RECRUITMENT.md §1 ("separate
 * collections, not listings.json reuse").
 *
 * Phase 4d: the CRUD paths (/mine, /:id, POST, PUT, DELETE) run through
 * modules/recruitment `jobsRepo` (criteria-grammar repository over the `jobs` table),
 * not the predicate store. Phase 4e: the public browse (GET /) now runs through
 * modules/recruitment `searchJobs` — one indexed SQL query joining jobs to the
 * identity_employer_cards view, not an in-JS match+sort over every row.
 */

const express = require("express");
const router = express.Router();

const { authGuard } = require("../../../middleware/authGuard");
const identity = require("../../identity");
const {
  searchJobs,
  employerProfileGaps,
  jobsRepo,
  // job.service.js — validation/normalization (Phase 4b extraction)
  VALID_JOB_STATUSES,
  VALID_EMPLOYMENT_TYPES,
  VALID_EXPERIENCE_LEVELS,
  jobsPaginationOf,
  toNumberOrNull,
  toBool,
  normalizeQuestions,
  buildLocation,
  buildSalaryRange,
  normalizeStringList,
  // policy.js
  isJobOwnerOrAdmin,
} = require("../index");
const { validateBody } = require("../http/validateBody");
const { updateJob: updateJobSchema } = require("../schema/job.schema");

/* --------------------------------------------------- GET / (browse) -------- */

router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = jobsPaginationOf(req.query);
    const q = req.query.q ? String(req.query.q).trim() : "";

    // Filtering/gating logic lives in modules/recruitment jobSearch (shared with
    // the chat assistant's job-search intent, routes/assistant.js) — pagination
    // stays route-local since the shared helper returns the full match set + total.
    const { jobs: allMatches, total } = await searchJobs({
      q,
      filters: {
        company: req.query.company,
        jobFunction: req.query.jobFunction,
        employmentType: req.query.employmentType,
        experienceLevel: req.query.experienceLevel,
        city: req.query.city,
        state: req.query.state,
        remote: toBool(req.query.remote),
        minSalary: toNumberOrNull(req.query.minSalary),
        maxSalary: toNumberOrNull(req.query.maxSalary),
      },
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const pageItems = allMatches.slice(start, start + limit);

    return res.json({ success: true, data: { jobs: pageItems, total, page, totalPages } });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------- GET /mine ----------- */

router.get("/mine", authGuard, async (req, res, next) => {
  try {
    // Phase 4d: repository criteria + ORDER BY replace store.findMany(predicate) + a
    // JS sort. `-postedAt` compiles to `posted_at DESC NULLS LAST, id ASC` — proven
    // row-identical to the old `Date.parse(b.postedAt)||0 - …` sort in
    // test/differential.test.js.
    const jobs = await jobsRepo.findMany({ where: { employerId: req.user.id }, orderBy: "-postedAt" });
    return res.json({ success: true, data: { jobs } });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- GET /:id (detail) --------- */

router.get("/:id", async (req, res, next) => {
  try {
    const job = await jobsRepo.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    // Fire-and-forget view-count bump — now an ATOMIC increment (Phase 4d), which
    // closes the lost-update race (finding C2) that the old read-modify-write
    // `{ viewCount: (job.viewCount||0)+1 }` had. Still fire-and-forget: view counts
    // are a display metric, not a billing input (CLAUDE.md §5).
    jobsRepo.incrementById(job.id, "viewCount", 1).catch(() => {});

    // Employer mini-info via the identity port (Phase 3) — same shape as the old
    // employerMiniOf(store.getById("users.json", …)).
    const employer = await identity.getEmployerCard(job.employerId);
    return res.json({ success: true, data: { ...job, employer } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------- POST / ---------- */

router.post("/", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    const title = String(b.title || "").trim();
    if (!title) {
      return res.status(400).json({ success: false, error: "title is required" });
    }
    if (b.employmentType && !VALID_EMPLOYMENT_TYPES.has(b.employmentType)) {
      return res.status(400).json({ success: false, error: "invalid employmentType" });
    }
    if (b.experienceLevel && !VALID_EXPERIENCE_LEVELS.has(b.experienceLevel)) {
      return res.status(400).json({ success: false, error: "invalid experienceLevel" });
    }

    const user = req.user;
    if (user.recruitmentRoleLockedAt && user.recruitmentRole !== "recruiter") {
      return res.status(403).json({ success: false, error: "Candidates cannot post jobs." });
    }
    // Full company-profile gate — an incomplete company profile can't post a job. Same
    // rules as frontend/lib/recruitmentProfile.ts (the Post-a-job page pre-checks and
    // shows the same checklist). `missing` is [{ key, label }]; when there's no profile
    // at all it's a single { key: "profile" } row.
    const missing = employerProfileGaps(user);
    if (missing.length) {
      return res.status(403).json({
        success: false,
        error: user.employerProfile
          ? "Complete your company profile before posting a job."
          : "Create your company profile before posting a job.",
        code: user.employerProfile ? "employer_profile_incomplete" : "employer_profile_required",
        missing,
      });
    }

    const job = {
      employerId: user.id,
      title,
      description: b.description ? String(b.description).trim() : "",
      jobFunction: b.jobFunction ? String(b.jobFunction).trim() : null,
      employmentType: b.employmentType || null,
      experienceLevel: b.experienceLevel || null,
      location: buildLocation(b.location),
      salaryRange: buildSalaryRange(b.salaryRange),
      skills: normalizeStringList(b.skills, 30),
      responsibilities: normalizeStringList(b.responsibilities, 30),
      requirements: normalizeStringList(b.requirements, 30),
      benefits: normalizeStringList(b.benefits, 30),
      questions: normalizeQuestions(b.questions),
      openings: Number.isFinite(Number(b.openings)) && Number(b.openings) > 0 ? Math.floor(Number(b.openings)) : 1,
      // Only "draft" is accepted from the client at creation time — every other status
      // value (paused/closed) is reachable only via PUT /:id after the job exists.
      status: b.status === "draft" ? "draft" : "active",
      viewCount: 0,
      applicationCount: 0,
      postedAt: new Date().toISOString(),
      expiresAt: b.expiresAt || null,
      qualification: b.qualification ? String(b.qualification).trim() : null,
    };

    const inserted = await jobsRepo.insert(job, "job");
    return res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------- PUT /:id -------- */

router.put("/:id", authGuard, validateBody(updateJobSchema), async (req, res, next) => {
  try {
    const job = await jobsRepo.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    if (!isJobOwnerOrAdmin(req.user, job)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // The write allowlist is the zod schema (modules/recruitment/schema/job.schema.js,
    // `.strip()`) — validateBody has already dropped every non-editable key
    // (id / employerId / postedAt / viewCount / applicationCount / ranking fields).
    const patch = { ...req.body };
    if (patch.status !== undefined) {
      if (!VALID_JOB_STATUSES.has(patch.status)) {
        return res.status(400).json({ success: false, error: "invalid status" });
      }
    }
    if (patch.employmentType !== undefined && patch.employmentType !== null && !VALID_EMPLOYMENT_TYPES.has(patch.employmentType)) {
      return res.status(400).json({ success: false, error: "invalid employmentType" });
    }
    if (patch.experienceLevel !== undefined && patch.experienceLevel !== null && !VALID_EXPERIENCE_LEVELS.has(patch.experienceLevel)) {
      return res.status(400).json({ success: false, error: "invalid experienceLevel" });
    }
    if (patch.location !== undefined) patch.location = buildLocation(patch.location);
    if (patch.salaryRange !== undefined) patch.salaryRange = buildSalaryRange(patch.salaryRange);
    if (patch.skills !== undefined) patch.skills = normalizeStringList(patch.skills, 30);
    if (patch.responsibilities !== undefined) patch.responsibilities = normalizeStringList(patch.responsibilities, 30);
    if (patch.requirements !== undefined) patch.requirements = normalizeStringList(patch.requirements, 30);
    if (patch.benefits !== undefined) patch.benefits = normalizeStringList(patch.benefits, 30);
    if (patch.questions !== undefined) patch.questions = normalizeQuestions(patch.questions);

    const updated = await jobsRepo.updateById(req.params.id, patch);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------- DELETE /:id ------- */

router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const job = await jobsRepo.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    if (!isJobOwnerOrAdmin(req.user, job)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await jobsRepo.deleteById(req.params.id);
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
