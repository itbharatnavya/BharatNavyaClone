/**
 * routes/jobFunctions.js — public read of the flat, admin-editable job-function
 * taxonomy (RECRUITMENT.md §2). GET only for now; admin CRUD can be added under
 * /api/admin/job-functions later the same way categories/collections were.
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");

router.get("/", async (req, res, next) => {
  try {
    const all = await store.all("job-functions.json");
    const active = all
      .filter((jf) => jf.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return res.json({ success: true, data: active });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
