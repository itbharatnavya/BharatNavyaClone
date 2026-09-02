/**
 * stories.js — seller reach tool: ephemeral 24h stories (DESIGN §3.7).
 *
 * Story { id, sellerId, authorType: seller|employer, media{type,url}, caption?,
 *         linkListingId?, createdAt, expiresAt(24h), views, isHighlight }
 *
 * Expired stories are SWEPT ON READ: GET / prunes anything past its expiresAt from
 * the store (unless highlighted — see below) and its response only ever includes
 * stories still inside their 24h window. A highlighted story is PINNED in STORAGE
 * indefinitely so it can keep showing on the seller's public profile via
 * GET /highlights, even long after it has expired out of GET / and GET /active.
 *
 * authorType filtering: a user can hold both a sellerProfile (Directory) and an
 * employerProfile (Recruitment), so `authorType` on each row (schema-migrations/0007)
 * records which product it was posted under. GET /, /highlights and /active all
 * default to "seller" when no ?authorType= is given — every pre-existing caller
 * (StoryRail on /directory, SellerStoriesSection on the public seller profile) is
 * Directory-only and must never surface Recruitment content, per CLAUDE.md's "must
 * never affect Directory" rule. Pass authorType=employer for Recruitment's own
 * dashboard tab, or authorType=all to opt out of the default entirely.
 *
 *   GET    /api/stories             → currently-active (+ still-active highlighted)
 *                                      stories, grouped by seller (public feed)
 *   GET    /api/stories/highlights  → ?sellerId= ALL of a seller's highlighted
 *                                      stories, expired or not (public profile)
 *   GET    /api/stories/active      → ?sellerId= a seller's currently-active stories,
 *                                      highlighted or not (public profile)
 *   POST   /api/stories             → create (authGuard; 24h expiry)
 *   PUT    /api/stories/:id/highlight → pin/unpin a story (authGuard; owner-only)
 *   POST   /api/stories/:id/view    → increment view counter
 *   DELETE /api/stories/:id         → delete a story (authGuard; owner or admin)
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../modules/_shared");
const identity = require("../modules/identity");
const { authGuard } = require("../middleware/authGuard");

const storiesRepo = repoForCollection("stories.json");
const DAY_MS = 24 * 60 * 60 * 1000;

function isAdmin(user) {
  return !!user && (user.roles || []).includes("admin");
}

// Resolves the effective authorType filter for a request: explicit "seller" or
// "employer" is used as-is, "all" opts out of filtering (returns null), and no
// param at all defaults to "seller" — see the file header comment for why.
function resolveAuthorTypeFilter(req) {
  const raw = req.query.authorType;
  if (raw === "all") return null;
  if (raw === "employer") return "employer";
  return "seller";
}

// GET / — the public/dashboard feed: only stories still inside their 24h window.
// Sweeps expired non-highlights out of storage, but keeps expired highlights in
// storage (not in this response) so GET /highlights can keep serving them to the
// seller's profile — see that route below.
router.get("/", async (req, res, next) => {
  try {
    const authorTypeFilter = resolveAuthorTypeFilter(req);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // Sweep on read: prune expired non-highlights from storage. Highlights are
    // pinned in STORAGE indefinitely (a seller can unpin/delete an old one from
    // their dashboard at any time). Was: read all, filter, store.writeJson(kept) —
    // the criteria here reproduce that filter's inverse exactly, including the
    // strict `isHighlight === true` (is_highlight is NOT NULL) and the
    // NaN-on-missing-expiresAt case (null expires_at also swept).
    await storiesRepo.deleteWhere({
      where: {
        isHighlight: { ne: true },
        _or: [{ expiresAt: { lte: nowIso } }, { expiresAt: { isNull: true } }],
      },
    });

    const all = await storiesRepo.findMany({});

    // Hidden stories survive in the store but never render here. Expired highlights
    // also survive in the store but are excluded from this feed by the expiresAt
    // check below — GET /highlights is the only place they still show.
    const visible = all.filter(
      (s) =>
        s.status !== "hidden" &&
        new Date(s.expiresAt).getTime() > now &&
        (authorTypeFilter === null || (s.authorType || "seller") === authorTypeFilter)
    );

    // Resolve seller info once.
    const users = await identity.hydrateUsersByIds(visible.map((s) => s.sellerId));
    const userById = new Map(users.map((u) => [u.id, u]));

    // Group by seller, preserving chronological story order within each group.
    const groups = new Map();
    const ordered = visible
      .slice()
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    for (const story of ordered) {
      if (!groups.has(story.sellerId)) {
        const u = userById.get(story.sellerId);
        // Flat fields matching the frontend's StoryGroup type (lib/types.ts) — this is
        // the shape every consumer (StoriesTab, StoryRail) is written against. Previously
        // this only carried a nested `seller` object, which silently broke any consumer
        // that read `g.sellerId` directly (StoriesTab.tsx always found zero of the
        // seller's own stories as a result — StoryRail.tsx happened to survive only
        // because it separately normalises both shapes).
        // isVerified falls back to employerProfile when sellerProfile is absent — a
        // Recruitment employer's story used to silently lose its verified badge here
        // (same author-resolution gap blogs.js's attachAuthors() already handled for
        // blogs — see ADMIN-CONSOLE.md §3). sellerSlug stays seller-only on purpose:
        // it feeds a hardcoded `/seller/<slug>` link (StoryViewer.tsx), and the
        // employer public profile has no stories section to link to yet (deliberately
        // deferred — see /employer/[slug]/page.tsx's own header comment), so an
        // employer slug here would just produce a wrong link instead of a dead one.
        // When the request is scoped to employer stories, every story in this group
        // is employer-authored (see authorTypeFilter above), so prefer employerProfile
        // for isVerified — otherwise fall back to the sellerProfile-first order.
        const profile =
          authorTypeFilter === "employer"
            ? (u && u.employerProfile) || (u && u.sellerProfile) || null
            : (u && u.sellerProfile) || (u && u.employerProfile) || null;
        groups.set(story.sellerId, {
          sellerId: story.sellerId,
          sellerName: u ? u.name : "Unknown Seller",
          sellerSlug: u && u.sellerProfile ? u.sellerProfile.slug : null,
          avatarUrl: u ? u.avatarUrl || null : null,
          isVerified: !!(profile && profile.isVerified),
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
    const authorTypeFilter = resolveAuthorTypeFilter(req);
    const rows = await storiesRepo.findMany({ where: { sellerId, isHighlight: true } });
    const highlights = rows
      .filter(
        (s) =>
          s.status !== "hidden" &&
          (authorTypeFilter === null || (s.authorType || "seller") === authorTypeFilter)
      )
      .sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
    return res.json({ success: true, data: highlights });
  } catch (err) {
    next(err);
  }
});

// GET /active?sellerId= — a seller's currently-active (non-expired) stories, whether
// highlighted or not. Powers the public profile's "Active" tab — a scoped version of
// what GET / already filters to, without fetching/grouping every seller's stories.
router.get("/active", async (req, res, next) => {
  try {
    const sellerId = req.query.sellerId;
    if (!sellerId) {
      return res
        .status(400)
        .json({ success: false, error: "sellerId query param is required" });
    }
    const authorTypeFilter = resolveAuthorTypeFilter(req);
    const now = Date.now();
    const rows = await storiesRepo.findMany({ where: { sellerId } });
    const active = rows
      .filter(
        (s) =>
          s.status !== "hidden" &&
          new Date(s.expiresAt).getTime() > now &&
          (authorTypeFilter === null || (s.authorType || "seller") === authorTypeFilter)
      )
      .sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
    return res.json({ success: true, data: active });
  } catch (err) {
    next(err);
  }
});

// POST / — create a story that auto-expires 24h from now. `authorType` ("seller" |
// "employer") records which dashboard this was posted from — defaults to "seller"
// (the pre-existing, untouched path); "employer" requires the user to actually have
// an employerProfile, since that's the newly-exposed capability.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { media, caption, linkListingId, authorType } = req.body || {};
    if (!media || !media.type || !media.url) {
      return res
        .status(400)
        .json({ success: false, error: "media.type and media.url are required" });
    }
    const resolvedAuthorType = authorType === "employer" ? "employer" : "seller";
    if (resolvedAuthorType === "employer" && !req.user.employerProfile) {
      return res.status(403).json({ success: false, error: "Employer profile required" });
    }
    const now = new Date();
    const doc = {
      sellerId: req.user.id,
      authorType: resolvedAuthorType,
      media: { type: media.type, url: media.url },
      caption: caption || null,
      linkListingId: linkListingId || null,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DAY_MS).toISOString(),
      views: 0,
      isHighlight: false,
    };
    const created = await storiesRepo.insert(doc, "story");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/highlight — pin/unpin a story as a highlight (owner-only). Body
// { isHighlight?: boolean } — defaults to true so existing "pin" callers are
// unaffected; pass false to unpin. A highlight is excluded from the 24h expiry
// sweep, so pinning persists the story on the seller's profile until unpinned
// (unpinning an already-expired story returns it to the normal sweep).
router.put("/:id/highlight", authGuard, async (req, res, next) => {
  try {
    const story = await storiesRepo.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }
    if (story.sellerId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "You can only highlight your own stories" });
    }
    const isHighlight = req.body?.isHighlight !== undefined ? !!req.body.isHighlight : true;
    const updated = await storiesRepo.updateById(story.id, { isHighlight });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /:id/view — increment a story's view counter.
router.post("/:id/view", async (req, res, next) => {
  try {
    const story = await storiesRepo.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }
    const updated = await storiesRepo.incrementById(story.id, "views", 1);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — remove a story outright (owner or admin).
router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const story = await storiesRepo.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, error: "Story not found" });
    }
    if (story.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "You can only delete your own stories" });
    }
    await storiesRepo.deleteById(story.id);
    return res.json({ success: true, data: { id: story.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
