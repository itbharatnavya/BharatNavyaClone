/**
 * agent.routes.js — Ask Navya agent (home-page Ask Navya card + modal).
 * POST /api/assistant/agent  { message, history? }
 *   -> { reply (markdown), mode: "in_app"|"hybrid"|"general", results:[{title,subtitle,href}],
 *        suggestions:[{label,href}], followUps:[string], usedAI, degraded, remaining }
 *
 * Deliberately separate from POST /api/assistant/chat (assistant.routes.js), which is the
 * rule-based navigation guide behind the floating bubble on every page and keeps its own
 * contract. All logic lives in ../service/agent.js; this file is only HTTP.
 */

const express = require("express");
const router = express.Router();
const config = require("../../../lib/config");
const { settingsRepo } = require("../../platform");
const { optionalAuth } = require("../../../middleware/authGuard");
const agent = require("../service/agent");

// Same resolution rule as GET /api/config's featureFlags.recruitmentLive: env override wins,
// else the admin-editable site-config flag.
async function isRecruitmentLive() {
  if (config.RECRUITMENT_LIVE !== null) return config.RECRUITMENT_LIVE;
  const s = await settingsRepo.read({});
  return !!(s.featureFlags && s.featureFlags.recruitmentLive);
}

router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const message = (req.body && req.body.message ? String(req.body.message) : "").trim();
    if (!message) return res.status(400).json({ success: false, error: "message is required" });
    if (message.length > config.AI_PROMPT_MAX) {
      return res.status(400).json({ success: false, error: `message must be ${config.AI_PROMPT_MAX} characters or fewer` });
    }
    const data = await agent.answer({
      message,
      history: req.body.history,
      user: req.user || null,
      recruitmentLive: await isRecruitmentLive(),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
