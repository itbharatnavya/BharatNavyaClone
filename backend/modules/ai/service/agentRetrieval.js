/**
 * agentRetrieval.js — gathers the IN-APP facts the Ask Navya agent answers from.
 *
 * Priority rule of the agent: anything Bharat Navya itself knows (how the app works,
 * live listings, sellers, jobs, plans, counts, categories) is retrieved here FIRST and
 * handed to the model as numbered sources S1..Sn; the model only falls back to general
 * knowledge when these cannot answer. Every retriever is independent and guarded — one
 * failing never blocks the others — and reads through public module ports only, with
 * public fields only (never a phone/email).
 *
 * retrieveContext(message, { user, recruitmentLive }) ->
 *   { sources: [{ id, kind, title, subtitle, href, detail, card }], parsed, intents }
 * `card: true` sources are shown to the user as result cards; the rest are model-only context.
 */

const { repoForCollection } = require("../../_shared");
const directory = require("../../directory");
const identity = require("../../identity");
const monetization = require("../../monetization");
const { searchJobs } = require("../../recruitment");
const { parseQuery, selectRelevantCategories } = require("../../../lib/nlp");
const { searchListings } = require("../../../lib/search");
const { retrieveKnowledge, tokens } = require("./agentKnowledge");

const MAX_LISTINGS = 5;
const MAX_JOBS = 4;
const MAX_SELLERS = 3;
const MAX_CATEGORIES = 3;

// Words that describe the ACT of searching, not the thing searched for.
const GENERIC = new Set([
  "find", "show", "search", "looking", "look", "near", "nearby", "best", "top", "good", "cheap", "cheapest", "india", "indian", "company", "companies",
  "business", "price", "prices", "rate", "rates", "list", "buy", "supplier", "suppliers", "vendor", "vendors", "manufacturer", "manufacturers", "service", "services",
  "product", "products", "job", "jobs", "role", "roles", "work", "hire", "hiring", "give", "suggest", "recommend", "help", "hello", "hi", "hey", "thanks", "thank", "ok", "okay",
]);

const JOB_RE = /\b(jobs?|vacanc(?:y|ies)|hiring|careers?|positions?|openings?|roles?|recruiters?|candidates?|apply|salary|fresher|internship)\b/i;
const PRICING_RE = /\b(pricing|plans?|subscription|subscribe|silver|gold|free plan|how much|cost|fees?|charges?|premium|lead quota)\b/i;
const STATS_RE = /\b(how many|number of|total|count)\b/i;

const fmt = (n) => Number(n).toLocaleString("en-IN");

/** significant tokens of a message — content words only. */
function contentTokens(message) {
  return tokens(message).filter((t) => !GENERIC.has(t));
}

/** does `hay` contain token t (with simple plural / 4-char-prefix tolerance)? */
function hasToken(hay, t) {
  if (hay.includes(t)) return true;
  if (t.endsWith("s") && t.length > 3 && hay.includes(t.slice(0, -1))) return true;
  return t.length >= 6 && hay.includes(t.slice(0, 5));
}

function listingHaystack(l) {
  return [
    l.title,
    l.legacyCategory,
    Array.isArray(l.keywords) ? l.keywords.join(" ") : "",
    Array.isArray(l.categoryPath) ? l.categoryPath.join(" ").replace(/-/g, " ") : "",
    l.product && l.product.brand,
  ].filter(Boolean).join(" ").toLowerCase();
}

const priceOf = (l) => (l.product && typeof l.product.price === "number" ? l.product.price : null);

async function retrieveListings(message, parsed, ctoks) {
  // A query with no content words ("hello", "find me something") has nothing to search for.
  if (!ctoks.length) return { sources: [], total: 0 };
  const approved = await identity.getApprovedSellerIds();
  const filters = { status: "active", sellerIds: approved };
  if (parsed.city) filters.city = parsed.city;
  if (parsed.type) filters.type = parsed.type;
  if (parsed.budgetMax != null) filters.maxPrice = parsed.budgetMax;

  const q = ctoks.join(" ");
  let hits = await searchListings({ q, filters, limit: 40 });
  // BM25 widens to OR when AND finds nothing, which drags in junk — keep only real overlap.
  hits = hits.filter(({ listing }) => {
    const hay = listingHaystack(listing);
    const matched = ctoks.filter((t) => hasToken(hay, t)).length;
    return matched >= Math.max(1, Math.ceil(ctoks.length / 2));
  });
  const total = hits.length;
  const top = hits.slice(0, MAX_LISTINGS).map((h) => h.listing);

  const sellers = await identity.getSellerBrowseCards(top.map((l) => l.sellerId));
  const sources = top.map((l) => {
    const seller = sellers.get(l.sellerId);
    const price = priceOf(l);
    const city = l.location && l.location.city;
    const subtitle = [seller && seller.companyName, city, price !== null ? `₹${fmt(price)}` : null].filter(Boolean).join(" · ");
    const bits = [
      `${l.type === "service" ? "Service" : "Product"} listing "${l.title}"`,
      seller && `by ${seller.companyName}${seller.isVerified ? " (verified seller)" : ""}`,
      city && `in ${city}${l.location.state ? ", " + l.location.state : ""}`,
      price !== null && `price ₹${fmt(price)}${l.product.unitOfMeasure ? " per " + l.product.unitOfMeasure : ""}`,
      l.product && l.product.moq && `minimum order ${fmt(l.product.moq)}`,
      l.legacyCategory && `category ${l.legacyCategory}`,
    ].filter(Boolean);
    return { kind: "listing", title: l.title, subtitle, href: `/listing/${l.id}`, detail: bits.join("; "), card: true };
  });
  return { sources, total };
}

async function retrieveSellers(ctoks) {
  if (!ctoks.length) return [];
  const rows = await identity.searchApprovedSellersByName(ctoks, MAX_SELLERS);
  return rows.map((s) => ({
    kind: "seller",
    title: s.companyName,
    subtitle: [s.city, s.isVerified ? "Verified" : null, s.reviewCount ? `${s.rating.toFixed(1)} rating (${s.reviewCount} reviews)` : null].filter(Boolean).join(" · "),
    href: `/seller/${s.slug}`,
    detail: `Seller "${s.companyName}"${s.city ? " in " + s.city : ""}${s.isVerified ? ", verified" : ", not yet verified"}${s.reviewCount ? `, rated ${s.rating.toFixed(1)} from ${s.reviewCount} reviews` : ""}`,
    card: true,
  }));
}

async function retrieveCategories(message, parsed) {
  const cats = await repoForCollection("categories.json").findMany({});
  const byslug = new Map(cats.map((c) => [c.slug, c]));
  const out = [];
  const seen = new Set();
  const push = (c) => {
    if (!c || seen.has(c.slug)) return;
    seen.add(c.slug);
    out.push({
      kind: "category",
      title: c.name,
      subtitle: "Category",
      href: `/${c.slug}`,
      detail: `Directory category "${c.name}"`,
      card: false,
    });
  };
  if (parsed.category && parsed.confidence >= 0.4) push(byslug.get(parsed.category));
  // shortlist only counts when the matcher found real overlap with the question
  for (const c of selectRelevantCategories(message, cats, MAX_CATEGORIES)) {
    if (out.length >= MAX_CATEGORIES) break;
    push(c);
  }
  return out;
}

async function retrieveJobs(message, parsed) {
  const filters = {};
  if (parsed.city) filters.city = parsed.city;
  const { jobs, total } = await searchJobs({ q: message, filters, limit: MAX_JOBS });
  const sources = jobs.map((j) => {
    const company = j.employer && j.employer.companyName;
    const city = (j.location && j.location.city) || (j.location && j.location.remote ? "Remote" : null);
    return {
      kind: "job",
      title: j.title,
      subtitle: [company, city].filter(Boolean).join(" · "),
      href: `/job/${j.id}`,
      detail: `Job "${j.title}"${company ? " at " + company : ""}${city ? " (" + city + ")" : ""}`,
      card: true,
    };
  });
  return { sources, total };
}

async function retrievePlans() {
  const plans = await monetization.plansRepo.findMany({});
  const lines = plans
    .sort((a, b) => (a.tierRank || 0) - (b.tierRank || 0))
    .map((p) => {
      const price = p.priceInfo && p.priceInfo.monthly != null ? (p.priceInfo.monthly === 0 ? "free" : `₹${fmt(p.priceInfo.monthly)} per month`) : "custom price";
      return `${p.name}: ${price}; ${p.listingLimit == null ? "unlimited" : p.listingLimit} listings; ${p.leadQuotaPerCycle} leads per cycle; ${p.featuredCreditsPerCycle} featured credits; ${p.verifiedBadgeIncluded ? "verified badge included" : "no verified badge"}; ${p.analyticsEnabled ? "analytics included" : "no analytics"}`;
    });
  return { kind: "plans", title: "Seller subscription plans", subtitle: "", href: "/pricing", detail: lines.join(" | "), card: false };
}

async function retrieveStats() {
  const [byType, counts, categories] = await Promise.all([
    directory.activeListingCountsByType(),
    identity.directoryCounts(),
    repoForCollection("categories.json").count(),
  ]);
  return {
    kind: "stats",
    title: "Platform numbers",
    subtitle: "",
    href: "/directory",
    detail: `Right now Bharat Navya has ${fmt(byType.product)} product listings, ${fmt(byType.service)} service listings, ${fmt(counts.sellers)} sellers and ${fmt(categories)} categories`,
    card: false,
  };
}

/** Run every retriever; never throws. Source ids (S1..) are assigned last so order = relevance. */
async function retrieveContext(message, { user, recruitmentLive }) {
  const ctoks = contentTokens(message);
  const wantsJobs = JOB_RE.test(message);
  const safe = (p, fallback) => p.catch(() => fallback);

  // parseQuery needs the category list; fetch once and share with the other readers via the repo cache of PG.
  let parsed = {};
  try {
    const cats = await repoForCollection("categories.json").findMany({});
    parsed = parseQuery(message, cats, { preferGeneral: true }) || {};
  } catch {
    parsed = {};
  }

  const [kb, listings, sellers, categories, jobs, plans, stats] = await Promise.all([
    Promise.resolve(retrieveKnowledge(message, !!recruitmentLive, 3)),
    safe(retrieveListings(message, parsed, wantsJobs ? [] : ctoks), { sources: [], total: 0 }),
    safe(retrieveSellers(wantsJobs ? [] : ctoks), []),
    safe(retrieveCategories(message, parsed), []),
    recruitmentLive && wantsJobs ? safe(retrieveJobs(message, parsed), { sources: [], total: 0 }) : { sources: [], total: 0 },
    PRICING_RE.test(message) ? safe(retrievePlans(), null) : null,
    STATS_RE.test(message) ? safe(retrieveStats(), null) : null,
  ]);

  const ordered = [];
  for (const e of kb) {
    ordered.push({
      kind: "kb",
      title: e.title,
      subtitle: "",
      href: (e.links[0] && e.links[0].href) || "/about",
      detail: e.text,
      card: false,
      links: e.links,
    });
  }
  if (stats) ordered.push(stats);
  if (plans) ordered.push(plans);
  ordered.push(...jobs.sources, ...sellers, ...listings.sources, ...categories);

  const sources = ordered.map((s, i) => ({ ...s, id: `S${i + 1}` }));
  return {
    sources,
    parsed,
    meta: { listingTotal: listings.total, jobTotal: jobs.total, wantsJobs, signedIn: !!user },
  };
}

module.exports = { retrieveContext, contentTokens };
