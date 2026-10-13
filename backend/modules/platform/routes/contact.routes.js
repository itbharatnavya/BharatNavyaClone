/**
 * contact.routes.js — the public Contact page form (frontend app/contact/page.tsx).
 *
 * POST /api/contact                       public (optionalAuth): save a message. Needs a name,
 *                                         a message and an email or phone. Light per-IP limit.
 * GET  /api/admin/contact-messages        admin: newest first, optional ?status=new|closed
 * PATCH /api/admin/contact-messages/:id   admin: { status: "new" | "closed" }
 *
 * Both routers are mounted from platform/mount.js; the admin one in the "admin-sub" phase so
 * it sits before the blanket /api/admin router (same pattern as adminInquiries).
 */

const express = require("express");
const { repoForCollection } = require("../../_shared");
const { authGuard, optionalAuth, requireRole } = require("../../../middleware/authGuard");

const messages = repoForCollection("contact-messages.json");
const TOPICS = new Set(["general", "listing", "advertising", "hiring", "support", "partnership", "other"]);
const clean = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

// At most 5 messages per IP per 10 minutes (in memory; resets on restart).
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

const publicRouter = express.Router();
publicRouter.post("/", optionalAuth, async (req, res, next) => {
  try {
    if (limited(req.ip)) return res.status(429).json({ success: false, error: "Too many messages. Please try again in a few minutes." });
    const b = req.body || {};
    const name = clean(b.name, 120), email = clean(b.email, 160), phone = clean(b.phone, 30), message = clean(b.message, 3000);
    const topic = TOPICS.has(b.topic) ? b.topic : "general";
    if (!name) return res.status(400).json({ success: false, error: "Please enter your name." });
    if (!email && !phone) return res.status(400).json({ success: false, error: "Add an email or phone number so we can reply." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: "That email doesn't look right." });
    if (phone && phone.replace(/\D/g, "").length < 8) return res.status(400).json({ success: false, error: "That phone number looks too short." });
    if (message.length < 10) return res.status(400).json({ success: false, error: "Please write a little more so we can help." });
    const created = await messages.insert({
      name, email: email || null, phone: phone || null, topic, message,
      userId: req.user ? req.user.id : null, status: "new", createdAt: new Date().toISOString(),
    }, "cmsg");
    return res.json({ success: true, data: { id: created.id } });
  } catch (err) { next(err); }
});

const adminRouter = express.Router();
adminRouter.use(authGuard, requireRole("admin"));
adminRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status;
    let rows = await messages.findMany(status ? { where: { status } } : {});
    rows = rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});
adminRouter.patch("/:id", async (req, res, next) => {
  try {
    const status = req.body && req.body.status;
    if (!["new", "closed"].includes(status)) return res.status(400).json({ success: false, error: "status must be new or closed" });
    const updated = await messages.updateById(req.params.id, { status });
    if (!updated) return res.status(404).json({ success: false, error: "Message not found" });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

module.exports = { publicRouter, adminRouter };
