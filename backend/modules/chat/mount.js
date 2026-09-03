/**
 * chat/mount.js — the dashboard chat route mount as data (BACKEND-AUDIT.md
 * Phase 8).
 *
 * Chat is dormant — no buyer-facing entry point surfaces it (CLAUDE.md §2
 * "Contact & chat"), but the Socket.IO channel + REST endpoints still exist and
 * are kept working. modules/chat owns the `conversations` / `messages` tables.
 *
 *   phase "public"  /api/chat.
 */

const MOUNTS = [
  { path: "/api/chat", router: require("../../routes/chat"), phase: "public" },
];

function mountChat(app, phase = "public") {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountChat };
