/**
 * routes/adminJobs.js — admin visibility over ALL jobs, regardless of status or
 * employer-approval (RECRUITMENT.md: "no dedicated job-moderation queue... admin can
 * already PUT /api/jobs/:id to pause/close one"). The public GET /api/jobs
 * (routes/jobs.js) only returns status:"active" jobs from approved employers, so it
 * can't be reused for admin visibility.
 *
 * Mounted at /api/admin/jobs, BEFORE the blanket `/api/admin` guard in index.js — same
 * nested-admin-route pattern as adminListings.js/adminCategories.js. Self-guarded.
 *
 * GET /  — all jobs, paginated, filterable by status/employer/company/search.
 *
 * No mutation route here — pause/activate/close reuse the existing PUT /api/jobs/:id
 * (isOwnerOrAdmin already lets an admin patch status).
 */

const express = require("express");
const router = express.Router();
const identity = require("../modules/identity");
const recruitment = require("../modules/recruitment");
const { authGuard, requireRole } = require("../middleware/authGuard");
const { paginationOf } = require("../modules/_shared/pagination");

router.use(authGuard, requireRole("admin"));

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = paginationOf(req.query, { defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT });
    const status = req.query.status;
    const employerId = req.query.employerId;
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : "";

    // Phase 7: status/employerId filter pushed to jobsRepo criteria (SQL); the
    // employer company-name/status come from identity's view-backed card map for
    // just the employerIds present — was a full store.all of the jobs + users
    // collections (the latter a composite hydrate of every user).
    const where = {};
    if (status && status !== "all") where.status = status;
    if (employerId) where.employerId = employerId;
    const jobs0 = await recruitment.jobsRepo.findMany({ where });
    const employerById = await identity.getEmployerStatusCards(jobs0.map((j) => j.employerId));

    let jobs = jobs0;
    if (q) {
      jobs = jobs.filter((j) => {
        const company = (employerById.get(j.employerId)?.companyName || "").toLowerCase();
        const hay = `${j.title || ""} ${company}`.toLowerCase();
        return hay.includes(q);
      });
    }

    jobs = jobs.slice().sort((a, b) => (Date.parse(b.postedAt) || 0) - (Date.parse(a.postedAt) || 0));

    const total = jobs.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = jobs.slice(start, start + limit).map((j) => {
      const emp = employerById.get(j.employerId);
      return {
        id: j.id,
        title: j.title,
        status: j.status,
        employmentType: j.employmentType,
        experienceLevel: j.experienceLevel,
        location: j.location,
        postedAt: j.postedAt,
        applicationCount: j.applicationCount || 0,
        employerId: j.employerId,
        employerCompany: emp?.companyName || "Unknown",
        employerStatus: emp?.status || null,
      };
    });

    return res.json({ success: true, data: { jobs: items, total, page, totalPages } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
