/**
 * listings.js — composite relational mapper for listings.json.
 *
 * listings (1) --< listing_media (array)
 *          (1) --- listing_products (1:1, when type='product')
 *                     |--< listing_product_specifications (EAV — key set varies per category)
 *                     |--< listing_product_price_tiers (array; shape unconfirmed, never populated)
 *                     \--< listing_product_variants (array; shape unconfirmed, never populated)
 *          (1) --- listing_services (1:1, when type='service')
 *                     |--< listing_service_rate_card (array)
 *                     \--< listing_service_portfolio (array; shape unconfirmed, never populated)
 *
 * Same top-level-upsert-in-place / child-table-replace pattern as users.js — see that
 * file's header for why. For the two unconfirmed-shape sub-lists (price tiers,
 * variants, portfolio) each row keeps the complete original item in an `extra jsonb`
 * column and is reconstructed straight from it, so round-tripping is lossless
 * regardless of whether the couple of guessed typed columns match the real shape.
 */

const { docToRow, rowToDoc, quoteIdent, withTransaction, upsertRow, replaceChildRows, nestedToRow, nestedFromRow } = require("./util");

const t = "text", i = "int", n = "numeric", b = "bool", ts = "timestamptz", arr = "textArray";
const col = (c, type) => ({ col: c, type });

const LISTING_COLUMNS = {
  id: col("id", t), sellerId: col("seller_id", t), type: col("type", t), title: col("title", t),
  slug: col("slug", t), description: col("description", t), categoryId: col("category_id", t),
  legacyCategory: col("legacy_category", t), categoryPath: col("category_path", arr), keywords: col("keywords", arr),
  status: col("status", t), createdAt: col("created_at", ts), rating: col("rating", n),
  reviewCount: col("review_count", i), isVerifiedSeller: col("is_verified_seller", b), isFeatured: col("is_featured", b),
  featuredStartDate: col("featured_start_date", ts), featuredEndDate: col("featured_end_date", ts),
  rankBoostScore: col("rank_boost_score", n), isSponsored: col("is_sponsored", b),
  boostToTopLastUsed: col("boost_to_top_last_used", ts), manualPinRank: col("manual_pin_rank", i),
  locationId: col("location_id", t), views: col("views", i), panIndia: col("pan_india", b),
  productKey: col("product_key", t), serviceCities: col("service_cities", arr),
  verification: col("verification", "jsonb"),
};
const LISTING_NESTED = [
  { docKey: "location", fields: {
    city: col("location_city", t), state: col("location_state", t), pincode: col("location_pincode", t),
    lat: col("location_lat", n), lng: col("location_lng", n), panIndia: col("location_pan_india", b),
  } },
];

const PRODUCT_COLUMNS = {
  sku: col("sku", t), price: col("price", n), currency: col("currency", t), unitOfMeasure: col("unit_of_measure", t),
  moq: col("moq", i), stockQty: col("stock_qty", i), availability: col("availability", t), leadTime: col("lead_time", t),
  sampleAvailable: col("sample_available", b), brand: col("brand", t), condition: col("condition", t),
  certifications: col("certifications", arr),
};

const SERVICE_COLUMNS = {
  pricingModel: col("pricing_model", t), serviceMode: col("service_mode", t),
  availabilitySchedule: col("availability_schedule", t), experienceYears: col("experience_years", i),
  teamSize: col("team_size", t), sla: col("sla", t), warranty: col("warranty", t), bookingType: col("booking_type", t),
  timeline: col("timeline", t), serviceArea: col("service_area", arr), credentials: col("credentials", arr),
  deliverables: col("deliverables", arr),
};

function createListingsStore(pool, nextId) {
  async function hydrate(client, listingRow) {
    const doc = rowToDoc(listingRow, LISTING_COLUMNS);
    nestedFromRow(listingRow, LISTING_NESTED, doc);

    const mediaRes = await client.query(
      `SELECT * FROM listing_media WHERE listing_id = $1 ORDER BY position ASC`, [listingRow.id]
    );
    doc.media = mediaRes.rows.map((r) => ({ type: r.type, url: r.url }));

    doc.product = null;
    const productRes = await client.query(`SELECT * FROM listing_products WHERE listing_id = $1`, [listingRow.id]);
    if (productRes.rowCount) {
      const productRow = productRes.rows[0];
      const product = rowToDoc(productRow, PRODUCT_COLUMNS);

      const specRes = await client.query(
        `SELECT spec_key, spec_value FROM listing_product_specifications WHERE listing_id = $1 ORDER BY id ASC`,
        [listingRow.id]
      );
      product.specifications = {};
      for (const r of specRes.rows) product.specifications[r.spec_key] = r.spec_value;

      const tierRes = await client.query(
        `SELECT extra FROM listing_product_price_tiers WHERE listing_id = $1 ORDER BY position ASC`, [listingRow.id]
      );
      product.priceTiers = tierRes.rows.map((r) => r.extra);

      const variantRes = await client.query(
        `SELECT extra FROM listing_product_variants WHERE listing_id = $1 ORDER BY position ASC`, [listingRow.id]
      );
      product.variants = variantRes.rows.map((r) => r.extra);

      doc.product = product;
    }

    doc.service = null;
    const serviceRes = await client.query(`SELECT * FROM listing_services WHERE listing_id = $1`, [listingRow.id]);
    if (serviceRes.rowCount) {
      const serviceRow = serviceRes.rows[0];
      const service = rowToDoc(serviceRow, SERVICE_COLUMNS);

      const rateRes = await client.query(
        `SELECT label, price, unit FROM listing_service_rate_card WHERE listing_id = $1 ORDER BY position ASC`,
        [listingRow.id]
      );
      service.rateCard = rateRes.rows.map((r) => ({ label: r.label, price: r.price === null ? null : Number(r.price), unit: r.unit }));

      const portfolioRes = await client.query(
        `SELECT extra FROM listing_service_portfolio WHERE listing_id = $1 ORDER BY position ASC`, [listingRow.id]
      );
      service.portfolio = portfolioRes.rows.map((r) => r.extra);

      doc.service = service;
    }

    return doc;
  }

  // Same shape as hydrate(), but built from maps that were already batch-
  // fetched for every listing at once (see all() below) instead of issuing
  // 4-8 queries per row. Pure/sync — no client, no awaits.
  function hydrateFromMaps(listingRow, maps) {
    const doc = rowToDoc(listingRow, LISTING_COLUMNS);
    nestedFromRow(listingRow, LISTING_NESTED, doc);

    doc.media = (maps.mediaByListing.get(listingRow.id) || []).map((r) => ({ type: r.type, url: r.url }));

    doc.product = null;
    const productRow = maps.productByListing.get(listingRow.id);
    if (productRow) {
      const product = rowToDoc(productRow, PRODUCT_COLUMNS);

      product.specifications = {};
      for (const r of maps.specsByListing.get(listingRow.id) || []) {
        product.specifications[r.spec_key] = r.spec_value;
      }
      product.priceTiers = (maps.tiersByListing.get(listingRow.id) || []).map((r) => r.extra);
      product.variants = (maps.variantsByListing.get(listingRow.id) || []).map((r) => r.extra);

      doc.product = product;
    }

    doc.service = null;
    const serviceRow = maps.serviceByListing.get(listingRow.id);
    if (serviceRow) {
      const service = rowToDoc(serviceRow, SERVICE_COLUMNS);

      service.rateCard = (maps.rateCardByListing.get(listingRow.id) || []).map((r) => ({
        label: r.label, price: r.price === null ? null : Number(r.price), unit: r.unit,
      }));
      service.portfolio = (maps.portfolioByListing.get(listingRow.id) || []).map((r) => r.extra);

      doc.service = service;
    }

    return doc;
  }

  /** Group an array of rows by `listing_id` into a Map<listing_id, row[]>. */
  function groupByListingId(rows) {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.listing_id)) m.set(r.listing_id, []);
      m.get(r.listing_id).push(r);
    }
    return m;
  }

  async function getByIdWith(client, id) {
    const res = await client.query(`SELECT * FROM listings WHERE id = $1`, [id]);
    if (!res.rowCount) return null;
    return hydrate(client, res.rows[0]);
  }

  async function upsertDoc(client, doc) {
    const listingRow = docToRow(doc, LISTING_COLUMNS);
    nestedToRow(doc, LISTING_NESTED, listingRow);
    await upsertRow(client, "listings", "id", listingRow);

    const media = (doc.media || []).map((m, idx) => ({ listing_id: doc.id, type: m.type, url: m.url, position: idx }));
    await replaceChildRows(client, "listing_media", "listing_id", doc.id, media);

    if (doc.product) {
      const p = doc.product;
      const productRow = docToRow(p, PRODUCT_COLUMNS);
      productRow.listing_id = doc.id;
      await upsertRow(client, "listing_products", "listing_id", productRow);

      const specs = Object.entries(p.specifications || {}).map(([spec_key, spec_value]) => ({
        listing_id: doc.id, spec_key, spec_value: spec_value === null || spec_value === undefined ? null : String(spec_value),
      }));
      await replaceChildRows(client, "listing_product_specifications", "listing_id", doc.id, specs);

      const tiers = (p.priceTiers || []).map((item, idx) => ({
        listing_id: doc.id, min_qty: item?.minQty ?? item?.min_qty ?? null, price: item?.price ?? null, extra: item, position: idx,
      }));
      await replaceChildRows(client, "listing_product_price_tiers", "listing_id", doc.id, tiers);

      const variants = (p.variants || []).map((item, idx) => ({
        listing_id: doc.id, name: item?.name ?? null, extra: item, position: idx,
      }));
      await replaceChildRows(client, "listing_product_variants", "listing_id", doc.id, variants);
    } else {
      // Cascades to specifications / price tiers / variants.
      await client.query(`DELETE FROM listing_products WHERE listing_id = $1`, [doc.id]);
    }

    if (doc.service) {
      const s = doc.service;
      const serviceRow = docToRow(s, SERVICE_COLUMNS);
      serviceRow.listing_id = doc.id;
      await upsertRow(client, "listing_services", "listing_id", serviceRow);

      const rateCard = (s.rateCard || []).map((r, idx) => ({
        listing_id: doc.id, label: r.label ?? null, price: r.price ?? null, unit: r.unit ?? null, position: idx,
      }));
      await replaceChildRows(client, "listing_service_rate_card", "listing_id", doc.id, rateCard);

      const portfolio = (s.portfolio || []).map((item, idx) => ({ listing_id: doc.id, extra: item, position: idx }));
      await replaceChildRows(client, "listing_service_portfolio", "listing_id", doc.id, portfolio);
    } else {
      // Cascades to rate card / portfolio.
      await client.query(`DELETE FROM listing_services WHERE listing_id = $1`, [doc.id]);
    }
  }

  return {
    // Batch-hydrates every listing in 9 total queries (1 for listings + 8 for
    // every child table, each fetched once across all ids with = ANY($1))
    // instead of the previous 1 + up to 8-per-row — the difference between 9
    // queries and several thousand for a few hundred listings.
    async all() {
      const res = await pool.query(`SELECT * FROM listings ORDER BY id ASC`);
      const rows = res.rows;
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);

      const [
        mediaRes, productRes, specRes, tierRes, variantRes,
        serviceRes, rateRes, portfolioRes,
      ] = await Promise.all([
        pool.query(`SELECT * FROM listing_media WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`, [ids]),
        pool.query(`SELECT * FROM listing_products WHERE listing_id = ANY($1)`, [ids]),
        pool.query(`SELECT listing_id, spec_key, spec_value FROM listing_product_specifications WHERE listing_id = ANY($1) ORDER BY id ASC`, [ids]),
        pool.query(`SELECT listing_id, extra FROM listing_product_price_tiers WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`, [ids]),
        pool.query(`SELECT listing_id, extra FROM listing_product_variants WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`, [ids]),
        pool.query(`SELECT * FROM listing_services WHERE listing_id = ANY($1)`, [ids]),
        pool.query(`SELECT listing_id, label, price, unit FROM listing_service_rate_card WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`, [ids]),
        pool.query(`SELECT listing_id, extra FROM listing_service_portfolio WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`, [ids]),
      ]);

      const maps = {
        mediaByListing: groupByListingId(mediaRes.rows),
        productByListing: new Map(productRes.rows.map((r) => [r.listing_id, r])),
        specsByListing: groupByListingId(specRes.rows),
        tiersByListing: groupByListingId(tierRes.rows),
        variantsByListing: groupByListingId(variantRes.rows),
        serviceByListing: new Map(serviceRes.rows.map((r) => [r.listing_id, r])),
        rateCardByListing: groupByListingId(rateRes.rows),
        portfolioByListing: groupByListingId(portfolioRes.rows),
      };

      return rows.map((row) => hydrateFromMaps(row, maps));
    },
    async findOne(predicate) {
      const rows = await this.all();
      return rows.find(predicate) || null;
    },
    async findMany(predicate) {
      const rows = await this.all();
      return rows.filter(predicate);
    },
    async getById(id) {
      return getByIdWith(pool, id);
    },
    async insert(doc, idPrefix) {
      const id = doc.id || (idPrefix ? await nextId(idPrefix) : undefined);
      const full = { ...doc, ...(id ? { id } : {}) };
      return withTransaction(pool, async (client) => {
        await upsertDoc(client, full);
        return getByIdWith(client, full.id);
      });
    },
    async update(id, patch) {
      return withTransaction(pool, async (client) => {
        const existing = await getByIdWith(client, id);
        if (!existing) return null;
        const merged = { ...existing, ...patch, id };
        await upsertDoc(client, merged);
        return getByIdWith(client, id);
      });
    },
    async remove(id) {
      const res = await pool.query(`DELETE FROM listings WHERE id = $1`, [id]);
      return res.rowCount > 0;
    },
    async writeJson(docs) {
      await withTransaction(pool, async (client) => {
        const ids = [];
        for (const doc of docs) {
          await upsertDoc(client, doc);
          ids.push(doc.id);
        }
        if (ids.length) {
          await client.query(`DELETE FROM listings WHERE id != ALL($1)`, [ids]);
        } else {
          await client.query(`DELETE FROM listings`);
        }
      });
    },
  };
}

module.exports = { createListingsStore };
