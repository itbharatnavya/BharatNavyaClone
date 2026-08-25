/**
 * routes/jobRoles.js — public read of the predefined job-title picklist
 * (RECRUITMENT.md §2 companion to job-functions.json). GET only for now; admin CRUD
 * can be added under /api/admin/job-roles later the same way job-functions was.
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");

router.get("/", async (req, res, next) => {
  try {
    const jobFunction = req.query.jobFunction ? String(req.query.jobFunction).trim() : undefined;
    const all = await store.all("job-roles.json");
    const active = all
      .filter((r) => r.isActive !== false)
      .filter((r) => !jobFunction || r.jobFunction === jobFunction)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.json({ success: true, data: active });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
