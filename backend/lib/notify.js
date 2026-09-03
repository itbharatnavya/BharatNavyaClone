/**
 * notify.js — in-app notification helpers for BharatSource.
 *
 * Notifications live in DB/notifications.json as a JSON array. Each is addressed to a
 * single recipient (userId), carries a short machine `type` (e.g. "new_follower") plus
 * a free-form `data` payload the frontend renders, and a `read` flag toggled as the
 * user views them. IDs are monotonic (ntf_000001) via the store.
 *
 * This is the single entry point other features call to notify a user, so creation
 * stays consistent wherever it's triggered (follows, and future producers).
 */

const { repoForCollection } = require("../modules/_shared");

const notifRepo = repoForCollection("notifications.json");

/**
 * Create + persist a notification for `userId`. Returns the inserted document.
 * `type` is a short machine string; `data` is a free-form payload object.
 */
async function createNotification(userId, type, data = {}) {
  const notification = {
    userId,
    type,
    data: data || {},
    read: false,
    createdAt: new Date().toISOString(),
  };
  return notifRepo.insert(notification, "ntf");
}

/** A user's notifications, newest-first (createdAt desc, id as tie-breaker). */
async function listForUser(userId) {
  const rows = await notifRepo.findMany({ where: { userId } });
  return rows.sort((a, b) => {
    const t = (b.createdAt || "").localeCompare(a.createdAt || "");
    return t !== 0 ? t : (b.id || "").localeCompare(a.id || "");
  });
}

/**
 * Mark a single notification read. Only its owner (userId) may mark it, so a
 * mismatched owner (or a missing id) returns null.
 */
async function markRead(id, userId) {
  const existing = await notifRepo.findById(id);
  if (!existing || existing.userId !== userId) return null;
  return notifRepo.updateById(id, { read: true });
}

/** Mark all of a user's unread notifications read. Returns the number updated. */
async function markAllRead(userId) {
  const unread = (await notifRepo.findMany({ where: { userId } })).filter((n) => !n.read);
  for (const n of unread) {
    await notifRepo.updateById(n.id, { read: true });
  }
  return unread.length;
}

module.exports = { createNotification, listForUser, markRead, markAllRead };
