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
const { optionalAuth } = require("../middleware/authGuard");

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

/**
 * The assistant is a GLOBAL guide across the whole suite (Directory,
 * Consultations, Recruitment, Credit Card, Mutual, plus general site pages),
 * not just a Directory-category search. This map lets it point to the right
 * place for meta/navigation questions the deterministic category matcher was
 * never meant to answer (it only knows Directory categories & listings).
 */
const SITE_SECTIONS = [
  {
    label: "Browse Consultations",
    href: "/consultations",
    blurb: "Consultations — hire verified CAs, lawyers and consultants",
    keywords: ["consultation", "consultations", "consultant", "consultants", "book a consultation", "hire an expert", "hire a lawyer", "hire a ca"],
  },
  {
    label: "Recruitment (coming soon)",
    href: "/recruitment",
    blurb: "Recruitment — post roles and connect with vetted candidates (coming soon)",
    keywords: ["recruitment", "recruit", "hiring", "hire staff", "job posting", "job postings", "vacancy", "vacancies", "candidates"],
  },
  {
    label: "Credit Card (coming soon)",
    href: "/credit-card",
    blurb: "Credit Card — business credit cards for your company (coming soon)",
    keywords: ["credit card", "creditcard"],
  },
  {
    label: "Mutual (coming soon)",
    href: "/mutual",
    blurb: "Mutual — grow surplus with curated mutual funds (coming soon)",
    keywords: ["mutual fund", "mutual funds", "sip investment"],
  },
  {
    label: "View pricing",
    href: "/pricing",
    blurb: "our pricing & subscription plans",
    keywords: ["pricing", "subscription plan", "subscription plans", "how much does it cost"],
  },
  {
    label: "About BharatSource",
    href: "/about",
    blurb: "what BharatSource is",
    keywords: ["who are you", "what is bharatsource", "about bharatsource", "about us"],
  },
];

/** Word/phrase-boundary keyword match so e.g. "sell" doesn't fire inside "reseller". */
function matchSiteSection(message) {
  const padded = ` ${message.toLowerCase()} `;
  let best = null;
  for (const sec of SITE_SECTIONS) {
    for (const kw of sec.keywords) {
      const re = new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
      if (re.test(padded)) {
        const weight = kw.split(/\s+/).length; // multi-word phrases are stronger signals
        if (!best || weight > best.weight) best = { ...sec, weight };
        break;
      }
    }
  }
  return best;
}

/** Word/phrase-boundary test for a single keyword phrase against a message. */
function hasPhrase(message, phrase) {
  const re = new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
  return re.test(` ${message.toLowerCase()} `);
}

// Account/listing/RFQ actions are platform navigation, not a product search —
// they must never fall through to category matching. Kept deliberately
// narrow (specific self-referential phrases, not a bare "register"/
// "registration") because the Directory has real service categories named
// "GST Registration", "Company Registration", "Trademark Registration" —
// a bare-word match would hijack those genuine searches.
const ACCOUNT_PHRASES = [
  "how do i register", "how to register", "how can i register",
  "sign up", "signup", "create an account", "create my account",
  "open an account", "new account", "register on bharatsource",
  "how to create account", "how do i create an account",
];
const SELL_PHRASES = [
  "register my product", "register product", "add a product", "add my product",
  "add product", "list a product", "list my product", "how do i add a product",
  "how to list a product", "sell my product", "how do i sell", "how to sell",
  "become a seller", "start selling", "post a listing",
];
const RFQ_PHRASES = [
  "requirement", "my requirement", "post a requirement", "raise a requirement",
  "post my requirement", "post requirement",
];

// Broadened fallback signals — this is the guaranteed-available path when the
// AI-reasoning path (which understands arbitrary phrasing) is unavailable or
// over the hourly cap, so it needs to be more than just the exact-phrase list
// above (that's how "i want to sell product" first slipped through to the
// category matcher). No category name contains "sell"/"list"/"add"/"post" as
// a word (checked against categories.json), so broadening those verbs is safe.
const SELL_NOUN_RE = /\b(product|products|item|items|goods)\b/i;
const SELL_SELF_RE = /\b(i|my|myself|we|our|me)\b/i;
const SELL_VERB_RE = /\bsell(s|ing)?\b/i;

function looksLikeSellIntent(message) {
  if (SELL_PHRASES.some((p) => hasPhrase(message, p))) return true;
  // "sell" is an unambiguous verb in this domain (no legitimate RFQ/
  // recruitment/registration-service query uses it) — pair it with a
  // self-reference or a product noun to catch "i want to sell product" /
  // "sell my products" / "sell items" without firing on a buyer query like
  // "who sells steel pipes" (no self-marker, no product noun).
  return SELL_VERB_RE.test(message) && (SELL_SELF_RE.test(message) || SELL_NOUN_RE.test(message));
}

// "register"/"registration" collides with real Directory categories (GST
// Registration, Company Registration, Trademark Registration) — bail out
// whenever one of those qualifiers is present, regardless of which check
// below would otherwise have matched.
const REGISTRATION_SERVICE_QUALIFIERS = /\b(gst|company|trademark|business|firm|msme|fssai|iso|patent|copyright|trust|society|partnership|llp|pvt|startup)\b/i;
const REGISTER_WORD_RE = /\bregister(ing)?\b|\bregistration\b/i;

function looksLikeAccountIntent(message) {
  if (REGISTER_WORD_RE.test(message) && REGISTRATION_SERVICE_QUALIFIERS.test(message)) return false;
  if (ACCOUNT_PHRASES.some((p) => hasPhrase(message, p))) return true;
  return REGISTER_WORD_RE.test(message) && SELL_SELF_RE.test(message);
}

/**
 * "How do I register / sell / post a requirement" are platform actions with
 * one right answer each — never a product/category guess. Detected up front
 * so buildNavigation() (and its category/listing suggestions) is never
 * consulted for these.
 */
function detectActionIntent(message) {
  if (looksLikeSellIntent(message)) return "sell";
  if (looksLikeAccountIntent(message)) return "account";
  if (RFQ_PHRASES.some((p) => hasPhrase(message, p))) return "rfq";
  return null;
}

/** Auth-aware reply for an action intent. `user` is req.user (null if guest). */
function buildActionReply(intent, user) {
  if (intent === "account") {
    if (!user) {
      return {
        reply: "You'll need an account first — takes under a minute. Already have one? Just log in instead.",
        suggestions: [
          { label: "Create an account", href: "/register" },
          { label: "Log in", href: "/login" },
        ],
      };
    }
    return {
      reply: "You're already signed in, so you're all set — no need to register again.",
      suggestions: [
        user.sellerProfile
          ? { label: "Go to dashboard", href: "/dashboard" }
          : { label: "Go to My Profile", href: "/profile" },
      ],
    };
  }
  if (intent === "sell") {
    if (!user) {
      return {
        reply: "To list a product or service, first create an account (or log in if you already have one) — then add your business details from the Directory dashboard and you can start listing.",
        suggestions: [
          { label: "Create an account", href: "/register?next=/sell" },
          { label: "Log in", href: "/login?next=/sell" },
        ],
      };
    }
    if (!user.sellerProfile) {
      return {
        reply: "Add your business details first — that turns your account into a seller account, and you can list right after. Your first listing can also create it for you automatically if you'd rather start there.",
        suggestions: [
          { label: "Add business details", href: "/dashboard?tab=profile" },
          { label: "Add a product", href: "/sell" },
        ],
      };
    }
    return {
      reply: "You're signed in — head to the listing form to add your product or service.",
      suggestions: [{ label: "Add a product", href: "/sell" }],
    };
  }
  // "rfq" — public page, auth wall deferred to submit time, so no branching needed.
  return {
    reply: "Describe what you need and matching sellers will quote you directly — no need to search category by category.",
    suggestions: [{ label: "Post a requirement (RFQ)", href: "/rfq" }],
  };
}

/**
 * "How many products/sellers/experts…" questions have no business going
 * through category matching (that's how "product count" ended up landing on
 * a random "…Products" category). Recognize the intent up front and answer
 * with real counts instead.
 */
function detectStatsSubject(message) {
  const m = message.toLowerCase();
  if (!/\b(how many|how much|count|total|number of)\b/.test(m)) return null;
  if (/categor/.test(m)) return "categories";
  if (/\b(expert|consultant|lawyer|advocate|chartered accountant)\b/.test(m)) return "experts";
  if (/\b(seller|sellers|vendor|vendors|supplier|suppliers|manufacturer|manufacturers)\b/.test(m)) return "sellers";
  if (/\bservice/.test(m)) return "services";
  if (/\b(product|products|listing|listings|item|items)\b/.test(m)) return "products";
  return "overview";
}

async function buildStatsReply(subject) {
  const [listings, users, cats] = await Promise.all([
    store.all("listings.json"),
    store.all("users.json"),
    store.all("categories.json"),
  ]);
  const active = listings.filter((l) => l.status === "active");
  const products = active.filter((l) => l.type === "product").length;
  const services = active.filter((l) => l.type === "service").length;
  const sellers = users.filter((u) => u.sellerProfile).length;
  const experts = users.filter((u) => u.sellerProfile && u.sellerProfile.expert).length;
  const categories = cats.length;
  const fmt = (n) => Number(n).toLocaleString("en-IN");

  const suggestions = [];
  let reply;
  switch (subject) {
    case "products":
      reply = `We currently have ${fmt(products)} product listings live on the Directory, across ${fmt(categories)} categories.`;
      suggestions.push({ label: "Browse Directory", href: "/directory" });
      break;
    case "services":
      reply = `There are ${fmt(services)} service listings live right now, mainly through Consultations and the Directory.`;
      suggestions.push({ label: "Browse Consultations", href: "/consultations" });
      break;
    case "sellers":
      reply = `${fmt(sellers)} sellers are registered on BharatSource right now.`;
      suggestions.push({ label: "Browse Directory", href: "/directory" });
      break;
    case "experts":
      reply = `${fmt(experts)} verified experts are available to consult right now.`;
      suggestions.push({ label: "Browse Consultations", href: "/consultations" });
      break;
    case "categories":
      reply = `The Directory is organised into ${fmt(categories)} categories.`;
      suggestions.push({ label: "Browse categories", href: "/categories" });
      break;
    default:
      reply = `Right now BharatSource has ${fmt(products)} products, ${fmt(services)} services, ${fmt(sellers)} sellers and ${fmt(experts)} experts, across ${fmt(categories)} categories.`;
      suggestions.push({ label: "Browse Directory", href: "/directory" });
      suggestions.push({ label: "Browse Consultations", href: "/consultations" });
  }
  suggestions.push({ label: "Post a requirement (RFQ)", href: "/rfq" });
  return { reply, suggestions: suggestions.slice(0, 6) };
}

// A clearly confident product search (see plan for the measured confidence
// gap between e.g. "i want to sell product" at 0.19 and real searches at
// 0.54+) skips AI entirely — fast, free, and the deterministic match is
// already reliable at this level.
const CONFIDENT_CATEGORY_THRESHOLD = 0.4;

/**
 * Deterministic fallback — used when the AI path is unavailable, over the
 * hourly cap, or returns nothing usable. `cats`/`parsed` are passed in
 * (already fetched/computed by the caller) rather than redone here.
 */
async function buildNavigation(message, cats, parsed) {
  const suggestions = [];
  const site = matchSiteSection(message);

  // best category match
  let cat = null;
  if (parsed.category) cat = cats.find((c) => c.slug === parsed.category);
  if (!cat && !site) {
    const m = message.toLowerCase();
    cat = cats.find((c) => !c.parentId && (m.includes(c.slug.split("-")[0]) || c.name.toLowerCase().split(/\W+/).some((w) => w.length > 3 && m.includes(w))));
  }

  if (site) suggestions.push({ label: site.label, href: site.href });
  if (cat) {
    const q = new URLSearchParams();
    if (parsed.city) q.set("city", parsed.city);
    if (parsed.type) q.set("type", parsed.type);
    if (parsed.budgetMax) q.set("budgetMax", String(parsed.budgetMax));
    suggestions.push({ label: `Browse ${cat.name}`, href: `/${cat.slug}${q.toString() ? "?" + q : ""}` });
  }

  // top matching listings — skip for a pure site-navigation question (site
  // matched, no category intent) where a listing search would just be noise.
  if (!site || cat) {
    try {
      const { searchListings } = require("../lib/search");
      const hitsL = await searchListings({ q: message, filters: { status: "active" }, limit: 3 });
      for (const { listing } of hitsL) suggestions.push({ label: listing.title, href: `/listing/${listing.id}` });
    } catch {}
  }

  // Only for a genuine product-search reply — a pure site-navigation match
  // (site && !cat) has nothing to "see all results" for.
  if (!site) suggestions.push({ label: "See all results", href: `/search?q=${encodeURIComponent(message)}` });
  suggestions.push({ label: "Post a requirement (RFQ)", href: "/rfq" });

  const bits = [];
  if (site) bits.push(`For ${site.blurb}, head to **${site.label}**`);
  if (cat) bits.push(`${site ? "I also found" : "I found"} the **${cat.name}** category`);
  if (parsed.city) bits.push(`in **${parsed.city}**`);
  if (parsed.type) bits.push(`(${parsed.type}s)`);
  const reply = bits.length
    ? `${bits.join(" ")}. Here are some good places to start — or post an RFQ and matching vendors will contact you.`
    : `I can help you find vendors, products and services across BharatSource — Directory, Consultations and more. Try naming what you need (e.g. "stainless steel sheets in Mumbai" or "CA for GST filing"), or ask about selling, pricing, or our other products. Here are a few options:`;

  return { reply, suggestions: suggestions.slice(0, 6), parsed };
}

/**
 * Fast, free path for a message parseQuery is already confident about — no
 * AI needed. Deliberately leaner than buildNavigation() (no site-section
 * logic): a confident product search essentially never overlaps with a
 * site-navigation question, so that combo is left to the AI/fallback path.
 */
async function buildCategoryNav(message, cats, parsed) {
  const cat = cats.find((c) => c.slug === parsed.category);
  const suggestions = [];
  const q = new URLSearchParams();
  if (parsed.city) q.set("city", parsed.city);
  if (parsed.type) q.set("type", parsed.type);
  if (parsed.budgetMax) q.set("budgetMax", String(parsed.budgetMax));
  suggestions.push({ label: `Browse ${cat.name}`, href: `/${cat.slug}${q.toString() ? "?" + q : ""}` });

  try {
    const { searchListings } = require("../lib/search");
    const hitsL = await searchListings({ q: message, filters: { status: "active" }, limit: 3 });
    for (const { listing } of hitsL) suggestions.push({ label: listing.title, href: `/listing/${listing.id}` });
  } catch {}

  suggestions.push({ label: "See all results", href: `/search?q=${encodeURIComponent(message)}` });
  suggestions.push({ label: "Post a requirement (RFQ)", href: "/rfq" });

  const bits = [`I found the **${cat.name}** category`];
  if (parsed.city) bits.push(`in **${parsed.city}**`);
  if (parsed.type) bits.push(`(${parsed.type}s)`);
  const reply = `${bits.join(" ")}. Here are some good places to start — or post an RFQ and matching vendors will contact you.`;

  return { reply, suggestions: suggestions.slice(0, 6) };
}

/**
 * Known platform actions the AI-reasoning path is allowed to point to — a
 * flat allowlist so the model can never fabricate a link (mirrors
 * routes/ai.js validating any AI-emitted category slug against
 * categories.json before trusting it). "register"/"login"/"sell" are handled
 * separately in resolveWithAI() because they're auth-aware.
 */
// "dashboard" is handled separately (auth + seller-state aware) in resolveWithAI,
// not through this flat map.
const KNOWN_ACTIONS = {
  rfq: { label: "Post a requirement (RFQ)", href: "/rfq" },
  pricing: { label: "View pricing", href: "/pricing" },
  about: { label: "About BharatSource", href: "/about" },
  directory: { label: "Browse Directory", href: "/directory" },
  consultations: { label: "Browse Consultations", href: "/consultations" },
  recruitment: { label: "Recruitment (coming soon)", href: "/recruitment" },
  "credit-card": { label: "Credit Card (coming soon)", href: "/credit-card" },
  mutual: { label: "Mutual (coming soon)", href: "/mutual" },
};

/**
 * Full "product structure" context for the CLI call — the knowledge the
 * regex-based approach never had. Mirrors routes/ai.js's askClaudeIntent()
 * (same "slug | name" category listing, same seed-from-deterministic-parse
 * pattern) plus the whole suite + platform actions + auth state + history.
 */
function buildAssistantPrompt({ message, history, user, categories, parsed }) {
  const catList = (categories || [])
    .filter((c) => c && c.slug)
    .map((c) => `${c.slug} | ${c.name}`)
    .join("\n");

  const historyLines = Array.isArray(history)
    ? history
        .slice(-6)
        .filter((h) => h && typeof h.content === "string")
        .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
        .join("\n")
    : "";

  const authLine = user
    ? `Logged in as ${user.name || "a registered user"}${user.sellerProfile ? ", and already a seller (has a business profile with a Directory dashboard)." : ", but has NOT added business details yet — no seller profile, so no Directory dashboard either. They do have their own basic account Profile page (name/city/contact settings — nothing business-related)."}`
    : "A guest, not logged in.";

  return (
    "You are BharatSource's in-app assistant — a global guide across the WHOLE product suite, not just a Directory product " +
    "search. Understand what the user is really asking and answer helpfully and specifically, using ONLY the real " +
    "information below. Never invent categories, vendors, prices, or pages that aren't listed here.\n\n" +
    "BharatSource is an Indian B2B/B2C marketplace suite. It is a lead/enquiry platform — there is no cart or online " +
    "payment; buyers and sellers connect and negotiate directly.\n\n" +
    "Products in the suite:\n" +
    "- Directory (/directory, LIVE): browse & search product/service listings by category, contact sellers, post RFQs.\n" +
    "- Consultations (/consultations, LIVE): hire verified experts (CAs, lawyers, consultants) via fixed-price packages or a booking request.\n" +
    "- Recruitment (/recruitment, COMING SOON): post roles, connect with candidates.\n" +
    "- Credit Card (/credit-card, COMING SOON): business credit cards.\n" +
    "- Mutual (/mutual, COMING SOON): curated mutual funds.\n\n" +
    'Platform actions (use the matching key in "actions" when relevant):\n' +
    "- register: create a free BharatSource account (one form, self-serve). This ONLY creates the account — it does not " +
    "collect any business/company details.\n" +
    "- login: log in to an existing account.\n" +
    "- sell: list a product or service for sale. Needs an account first, then business details (company name, GST, " +
    "location) added in the Directory dashboard — that step is what turns a plain account into a seller account and " +
    "unlocks the rest of the dashboard (listings, leads, analytics…). Their first listing can also create a minimal " +
    "seller profile automatically if they'd rather start there and fill in details later. This business-details step " +
    "is separate from, and unrelated to, their basic account Profile page.\n" +
    "- rfq: post a requirement — describe what you need, matching sellers quote you directly. Public page, no login needed to browse it.\n" +
    "- dashboard: for an existing seller, their Directory dashboard (listings/leads/analytics/etc.). For a logged-in " +
    "user who is NOT yet a seller, there is no dashboard to send them to — use this action to mean their own basic " +
    "account Profile page instead (name/city/contact settings only, no business content).\n" +
    "- pricing: subscription plans & pricing.\n" +
    "- about: what BharatSource is.\n" +
    "- directory / consultations / recruitment / credit-card / mutual: the suite product pages above.\n\n" +
    'IMPORTANT: a business/legal "registration SERVICE" (GST Registration, Company Registration, Trademark Registration, ' +
    'etc.) is a real thing a seller offers on the Directory — it is a category, NOT the same as the "register" action ' +
    "above (creating a BharatSource account). If the user wants to find/hire someone who does GST/company/trademark " +
    "registration, that's a normal category search — use categorySlug, not the register action.\n\n" +
    "Directory categories (format: slug | name):\n" +
    (catList || "(none available)") +
    "\n\n" +
    (parsed && parsed.category
      ? `Our keyword matcher's best (low-confidence) guess at a category: ${parsed.category} — confirm or override this.\n\n`
      : "") +
    `User: ${authLine}\n` +
    "This matters: if they ask how to register/sign up but are ALREADY logged in, tell them they already have an " +
    "account instead of giving signup instructions. If they ask to sell/list and are logged in but NOT yet a seller, " +
    "guide them to add business details in the Directory dashboard (that's how they become a seller) — mention they " +
    "can also jump straight to adding a listing if they'd rather fill in details afterwards. If they ask to sell/list " +
    "and are ALREADY a seller, send them straight to adding a listing, not to their account Profile or register/log " +
    "in. Their basic account Profile page and the Directory business-details step are two separate, unrelated places " +
    "— never conflate them.\n\n" +
    (historyLines ? `Conversation so far:\n${historyLines}\n\n` : "") +
    `User's latest message: "${message}"\n\n` +
    "Respond with a JSON object with EXACTLY these keys:\n" +
    '{"reply": <natural, specific, 1-4 sentence answer, plain text, no markdown links>, ' +
    '"actions": [<zero to three of: "register","login","sell","rfq","dashboard","pricing","about","directory","consultations","recruitment","credit-card","mutual">], ' +
    '"categorySlug": <one exact slug from the list above that best matches a product/service search, or null>}\n' +
    "Only include an action or categorySlug when it's genuinely the right next step for what the user asked — for a " +
    "purely informational question, both can be empty/null. Only use a categorySlug that appears verbatim in the list above."
  );
}

/**
 * Primary path for anything that isn't a clearly confident product search:
 * ask the CLI to reason over the real product structure and return
 * {reply, suggestions}, same shape every other builder in this file returns.
 * Returns null on any failure (bad/missing output) so the caller falls back
 * to the deterministic path — the never-blank guarantee holds either way.
 */
async function resolveWithAI({ message, history, user, categories, parsed }) {
  const prompt = buildAssistantPrompt({ message, history, user, categories, parsed });
  const ai = await claudeCli.askClaudeJSON(prompt, { timeoutMs: 15000 });
  if (!ai || typeof ai.reply !== "string" || !ai.reply.trim()) return null;

  const validSlugs = new Set((categories || []).map((c) => c && c.slug).filter(Boolean));
  const actions = Array.isArray(ai.actions) ? ai.actions.filter((a) => typeof a === "string") : [];
  const suggestions = [];

  // "sell" is auth-aware: guest needs an account first; a signed-in user who
  // isn't a seller yet needs business details added (that's what unlocks the
  // dashboard); an existing seller goes straight to the listing form — same
  // mapping buildActionReply() uses.
  if (actions.includes("sell")) {
    if (!user) {
      suggestions.push({ label: "Create an account", href: "/register?next=/sell" });
      suggestions.push({ label: "Log in", href: "/login?next=/sell" });
    } else if (!user.sellerProfile) {
      suggestions.push({ label: "Add business details", href: "/dashboard?tab=profile" });
      suggestions.push({ label: "Add a product", href: "/sell" });
    } else {
      suggestions.push({ label: "Add a product", href: "/sell" });
    }
  }
  for (const a of actions) {
    if (a === "sell") continue; // handled above
    if (a === "register") {
      if (!user) suggestions.push({ label: "Create an account", href: "/register" });
      continue; // nonsensical to offer registration to someone already signed in
    }
    if (a === "login") {
      if (!user) suggestions.push({ label: "Log in", href: "/login" });
      continue;
    }
    if (a === "dashboard") {
      if (!user) continue; // guest has no dashboard to go to
      suggestions.push(
        user.sellerProfile
          ? { label: "Go to dashboard", href: "/dashboard" }
          : { label: "Go to My Profile", href: "/profile" }
      );
      continue;
    }
    const known = KNOWN_ACTIONS[a];
    if (known) suggestions.push(known);
  }

  const slug = typeof ai.categorySlug === "string" ? ai.categorySlug.trim() : null;
  if (slug && validSlugs.has(slug)) {
    const cat = categories.find((c) => c.slug === slug);
    const q = new URLSearchParams();
    if (parsed && parsed.city) q.set("city", parsed.city);
    if (parsed && parsed.type) q.set("type", parsed.type);
    if (parsed && parsed.budgetMax) q.set("budgetMax", String(parsed.budgetMax));
    suggestions.push({ label: `Browse ${cat.name}`, href: `/${cat.slug}${q.toString() ? "?" + q : ""}` });
  }

  // Dedupe by base path (ignoring query string) — e.g. "sell" (guest) already
  // expands to /register?next=/sell + /login?next=/sell, so a model that also
  // separately emitted "register"/"login" shouldn't double them up as bare
  // /register + /login. Keep the first occurrence — "sell"'s next=-carrying
  // links are pushed first, so those are the ones kept.
  const seen = new Set();
  const deduped = suggestions.filter((s) => {
    const path = s.href.split("?")[0];
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });

  return { reply: ai.reply.trim(), suggestions: deduped.slice(0, 4) };
}

router.post("/chat", optionalAuth, async (req, res, next) => {
  try {
    const message = (req.body && req.body.message ? String(req.body.message) : "").trim();
    if (!message) return res.status(400).json({ success: false, error: "message is required" });

    const statsSubject = detectStatsSubject(message);
    let nav;
    let usedAI = false;

    if (statsSubject) {
      nav = await buildStatsReply(statsSubject);
    } else {
      const cats = await store.all("categories.json");
      // preferGeneral: on a scoring tie, land on the broader top-level category
      // (e.g. "Electronics & Electrical") instead of whichever subcategory
      // happened to be listed first — see lib/nlp.js matchCategory(). Directory's
      // own search (routes/ai.js) does NOT pass this and is unaffected.
      const parsed = parseQuery(message, cats, { preferGeneral: true });

      if (parsed.category && parsed.confidence >= CONFIDENT_CATEGORY_THRESHOLD) {
        // Clearly confident product search — fast, free, no AI needed.
        nav = await buildCategoryNav(message, cats, parsed);
      } else if (config.ANTHROPIC_API_KEY && allowAI()) {
        // Legacy path — never exercised in this dev environment (no API key
        // is ever configured here); kept unchanged for a hypothetical future
        // production deployment. Not touched by this fix.
        const actionIntent = detectActionIntent(message);
        nav = actionIntent ? buildActionReply(actionIntent, req.user) : await buildNavigation(message, cats, parsed);
        const links = nav.suggestions.map((s) => `- ${s.label} (${s.href})`).join("\n");
        try {
          const Anthropic = require("@anthropic-ai/sdk");
          const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
          hits.push(Date.now());
          const sys =
            "You are BharatSource's shopping assistant. Help the user find vendors, products or services on the marketplace. Be concise (2-3 sentences), friendly, and always ground answers in the provided candidate links and known facts. Never invent vendors, categories, or numbers — if a fact (e.g. a count) is given below, state it as-is; otherwise say you don't have an exact figure.";
          const msg = await client.messages.create({
            model: "claude-opus-5",
            max_tokens: 400,
            system: sys,
            messages: [
              ...(Array.isArray(req.body.history) ? req.body.history.slice(-6) : []),
              { role: "user", content: `User asked: "${message}"\n\nKnown facts:\n${nav.reply}\n\nCandidate links you can point to:\n${links}\n\nWrite a short helpful reply guiding them.` },
            ],
          });
          const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
          if (text) {
            nav = { ...nav, reply: text };
            usedAI = true;
          }
        } catch (e) {
          // fall back to the deterministic reply silently
        }
      } else if (!config.ANTHROPIC_API_KEY && config.AI_CLI_ENABLED && claudeCli.isClaudeAvailable() && allowAI()) {
        hits.push(Date.now());
        nav = await resolveWithAI({ message, history: req.body.history, user: req.user, categories: cats, parsed });
        usedAI = !!nav;
        if (!nav) {
          const actionIntent = detectActionIntent(message);
          nav = actionIntent ? buildActionReply(actionIntent, req.user) : await buildNavigation(message, cats, parsed);
        }
      } else {
        const actionIntent = detectActionIntent(message);
        nav = actionIntent ? buildActionReply(actionIntent, req.user) : await buildNavigation(message, cats, parsed);
      }
    }

    res.json({ success: true, data: { reply: nav.reply, suggestions: nav.suggestions, usedAI, remaining: remaining() } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
