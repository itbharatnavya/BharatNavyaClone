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

const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");
const { createNotification } = require("../lib/notify");
const { candidateProfileGaps } = require("../modules/recruitment");

// Employer-settable statuses via POST /:id/status — "withdrawn" is deliberately NOT in
// this set, since it's a candidate-only transition (see POST /:id/withdraw below), not
// something an employer can set on a candidate's behalf.
const VALID_STATUSES = ["applied", "viewed", "shortlisted", "interview", "rejected", "hired"];
const VALID_STATUS_SET = new Set(VALID_STATUSES);
// Every status an application can actually hold, used only to validate the GET /
// ?status= filter (an employer should be able to filter on withdrawn applications too).
const ALL_STATUSES_SET = new Set([...VALID_STATUSES, "withdrawn"]);

/* ------------------------------------------------------------- helpers ----- */

function candidateMiniOf(user) {
  if (!user) return null;
  const cp = user.candidateProfile || {};
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    headline: cp.headline || null,
    experienceYears: cp.experienceYears ?? null,
    currentRole: cp.currentRole || null,
    currentCompany: cp.currentCompany || null,
    skills: cp.skills || [],
    resumeUrl: cp.resumeUrl || null,
    // The candidate initiated this relationship by applying, so — unlike the public
    // candidate-directory gating on GET /api/candidates/:id — contact fields are
    // included here unconditionally, the same way a Directory lead carries the buyer's
    // contact info once delivered (routes/inquiries.js's Lead rows).
    contactPhone: cp.contactPhone || null,
    contactEmail: cp.contactEmail || user.email || null,
  };
}

function jobMiniOf(job) {
  if (!job) return null;
  // questions included so the candidate's My Applications view can show each answer
  // next to its actual question text (build plan Phase 3) — this is the same
  // job.questions array already shown to the candidate during apply, not new exposure.
  return { id: job.id, title: job.title, jobFunction: job.jobFunction, status: job.status, questions: job.questions || [] };
}

function canViewApplication(user, application, job) {
  if (!user) return false;
  if ((user.roles || []).includes("admin")) return true;
  if (application.candidateId === user.id) return true;
  return !!job && job.employerId === user.id;
}

/* --------------------------------------------------------- POST / ---------- */

router.post("/", authGuard, async (req, res, next) => {
  try {
    const jobId = req.body && req.body.jobId;
    if (!jobId) {
      return res.status(400).json({ success: false, error: "jobId is required" });
    }
    const job = await store.getById("jobs.json", jobId);
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

    // Duplicate-application guard + insert run inside one lock so a rapid double-submit
    // can't race past the findOne check in file-DB mode (single-process assumption,
    // same as the rest of the codebase — DIRECTORY.md §"Multi-process safety"). Under
    // Postgres, the applications(job_id, candidate_id) UNIQUE index (see
    // schema-migrations/0002_add_recruitment_tables.sql) is the real, multi-process-safe
    // backstop — caught below if this lock-based check is ever bypassed.
    let application;
    try {
      application = await store.withLock("applications.json", async () => {
        const existing = await store.findOne(
          "applications.json",
          (a) => a.jobId === jobId && a.candidateId === candidate.id
        );
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
        return store.insert("applications.json", doc, "app");
      });
    } catch (err) {
      // Postgres unique_violation — belt-and-suspenders if the lock above was somehow
      // bypassed (e.g. a future multi-process deploy). Same friendly 409 either way.
      if (err.code === "23505") {
        return res.status(409).json({ success: false, error: "You have already applied to this job" });
      }
      throw err;
    }

    // Fire-and-forget: bump the job's applicationCount and notify the employer. Neither
    // failure should fail the application itself — mirrors notifySellerOfLead's
    // best-effort shape in routes/inquiries.js.
    store.update("jobs.json", jobId, { applicationCount: (job.applicationCount || 0) + 1 }).catch(() => {});
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
    const applications = await store.findMany("applications.json", (a) => a.candidateId === req.user.id);
    applications.sort((a, b) => (Date.parse(b.appliedAt) || 0) - (Date.parse(a.appliedAt) || 0));

    // Batch-fetch every referenced job in one query (no N+1) instead of getById per row.
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const jobs = await store.findMany("jobs.json", (j) => jobIds.includes(j.id));
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
    let applications = await store.findMany("applications.json", (a) => {
      if (a.employerId !== req.user.id) return false;
      if (jobId && a.jobId !== jobId) return false;
      if (status && a.status !== status) return false;
      return true;
    });
    applications.sort((a, b) => (Date.parse(b.appliedAt) || 0) - (Date.parse(a.appliedAt) || 0));

    // Batch-fetch referenced jobs + candidates in two extra queries total (no N+1).
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const [jobs, candidates] = await Promise.all([
      store.findMany("jobs.json", (j) => jobIds.includes(j.id)),
      store.findMany("users.json", (u) => candidateIds.includes(u.id)),
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
    const application = await store.getById("applications.json", req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    const job = await store.getById("jobs.json", application.jobId);
    if (!canViewApplication(req.user, application, job)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const candidate = await store.getById("users.json", application.candidateId);
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
    const application = await store.getById("applications.json", req.params.id);
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

    const updated = await store.update("applications.json", req.params.id, {
      status,
      statusHistory,
      updatedAt: now,
    });

    const job = await store.getById("jobs.json", application.jobId);
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
    const application = await store.getById("applications.json", req.params.id);
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
    const updated = await store.update("applications.json", req.params.id, {
      status: "withdrawn",
      statusHistory,
      updatedAt: now,
    });

    const job = await store.getById("jobs.json", application.jobId);
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
// Exported for unit testing (test/applications.unit.test.js).
module.exports._internal = { candidateMiniOf, jobMiniOf, canViewApplication, VALID_STATUSES };
