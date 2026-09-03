/**
 * routes/applications.js — Recruitment: candidate applications + employer review
 * (RECRUITMENT.md §3). The application analog of Directory's routes/inquiries.js
 * lead/quote flow, simplified: an application always targets exactly one job (no
 * fan-out — a job has exactly one employer, unlike a broad RFQ).
 *
 * POST /             candidate applies to a job (authGuard — applying needs identity;
 *                    403 if recruitmentRole is "recruiter"; 400 if the candidate's
 *                    profile is incomplete (recruitment.candidateProfileGaps
 *                    — headline/summary/experience/skills/mobile/email/CV), or hasn't
 *                    answered all of the job's required questions)
 * GET  /mine          candidate's own applications
 * GET  /               employer's received applications across THEIR OWN jobs only
 *                      (authGuard; always scoped to req.user.id as employer — an admin
 *                      role does NOT widen this list; optional ?jobId=&status= filters)
 * GET  /:id             single application (candidate owner, job's employer, or admin)
 * POST /:id/status       employer updates status (authGuard; owner or admin)
 */

const express = require("express");
const router = express.Router();

const identity = require("../../identity");
const { authGuard } = require("../../../middleware/authGuard");
const { createNotification } = require("../../../lib/notify");
const {
  candidateProfileGaps,
  // application.service.js (Phase 4b extraction)
  VALID_STATUSES,
  VALID_STATUS_SET,
  ALL_STATUSES_SET,
  candidateMiniOf,
  jobMiniOf,
  // policy.js
  canViewApplication,
  // repositories (Phase 4d)
  jobsRepo,
  appsRepo,
} = require("../index");

/* --------------------------------------------------------- POST / ---------- */

router.post("/", authGuard, async (req, res, next) => {
  try {
    const jobId = req.body && req.body.jobId;
    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }
    const job = await jobsRepo.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    if (job.status !== "active") {
      return res.status(400).json({ success: false, error: "This job is no longer accepting applications" });
    }

    const candidate = req.user;
    if (candidate.recruitmentRole === "recruiter") {
      return res.status(403).json({ success: false, error: "Recruiters cannot apply to jobs." });
    }

    const cp = candidate.candidateProfile || {};
    const resumeUrl = (req.body && req.body.resumeUrl) || cp.resumeUrl || null;
    const coverNote = req.body && req.body.coverNote ? String(req.body.coverNote).trim().slice(0, 4000) : "";

    // Full candidate-profile gate: an incomplete profile can't apply at all. The same
    // rules power the Apply modal's pre-check and the dashboard Candidate profile form
    // (frontend/lib/recruitmentProfile.ts), so the applicant is turned away here only
    // if they somehow bypassed the client gate. `missing` is [{ key, label }] — the
    // frontend renders it as a checklist and links to ?tab=profile.
    const missing = candidateProfileGaps({
      ...candidate,
      candidateProfile: { ...cp, resumeUrl: resumeUrl || cp.resumeUrl || null },
    });
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: "Complete your candidate profile before applying.",
        code: "candidate_profile_incomplete",
        missing,
      });
    }

    // Recruiter-defined required questions must all be answered.
    const answersInput = Array.isArray(req.body && req.body.answers) ? req.body.answers : [];
    const answers = [];
    const missingQuestions = [];
    for (const q of job.questions || []) {
      const found = answersInput.find((a) => a && a.questionId === q.id);
      const text = found && found.text ? String(found.text).trim().slice(0, 2000) : "";
      if (q.required && !text) {
        missingQuestions.push({ id: q.id, text: q.text });
        continue;
      }
      if (text) answers.push({ questionId: q.id, text });
    }
    if (missingQuestions.length) {
      return res.status(400).json({
        success: false,
        error: "Answer all required questions before applying.",
        missingQuestions,
      });
    }

    // Duplicate-application guard: the fast-path check (already applied → friendly
    // 409) plus the real backstop — the applications(job_id, candidate_id) UNIQUE
    // index (schema-migrations/0002_add_recruitment_tables.sql), which is
    // multi-process-safe and caught as `23505` below. Phase 4d dropped the file-DB
    // `store.withLock` wrapper — under Postgres the index, not a single-process
    // mutex, is what actually serializes a rapid double-submit.
    let application;
    try {
      const existing = await appsRepo.findOne({ where: { jobId, candidateId: candidate.id } });
      if (existing) {
        const err = new Error("You have already applied to this job");
        err.status = 409;
        throw err;
      }
      const now = new Date().toISOString();
      const doc = {
        jobId,
        employerId: job.employerId,
        candidateId: candidate.id,
        resumeUrl,
        coverNote,
        answers,
        status: "applied",
        statusHistory: [{ status: "applied", note: null, changedAt: now }],
        appliedAt: now,
        updatedAt: now,
      };
      application = await appsRepo.insert(doc, "app");
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ success: false, error: "You have already applied to this job" });
      }
      throw err;
    }

    // Fire-and-forget: bump the job's applicationCount (Phase 4d — atomic increment,
    // closes the C2 lost-update race) and notify the employer. Neither failure should
    // fail the application itself — mirrors notifySellerOfLead's best-effort shape.
    jobsRepo.incrementById(jobId, "applicationCount", 1).catch(() => {});
    createNotification(job.employerId, "new_application", {
      jobId,
      jobTitle: job.title,
      applicationId: application.id,
      candidateName: candidate.name,
    }).catch(() => {});

    return res.status(201).json({ success: true, data: application });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ success: false, error: err.message });
    }
    next(err);
  }
});

/* ----------------------------------------------------- GET /mine ----------- */

router.get("/mine", authGuard, async (req, res, next) => {
  try {
    // Phase 4d: repo criteria + ORDER BY replace store.findMany(predicate) + JS sort
    // (row-identical — test/differential.test.js "GET /applications/mine equivalent").
    const applications = await appsRepo.findMany({
      where: { candidateId: req.user.id },
      orderBy: "-appliedAt",
    });

    // Batch-fetch every referenced job in one query (no N+1).
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const jobs = jobIds.length ? await jobsRepo.findMany({ where: { id: { in: jobIds } } }) : [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));

    const data = applications.map((a) => ({ ...a, job: jobMiniOf(jobById.get(a.jobId)) }));
    return res.json({ success: true, data: { applications: data } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------- GET / ----------- */

router.get("/", authGuard, async (req, res, next) => {
  try {
    const { jobId, status } = req.query;
    if (status !== undefined && !ALL_STATUSES_SET.has(status)) {
      return res.status(400).json({ success: false, error: "invalid status filter" });
    }

    // Always employer-scoped to the caller. This is the recruiter dashboard's own
    // "applications for my jobs" feed — an admin role must NOT turn it into a
    // cross-employer firehose (that leaked every employer's applications into the
    // dashboard of any user who also held the admin role). Admin per-record access
    // still exists on GET /:id and POST /:id/status.
    // Phase 4d: employer-scoped feed via repo criteria + ORDER BY (was a full
    // store.findMany scan + JS sort). Always scoped to req.user.id as employer — an
    // admin role never widens this list.
    const where = { employerId: req.user.id };
    if (jobId) where.jobId = String(jobId);
    if (status) where.status = String(status);
    const applications = await appsRepo.findMany({ where, orderBy: "-appliedAt" });

    // Batch-fetch referenced jobs + candidates (no N+1). Candidates via the
    // identity port's by-id hydrate (Phase 7; was a store.findMany full scan).
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const [jobs, candidates] = await Promise.all([
      jobIds.length ? jobsRepo.findMany({ where: { id: { in: jobIds } } }) : [],
      identity.hydrateUsersByIds(candidateIds),
    ]);
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const candidateById = new Map(candidates.map((u) => [u.id, u]));

    const data = applications.map((a) => ({
      ...a,
      job: jobMiniOf(jobById.get(a.jobId)),
      candidate: candidateMiniOf(candidateById.get(a.candidateId)),
    }));
    return res.json({ success: true, data: { applications: data } });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------- GET /:id ------------ */

router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const application = await appsRepo.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    const job = await jobsRepo.findById(application.jobId);
    if (!canViewApplication(req.user, application, job)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const candidate = await identity.getAuthUser(application.candidateId);
    return res.json({
      success: true,
      data: { ...application, job: jobMiniOf(job), candidate: candidateMiniOf(candidate) },
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------- POST /:id/status -------- */

router.post("/:id/status", authGuard, async (req, res, next) => {
  try {
    const status = req.body && req.body.status;
    if (!VALID_STATUS_SET.has(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    const application = await appsRepo.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    const isAdmin = (req.user.roles || []).includes("admin");
    if (!isAdmin && application.employerId !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const note = req.body && req.body.note ? String(req.body.note).trim().slice(0, 1000) : null;
    const now = new Date().toISOString();
    const statusHistory = [...(application.statusHistory || []), { status, note, changedAt: now }];

    const updated = await appsRepo.updateById(req.params.id, {
      status,
      statusHistory,
      updatedAt: now,
    });

    const job = await jobsRepo.findById(application.jobId);
    createNotification(application.candidateId, "application_status", {
      jobId: application.jobId,
      jobTitle: job ? job.title : null,
      applicationId: application.id,
      status,
    }).catch(() => {});

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- POST /:id/withdraw ------- */
// Candidate-only, self-service withdrawal (build-plan Phase 1/3). Blocked once
// hired (nothing to withdraw from) or already withdrawn. Unlike POST /:id/status,
// this is never reachable by the employer — the candidate is the only party who can
// initiate it, mirroring the applied-by-candidate-only shape of POST / above.
router.post("/:id/withdraw", authGuard, async (req, res, next) => {
  try {
    const application = await appsRepo.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    if (application.candidateId !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    if (application.status === "withdrawn") {
      return res.status(400).json({ success: false, error: "This application is already withdrawn" });
    }
    if (application.status === "hired") {
      return res.status(400).json({ success: false, error: "Cannot withdraw a hired application" });
    }

    const now = new Date().toISOString();
    const statusHistory = [...(application.statusHistory || []), { status: "withdrawn", note: null, changedAt: now }];
    const updated = await appsRepo.updateById(req.params.id, {
      status: "withdrawn",
      statusHistory,
      updatedAt: now,
    });

    const job = await jobsRepo.findById(application.jobId);
    createNotification(application.employerId, "application_withdrawn", {
      jobId: application.jobId,
      jobTitle: job ? job.title : null,
      applicationId: application.id,
      candidateName: req.user.name,
    }).catch(() => {});

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
