/**
 * blogs.js — seller reach tool: permanent, SEO-friendly blog posts (DESIGN §3.7).
 *
 * Blog { id, sellerId, authorType: seller|employer, title, slug, coverImage?,
 *        body(markdown), categoryId?, tags[], status: draft|published, publishedAt,
 *        views }
 *
 *   GET    /api/blogs            → published blogs (?sellerId= &category= &authorType=)
 *   GET    /api/blogs/:slug      → one blog (counts a view)
 *   POST   /api/blogs            → create (authGuard; author = req.user)
 *   PUT    /api/blogs/:id        → update (authGuard; owner or admin)
 *   DELETE /api/blogs/:id        → delete (authGuard; owner or admin)
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../../_shared");
const identity = require("../../identity");
const { authGuard } = require("../../../middleware/authGuard");

const blogsRepo = repoForCollection("blogs.json");

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isAdmin(user) {
  return !!user && (user.roles || []).includes("admin");
}

// Resolve authoring-vendor details for a set of blogs so the client can
// interlink blog -> seller without a separate "seller by id" endpoint.
// Attaches a nested `author` object plus flat `authorName`/`sellerSlug`
// convenience fields (the frontend reads both). Non-fatal by design.
//
// `b.authorType` (stored on the row, see schema-migrations/0007) is the source of
// truth for which product a blog was authored under — a user can hold BOTH a
// sellerProfile and an employerProfile, so "does this author have a sellerProfile"
// is not enough to tell a Directory blog apart from a Recruitment one. Only falls
// back to inferring from the author's current profiles for pre-migration rows that
// predate the stored column (shouldn't normally happen once the migration has run).
async function attachAuthors(blogs) {
  const list = Array.isArray(blogs) ? blogs : [blogs];
  const ids = [...new Set(list.map((b) => b && b.sellerId).filter(Boolean))];
  if (!ids.length) return blogs;
  const users = await identity.hydrateUsersByIds(ids);
  const byId = new Map(users.map((u) => [u.id, u]));
  const enrich = (b) => {
    if (!b) return b;
    const u = byId.get(b.sellerId);
    if (!u) return b;
    const sp = u.sellerProfile;
    const ep = u.employerProfile;
    if (!sp && !ep) return b;
    const type = b.authorType || (sp ? "seller" : "employer");
    const profile = (type === "employer" ? ep : sp) || sp || ep;
    const slug = profile.slug || null;
    const companyName = profile.companyName || u.name || null;
    const logo = profile.logo || u.avatarUrl || null;
    const city = (profile.location && profile.location.city) || u.city || null;
    return {
      ...b,
      author: { sellerId: b.sellerId, type, slug, companyName, logo, city, isVerified: !!profile.isVerified },
      authorType: type,
      authorName: companyName,
      sellerSlug: slug,
    };
  };
  return Array.isArray(blogs) ? list.map(enrich) : enrich(blogs);
}

// Ensure a unique slug within the collection.
async function uniqueSlug(base) {
  const rows = await blogsRepo.findMany({});
  const taken = new Set(rows.map((b) => b.slug));
  let slug = base || "post";
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

// GET / — published blogs, newest first, optional sellerId / category / authorType
// filters. authorType ("seller" | "employer") is now a real stored column, so it
// filters up front like the other two. No filter = suite-wide (used by /blog, which
// intentionally shows both products) — Recruitment's dashboard tab and
// /recruitment/blog pass authorType explicitly to scope to their own product.
router.get("/", async (req, res, next) => {
  try {
    const { sellerId, category, authorType } = req.query;
    let blogs = await blogsRepo.findMany({ where: { status: "published" } });
    if (sellerId) blogs = blogs.filter((b) => b.sellerId === sellerId);
    if (category) blogs = blogs.filter((b) => b.categoryId === category);
    if (authorType) blogs = blogs.filter((b) => (b.authorType || "seller") === authorType);
    blogs.sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    return res.json({ success: true, data: await attachAuthors(blogs) });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — single blog by slug; increments the view counter.
router.get("/:slug", async (req, res, next) => {
  try {
    const blog = await blogsRepo.findOne({ where: { slug: req.params.slug } });
    // A moderator-hidden blog is treated as non-existent to the public site.
    if (!blog || blog.status === "hidden") {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    const updated = await blogsRepo.incrementById(blog.id, "views", 1);
    return res.json({ success: true, data: await attachAuthors(updated || blog) });
  } catch (err) {
    next(err);
  }
});

// POST / — create a blog owned by the authenticated user. `authorType` ("seller" |
// "employer") records which dashboard this was posted from — defaults to "seller"
// (the pre-existing, untouched path); "employer" requires the user to actually have
// an employerProfile, since that's the newly-exposed capability.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { title, coverImage, body, categoryId, tags, authorType } = req.body || {};
    if (!title || !body) {
      return res
        .status(400)
        .json({ success: false, error: "title and body are required" });
    }
    const resolvedAuthorType = authorType === "employer" ? "employer" : "seller";
    if (resolvedAuthorType === "employer" && !req.user.employerProfile) {
      return res.status(403).json({ success: false, error: "Employer profile required" });
    }
    const slug = await uniqueSlug(slugify(title));
    const doc = {
      sellerId: req.user.id,
      authorType: resolvedAuthorType,
      title,
      slug,
      coverImage: coverImage || null,
      body,
      categoryId: categoryId || null,
      tags: Array.isArray(tags) ? tags : [],
      status: "published",
      publishedAt: new Date().toISOString(),
      views: 0,
    };
    const created = await blogsRepo.insert(doc, "blog");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update; only the author or an admin may edit.
router.put("/:id", authGuard, async (req, res, next) => {
  try {
    const blog = await blogsRepo.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    if (blog.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const { title, coverImage, body, categoryId, tags, status } = req.body || {};
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (coverImage !== undefined) patch.coverImage = coverImage;
    if (body !== undefined) patch.body = body;
    if (categoryId !== undefined) patch.categoryId = categoryId;
    if (tags !== undefined) patch.tags = Array.isArray(tags) ? tags : [];
    if (status !== undefined) patch.status = status;
    const updated = await blogsRepo.updateById(blog.id, patch);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete; only the author or an admin may delete.
router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const blog = await blogsRepo.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    if (blog.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await blogsRepo.deleteById(blog.id);
    return res.json({ success: true, data: { id: blog.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
