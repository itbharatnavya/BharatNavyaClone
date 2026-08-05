/**
 * seed-categories.js — Phase 2 seed: the nested category taxonomy.
 *
 * Builds a credible horizontal-marketplace tree (IndiaMART/JustDial-style) from the
 * taxonomy R&D summarized in DESIGN.md §3.3 (~24 top-level categories, product +
 * service verticals) and fully drills the four deep spikes named there:
 *
 *   Tools → Cleaning → Cleaning Equipment → Vacuum Cleaners → Robotic Vacuum Cleaners
 *   Food → Flour, Grains & Cereals → Wheat Flour (Atta) → Multigrain Atta
 *   Accounting → Taxation → GST Services → GST Registration
 *   Home & Local Services → Appliance Repair → AC Services → Split AC Repair
 *
 * Output: a FLAT array of Category docs (id, name, slug, parentId, path[], type,
 * icon, description, facets[], listingCount, order) written to DB/categories.json —
 * the frontend builds the nested tree from parentId (DESIGN §3.3).
 *
 * It then reconciles DB/listings.json: each listing's legacy category string is
 * mapped to the best-matching categoryId, and categoryId + categoryPath are set.
 *
 * Run:  node scripts/seed-categories.js
 */

const store = require("../lib/store");

/* -------------------------------------------------------------- helpers ---- */

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Facet rails per DESIGN §3.3: divergent for products vs services.
const PRODUCT_FACETS = ["brand", "priceRange", "location", "moq", "availability", "certifications"];
const SERVICE_FACETS = ["location", "rate", "experience", "credentials", "availability", "rating"];

function facetsFor(type) {
  if (type === "service") return SERVICE_FACETS.slice();
  if (type === "both") {
    // union, product facets first, service extras appended
    return [...PRODUCT_FACETS, ...SERVICE_FACETS.filter((f) => !PRODUCT_FACETS.includes(f))];
  }
  return PRODUCT_FACETS.slice();
}

function descFor(name, type) {
  if (type === "service") return `Find verified ${name} providers, compare quotes and enquire on BharatSource.`;
  if (type === "both") return `Explore ${name} products and services from suppliers across India.`;
  return `Source ${name} from verified suppliers and manufacturers across India.`;
}

/* --------------------------------------------------------------- taxonomy -- */
// A node is either a string (leaf name) or { name, type?, children? }.
// Children inherit their parent's `type` unless they override it.
// Top-level nodes MUST declare a type.

const TAXONOMY = [
  {
    name: "Textiles, Fabrics & Yarn",
    type: "product",
    children: [
      "Cotton Fabric", "Silk Fabric", "Woolen Fabric", "Synthetic Fabric",
      "Yarn & Thread", "Denim Fabric", "Knitted Fabric", "Technical Textiles",
    ],
  },
  {
    name: "Apparel, Clothing & Garments",
    type: "product",
    children: [
      "Men's Clothing", "Women's Clothing", "Kids' Wear", "Ethnic Wear",
      "Sportswear", "Uniforms & Workwear", "Winter Wear", "Innerwear & Lingerie",
    ],
  },
  {
    name: "Industrial Machinery & Equipment",
    type: "product",
    children: [
      "CNC Machines", "Packaging Machinery", "Textile Machinery", "Printing Machinery",
      "Material Handling Equipment", "Pumps & Compressors", "Welding Equipment", "Machine Tools",
    ],
  },
  {
    name: "Chemicals, Dyes & Solvents",
    type: "product",
    children: [
      "Industrial Chemicals", "Dyes & Pigments", "Solvents", "Adhesives & Sealants",
      "Laboratory Chemicals", "Water Treatment Chemicals", "Agrochemicals", "Specialty Chemicals",
    ],
  },
  {
    name: "Electronics & Electrical",
    type: "product",
    children: [
      "PCB & Components", "Sensors & Modules", "Connectors & Cables", "Batteries & Power",
      "LED & Lighting", "Switchgear & Panels", "Consumer Electronics", "Electronic Instruments",
    ],
  },
  {
    name: "Packaging & Printing",
    type: "product",
    children: [
      "Corrugated Boxes", "Flexible Packaging", "Labels & Stickers", "Bottles & Containers",
      "Tapes & Films", "Printing Services (Packaging)", "Paper & Board", "Packaging Consumables",
    ],
  },
  {
    name: "Building & Construction",
    type: "product",
    children: [
      "TMT Bars & Steel", "Cement & Concrete", "Bricks & Blocks", "Tiles & Flooring",
      "Sanitaryware & Fittings", "Paints & Coatings", "Doors & Windows", "Aggregates & Sand",
    ],
  },
  {
    name: "Automotive Parts & Accessories",
    type: "product",
    children: [
      "Engine Components", "Bearings & Bushings", "Transmission Parts", "Braking Systems",
      "Auto Electricals", "Tyres & Tubes", "Car Accessories", "Two-Wheeler Parts",
    ],
  },
  {
    name: "Agriculture & Farming",
    type: "product",
    children: [
      "Tractor Implements", "Irrigation Equipment", "Seeds & Saplings", "Fertilizers",
      "Farm Tools", "Greenhouse & Polyhouse", "Agri Pumps", "Harvesting Equipment",
    ],
  },
  {
    name: "Medical & Healthcare Supplies",
    type: "product",
    children: [
      "Surgical Instruments", "Disposables & Consumables", "Diagnostic Equipment", "Hospital Furniture",
      "PPE & Safety", "Orthopedic Supplies", "Dental Supplies", "Medical Devices",
    ],
  },
  {
    // ---- DEEP SPIKE 2: Food → Flour, Grains & Cereals → Wheat Flour (Atta) → Multigrain Atta
    name: "Food & Beverages",
    slug: "food",
    type: "product",
    children: [
      {
        name: "Flour, Grains & Cereals",
        children: [
          {
            name: "Wheat Flour (Atta)",
            children: [
              "Multigrain Atta", "Whole Wheat Atta", "Refined Wheat Flour (Maida)", "Semolina (Sooji)",
            ],
          },
          "Rice", "Maize & Corn", "Millets", "Besan & Gram Flour",
        ],
      },
      "Spices & Masala", "Edible Oils & Ghee", "Pulses & Lentils",
      "Tea, Coffee & Beverages", "Dairy Products", "Snacks & Packaged Food", "Dry Fruits & Nuts",
    ],
  },
  {
    name: "Home, Furniture & Furnishings",
    type: "product",
    children: [
      "Furniture", "Home Decor", "Kitchenware", "Bedding & Linen",
      "Curtains & Blinds", "Lighting & Lamps", "Storage & Organization", "Rugs & Carpets",
    ],
  },
  {
    // ---- DEEP SPIKE 1: Tools → Cleaning → Cleaning Equipment → Vacuum Cleaners → Robotic Vacuum Cleaners
    name: "Tools, Hardware & Cleaning",
    slug: "tools",
    type: "product",
    children: [
      "Hand Tools", "Power Tools", "Hardware & Fasteners", "Cutting Tools",
      "Measuring Instruments", "Safety Equipment", "Abrasives",
      {
        name: "Cleaning",
        children: [
          {
            name: "Cleaning Equipment",
            children: [
              {
                name: "Vacuum Cleaners",
                children: [
                  "Robotic Vacuum Cleaners", "Wet & Dry Vacuum Cleaners",
                  "Industrial Vacuum Cleaners", "Handheld Vacuum Cleaners",
                ],
              },
              "Floor Scrubbers", "Pressure Washers", "Steam Cleaners",
            ],
          },
          "Cleaning Chemicals", "Brooms & Mops", "Housekeeping Supplies",
        ],
      },
    ],
  },
  {
    name: "Metals, Steel & Alloys",
    type: "product",
    children: [
      "Steel & Iron", "Aluminium", "Copper & Brass", "Stainless Steel",
      "Metal Sheets & Coils", "Pipes & Tubes", "Metal Scrap", "Alloys",
    ],
  },
  {
    name: "Plastics, Polymers & Rubber",
    type: "product",
    children: [
      "Plastic Granules", "Plastic Sheets & Films", "Plastic Products", "Rubber Products",
      "Polymer Resins", "Moulded Components", "PVC & Pipes", "Recycled Plastics",
    ],
  },
  {
    name: "Pharmaceuticals & Lab Supplies",
    type: "product",
    children: [
      "Active Pharmaceutical Ingredients", "Formulations & Tablets", "Ayurvedic & Herbal", "Nutraceuticals",
      "Lab Equipment", "Reagents & Chemicals", "Veterinary Medicines", "Surgical Dressings",
    ],
  },
  {
    name: "Office & Stationery Supplies",
    type: "product",
    children: [
      "Paper & Notebooks", "Writing Instruments", "Office Furniture", "Printers & Cartridges",
      "Files & Folders", "Office Electronics", "Housekeeping (Office)", "Pantry Supplies",
    ],
  },
  {
    name: "Beauty, Personal Care & Wellness",
    type: "both",
    children: [
      "Skincare Products", "Haircare Products", "Cosmetics & Makeup", "Salon Equipment",
      "Spa & Wellness Services", "Fragrances", "Personal Hygiene", "Fitness Equipment",
    ],
  },
  {
    name: "Gifts, Crafts & Sports",
    type: "product",
    children: [
      "Handicrafts", "Corporate Gifts", "Sports Goods", "Toys & Games",
      "Festival & Decorative", "Musical Instruments", "Fitness & Outdoor", "Stationery Gifts",
    ],
  },
  {
    // ---- DEEP SPIKE 4: Home & Local Services → Appliance Repair → AC Services → Split AC Repair
    name: "Home & Local Services",
    slug: "home-local-services",
    type: "service",
    children: [
      {
        name: "Appliance Repair",
        children: [
          {
            name: "AC Services",
            children: [
              "Split AC Repair", "Window AC Repair", "AC Installation",
              "AC Gas Refilling", "AC Annual Maintenance",
            ],
          },
          "Refrigerator Repair", "Washing Machine Repair", "Microwave Repair", "Water Purifier Service",
        ],
      },
      "Home Cleaning", "Plumbing", "Electrician Services", "Pest Control",
      "Painting Services", "Carpentry", "Interior Design",
    ],
  },
  {
    // ---- DEEP SPIKE 3: Accounting → Taxation → GST Services → GST Registration
    name: "Accounting, Tax & Compliance",
    slug: "accounting",
    type: "service",
    children: [
      {
        name: "Taxation",
        children: [
          {
            name: "GST Services",
            children: [
              "GST Registration", "GST Return Filing", "GST Audit", "GST Advisory",
            ],
          },
          "Income Tax Services", "TDS Services", "International Taxation",
        ],
      },
      "Bookkeeping", "Auditing & Assurance", "Payroll Services", "Company Registration", "Financial Consulting",
    ],
  },
  {
    name: "Professional & Consulting Services",
    type: "service",
    children: [
      "Legal Services", "IT & Software Services", "Digital Marketing", "HR & Recruitment",
      "Business Consulting", "Architecture & Design", "Translation Services", "Market Research",
    ],
  },
  {
    name: "Logistics, Transport & Warehousing",
    type: "service",
    children: [
      "Freight & Cargo", "Courier & Parcel", "Warehousing", "Packers & Movers",
      "Cold Chain Logistics", "Customs Clearance", "Fleet & Transport", "Last-Mile Delivery",
    ],
  },
  {
    name: "Education, Training & Events",
    type: "service",
    children: [
      "Coaching & Tutoring", "Skill Development", "Corporate Training", "Online Courses",
      "Event Management", "Certification Programs", "Language Classes", "Career Counseling",
    ],
  },
];

/* --------------------------------------------------------------- flatten --- */

function buildCategories() {
  const out = [];
  const usedSlugs = new Set();

  function walk(node, parent, inheritedType, order) {
    const isObj = typeof node === "object";
    const name = isObj ? node.name : node;
    const type = (isObj && node.type) || inheritedType;
    const slug = (isObj && node.slug) || slugify(name);

    if (usedSlugs.has(slug)) {
      throw new Error(`Duplicate category slug "${slug}" (from "${name}") — slugs must be unique`);
    }
    usedSlugs.add(slug);

    const path = parent ? [...parent.path, slug] : [slug];
    const doc = {
      id: `cat_${slug}`,
      name,
      slug,
      parentId: parent ? parent.id : null,
      path,
      type,
      icon: null,
      description: descFor(name, type),
      facets: facetsFor(type),
      listingCount: 0,
      order,
    };
    out.push(doc);

    const children = (isObj && node.children) || [];
    children.forEach((child, i) => walk(child, doc, type, i + 1));
  }

  TAXONOMY.forEach((node, i) => walk(node, null, node.type, i + 1));
  return out;
}

/* -------------------------------------------- legacy → category mapping ---- */
// Legacy free-text category strings on existing listings → best-matching top-level slug.

const LEGACY_MAP = {
  Textiles: "textiles-fabrics-yarn",
  Chemicals: "chemicals-dyes-solvents",
  Packaging: "packaging-printing",
  Electronics: "electronics-electrical",
  Agriculture: "agriculture-farming",
  Construction: "building-construction",
  Automotive: "automotive-parts-accessories",
  "Food Products": "food",
  "Medical Supplies": "medical-healthcare-supplies",
  "Industrial Machinery": "industrial-machinery-equipment",
};

/* ------------------------------------------------------------------ main --- */

async function main() {
  const categories = buildCategories();
  await store.writeJson("categories.json", categories);

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const topLevel = categories.filter((c) => c.parentId === null);
  const maxDepth = Math.max(...categories.map((c) => c.path.length));

  // --- sanity: every legacy target slug must resolve to a real category ---
  for (const [legacy, targetSlug] of Object.entries(LEGACY_MAP)) {
    if (!bySlug.has(targetSlug)) {
      throw new Error(`Legacy map target "${targetSlug}" (for "${legacy}") is not a real category slug`);
    }
  }

  // --- reconcile listings ---
  const listings = await store.readJson("listings.json", []);
  const mapCounts = {};
  const unmapped = [];
  for (const l of listings) {
    const targetSlug = LEGACY_MAP[l.legacyCategory];
    const cat = targetSlug ? bySlug.get(targetSlug) : null;
    if (cat) {
      l.categoryId = cat.id;
      l.categoryPath = cat.path.slice();
      mapCounts[cat.slug] = (mapCounts[cat.slug] || 0) + 1;
    } else {
      l.categoryId = null;
      l.categoryPath = [];
      unmapped.push(`${l.id} (${l.legacyCategory})`);
    }
  }
  await store.writeJson("listings.json", listings);

  /* --------------------------------------------------------------- report -- */
  console.log("=== categories seeded → DB/categories.json ===");
  console.log(`total categories : ${categories.length}`);
  console.log(`top-level         : ${topLevel.length}`);
  console.log(`max depth (levels): ${maxDepth}`);
  console.log("");
  console.log("deep-spike leaf paths:");
  for (const slug of [
    "robotic-vacuum-cleaners",
    "multigrain-atta",
    "gst-registration",
    "split-ac-repair",
  ]) {
    const c = bySlug.get(slug);
    console.log(`  ${slug.padEnd(24)} → ${c ? c.path.join(" / ") : "MISSING!"}`);
  }
  console.log("");
  console.log("=== listings reconciled → DB/listings.json ===");
  console.log(`total listings    : ${listings.length}`);
  console.log(`mapped            : ${listings.length - unmapped.length}`);
  console.log(`unmapped          : ${unmapped.length}${unmapped.length ? " → " + unmapped.join(", ") : ""}`);
  console.log("per-category mapping:");
  for (const [slug, n] of Object.entries(mapCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug.padEnd(34)} ${n}`);
  }
}

main().catch((e) => {
  console.error("seed-categories failed:", e);
  process.exit(1);
});
