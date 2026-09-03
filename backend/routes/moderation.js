/**
 * moderation.js — admin content moderation + seller-verification review queue.
 *
 * This surface lets an admin approve / hide / delete vendor BLOGS and STORIES,
 * and review seller GST/PAN VERIFICATION requests. Reviews are NOT moderated —
 * they publish immediately on submission (see routes/reviews.js) — so "review"
 * is not a valid /content type here.
 *
 * EVERY route is admin-only. The guard is applied inside the router (router.use) so
 * index.js mounts it plainly BEFORE the blanket /api/admin router:
 *   app.use("/api/admin/moderation", require("./routes/moderation"))
 *
 *   GET  /content?type=blog|story                → all rows (incl. hidden/draft),
 *                                                    enriched with author + title/snippet
 *   POST /:type/:id/hide                          → status "hidden"      (off the site)
 *   POST /:type/:id/approve                       → back to published
 *   POST /:type/:id/delete                        → remove the row
 *
 *   GET  /verifications                           → seller verification requests
 *   POST /verifications/:id/approve               → grant verified badge + trust seal
 *   POST /verifications/:id/reject                → mark request rejected
 *
 * Hiding works because the PUBLIC reads already exclude "hidden":
 *   - blogs.js  list read keeps only status "published"; the single-slug read 404s "hidden"
 *   - stories.js reads filter out status "hidden"
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../modules/_shared");
const identity = require("../modules/identity");
const { verificationRepo: verifRepo } = require("../modules/platform");
const { authGuard, requireRole } = require("../middleware/authGuard");

// Auth + admin role for every endpoint below.
router.use(authGuard, requireRole("admin"));

// Per-type metadata: which repository + what "visible" status means for that type.
const TYPE_META = {
  blog: { repo: repoForCollection("blogs.json"), published: "published" },
  story: { repo: repoForCollection("stories.json"), published: "published" },
};
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Strip markdown/whitespace and clip to a short snippet for the moderation table. */
function snippet(text, len = 140) {
  const s = String(text || "")
    .replace(/[#*_>`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

/** Normalize one row of the given type into a uniform moderation item. */
function toItem(type, row, byId) {
  const who = byId.get(row.sellerId);
  const authorType = (who && who.type) || null;
  if (type === "blog") {
    return {
      id: row.id,
      type,
      title: row.title || "(untitled)",
      snippet: snippet(row.excerpt || row.body),
      author: (who && who.company) || "Unknown",
      authorType,
      target: null,
      status: row.status || "published",
      date: row.publishedAt || row.createdAt || null,
      href: row.slug ? `/blog/${row.slug}` : null,
    };
  }
  // story
  return {
    id: row.id,
    type,
    title: row.caption ? snippet(row.caption, 60) : "Story",
    snippet: row.media ? `${row.media.type || "media"} · ${row.media.url || ""}` : "",
    author: (who && who.company) || "Unknown",
    authorType,
    target: null,
    status: row.status || "published",
    date: row.createdAt || null,
    href: null,
  };
}

/* =========================================================== content queue == */
// GET /content?type=blog|story&authorType=seller|employer — every row (hidden/pending
// included), optionally scoped to which product's accounts authored it (mirrors
// blogs.js's own GET / authorType filter, applied post-lookup the same way).
router.get("/content", async (req, res, next) => {
  try {
    const type = String(req.query.type || "").toLowerCase();
    const meta = TYPE_META[type];
    if (!meta) {
      return res
        .status(400)
        .json({ success: false, error: "type must be blog | story" });
    }
    const authorType = req.query.authorType;
    const rows = await meta.repo.findMany({});
    // Author company/type only for the ids actually present (Phase 5e) — not a
    // `store.all("users.json")` hydrate of every user.
    const byId = await identity.getAccountCards(rows.map((r) => r.sellerId));
    let items = rows
      .map((r) => toItem(type, r, byId))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (authorType === "seller" || authorType === "employer") {
      items = items.filter((i) => i.authorType === authorType);
    }
    return res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------- verifications */
// Declared BEFORE the generic /:type/:id/:action so "verifications" is never
// mistaken for a content type.

// GET /verifications — all requests, newest first, enriched with company name.
router.get("/verifications", async (req, res, next) => {
  try {
    const status = req.query.status;
    const rows = await verifRepo.findMany({});
    const byId = await identity.getAccountCards(rows.map((r) => r.sellerId));
    let list = rows;
    if (status && status !== "all") list = list.filter((r) => r.status === status);
    const data = list
      .map((r) => {
        const who = byId.get(r.sellerId);
        return { ...r, companyName: (who && who.company) || r.sellerId };
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /verifications/:id/approve — grant the verified badge + trust seal (+1yr).
router.post("/verifications/:id/approve", async (req, res, next) => {
  try {
    const request = await verifRepo.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    const user = await identity.getAuthUser(request.sellerId);
    if (!user || !user.sellerProfile) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }
    const sellerProfile = {
      ...user.sellerProfile,
      isVerified: true,
      trustSealVerified: true,
      verifiedBadgeExpiry: new Date(Date.now() + YEAR_MS).toISOString(),
    };
    await identity.updateUser(user.id, { sellerProfile });
    const updated = await verifRepo.updateById(request.id, {
      status: "approved",
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /verifications/:id/reject — mark the request rejected (badge untouched).
router.post("/verifications/:id/reject", async (req, res, next) => {
  try {
    const updated = await verifRepo.updateById(req.params.id, {
      status: "rejected",
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------ content moderation actions */
// POST /:type/:id/:action  (action: hide | approve | delete)
router.post("/:type/:id/:action", async (req, res, next) => {
  try {
    const type = String(req.params.type || "").toLowerCase();
    const meta = TYPE_META[type];
    if (!meta) {
      return res
        .status(400)
        .json({ success: false, error: "type must be blog | story" });
    }
    const action = req.params.action;
    if (action === "delete") {
      const ok = await meta.repo.deleteById(req.params.id);
      if (!ok) return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, data: { id: req.params.id, deleted: true } });
    }
    let status;
    if (action === "hide") status = "hidden";
    else if (action === "approve") status = meta.published;
    else return res.status(400).json({ success: false, error: "Invalid action" });

    const updated = await meta.repo.updateById(req.params.id, { status });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
