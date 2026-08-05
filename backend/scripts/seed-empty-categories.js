/**
 * seed-empty-categories.js — add demo products to the categories that had 0
 * listings, so AI/search queries (e.g. "gift under 400", "office supplies")
 * return real results. Assigns to existing APPROVED sellers (so they show in
 * public browse), uses local /demo images, and marks gift items PAN India.
 * Idempotent-ish: skips a category if it already has seeded demo products.
 */
const store = require("../lib/store");

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// category slug -> { img theme, panIndia?, products:[{title, price, unit, moq, brand?}] }
const SEED = {
  "gifts-crafts-sports": {
    img: "retail", panIndia: true,
    products: [
      { title: "Birthday Gift Hamper Box", price: 349, unit: "box", moq: 10 },
      { title: "Return Gift Combo (Pack of 10)", price: 299, unit: "pack", moq: 20 },
      { title: "Party Balloons & Decoration Kit", price: 199, unit: "kit", moq: 25 },
      { title: "Personalized Greeting Card Set", price: 149, unit: "set", moq: 50 },
      { title: "Handmade Craft Gift Set", price: 399, unit: "set", moq: 12 },
      { title: "Cricket Kit for Juniors", price: 1499, unit: "set", moq: 5 },
    ],
  },
  food: {
    img: "food", panIndia: true,
    products: [
      { title: "Whole Wheat Atta (Bulk 50kg)", price: 1650, unit: "bag", moq: 10, brand: "AgriPure" },
      { title: "Assorted Snacks Party Pack", price: 299, unit: "pack", moq: 30 },
      { title: "Premium Basmati Rice (25kg)", price: 2200, unit: "bag", moq: 20 },
      { title: "Cold-Pressed Groundnut Oil (5L)", price: 950, unit: "can", moq: 12 },
    ],
  },
  "apparel-clothing-garments": {
    img: "apparel",
    products: [
      { title: "Cotton Round-Neck T-Shirts (Bulk)", price: 180, unit: "piece", moq: 100 },
      { title: "Corporate Formal Shirts", price: 420, unit: "piece", moq: 50 },
      { title: "School Uniform Sets", price: 350, unit: "set", moq: 100 },
      { title: "Printed Kids Wear Combo", price: 260, unit: "piece", moq: 60 },
    ],
  },
  tools: {
    img: "machinery",
    products: [
      { title: "Cordless Drill Machine 20V", price: 3200, unit: "piece", moq: 5, brand: "Bosch" },
      { title: "Hand Tool Kit (108 pcs)", price: 1450, unit: "kit", moq: 10 },
      { title: "Adjustable Wrench Set", price: 380, unit: "set", moq: 20 },
      { title: "Measuring Tape (Pack of 12)", price: 240, unit: "pack", moq: 15 },
    ],
  },
  "office-stationery-supplies": {
    img: "business", panIndia: true,
    products: [
      { title: "A4 Copier Paper (Box of 10 reams)", price: 2400, unit: "box", moq: 10 },
      { title: "Gel Pens (Pack of 50)", price: 250, unit: "pack", moq: 40 },
      { title: "Office File Folders (Set of 25)", price: 320, unit: "set", moq: 30 },
      { title: "Sticky Notes Assorted Pack", price: 149, unit: "pack", moq: 50 },
    ],
  },
  "beauty-personal-care-wellness": {
    img: "retail", panIndia: true,
    products: [
      { title: "Herbal Face Wash (Bulk)", price: 180, unit: "piece", moq: 50 },
      { title: "Cotton Hand Towels (Pack of 12)", price: 360, unit: "pack", moq: 25 },
      { title: "Ayurvedic Hair Oil (500ml)", price: 240, unit: "bottle", moq: 40 },
      { title: "Salon Starter Kit", price: 3800, unit: "kit", moq: 3 },
    ],
  },
  "home-furniture-furnishings": {
    img: "home",
    products: [
      { title: "Office Ergonomic Chair", price: 4200, unit: "piece", moq: 5 },
      { title: "Cotton Bed Sheets (Bulk)", price: 380, unit: "piece", moq: 50 },
      { title: "Stackable Storage Boxes (Set of 6)", price: 890, unit: "set", moq: 20 },
      { title: "LED Desk Lamp", price: 340, unit: "piece", moq: 30 },
    ],
  },
  "plastics-polymers-rubber": {
    img: "industry",
    products: [
      { title: "HDPE Granules (25kg bag)", price: 2100, unit: "bag", moq: 40, brand: "Supreme" },
      { title: "PVC Pipes 1 inch (Bundle)", price: 780, unit: "bundle", moq: 30, brand: "Supreme" },
      { title: "Industrial Rubber Sheets", price: 460, unit: "sq.ft", moq: 100 },
      { title: "Plastic Storage Crates", price: 320, unit: "piece", moq: 50 },
    ],
  },
  "pharmaceuticals-lab-supplies": {
    img: "medical",
    products: [
      { title: "Nitrile Examination Gloves (Box 100)", price: 380, unit: "box", moq: 50 },
      { title: "Digital Thermometer (Bulk)", price: 190, unit: "piece", moq: 100 },
      { title: "Lab Beaker Set (Borosilicate)", price: 640, unit: "set", moq: 20 },
      { title: "3-Ply Surgical Masks (Box 100)", price: 220, unit: "box", moq: 60 },
    ],
  },
  "education-training-events": {
    img: "business",
    products: [
      { title: "GST Filing & Compliance Workshop", price: 1999, unit: "seat", moq: 1 },
      { title: "Corporate Excel Training (Batch)", price: 8500, unit: "batch", moq: 1 },
      { title: "School Science Lab Kit", price: 380, unit: "kit", moq: 20 },
      { title: "Event Photography Package", price: 12000, unit: "event", moq: 1 },
    ],
  },
};

const IMG_COUNT = { retail: 4, food: 4, apparel: 4, machinery: 4, business: 5, home: 4, industry: 4, medical: 4 };
const imgUrl = (theme, i) => `/demo/${theme}-${(i % (IMG_COUNT[theme] || 4)) + 1}.jpg`;

(async () => {
  const users = await store.all("users.json");
  const approved = users.filter((u) => u.sellerProfile && u.sellerProfile.status === "approved");
  const listings = await store.all("listings.json");
  let created = 0;

  const cats = Object.keys(SEED);
  for (let ci = 0; ci < cats.length; ci++) {
    const catSlug = cats[ci];
    const already = listings.some((l) => (l.categoryPath || []).includes(catSlug) && /demo seed/.test(l.description || ""));
    if (already) { console.log(`skip ${catSlug} (already seeded)`); continue; }
    const conf = SEED[catSlug];
    for (let pi = 0; pi < conf.products.length; pi++) {
      const p = conf.products[pi];
      const seller = approved[(ci + pi) % approved.length];
      const sp = seller.sellerProfile;
      const loc = conf.panIndia
        ? { panIndia: true }
        : { city: (sp.location && sp.location.city) || "Mumbai", state: (sp.location && sp.location.state) || "Maharashtra" };
      const listing = {
        sellerId: seller.id,
        type: "product",
        title: p.title,
        slug: slugify(p.title) + "-" + Math.floor(1000 + (ci * 100 + pi)),
        description: `${p.title}. Quality-checked stock available for bulk orders. (demo seed)`,
        categoryId: "cat_" + catSlug,
        legacyCategory: null,
        categoryPath: [catSlug],
        keywords: p.title.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
        media: [{ type: "image", url: imgUrl(conf.img, pi) }, { type: "image", url: imgUrl(conf.img, pi + 1) }],
        location: loc,
        panIndia: !!conf.panIndia,
        status: "active",
        createdAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0,
        isVerifiedSeller: !!sp.isVerified,
        isFeatured: pi === 0,
        featuredStartDate: null,
        featuredEndDate: null,
        rankBoostScore: 0,
        isSponsored: false,
        product: {
          sku: null, price: p.price, currency: "INR", priceTiers: [], unitOfMeasure: p.unit,
          moq: p.moq, stockQty: null, availability: "in_stock", leadTime: null,
          specifications: {}, certifications: [], variants: [], sampleAvailable: false,
          brand: p.brand || null,
        },
        service: null,
        locationId: null,
      };
      await store.insert("listings.json", listing, "lst");
      created++;
    }
    console.log(`seeded ${catSlug}: +${conf.products.length}`);
  }
  console.log(`\nDone. Created ${created} demo products across ${cats.length} categories.`);
})();
