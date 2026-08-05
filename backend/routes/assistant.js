/**
 * assistant.js — conversational AI navigation assistant (chatbot).
 * POST /api/assistant/chat  { message, history? } -> { reply, suggestions:[{label,href}], usedAI, remaining }
 *
 * Rate limit: a GLOBAL sliding window of 20 messages per hour (per the client's
 * "20x Claude Code account shared by all users" constraint). Over the cap — or with
 * no Anthropic credentials — it degrades to the deterministic navigator (parseQuery +
 * catalog search), which still gives real, useful navigation help.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const config = require("../lib/config");
const { parseQuery } = require("../lib/nlp");
const claudeCli = require("../lib/claudeCli");

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20;
let hits = []; // timestamps of AI-backed calls in the last hour

function allowAI() {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  return hits.length < LIMIT;
}
function remaining() {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  return Math.max(0, LIMIT - hits.length);
}

async function buildNavigation(message) {
  const cats = await store.all("categories.json");
  const parsed = parseQuery(message, cats);
  const suggestions = [];

  // best category match
  let cat = null;
  if (parsed.category) cat = cats.find((c) => c.slug === parsed.category);
  if (!cat) {
    const m = message.toLowerCase();
    cat = cats.find((c) => !c.parentId && (m.includes(c.slug.split("-")[0]) || c.name.toLowerCase().split(/\W+/).some((w) => w.length > 3 && m.includes(w))));
  }
  if (cat) {
    const q = new URLSearchParams();
    if (parsed.city) q.set("city", parsed.city);
    if (parsed.type) q.set("type", parsed.type);
    if (parsed.budgetMax) q.set("budgetMax", String(parsed.budgetMax));
    suggestions.push({ label: `Browse ${cat.name}`, href: `/${cat.slug}${q.toString() ? "?" + q : ""}` });
  }

  // top matching listings
  try {
    const { searchListings } = require("../lib/search");
    const hitsL = await searchListings({ q: message, filters: { status: "active" }, limit: 3 });
    for (const { listing } of hitsL) suggestions.push({ label: listing.title, href: `/listing/${listing.id}` });
  } catch {}

  suggestions.push({ label: "Search with AI", href: `/search?q=${encodeURIComponent(message)}` });
  suggestions.push({ label: "Post a requirement (RFQ)", href: "/rfq" });

  const bits = [];
  if (cat) bits.push(`I found the **${cat.name}** category`);
  if (parsed.city) bits.push(`in **${parsed.city}**`);
  if (parsed.type) bits.push(`(${parsed.type}s)`);
  const reply = bits.length
    ? `${bits.join(" ")}. Here are some good places to start — or post an RFQ and matching vendors will contact you.`
    : `I can help you find vendors, products and services. Try naming what you need (e.g. "stainless steel sheets in Mumbai" or "CA for GST filing"). Here are a few options:`;

  return { reply, suggestions: suggestions.slice(0, 6), parsed };
}

router.post("/chat", async (req, res, next) => {
  try {
    const message = (req.body && req.body.message ? String(req.body.message) : "").trim();
    if (!message) return res.status(400).json({ success: false, error: "message is required" });

    const nav = await buildNavigation(message); // deterministic base — always available
    let reply = nav.reply;
    let usedAI = false;

    const links = nav.suggestions.map((s) => `- ${s.label} (${s.href})`).join("\n");

    if (config.ANTHROPIC_API_KEY && allowAI()) {
      try {
        const Anthropic = require("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
        hits.push(Date.now());
        const sys = "You are BharatSource's shopping assistant. Help the user find vendors, products or services on the marketplace. Be concise (2-3 sentences), friendly, and always ground answers in the provided candidate links. Never invent vendors.";
        const msg = await client.messages.create({
          model: "claude-opus-5",
          max_tokens: 400,
          system: sys,
          messages: [
            ...(Array.isArray(req.body.history) ? req.body.history.slice(-6) : []),
            { role: "user", content: `User asked: "${message}"\n\nCandidate links you can point to:\n${links}\n\nWrite a short helpful reply guiding them.` },
          ],
        });
        reply = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim() || reply;
        usedAI = true;
      } catch (e) {
        // fall back to deterministic reply silently
      }
    } else if (!config.ANTHROPIC_API_KEY && config.AI_CLI_ENABLED && claudeCli.isClaudeAvailable() && allowAI()) {
      // No API key, but the locally authenticated `claude` CLI is available (and
      // we're under the shared 20/hr cap). Ground a concise reply in the same
      // deterministic candidate links. CLI calls count toward the hourly cap too.
      try {
        hits.push(Date.now());
        const prompt =
          "You are BharatSource's shopping assistant for an Indian B2B/B2C marketplace. " +
          "Help the user find vendors, products or services. Be concise (2-3 sentences), " +
          "friendly, and ground your answer ONLY in the candidate links below. Never invent vendors.\n\n" +
          `User asked: "${message}"\n\n` +
          `Candidate links you can point to:\n${links}\n\n` +
          "Write a short helpful reply guiding them (plain text, no markdown links).";
        const out = await claudeCli.askClaude(prompt, { timeoutMs: 15000 });
        if (out && out.trim()) {
          reply = out.trim();
          usedAI = true;
        }
      } catch (e) {
        // fall back to deterministic reply silently
      }
    }

    res.json({ success: true, data: { reply, suggestions: nav.suggestions, usedAI, remaining: remaining() } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
