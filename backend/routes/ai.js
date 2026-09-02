/**
 * routes/ai.js — AI vendor-search concierge (DESIGN.md §5, "Intent-First").
 *
 *   POST /ai/search  { query }
 *     -> { mode: "navigate" | "list" | "clarify",
 *          navigateTo?: { categorySlug, filters },
 *          listings?: [...],
 *          clarify?: "…",
 *          parsed }                                   (wrapped in { success, data })
 *
 * Pipeline:
 *   1. Deterministic normalize + synonym expand via lib/nlp.parseQuery (always).
 *   2. If ANTHROPIC_API_KEY is set, one tool-use call to Claude refines intent and
 *      picks the mode (searchVendors / navigateTo / askClarification). Every
 *      category slug the model emits is validated against categories.json.
 *   3. If there is no key OR the model call fails, a fully deterministic path runs.
 *
 * The deterministic path MUST work with no key — that is the guaranteed behaviour.
 *
 * This router also hosts POST /ai/autofill (authGuard): draft a listing from a
 * product photo via Claude vision when ANTHROPIC_API_KEY is set, else a graceful
 * deterministic best-guess from the seller's `hint` (fallback:true). Never crashes
 * without a key.
 */

const express = require("express");
const { repoForCollection } = require("../modules/_shared");
const directory = require("../modules/directory");
const config = require("../lib/config");
const { parseQuery } = require("../lib/nlp");
const claudeCli = require("../lib/claudeCli");
const { authGuard, optionalAuth } = require("../middleware/authGuard");
const { logSearchEvent } = require("../lib/searchEvents");

const router = express.Router();

/** The category list (slug + name) every path here validates model output against.
 *  Was `store.all("categories.json")` — same rows, via the flat repo. */
const loadCategories = () => repoForCollection("categories.json").findMany({});

const MODEL = "claude-sonnet-5"; // latest Claude model id (fallback string)
const RESULT_LIMIT = 12;
const LOW_CONFIDENCE = 0.35; // below this the deterministic parse asks Claude to refine

/* ------------------------------------------------------------- helpers ----- */

function cleanFilters(f) {
  const out = {};
  if (f.city) out.city = f.city;
  if (f.type) out.type = f.type;
  if (f.budgetMax != null) out.budgetMax = f.budgetMax;
  return out;
}

/**
 * Run the shared BM25 search if lib/search is available; otherwise fall back to a
 * simple in-memory scan over listings.json (title / keywords / description).
 */
async function runSearch(q, filters, limit) {
  try {
    const search = require("../lib/search");
    if (search && typeof search.searchListings === "function") {
      const res = await search.searchListings({ q, filters, limit });
      const arr = Array.isArray(res) ? res : (res && res.listings) || [];
      return arr.slice(0, limit);
    }
  } catch (_err) {
    // search module missing or threw — fall through to the scan.
  }
  return fallbackScan(q, filters, limit);
}

async function fallbackScan(q, filters, limit) {
  const listings = await directory.listingsForAiFallback();
  const terms = (String(q || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (t) => t.length > 2
  );
  const city = filters.city ? String(filters.city).toLowerCase() : null;
  const scored = [];
  for (const l of listings) {
    if (l.status && l.status !== "active") continue;
    if (filters.type && l.type !== filters.type) continue;
    if (city) {
      const lc = l.location && l.location.city ? String(l.location.city).toLowerCase() : "";
      if (!lc.includes(city)) continue;
    }
    const hay = [
      l.title || "",
      l.description || "",
      (l.keywords || []).join(" "),
      l.legacyCategory || "",
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score++;
    if (terms.length === 0 || score > 0) {
      scored.push({ l, score });
    }
  }
  scored.sort(
    (a, b) => b.score - a.score || (b.l.isFeatured ? 1 : 0) - (a.l.isFeatured ? 1 : 0)
  );
  return scored.slice(0, limit).map((s) => s.l);
}

// A structured slot means we understood *something* concrete about the query.
// Raw keywords alone don't count — a lone unknown token ("asdfghjkl") that also
// matches no listings is effectively gibberish and should clarify, not dead-end.
function hasStructuredSlot(parsed) {
  return !!(parsed.city || parsed.type || parsed.budgetMax != null);
}

const CLARIFY_PROMPT =
  "What are you sourcing? Tell me the product or service and your city — e.g. \"stainless steel sheets in Mumbai\" or \"CA in Pune for GST filing\".";

/* ------------------------------------------------- deterministic resolve --- */

async function deterministicResolve({ query, parsed }) {
  const q = String(query || "").trim();
  if (!q) {
    return { mode: "clarify", clarify: CLARIFY_PROMPT, parsed };
  }
  // Clean single-category match -> navigate to the category page.
  if (parsed.category) {
    return {
      mode: "navigate",
      navigateTo: { categorySlug: parsed.category, filters: cleanFilters(parsed) },
      parsed,
    };
  }
  // Otherwise list matching vendors.
  const listings = await runSearch(q, { city: parsed.city, type: parsed.type }, RESULT_LIMIT);
  if (!listings.length && !hasStructuredSlot(parsed)) {
    return { mode: "clarify", clarify: CLARIFY_PROMPT, parsed };
  }
  return { mode: "list", listings, parsed };
}

/* --------------------------------------------------- Anthropic tool path --- */

function buildTools() {
  return [
    {
      name: "searchVendors",
      description:
        "Return a ranked list of vendor listings. Use for specific, multi-constraint, or cross-category queries, or whenever confidence in a single category is low.",
      input_schema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search text to match against listings." },
          city: { type: "string" },
          type: { type: "string", enum: ["product", "service"] },
          budgetMax: { type: "number" },
        },
      },
    },
    {
      name: "navigateTo",
      description:
        "Send the user straight to a single category results page. Use ONLY when the query maps cleanly to one categorySlug from the provided list, ideally with at least one filter.",
      input_schema: {
        type: "object",
        properties: {
          categorySlug: {
            type: "string",
            description: "Must be one of the provided valid category slugs.",
          },
          city: { type: "string" },
          type: { type: "string", enum: ["product", "service"] },
          budgetMax: { type: "number" },
        },
        required: ["categorySlug"],
      },
    },
    {
      name: "askClarification",
      description:
        "Ask ONE short question when a required slot (what/category or location) is missing or the query is empty/gibberish.",
      input_schema: {
        type: "object",
        properties: { prompt: { type: "string" } },
        required: ["prompt"],
      },
    },
  ];
}

async function aiResolve({ query, parsed, categories }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const Client = Anthropic.default || Anthropic;
  const client = new Client({ apiKey: config.ANTHROPIC_API_KEY });

  const validSlugs = new Set((categories || []).map((c) => c && c.slug).filter(Boolean));
  const system =
    "You are the BharatSource sourcing concierge for an Indian B2B/B2C marketplace " +
    "(products and services across all industries). Decide the single best action for " +
    "the user's query by calling exactly one tool. Prefer navigateTo when the query maps " +
    "cleanly to one category (with at least one filter); use searchVendors for specific, " +
    "multi-constraint, or cross-category queries or when confidence is low; use " +
    "askClarification only when the query is empty or you cannot tell what they want. " +
    "Only ever use a categorySlug from the provided valid list.";

  const userText =
    `Query: ${query}\n\n` +
    `Deterministic pre-parse (hints, may be partial): ${JSON.stringify(parsed)}\n\n` +
    `Valid category slugs: ${[...validSlugs].join(", ") || "(none available)"}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    tool_choice: { type: "any" },
    tools: buildTools(),
    system,
    messages: [{ role: "user", content: userText }],
  });

  const tu = (resp.content || []).find((b) => b.type === "tool_use");
  if (!tu) throw new Error("model returned no tool_use block");
  const input = tu.input || {};

  if (tu.name === "navigateTo") {
    const slug = validSlugs.has(input.categorySlug) ? input.categorySlug : null;
    if (slug) {
      return {
        mode: "navigate",
        navigateTo: {
          categorySlug: slug,
          filters: cleanFilters({
            city: input.city != null ? input.city : parsed.city,
            type: input.type != null ? input.type : parsed.type,
            budgetMax: input.budgetMax != null ? input.budgetMax : parsed.budgetMax,
          }),
        },
        parsed,
      };
    }
    // Unknown slug — never dead-end; degrade to a list.
    const listings = await runSearch(query, { city: parsed.city, type: parsed.type }, RESULT_LIMIT);
    return { mode: "list", listings, parsed };
  }

  if (tu.name === "searchVendors") {
    const listings = await runSearch(
      input.q || query,
      {
        city: input.city != null ? input.city : parsed.city,
        type: input.type != null ? input.type : parsed.type,
      },
      RESULT_LIMIT
    );
    return { mode: "list", listings, parsed };
  }

  if (tu.name === "askClarification") {
    return { mode: "clarify", clarify: input.prompt || CLARIFY_PROMPT, parsed };
  }

  throw new Error(`unexpected tool: ${tu.name}`);
}

/* ---------------------------------------------------- Claude CLI path ------ */
/**
 * NO-KEY semantic path: refine intent with the locally authenticated `claude`
 * CLI (the user's terminal subscription) instead of the Anthropic SDK.
 *
 * Deterministic-first: the fast parseQuery + searchListings pass runs unchanged.
 * We only spend a ~3s CLI call when the deterministic parse is weak — low
 * confidence, no category, or an empty result set — and we always degrade to a
 * genuinely helpful, NEVER-BLANK response.
 */

function pickType(v) {
  return v === "product" || v === "service" ? v : null;
}

function pickPositiveNumber(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) && n > 0 ? Math.round(n) : null;
}

function nonEmptyString(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function defaultEmptyMessage(query) {
  const q = String(query || "").trim();
  return q
    ? `No exact matches for "${q}" yet — post a requirement and matching vendors will send you quotes.`
    : "Tell me what you're sourcing and I'll find matching vendors — or post a requirement and vendors will reach out.";
}

/** One CLI call: raw query + the full category list -> structured intent JSON. */
async function askClaudeIntent({ query, categories }) {
  const list = (categories || [])
    .filter((c) => c && c.slug)
    .map((c) => `${c.slug} | ${c.name}`)
    .join("\n");

  const prompt =
    "You are the sourcing concierge for BharatSource, an Indian B2B/B2C " +
    "marketplace spanning products and services across every industry.\n\n" +
    `A shopper searched: "${query}"\n\n` +
    "Full category list (format: slug | name):\n" +
    (list || "(none available)") +
    "\n\nInfer the shopper's intent and reply with a JSON object with EXACTLY " +
    "these keys:\n" +
    '{"categorySlug": <one exact slug from the list above, or null>, ' +
    '"type": "product" | "service" | null, ' +
    '"city": <string or null>, ' +
    '"budgetMax": <number in INR or null>, ' +
    '"searchTerms": <short string of the best keywords to match vendor listings>, ' +
    '"reply": <one friendly sentence to show the shopper about what you found>}\n' +
    "Only use a categorySlug that appears verbatim in the list; use null if none fit. " +
    "Never invent cities, prices, or quantities the shopper did not imply.";

  return claudeCli.askClaudeJSON(prompt, { timeoutMs: 15000 });
}

async function cliResolve({ query, parsed, categories }) {
  const q = String(query || "").trim();
  if (!q) {
    // Nothing to search — a short clarify is the honest, useful answer.
    return { mode: "clarify", clarify: CLARIFY_PROMPT, parsed };
  }

  const validSlugs = new Set((categories || []).map((c) => c && c.slug).filter(Boolean));

  // Merged intent, seeded from the deterministic parse.
  let category = parsed.category || null;
  let city = parsed.city || null;
  let type = parsed.type || null;
  let budgetMax = parsed.budgetMax != null ? parsed.budgetMax : null;
  let message = null;

  // Deterministic base result (fast default).
  let listings = await runSearch(q, { city, type }, RESULT_LIMIT);

  const needClaude =
    parsed.confidence < LOW_CONFIDENCE || !parsed.category || listings.length === 0;

  if (needClaude) {
    const intent = await askClaudeIntent({ query: q, categories });
    if (intent) {
      // Prefer Claude's slots when present; validate the slug against the catalog.
      const slug = nonEmptyString(intent.categorySlug);
      if (slug && validSlugs.has(slug)) category = slug;
      const cType = pickType(intent.type);
      if (cType) type = cType;
      const cCity = nonEmptyString(intent.city);
      if (cCity) city = cCity;
      const cBudget = pickPositiveNumber(intent.budgetMax);
      if (cBudget != null) budgetMax = cBudget;
      message = nonEmptyString(intent.reply);

      // Re-run search with the merged filters + Claude's refined search terms.
      const terms = nonEmptyString(intent.searchTerms) || q;
      listings = await runSearch(terms, { city, type }, RESULT_LIMIT);
    }
  }

  // ---- Build a NEVER-BLANK response ----
  if (listings.length > 0) {
    // A confident single category -> send them to the full category page.
    if (category && validSlugs.has(category)) {
      return {
        mode: "navigate",
        navigateTo: { categorySlug: category, filters: cleanFilters({ city, type, budgetMax }) },
        listings,
        message: message || undefined,
        parsed,
      };
    }
    return { mode: "list", listings, message: message || undefined, parsed };
  }

  // Still empty: return a helpful list-shaped response (frontend shows the RFQ
  // pointer + a friendly message rather than a dead end).
  return {
    mode: "list",
    listings: [],
    message: message || defaultEmptyMessage(q),
    parsed,
  };
}

/* --------------------------------------------------------------- route ----- */

// Public: the hero search must work before any auth wall (DESIGN §1.8).
// optionalAuth attaches req.user when a token is present but never blocks a
// guest request — used only to tag search-event logs with a userId when known.
router.post("/search", optionalAuth, async (req, res, next) => {
  try {
    const query =
      req.body && typeof req.body.query === "string" ? req.body.query : "";
    if (query.length > config.AI_PROMPT_MAX) {
      return res.status(400).json({
        success: false,
        error: `query must be ${config.AI_PROMPT_MAX} characters or fewer`,
      });
    }
    const categories = await loadCategories(); // [] if not seeded yet
    const parsed = parseQuery(query, categories);

    // Directory's own search bar opts out of AI refinement entirely (explicit
    // `ai:false`) — pure deterministic category+keyword search, guaranteed no
    // Claude/API call. Consultations and the suite home hero don't send this
    // flag, so they keep today's AI-refined behavior unchanged.
    const noAi = req.body && req.body.ai === false;

    let result;
    // C8: `degraded` is true ONLY when an AI/CLI refine call was attempted and
    // failed, so the response is the deterministic fallback — a caller can tell
    // that 200 apart from a normal one. It stays false when AI simply wasn't
    // attempted (no key/CLI, or `ai:false`).
    let degraded = false;
    if (noAi) {
      result = await deterministicResolve({ query, parsed });
    } else if (config.ANTHROPIC_API_KEY) {
      try {
        result = await aiResolve({ query, parsed, categories });
      } catch (_err) {
        // Any SDK / network / parsing failure -> deterministic guarantee.
        result = await deterministicResolve({ query, parsed });
        degraded = true;
      }
    } else if (config.AI_CLI_ENABLED && claudeCli.isClaudeAvailable()) {
      // No API key, but the locally authenticated `claude` CLI is available:
      // deterministic-first, semantic refine-on-need, never blank.
      try {
        result = await cliResolve({ query, parsed, categories });
      } catch (_err) {
        result = await deterministicResolve({ query, parsed });
        degraded = true;
      }
    } else {
      result = await deterministicResolve({ query, parsed });
    }
    result = { ...result, degraded };

    logSearchEvent({
      query,
      categorySlug: (result && result.navigateTo && result.navigateTo.categorySlug) || parsed.category || null,
      city: parsed.city || null,
      userId: req.user && req.user.id,
    }); // fire-and-forget

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------- AI listing auto-fill ---- */

const SERVICE_HINT_RE =
  /\b(service|services|repair|repairs|consult|consulting|installation|install|maintenance|design|training|agency|rental|rentals|cleaning|catering|contractor|freelanc|support)\b/;

function titleCase(str) {
  return String(str)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Deterministic best-guess draft from a free-text hint (no key / no image / on
 * failure). Always returns a usable shape; suggestedCategorySlug is left null
 * because we can't reliably map without the model.
 */
function autofillFallback(hint) {
  const h = String(hint || "").trim();
  const tokens = (h.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (t) => t.length > 2
  );
  const keywords = [...new Set(tokens)].slice(0, 8);
  const type = SERVICE_HINT_RE.test(h.toLowerCase()) ? "service" : "product";
  const title = h ? titleCase(h).slice(0, 80) : "New Listing";
  const description = h
    ? `${title}. ${h}. Contact the seller for pricing, specifications, and availability.`
    : "Add a description for your listing. Include key specifications, materials, dimensions, pricing, and what makes your offering stand out.";
  return { title, description, keywords, type, suggestedCategorySlug: null };
}

/** Build an Anthropic image content block from a URL or (data-)base64 string. */
function buildImageBlock({ imageUrl, imageBase64 }) {
  if (imageBase64) {
    let mediaType = "image/jpeg";
    let data = imageBase64;
    const m = /^data:([^;]+);base64,(.*)$/s.exec(imageBase64);
    if (m) {
      mediaType = m[1];
      data = m[2];
    }
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  }
  return { type: "image", source: { type: "url", url: imageUrl } };
}

/** One forced-tool vision call to Claude; returns a validated draft. */
async function autofillFromImage({ imageUrl, imageBase64, hint, categories }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const Client = Anthropic.default || Anthropic;
  const client = new Client({ apiKey: config.ANTHROPIC_API_KEY });

  const validSlugs = new Set((categories || []).map((c) => c && c.slug).filter(Boolean));

  const tool = {
    name: "listingDraft",
    description: "Draft a BharatSource marketplace listing from a product/service photo.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, specific product/service title." },
        description: {
          type: "string",
          description: "2-4 sentence marketplace description of what is shown.",
        },
        suggestedCategorySlug: {
          type: "string",
          description: "Best-matching slug from the provided valid list; omit if none fit.",
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "5-10 lowercase search keywords.",
        },
        type: { type: "string", enum: ["product", "service"] },
      },
      required: ["title", "description", "keywords", "type"],
    },
  };

  const system =
    "You are the BharatSource listing assistant for an Indian B2B/B2C marketplace. " +
    "Look at the photo and draft a concise, accurate listing by calling the " +
    "listingDraft tool exactly once. Choose suggestedCategorySlug ONLY from the " +
    "provided valid slugs; if none clearly fit, omit it.";

  const textParts = [];
  if (hint) textParts.push(`Seller hint: ${hint}`);
  textParts.push(`Valid category slugs: ${[...validSlugs].join(", ") || "(none available)"}`);

  const resp = await client.messages.create({
    model: MODEL, // "claude-sonnet-5"
    max_tokens: 1024,
    thinking: { type: "disabled" },
    tool_choice: { type: "tool", name: "listingDraft" },
    tools: [tool],
    system,
    messages: [
      {
        role: "user",
        content: [buildImageBlock({ imageUrl, imageBase64 }), { type: "text", text: textParts.join("\n\n") }],
      },
    ],
  });

  const tu = (resp.content || []).find((b) => b.type === "tool_use");
  if (!tu) throw new Error("model returned no tool_use block");
  const input = tu.input || {};

  const slug =
    input.suggestedCategorySlug && validSlugs.has(input.suggestedCategorySlug)
      ? input.suggestedCategorySlug
      : null;
  const keywords = Array.isArray(input.keywords)
    ? [...new Set(input.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean))].slice(0, 12)
    : [];

  return {
    title: String(input.title || "").trim() || "New Listing",
    description: String(input.description || "").trim(),
    suggestedCategorySlug: slug,
    keywords,
    type: input.type === "service" ? "service" : "product",
  };
}

// POST /autofill — draft a listing from a photo (or gracefully from a hint).
router.post("/autofill", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    const imageUrl = typeof b.imageUrl === "string" ? b.imageUrl.trim() : "";
    const imageBase64 = typeof b.imageBase64 === "string" ? b.imageBase64 : "";
    const hint = typeof b.hint === "string" ? b.hint : "";

    // No key (current state): guaranteed deterministic best-guess. Never crash.
    if (!config.ANTHROPIC_API_KEY) {
      const draft = autofillFallback(hint);
      return res.json({
        success: true,
        data: {
          ...draft,
          fallback: true,
          note: "Set ANTHROPIC_API_KEY to enable photo auto-fill",
        },
      });
    }

    // Key present but nothing to look at — degrade to the hint-based draft.
    if (!imageUrl && !imageBase64) {
      const draft = autofillFallback(hint);
      return res.json({
        success: true,
        data: {
          ...draft,
          fallback: true,
          note: "Provide imageUrl or imageBase64 to use photo auto-fill",
        },
      });
    }

    const categories = await loadCategories();
    try {
      const draft = await autofillFromImage({ imageUrl, imageBase64, hint, categories });
      return res.json({ success: true, data: { ...draft, fallback: false } });
    } catch (_err) {
      // Any SDK / network / parsing failure -> deterministic guarantee.
      const draft = autofillFallback(hint);
      return res.json({
        success: true,
        data: {
          ...draft,
          fallback: true,
          note: "Photo auto-fill failed; showing a best-guess draft",
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------- AI RFQ composer ------ */
/**
 * POST /rfq  { need }  (PUBLIC — buyers draft before any login wall)
 *   -> { title, productName, categorySlug, quantity, unit, targetPrice,
 *        deliveryLocation, timeline, details, formattedRfq, parsed, fallback }
 *
 * Same guarantee as the rest of this router: fully deterministic without a key,
 * refined by Claude when ANTHROPIC_API_KEY is present, and it NEVER crashes.
 */

// Quantity phrase like "500 kg", "2 tonnes", "100 pieces".
const RFQ_QUANTITY_RE =
  /\b(\d[\d,]*(?:\.\d+)?)\s*(kgs?|kilograms?|grams?|g|tonnes?|tons?|mt|quintals?|pcs?|pieces?|units?|nos?|dozens?|pairs?|sets?|rolls?|boxes?|box|cartons?|packs?|bags?|litres?|liters?|l|meters?|metres?|m|feet|ft)\b/i;

// Urgency / timeline phrase.
const RFQ_TIMELINE_RE =
  /\b(urgent(?:ly)?|asap|immediate(?:ly)?|(?:with)?in\s+\d+\s*(?:days?|weeks?|months?)|\d+\s*(?:days?|weeks?|months?)|this\s+(?:week|month)|next\s+(?:week|month))\b/i;

// Unit tokens to strip out of a derived product name.
const RFQ_UNIT_WORDS = new Set([
  "kg", "kgs", "kilogram", "kilograms", "gram", "grams", "g", "ton", "tons",
  "tonne", "tonnes", "mt", "quintal", "quintals", "pcs", "pc", "piece", "pieces",
  "unit", "units", "no", "nos", "dozen", "dozens", "pair", "pairs", "set", "sets",
  "roll", "rolls", "box", "boxes", "carton", "cartons", "pack", "packs", "bag",
  "bags", "litre", "litres", "liter", "liters", "l", "meter", "meters", "metre",
  "metres", "m", "feet", "ft",
]);

function detectQuantity(need) {
  const m = String(need || "").match(RFQ_QUANTITY_RE);
  if (!m) return { quantity: "", unit: "" };
  return { quantity: m[1].replace(/,/g, ""), unit: m[2].toLowerCase() };
}

function detectTimeline(need) {
  const m = String(need || "").match(RFQ_TIMELINE_RE);
  return m ? titleCase(m[0]) : "";
}

function categoryNameBySlug(categories, slug) {
  if (!slug) return "";
  const hit = (categories || []).find((c) => c && c.slug === slug);
  return hit ? hit.name : slug;
}

// Timeline/urgency tokens that pollute a derived product name.
const RFQ_NOISE_WORDS = new Set([
  "urgent", "urgently", "asap", "immediate", "immediately", "day", "days",
  "week", "weeks", "month", "months", "today", "tomorrow", "soon",
]);

function rfqProductName(need, parsed) {
  const words = (parsed.keywords || []).filter(
    (k) => !RFQ_UNIT_WORDS.has(k) && !RFQ_NOISE_WORDS.has(k)
  );
  if (words.length) return titleCase(words.slice(0, 6).join(" "));
  const cleaned = String(need || "").trim();
  return cleaned ? titleCase(cleaned).slice(0, 60) : "Requirement";
}

function buildFormattedRfq(d) {
  const qty = [d.quantity, d.unit].filter(Boolean).join(" ");
  return [
    `Requirement: ${d.productName || d.need || "—"}`,
    `Category: ${d.categoryName || "—"}`,
    `Quantity: ${qty || "—"}`,
    `Target price: ${d.targetPrice != null ? "₹" + d.targetPrice : "—"}`,
    `Delivery location: ${d.deliveryLocation || "—"}`,
    `Timeline: ${d.timeline || "—"}`,
    `Details: ${d.details || d.need || "—"}`,
  ].join("\n");
}

/** Deterministic RFQ draft from the parsed need. Always usable; fallback:true. */
function rfqFallback(need, parsed, categories) {
  const productName = rfqProductName(need, parsed);
  const { quantity, unit } = detectQuantity(need);
  const timeline = detectTimeline(need);
  const deliveryLocation = parsed.city || "";
  const targetPrice = parsed.budgetMax != null ? parsed.budgetMax : null;
  const categorySlug = parsed.category || null;
  const categoryName = categoryNameBySlug(categories, categorySlug);
  const title = deliveryLocation
    ? `${productName} in ${deliveryLocation}`
    : `Requirement for ${productName}`;
  const details =
    String(need || "").trim() ||
    `Looking for ${productName}. Please share pricing, specifications, and availability.`;
  const formattedRfq = buildFormattedRfq({
    need, productName, categoryName, quantity, unit, targetPrice,
    deliveryLocation, timeline, details,
  });
  return {
    title, productName, categorySlug, quantity, unit, targetPrice,
    deliveryLocation, timeline, details, formattedRfq,
  };
}

/** One forced-tool call to Claude; returns a validated, cleaner RFQ draft. */
async function rfqFromClaude({ need, parsed, categories }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const Client = Anthropic.default || Anthropic;
  const client = new Client({ apiKey: config.ANTHROPIC_API_KEY });

  const validSlugs = new Set((categories || []).map((c) => c && c.slug).filter(Boolean));

  const tool = {
    name: "rfqDraft",
    description:
      "Draft a structured B2B/B2C sourcing requirement (RFQ) from the buyer's free-text need.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short headline for the requirement." },
        productName: { type: "string", description: "The product or service being sourced." },
        categorySlug: {
          type: "string",
          description: "Best-matching slug from the provided valid list; omit if none fit.",
        },
        quantity: { type: "string", description: "Numeric quantity if stated, else empty." },
        unit: { type: "string", description: "Unit of measure (kg, pieces, …), else empty." },
        targetPrice: { type: "number", description: "Target/max budget in INR if stated." },
        deliveryLocation: { type: "string", description: "Delivery city/location if stated." },
        timeline: { type: "string", description: "Required timeline/urgency if stated." },
        details: {
          type: "string",
          description: "2-4 sentence clear description of the requirement for suppliers.",
        },
        formattedRfq: {
          type: "string",
          description: "A clean multi-line requirement summary suppliers can read.",
        },
      },
      required: ["title", "productName", "details", "formattedRfq"],
    },
  };

  const system =
    "You are the BharatSource sourcing assistant for an Indian B2B/B2C marketplace. " +
    "Turn the buyer's free-text need into ONE clean, structured requirement (RFQ) by " +
    "calling the rfqDraft tool exactly once. Only choose categorySlug from the provided " +
    "valid slugs; if none clearly fit, omit it. Leave fields empty when the buyer did not " +
    "state them — never invent quantities, prices, or locations.";

  const userText =
    `Buyer need: ${need}\n\n` +
    `Deterministic pre-parse (hints, may be partial): ${JSON.stringify(parsed)}\n\n` +
    `Valid category slugs: ${[...validSlugs].join(", ") || "(none available)"}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    tool_choice: { type: "tool", name: "rfqDraft" },
    tools: [tool],
    system,
    messages: [{ role: "user", content: userText }],
  });

  const tu = (resp.content || []).find((b) => b.type === "tool_use");
  if (!tu) throw new Error("model returned no tool_use block");
  const input = tu.input || {};

  const categorySlug =
    input.categorySlug && validSlugs.has(input.categorySlug)
      ? input.categorySlug
      : parsed.category || null;
  const productName = String(input.productName || "").trim() || rfqProductName(need, parsed);
  const details = String(input.details || "").trim() || String(need || "").trim();
  const quantity = input.quantity != null ? String(input.quantity).trim() : "";
  const unit = input.unit != null ? String(input.unit).trim() : "";
  const targetPrice =
    typeof input.targetPrice === "number" && isFinite(input.targetPrice)
      ? Math.round(input.targetPrice)
      : parsed.budgetMax != null
      ? parsed.budgetMax
      : null;
  const deliveryLocation = String(input.deliveryLocation || "").trim() || parsed.city || "";
  const timeline = String(input.timeline || "").trim();
  const categoryName = categoryNameBySlug(categories, categorySlug);
  const title =
    String(input.title || "").trim() ||
    (deliveryLocation ? `${productName} in ${deliveryLocation}` : `Requirement for ${productName}`);
  const formattedRfq =
    String(input.formattedRfq || "").trim() ||
    buildFormattedRfq({
      need, productName, categoryName, quantity, unit, targetPrice,
      deliveryLocation, timeline, details,
    });

  return {
    title, productName, categorySlug, quantity, unit, targetPrice,
    deliveryLocation, timeline, details, formattedRfq,
  };
}

// POST /rfq — compose a structured requirement from free text. Public (draft
// before login). Deterministic without a key (fallback:true); never crashes.
router.post("/rfq", optionalAuth, async (req, res, next) => {
  try {
    const need =
      req.body && typeof req.body.need === "string" ? req.body.need.trim() : "";
    if (need.length > config.AI_PROMPT_MAX) {
      return res.status(400).json({
        success: false,
        error: `need must be ${config.AI_PROMPT_MAX} characters or fewer`,
      });
    }
    const categories = await loadCategories();
    const parsed = parseQuery(need, categories);

    if (config.ANTHROPIC_API_KEY) {
      try {
        const draft = await rfqFromClaude({ need, parsed, categories });
        return res.json({ success: true, data: { ...draft, parsed, fallback: false } });
      } catch (_err) {
        const draft = rfqFallback(need, parsed, categories);
        return res.json({
          success: true,
          data: {
            ...draft,
            parsed,
            fallback: true,
            note: "AI drafting failed; showing a best-guess draft",
          },
        });
      }
    }

    const draft = rfqFallback(need, parsed, categories);
    return res.json({
      success: true,
      data: {
        ...draft,
        parsed,
        fallback: true,
        note: "Set ANTHROPIC_API_KEY to enable full AI drafting",
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
