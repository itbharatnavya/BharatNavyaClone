/**
 * routes/follow.js — user-to-user follow graph.
 *
 * A follow edge is { id, followerId, followingId, createdAt } in DB/follows.json:
 * followerId (the actor, from the JWT) follows followingId (the target). Following is
 * idempotent — a duplicate POST is a no-op — and each new follow notifies the target
 * via lib/notify.js ("new_follower").
 *
 * NOTE FOR INTEGRATOR: this router must be mounted by index.js with
 *   app.use("/api/follow", require("./routes/follow"));
 */

const express = require("express");
const router = express.Router();

const { repoForCollection } = require("../modules/_shared");
const identity = require("../modules/identity");
const { authGuard } = require("../middleware/authGuard");
const { createNotification } = require("../lib/notify");

const followsRepo = repoForCollection("follows.json");

// Basic, public-safe projection of a user for follow lists.
function publicUser(u) {
  if (!u) return null;
  const out = {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl || null,
    city: u.city || null,
    state: u.state || null,
  };
  if (u.sellerProfile) {
    out.sellerProfile = {
      companyName: u.sellerProfile.companyName || null,
      slug: u.sellerProfile.slug || null,
      logo: u.sellerProfile.logo || null,
    };
  }
  return out;
}

// POST /api/follow/:userId — follow a user (idempotent; notifies the target).
router.post("/:userId", authGuard, async (req, res, next) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.user.id;

    if (followingId === followerId) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot follow yourself" });
    }

    const target = await identity.getAuthUser(followingId);
    if (!target) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const existing = await followsRepo.findOne({
      where: { followerId, followingId },
    });
    if (!existing) {
      await followsRepo.insert(
        { followerId, followingId, createdAt: new Date().toISOString() },
        "flw"
      );
      await createNotification(followingId, "new_follower", {
        followerId,
        name: req.user.name,
      });
    }

    return res.json({ success: true, data: { following: true } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/follow/:userId — unfollow a user (idempotent).
router.delete("/:userId", authGuard, async (req, res, next) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.user.id;

    const existing = await followsRepo.findOne({
      where: { followerId, followingId },
    });
    if (existing) {
      await followsRepo.deleteById(existing.id);
    }

    return res.json({ success: true, data: { following: false } });
  } catch (err) {
    next(err);
  }
});

// GET /api/follow/me — users I follow (newest-first), with basic info.
router.get("/me", authGuard, async (req, res, next) => {
  try {
    const edges = await followsRepo.findMany({ where: { followerId: req.user.id } });
    const users = await identity.hydrateUsersByIds(edges.map((f) => f.followingId));
    const byId = new Map(users.map((u) => [u.id, u]));

    const following = edges
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map((f) => ({
        followingId: f.followingId,
        createdAt: f.createdAt,
        user: publicUser(byId.get(f.followingId)),
      }));

    return res.json({
      success: true,
      data: { following, count: following.length },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/follow/:userId/followers — public: follower count + list.
router.get("/:userId/followers", async (req, res, next) => {
  try {
    const followingId = req.params.userId;
    const edges = await followsRepo.findMany({ where: { followingId } });
    const users = await identity.hydrateUsersByIds(edges.map((f) => f.followerId));
    const byId = new Map(users.map((u) => [u.id, u]));

    const followers = edges
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map((f) => ({
        followerId: f.followerId,
        createdAt: f.createdAt,
        user: publicUser(byId.get(f.followerId)),
      }));

    return res.json({
      success: true,
      data: { count: followers.length, followers },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/follow/:userId/status — authed: am I following this user?
router.get("/:userId/status", authGuard, async (req, res, next) => {
  try {
    const existing = await followsRepo.findOne({
      where: { followerId: req.user.id, followingId: req.params.userId },
    });
    return res.json({ success: true, data: { following: !!existing } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
