/**
 * ai/mount.js — the AI concierge route mounts as data (BACKEND-AUDIT.md Phase 8).
 *
 * modules/ai owns NO tables — it is pure orchestration over the other domains'
 * public ports (directory / identity / repoForCollection for the category list).
 * The AI runtime itself (lib/claudeCli.js — the local `claude` CLI child process)
 * is unchanged and stays in lib/.
 *
 *   phase "public"  /api/ai (search / autofill / rfq) and /api/assistant (chat).
 */

const MOUNTS = [
  { path: "/api/ai", router: require("./routes/ai.routes"), phase: "public" },
  { path: "/api/assistant/agent", router: require("./routes/agent.routes"), phase: "public" },
  { path: "/api/assistant", router: require("./routes/assistant.routes"), phase: "public" },
];

function mountAI(app, phase = "public") {
  for (const m of MOUNTS) if (m.phase === phase) app.use(m.path, m.router);
}

module.exports = { MOUNTS, mountAI };
