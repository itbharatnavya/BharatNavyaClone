/**
 * routes/notifications.js — the authenticated user's in-app notifications.
 *
 * Read-only feed plus read-state toggles. All routes require a valid token; a user
 * only ever sees/mutates their own notifications (enforced in lib/notify.js).
 *
 * NOTE FOR INTEGRATOR: this router must be mounted by index.js with
 *   app.use("/api/notifications", require("./routes/notifications"));
 */

const express = require("express");
const router = express.Router();

const { authGuard } = require("../middleware/authGuard");
const notify = require("../lib/notify");

// GET /api/notifications — my notifications (newest-first) + unread count.
router.get("/", authGuard, async (req, res, next) => {
  try {
    const notifications = await notify.listForUser(req.user.id);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all my notifications read.
// Declared before "/:id/read" so the literal path isn't captured by the param route.
router.put("/read-all", authGuard, async (req, res, next) => {
  try {
    const updated = await notify.markAllRead(req.user.id);
    return res.json({ success: true, data: { updated } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark one of my notifications read.
router.put("/:id/read", authGuard, async (req, res, next) => {
  try {
    const notification = await notify.markRead(req.params.id, req.user.id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found" });
    }
    return res.json({ success: true, data: { notification } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
