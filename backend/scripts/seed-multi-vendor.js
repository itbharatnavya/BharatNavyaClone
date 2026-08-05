/**
 * seed-multi-vendor.js — create DUPLICATE products across different approved
 * sellers so the multi-vendor-per-product feature ("Also offered by N sellers")
 * visibly demonstrates. Same brand + title => same productKey => grouped as offers.
 * Idempotent-ish: skips a product if 3+ sellers already list it.
 */
const store = require("../lib/store");
const { slugify } = require("../lib/search");

const productKeyOf = (brand, title) => slugify(`${brand} ${title}`.trim());

// Each entry: one canonical product offered by 3 sellers at different prices/cities.
const PRODUCTS = [
  {
    brand: "Havells", title: "Havells 1.5 Sqmm FR PVC Insulated Wire (90m)",
    categorySlug: "electronics-electrical", unit: "coil", img: "electronics",
    offers: [
      { sellerId: "usr_s005", price: 1150, moq: 10 },
      { sellerId: "usr_s009", price: 1099, moq: 20 },
      { sellerId: "usr_s003", price: 1180, moq: 5 },
    ],
  },
  {
    brand: "UltraTech", title: "UltraTech PPC Cement (50kg Bag)",
    categorySlug: "building-construction", unit: "bag", img: "construction",
    offers: [
      { sellerId: "usr_s010", price: 390, moq: 50 },
      { sellerId: "usr_s004", price: 385, moq: 100 },
      { sellerId: "usr_s006", price: 399, moq: 40 },
    ],
  },
  {
    brand: "Tata", title: "Tata Tiscon TMT Bar Fe-500D (12mm)",
    categorySlug: "metals-steel-alloys", unit: "kg", img: "steel",
    offers: [
      { sellerId: "usr_s001", price: 62, moq: 500 },
      { sellerId: "usr_s008", price: 60, moq: 1000 },
      { sellerId: "usr_s012", price: 64, moq: 300 },
    ],
  },
];

const IMG_N = { electronics: 5, construction: 5, steel: 3 };
const imgUrl = (t, i) => `/demo/${t}-${(i % (IMG_N[t] || 4)) + 1}.jpg`;

(async () => {
  const users = await store.all("users.json");
  const byId = new Map(users.map((u) => [u.id, u]));
  const listings = await store.all("listings.json");
  let created = 0;

  for (const p of PRODUCTS) {
    const key = productKeyOf(p.brand, p.title);
    const existing = listings.filter(
      (l) => slugify(`${(l.product && l.product.brand) || ""} ${l.title}`.trim()) === key
    );
    if (existing.length >= 3) { console.log(`skip "${p.title}" (already ${existing.length} sellers)`); continue; }
    for (let i = 0; i < p.offers.length; i++) {
      const o = p.offers[i];
      const u = byId.get(o.sellerId);
      if (!u) { console.log("  missing seller", o.sellerId); continue; }
      const sp = u.sellerProfile || {};
      const listing = {
        sellerId: o.sellerId,
        type: "product",
        title: p.title,
        slug: slugify(p.title) + "-" + o.sellerId.replace(/[^a-z0-9]/gi, ""),
        description: `${p.title} — genuine ${p.brand} stock, available for bulk supply. (demo seed)`,
        categoryId: "cat_" + p.categorySlug,
        legacyCategory: null,
        categoryPath: [p.categorySlug],
        keywords: p.title.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
        media: [{ type: "image", url: imgUrl(p.img, i) }, { type: "image", url: imgUrl(p.img, i + 1) }],
        location: { city: (sp.location && sp.location.city) || "Mumbai", state: (sp.location && sp.location.state) || "Maharashtra" },
        status: "active",
        createdAt: new Date().toISOString(),
        rating: 0, reviewCount: 0,
        isVerifiedSeller: !!sp.isVerified,
        isFeatured: false, featuredStartDate: null, featuredEndDate: null,
        rankBoostScore: 0, isSponsored: false,
        product: {
          sku: null, price: o.price, currency: "INR", priceTiers: [], unitOfMeasure: p.unit,
          moq: o.moq, stockQty: null, availability: "in_stock", leadTime: null,
          specifications: {}, certifications: [], variants: [], sampleAvailable: false,
          brand: p.brand,
        },
        service: null, locationId: null,
        productKey: key,
      };
      await store.insert("listings.json", listing, "lst");
      created++;
    }
    console.log(`seeded "${p.title}" across ${p.offers.length} sellers (${p.offers.map((o) => "₹" + o.price).join(" / ")})`);
  }
  // small settle
  await new Promise((r) => setTimeout(r, 300));
  console.log(`\nDone. Created ${created} multi-vendor offer listings.`);
})();
