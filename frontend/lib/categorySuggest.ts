// Category suggestions for the listing flow. A seller types what they sell in plain words
// ("coconut water, 200 ml bottles") and we return the closest categories, so nobody has to
// know our category tree. Pure functions, no network: scoring works on the names, parent
// path and description of each category plus a small hand-written vocabulary of everyday
// words (a coconut is not a category name, but "beverages" is where it belongs).

import type { Category } from "@/lib/types";

const STOP = new Set([
  "a", "an", "and", "the", "of", "for", "in", "on", "to", "with", "my", "our", "your", "i", "we",
  "sell", "selling", "offer", "offering", "provide", "providing", "supply", "supplying", "make", "making",
  "best", "good", "quality", "new", "pure", "fresh", "wholesale", "bulk", "retail", "pack", "packs", "pack.",
]);

// Everyday word or phrase -> words that appear in the names of the categories it belongs to.
// Phrases are matched first and weigh more than single words.
const VOCAB: Record<string, string[]> = {
  "coconut water": ["beverage"],
  coconut: ["beverage", "food", "oil"],
  juice: ["beverage"], drink: ["beverage"], soda: ["beverage"], water: ["beverage"], tea: ["tea", "beverage"],
  coffee: ["coffee", "beverage"], milk: ["dairy"], curd: ["dairy"], paneer: ["dairy"], ghee: ["ghee", "oil"],
  butter: ["dairy"], cheese: ["dairy"], oil: ["oil"], rice: ["flour", "grain"], wheat: ["flour", "grain"],
  atta: ["flour", "grain"], flour: ["flour"], dal: ["pulse"], lentil: ["pulse"], masala: ["spice"], spice: ["spice"],
  chilli: ["spice"], turmeric: ["spice"], snack: ["snack"], biscuit: ["snack"], namkeen: ["snack"], chips: ["snack"],
  nut: ["dry fruit"], almond: ["dry fruit"], cashew: ["dry fruit"], raisin: ["dry fruit"], fruit: ["food", "agri"],
  vegetable: ["agri", "food"], honey: ["food"], pickle: ["food"], sugar: ["food"], salt: ["food"],
  bottle: ["bottle", "packaging", "container"], jar: ["container", "packaging"], box: ["packaging"], carton: ["packaging"],
  bag: ["bag", "packaging"], label: ["printing"], sticker: ["printing"],
  shirt: ["apparel", "clothing"], tshirt: ["apparel", "clothing"], saree: ["apparel", "clothing"], kurta: ["apparel", "clothing"],
  jeans: ["apparel", "clothing"], dress: ["apparel", "clothing"], uniform: ["apparel", "clothing"], shoe: ["apparel"],
  cloth: ["textile", "fabric"], fabric: ["fabric", "textile"], cotton: ["fabric", "textile"], silk: ["silk", "fabric"],
  yarn: ["yarn", "textile"], thread: ["yarn", "textile"],
  steel: ["steel"], iron: ["steel", "alloy"], aluminium: ["aluminium"], copper: ["alloy", "metal"], pipe: ["pipe", "steel"],
  cement: ["cement"], brick: ["brick"], sand: ["aggregate", "sand"], tile: ["building"], paint: ["paint", "chemical"],
  chemical: ["chemical"], dye: ["dye"], solvent: ["solvent"], adhesive: ["adhesive"], fertilizer: ["agro", "agri"],
  seed: ["agri"], pump: ["pump"], motor: ["motor", "machinery"], machine: ["machinery"], cnc: ["machine"],
  led: ["electric", "light"], bulb: ["electric", "light"], wire: ["wire", "electric"], cable: ["wire", "electric"],
  switch: ["electric"], battery: ["batter"], solar: ["solar", "electric"], laptop: ["electronic"], phone: ["electronic"],
  mask: ["medical"], gloves: ["medical"], syringe: ["medical"], medicine: ["pharma"], tablet: ["pharma"],
  soap: ["personal care", "beauty"], shampoo: ["personal care", "beauty"], cream: ["beauty", "personal care"],
  herbal: ["ayurvedic", "herbal"], ayurvedic: ["ayurvedic"],
  furniture: ["furniture"], sofa: ["furniture"], bed: ["bed"], mattress: ["bedding"], curtain: ["furnishing"],
  pen: ["stationery"], notebook: ["stationery"], paper: ["stationery", "paper"], toy: ["gift", "toy"], gift: ["gift"],
  craft: ["craft"], handicraft: ["craft"], brass: ["craft", "metal"],
  car: ["automotive"], tyre: ["automotive"], tire: ["automotive"], brake: ["braking"], bike: ["automotive"], spare: ["automotive"],
  courier: ["logistic"], transport: ["logistic", "transport"], packer: ["packers", "moving"], mover: ["moving", "packers"],
  accountant: ["accounting"], accounting: ["accounting"], gst: ["tax", "compliance"], tax: ["tax"], audit: ["audit"], legal: ["legal"],
  lawyer: ["legal"], design: ["design"], website: ["digital", "web"], marketing: ["marketing"], seo: ["digital", "marketing"],
  repair: ["repair", "service"], plumber: ["plumb"], electrician: ["electric"], carpenter: ["carpentry"], cleaning: ["cleaning"],
  tutor: ["coaching", "education"], coaching: ["coaching"], training: ["training", "certification"],
};

const UNIT_RE = /^\d+(\.\d+)?(ml|l|ltr|kg|g|gm|mg|mm|cm|m|pcs|pc|inch|ft)?$/;

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es") && /(ch|sh|ss|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ""))
    .filter((w) => w && !STOP.has(w) && !UNIT_RE.test(w))
    .map(stem);
}

export interface CategoryMatch {
  category: Category;
  score: number;
}

export function suggestCategories(
  query: string,
  categories: Category[],
  opts: { limit?: number; byId?: Map<string, Category> } = {}
): CategoryMatch[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];

  const byId = opts.byId || new Map(categories.map((c) => [c.id, c]));
  const hasChildren = new Set<string>();
  categories.forEach((c) => { if (c.parentId) hasChildren.add(c.parentId); });

  // Words that point to categories: phrases from the vocabulary first, then single words.
  const boosts: { word: string; weight: number }[] = [];
  for (const [phrase, words] of Object.entries(VOCAB)) {
    if (phrase.includes(" ")) {
      if (q.includes(phrase)) words.forEach((w) => boosts.push({ word: w, weight: 22 }));
    } else if (tokens.includes(stem(phrase))) {
      words.forEach((w, i) => boosts.push({ word: w, weight: i === 0 ? 12 : 6 }));
    }
  }

  const scored: CategoryMatch[] = [];
  for (const c of categories) {
    const name = c.name.toLowerCase();
    const nameTokens = tokenize(name);
    const ancestors = (c.path || [])
      .slice(0, -1)
      .map((slug) => categories.find((x) => x.slug === slug)?.name?.toLowerCase() || "")
      .join(" ");
    const desc = (c.description || "").toLowerCase();
    let score = 0;

    if (name.includes(q)) score += 30;
    for (const t of tokens) {
      if (nameTokens.includes(t)) score += 10;
      else if (t.length >= 4 && nameTokens.some((n) => n.startsWith(t) || t.startsWith(n))) score += 6;
      if (t.length >= 3 && ancestors.includes(t)) score += 3;
      if (t.length >= 4 && desc.includes(t)) score += 2;
    }
    for (const b of boosts) {
      if (name.includes(b.word)) score += b.weight;
      else if (ancestors.includes(b.word)) score += Math.round(b.weight / 3);
    }
    if (score > 0 && !hasChildren.has(c.id)) score += 14; // prefer the specific, selectable leaf
    if (score >= 6) scored.push({ category: c, score });
  }

  scored.sort((a, b) => b.score - a.score || a.category.name.localeCompare(b.category.name));
  void byId;
  // Sellers publish into a specific category, so offer those; parents only if nothing specific fits.
  const leaves = scored.filter((m) => !hasChildren.has(m.category.id));
  const pool = leaves.length ? leaves : scored;
  // Drop weak tail matches: anything far below the best one is noise.
  const best = pool[0]?.score ?? 0;
  return pool.filter((m) => m.score >= best * 0.5).slice(0, opts.limit ?? 5);
}
