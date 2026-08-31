/**
 * nlp.js — deterministic query parser for the AI concierge (DESIGN.md §5).
 *
 * This is the "normalize + synonym expand" stage that runs BEFORE any model call,
 * and the guaranteed fallback when no ANTHROPIC_API_KEY is configured. It is pure,
 * synchronous, and dependency-free so it can be trusted as a guard-rail: every
 * category slug / city the model later emits is validated against the same
 * reference data this parser uses.
 *
 * parseQuery(text, categories) -> {
 *   category,    // best-matching category slug (validated against `categories`) or null
 *   city,        // matched Indian city (title-cased) or null
 *   type,        // "product" | "service" | null
 *   budgetMax,   // number (INR) from "under X" / "₹X" or null
 *   keywords,    // meaningful, synonym-expanded search terms
 *   confidence   // 0..1 rough signal strength
 * }
 */

/* -------------------------------------------------------- reference data --- */

// Abbreviation / jargon expansion. Keys are single lowercase tokens; values are
// the words they expand into (used for both keyword expansion and category match).
const SYNONYMS = {
  ca: ["chartered", "accountant", "accounting"],
  cas: ["chartered", "accountant", "accounting"],
  gst: ["gst", "tax", "taxation", "goods", "services"],
  itr: ["income", "tax", "return", "filing"],
  ss: ["stainless", "steel"],
  ms: ["mild", "steel"],
  atta: ["wheat", "flour"],
  pcb: ["printed", "circuit", "board", "electronics"],
  mfg: ["manufacturer", "manufacturing"],
  cnc: ["cnc", "machine", "machinery"],
  hr: ["human", "resources"],
  fmcg: ["food", "consumer", "goods"],
  // Use-case / occasion words → category tokens, so the deterministic path can
  // still land on a sensible category (matched against slug+name tokens) even
  // when the shopper never names one. Additive; existing entries are unchanged.
  birthday: ["gifts", "crafts", "party"],
  party: ["gifts", "crafts", "party"],
  gift: ["gifts", "crafts"],
  gifts: ["gifts", "crafts"],
  wedding: ["gifts", "crafts", "wedding"],
  festival: ["gifts", "crafts", "festival"],
  festive: ["gifts", "crafts"],
  diwali: ["gifts", "crafts", "festival"],
  office: ["office", "stationery", "supplies"],
  stationery: ["office", "stationery", "supplies"],
  grocery: ["food", "grocery"],
  groceries: ["food", "grocery"],
  snack: ["food", "snacks"],
  snacks: ["food", "snacks"],
};

// A small, high-frequency India city list. Multi-word entries are checked as
// substrings; keep the longer variants first so "new delhi" wins over "delhi".
const CITIES = [
  "new delhi",
  "navi mumbai",
  "greater noida",
  "mumbai",
  "delhi",
  "bengaluru",
  "bangalore",
  "chennai",
  "kolkata",
  "hyderabad",
  "pune",
  "ahmedabad",
  "surat",
  "jaipur",
  "lucknow",
  "kanpur",
  "nagpur",
  "indore",
  "coimbatore",
  "kochi",
  "cochin",
  "ludhiana",
  "gurugram",
  "gurgaon",
  "noida",
  "chandigarh",
  "bhopal",
  "patna",
  "vadodara",
  "visakhapatnam",
  "agra",
  "nashik",
  "rajkot",
  "faridabad",
  "meerut",
  "varanasi",
  "thane",
  "tiruppur",
  "moradabad",
  "aurangabad",
];

// Words that signal a SERVICE listing.
const SERVICE_WORDS = new Set([
  "ca",
  "cas",
  "chartered",
  "accountant",
  "accounting",
  "consultant",
  "consulting",
  "consultancy",
  "service",
  "services",
  "repair",
  "repairing",
  "filing",
  "audit",
  "auditor",
  "lawyer",
  "advocate",
  "legal",
  "architect",
  "designer",
  "design",
  "photographer",
  "photography",
  "plumber",
  "electrician",
  "tutor",
  "tuition",
  "coaching",
  "training",
  "agency",
  "maintenance",
  "installation",
  "hire",
  "booking",
  "consultation",
  "gst",
  "itr",
]);

// Words that signal a PRODUCT listing.
const PRODUCT_WORDS = new Set([
  "steel",
  "stainless",
  "fabric",
  "cotton",
  "yarn",
  "machine",
  "machinery",
  "pump",
  "cement",
  "chemical",
  "chemicals",
  "pipe",
  "pipes",
  "sheet",
  "sheets",
  "flour",
  "atta",
  "wire",
  "bearing",
  "bearings",
  "component",
  "components",
  "equipment",
  "material",
  "materials",
  "supply",
  "wholesale",
  "bulk",
  "manufacturer",
  "supplier",
  "board",
  "packaging",
  "box",
  "boxes",
  "fertilizer",
  "seed",
  "seeds",
]);

const STOP = new Set([
  "a",
  "an",
  "the",
  "i",
  "im",
  "need",
  "needed",
  "want",
  "wanted",
  "looking",
  "look",
  "for",
  "in",
  "at",
  "near",
  "from",
  "to",
  "of",
  "and",
  "or",
  "my",
  "me",
  "some",
  "any",
  "please",
  "pls",
  "find",
  "get",
  "buy",
  "best",
  "top",
  "good",
  "with",
  "on",
  "is",
  "are",
  "who",
  "can",
  "someone",
  "somebody",
  "provide",
  "provider",
]);

// Words that are part of a budget phrase and shouldn't leak into keywords.
const BUDGET_WORDS = new Set([
  "under",
  "below",
  "less",
  "than",
  "upto",
  "up",
  "within",
  "budget",
  "max",
  "maximum",
  "rs",
  "inr",
  "price",
  "cost",
]);

/* ------------------------------------------------------------- helpers ----- */

function tokenize(text) {
  return (String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []);
}

function unique(arr) {
  return [...new Set(arr)];
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/** Detect an Indian city from the reference list, else an "in <City>" token. */
function detectCity(original) {
  const lower = String(original || "").toLowerCase();
  for (const city of CITIES) {
    // word-ish boundary check so "pune" doesn't match "puneet"
    const re = new RegExp(`(^|[^a-z])${city.replace(/ /g, "\\s+")}([^a-z]|$)`);
    if (re.test(lower)) return titleCase(city);
  }
  // Fallback: capitalized token after a locative preposition ("in Pune").
  const m = String(original || "").match(/\b(?:in|at|near|from)\s+([A-Z][a-z]{2,})/);
  if (m) return titleCase(m[1]);
  return null;
}

function titleCase(s) {
  return String(s)
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Parse a rupee budget ceiling from phrases like "under 5000", "₹5k", "upto 2 lakh". */
function detectBudgetMax(original) {
  const text = String(original || "").toLowerCase();
  const re =
    /(?:under|below|less than|upto|up to|within|budget|max(?:imum)?|₹|rs\.?|inr)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh|lac|cr|crore)?/i;
  const m = text.match(re);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (!isFinite(n)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k" || unit === "thousand") n *= 1e3;
  else if (unit === "lakh" || unit === "lac") n *= 1e5;
  else if (unit === "cr" || unit === "crore") n *= 1e7;
  return Math.round(n);
}

/** Expand a token set with synonym mappings. */
function expandTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    out.push(t);
    if (SYNONYMS[t]) out.push(...SYNONYMS[t]);
  }
  return unique(out);
}

/** Tokens that describe a category (from both its slug and its display name). */
function categoryTokens(cat) {
  const fromSlug = String(cat.slug || "").split(/[-_]/);
  const fromName = String(cat.name || "").toLowerCase().split(/\s+/);
  return unique([...fromSlug, ...fromName].filter((t) => t && !STOP.has(t)));
}

/**
 * Fuzzy "contains" match of the query token set against each category.
 * Returns { slug, score } for the best match, or null.
 *
 * `opts.preferGeneral` (default false, so existing callers are unaffected):
 * when a subcategory ties a top-level category on raw score, keep the
 * top-level one. Without it, the winner of a tie is whichever category the
 * `categories` array happens to enumerate first — an accident of file/DB
 * ordering, not query relevance (e.g. a broad "electronics" query landing on
 * a random child category just because it was listed earlier that request).
 */
function matchCategory(querySet, categories, opts = {}) {
  let best = null;
  for (const cat of categories || []) {
    if (!cat || !cat.slug) continue;
    const catToks = categoryTokens(cat);
    if (!catToks.length) continue;
    let score = 0;
    for (const ct of catToks) {
      if (querySet.has(ct)) {
        score += 2; // exact token hit
      } else if (ct.length >= 4) {
        // substring either direction (e.g. "account" ~ "accounting")
        for (const qt of querySet) {
          if (qt.length >= 4 && (qt.includes(ct) || ct.includes(qt))) {
            score += 1;
            break;
          }
        }
      }
    }
    if (score > 0) {
      if (!best || score > best.score) {
        best = { slug: cat.slug, score, max: catToks.length * 2, parentId: cat.parentId || null };
      } else if (opts.preferGeneral && score === best.score && !cat.parentId && best.parentId) {
        best = { slug: cat.slug, score, max: catToks.length * 2, parentId: null };
      }
    }
  }
  return best;
}

/* ----------------------------------------------------------- parseQuery ---- */

function parseQuery(text, categories = [], opts = {}) {
  const original = String(text == null ? "" : text);
  const rawTokens = tokenize(original);
  const expanded = expandTokens(rawTokens);
  const querySet = new Set(expanded);

  const city = detectCity(original);
  const budgetMax = detectBudgetMax(original);

  // type: any service signal wins, else any product signal, else null.
  let type = null;
  if (expanded.some((t) => SERVICE_WORDS.has(t))) type = "service";
  else if (expanded.some((t) => PRODUCT_WORDS.has(t))) type = "product";

  const catMatch = matchCategory(querySet, categories, opts);
  const category = catMatch ? catMatch.slug : null;

  // keywords: meaningful, expanded terms minus stopwords / budget words / city / numbers.
  const cityWords = new Set(city ? tokenize(city) : []);
  const keywords = unique(
    expanded.filter(
      (t) =>
        !STOP.has(t) &&
        !BUDGET_WORDS.has(t) &&
        !cityWords.has(t) &&
        !/^\d+$/.test(t)
    )
  );

  // confidence: category strength dominates, other slots add a little.
  const catStrength = catMatch ? clamp01(catMatch.score / catMatch.max) : 0;
  let confidence =
    catStrength * 0.5 +
    (city ? 0.2 : 0) +
    (type ? 0.15 : 0) +
    (budgetMax != null ? 0.05 : 0) +
    Math.min(keywords.length, 3) * 0.03;
  confidence = Math.round(clamp01(confidence) * 100) / 100;

  return { category, city, type, budgetMax, keywords, confidence };
}

/**
 * Rank all categories against a query locally (reuses matchCategory()'s scoring,
 * synchronous, no CLI call) and return only the top few — for callers that build
 * an AI prompt and would otherwise dump every category into it on every request
 * (e.g. routes/assistant.js's buildAssistantPrompt(), which used to send all 280
 * rows regardless of relevance). The CLI still sees enough real candidates to
 * pick correctly or say "none of these," at a fraction of the prompt tokens.
 */
function selectRelevantCategories(text, categories = [], limit = 20) {
  const rawTokens = tokenize(text);
  const expanded = expandTokens(rawTokens);
  const querySet = new Set(expanded);

  const scored = (categories || [])
    .filter((c) => c && c.slug)
    .map((cat) => {
      const catToks = categoryTokens(cat);
      let score = 0;
      for (const ct of catToks) {
        if (querySet.has(ct)) score += 2;
        else if (ct.length >= 4) {
          for (const qt of querySet) {
            if (qt.length >= 4 && (qt.includes(ct) || ct.includes(qt))) {
              score += 1;
              break;
            }
          }
        }
      }
      return { cat, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length >= limit) return scored.slice(0, limit).map((s) => s.cat);

  // Not enough scored hits to fill the shortlist (short/ambiguous query) — pad
  // with top-level categories so the CLI still has a reasonable spread to
  // choose "none of these fit" from, rather than an unnaturally short list.
  const chosen = new Map(scored.map((s) => [s.cat.slug, s.cat]));
  for (const cat of categories || []) {
    if (chosen.size >= limit) break;
    if (cat && cat.slug && !cat.parentId && !chosen.has(cat.slug)) chosen.set(cat.slug, cat);
  }
  return [...chosen.values()];
}

module.exports = { parseQuery, selectRelevantCategories };
