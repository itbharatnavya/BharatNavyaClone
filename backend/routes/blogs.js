/**
 * blogs.js — seller reach tool: permanent, SEO-friendly blog posts (DESIGN §3.7).
 *
 * Blog { id, sellerId, title, slug, coverImage?, body(markdown), categoryId?,
 *        tags[], status: draft|published, publishedAt, views }
 *
 *   GET    /api/blogs            → published blogs (?sellerId= &category=)
 *   GET    /api/blogs/:slug      → one blog (counts a view)
 *   POST   /api/blogs            → create (authGuard; author = req.user)
 *   PUT    /api/blogs/:id        → update (authGuard; owner or admin)
 *   DELETE /api/blogs/:id        → delete (authGuard; owner or admin)
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

const COLLECTION = "blogs.json";

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
async function attachAuthors(blogs) {
  const list = Array.isArray(blogs) ? blogs : [blogs];
  const ids = [...new Set(list.map((b) => b && b.sellerId).filter(Boolean))];
  if (!ids.length) return blogs;
  const users = await store.all("users.json");
  const byId = new Map(users.map((u) => [u.id, u]));
  const enrich = (b) => {
    if (!b) return b;
    const u = byId.get(b.sellerId);
    const sp = u && u.sellerProfile;
    if (!sp) return b;
    return {
      ...b,
      author: {
        sellerId: b.sellerId,
        slug: sp.slug || null,
        companyName: sp.companyName || u.name || null,
        logo: sp.logo || u.avatarUrl || null,
        city: (sp.location && sp.location.city) || u.city || null,
        isVerified: !!sp.isVerified,
      },
      authorName: sp.companyName || u.name || null,
      sellerSlug: sp.slug || null,
    };
  };
  return Array.isArray(blogs) ? list.map(enrich) : enrich(blogs);
}

// Ensure a unique slug within the collection.
async function uniqueSlug(base) {
  const rows = await store.all(COLLECTION);
  const taken = new Set(rows.map((b) => b.slug));
  let slug = base || "post";
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

// GET / — published blogs, newest first, optional sellerId / category filters.
router.get("/", async (req, res, next) => {
  try {
    const { sellerId, category } = req.query;
    let blogs = (await store.all(COLLECTION)).filter((b) => b.status === "published");
    if (sellerId) blogs = blogs.filter((b) => b.sellerId === sellerId);
    if (category) blogs = blogs.filter((b) => b.categoryId === category);
    blogs.sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    return res.json({ success: true, data: await attachAuthors(blogs) });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — single blog by slug; increments the view counter.
router.get("/:slug", async (req, res, next) => {
  try {
    const blog = await store.findOne(COLLECTION, (b) => b.slug === req.params.slug);
    // A moderator-hidden blog is treated as non-existent to the public site.
    if (!blog || blog.status === "hidden") {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    const updated = await store.update(COLLECTION, blog.id, {
      views: (blog.views || 0) + 1,
    });
    return res.json({ success: true, data: await attachAuthors(updated || blog) });
  } catch (err) {
    next(err);
  }
});

// POST / — create a blog owned by the authenticated user.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { title, coverImage, body, categoryId, tags } = req.body || {};
    if (!title || !body) {
      return res
        .status(400)
        .json({ success: false, error: "title and body are required" });
    }
    const slug = await uniqueSlug(slugify(title));
    const doc = {
      sellerId: req.user.id,
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
    const created = await store.insert(COLLECTION, doc, "blog");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update; only the author or an admin may edit.
router.put("/:id", authGuard, async (req, res, next) => {
  try {
    const blog = await store.getById(COLLECTION, req.params.id);
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
    const updated = await store.update(COLLECTION, blog.id, patch);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete; only the author or an admin may delete.
router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const blog = await store.getById(COLLECTION, req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog not found" });
    }
    if (blog.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await store.remove(COLLECTION, blog.id);
    return res.json({ success: true, data: { id: blog.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
