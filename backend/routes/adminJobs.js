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
const store = require("../lib/store");
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

    const [allJobs, users] = await Promise.all([store.all("jobs.json"), store.all("users.json")]);
    const employerById = new Map(users.filter((u) => u.employerProfile).map((u) => [u.id, u]));

    let jobs = allJobs;
    if (status && status !== "all") jobs = jobs.filter((j) => j.status === status);
    if (employerId) jobs = jobs.filter((j) => j.employerId === employerId);
    if (q) {
      jobs = jobs.filter((j) => {
        const employer = employerById.get(j.employerId);
        const company = (employer?.employerProfile?.companyName || "").toLowerCase();
        const hay = `${j.title || ""} ${company}`.toLowerCase();
        return hay.includes(q);
      });
    }

    jobs = jobs.slice().sort((a, b) => (Date.parse(b.postedAt) || 0) - (Date.parse(a.postedAt) || 0));

    const total = jobs.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = jobs.slice(start, start + limit).map((j) => {
      const employer = employerById.get(j.employerId);
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
        employerCompany: employer?.employerProfile?.companyName || "Unknown",
        employerStatus: employer?.employerProfile?.status || null,
      };
    });

    return res.json({ success: true, data: { jobs: items, total, page, totalPages } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
