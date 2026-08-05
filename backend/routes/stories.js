/**
 * stories.js — seller reach tool: ephemeral 24h stories (DESIGN §3.7).
 *
 * Story { id, sellerId, media{type,url}, caption?, linkListingId?, createdAt,
 *         expiresAt(24h), views, isHighlight }
 *
 * Expired stories are SWEPT ON READ: GET / prunes anything past its expiresAt from
 * the store before returning the survivors grouped by seller — EXCEPT highlights.
 * A highlighted story is PINNED: it survives the 24h expiry sweep and keeps showing
 * on the seller's profile via GET /highlights.
 *
 *   GET  /api/stories             → active (+ pinned) stories grouped by seller
 *   GET  /api/stories/highlights  → ?sellerId= a seller's highlighted stories
 *   POST /api/stories             → create (authGuard; 24h expiry)
 *   PUT  /api/stories/:id/highlight → pin a story (authGuard; owner-only)
 *   POST /api/stories/:id/view    → increment view counter
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

const COLLECTION = "stories.json";
const DAY_MS = 24 * 60 * 60 * 1000;

// GET / — sweep expired (keeping pinned highlights), then group by seller.
router.get("/", async (req, res, next) => {
  try {
    const now = Date.now();
    const all = await store.all(COLLECTION);
    // Keep a story if it's still active OR it's a pinned highlight. Highlights
    // never get pruned even once their 24h expiresAt has passed.
    const kept = all.filter(
      (s) => s.isHighlight === true || new Date(s.expiresAt).getTime() > now
    );

    // Sweep on read: if anything expired (and wasn't pinned), persist the pruned set.
    // Note: moderator-hidden stories are KEPT in the store (an admin can approve them
    // later) — they are only filtered out of the PUBLIC response below.
    if (kept.length !== all.length) {
      await store.writeJson(COLLECTION, kept);
    }

    // Hidden stories survive in the store but never render on the public site.
    const visible = kept.filter((s) => s.status !== "hidden");

    // Resolve seller info once.
    const users = await store.all("users.json");
    const userById = new Map(users.map((u) => [u.id, u]));

    // Group by seller, preserving chronological story order within each group.
    const groups = new Map();
    const ordered = visible
      .slice()
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const story of ordered) {
      if (!groups.has(story.sellerId)) {
        const u = userById.get(story.sellerId);
        groups.set(story.sellerId, {
          seller: {
            id: story.sellerId,
            name: u ? u.name : "Unknown Seller",
            avatarUrl: u ? u.avatarUrl || null : null,
            slug: u && u.sellerProfile ? u.sellerProfile.slug : null,
          },
          stories: [],
        });
      }
      groups.get(story.sellerId).stories.push(story);
    }

    // Groups ordered by most-recent story first.
    const data = Array.from(groups.values()).sort((a, b) => {
      const la = a.stories[a.stories.length - 1].createdAt || "";
      const lb = b.stories[b.stories.length - 1].createdAt || "";
      return String(lb).localeCompare(String(la));
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /highlights?sellerId= — a seller's pinned highlights (expiry ignored).
router.get("/highlights", async (req, res, next) => {
  try {
    const sellerId = req.query.sellerId;
    if (!sellerId) {
      return res
        .status(400)
        .json({ success: false, error: "sellerId query param is required" });
    }
    const all = await store.all(COLLECTION);
    const highlights = all
      .filter(
        (s) =>
          s.sellerId === sellerId &&
          s.isHighlight === true &&
          s.status !== "hidden"
      )
      .sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
    return res.json({ success: true, data: highlights });
  } catch (err) {
    next(err);
  }
});

// POST / — create a story that auto-expires 24h from now.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { media, caption, linkListingId } = req.body || {};
    if (!media || !media.type || !media.url) {
      return res
        .status(400)
        .json({ success: false, error: "media.type and media.url are required" });
    }
    const now = new Date();
    const doc = {
      sellerId: req.user.id,
      media: { type: media.type, url: media.url },
      caption: caption || null,
      linkListingId: linkListingId || null,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DAY_MS).toISOString(),
      views: 0,
      isHighlight: false,
    };
    const created = await store.insert(COLLECTION, doc, "story");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/highlight — pin a story as a highlight (owner-only). A highlight is
// excluded from the 24h expiry sweep, so it persists on the seller's profile.
router.put("/:id/highlight", authGuard, async (req, res, next) => {
  try {
    const story = await store.getById(COLLECTION, req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }
    if (story.sellerId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "You can only highlight your own stories" });
    }
    const updated = await store.update(COLLECTION, story.id, {
      isHighlight: true,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /:id/view — increment a story's view counter.
router.post("/:id/view", async (req, res, next) => {
  try {
    const story = await store.getById(COLLECTION, req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }
    const updated = await store.update(COLLECTION, story.id, {
      views: (story.views || 0) + 1,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
