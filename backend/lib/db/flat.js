/**
 * flat.js — generic engine for collections that map 1:1 onto a single table (no child
 * tables). Covers every collection except users, listings (composite; own modules),
 * chat/leads-ledger (fixed-shape logs; own modules) and settings (singleton; own module).
 *
 * A few collections have one small nested object (notifications.data, stories.media,
 * subscription_plans.priceInfo) that's flattened into prefixed columns on the same
 * table — `nested` handles that without needing a child table.
 */

const {
  docToRow, rowToDoc, quoteIdent, insertParts, withTransaction, upsertRow, nestedToRow, nestedFromRow,
} = require("./util");

class FlatCollectionStore {
  constructor(pool, config) {
    this.pool = pool;
    this.table = config.table;
    this.columns = config.columns; // { jsKey: { col, type } }, must include id
    this.nested = config.nested || [];
    this.idPrefix = config.idPrefix || null;
    this.nextId = config.nextId; // async (prefix) => id
    this.custom = config.custom || null; // { toRow(doc, row), fromRow(row, doc) } escape hatch
  }

  _toRow(doc) {
    const row = docToRow(doc, this.columns);
    nestedToRow(doc, this.nested, row);
    if (this.custom?.toRow) this.custom.toRow(doc, row);
    return row;
  }

  _fromRow(row) {
    const doc = rowToDoc(row, this.columns);
    nestedFromRow(row, this.nested, doc);
    if (this.custom?.fromRow) this.custom.fromRow(row, doc);
    return doc;
  }

  async all() {
    const res = await this.pool.query(`SELECT * FROM ${quoteIdent(this.table)} ORDER BY id ASC`);
    return res.rows.map((r) => this._fromRow(r));
  }

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  }

  async findMany(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  }

  async getById(id) {
    const res = await this.pool.query(`SELECT * FROM ${quoteIdent(this.table)} WHERE id = $1`, [id]);
    return res.rowCount ? this._fromRow(res.rows[0]) : null;
  }

  async insert(doc, idPrefix) {
    const id = doc.id || (idPrefix ? await this.nextId(idPrefix) : undefined);
    const row = this._toRow({ ...doc, ...(id ? { id } : {}) });
    const { colsSql, placeholdersSql, values } = insertParts(row);
    const res = await this.pool.query(
      `INSERT INTO ${quoteIdent(this.table)} (${colsSql}) VALUES (${placeholdersSql}) RETURNING *`,
      values
    );
    return this._fromRow(res.rows[0]);
  }

  async update(id, patch) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch, id };
    const row = this._toRow(merged);
    const updated = await upsertRow(this.pool, this.table, "id", row);
    return this._fromRow(updated);
  }

  async remove(id) {
    const res = await this.pool.query(`DELETE FROM ${quoteIdent(this.table)} WHERE id = $1`, [id]);
    return res.rowCount > 0;
  }

  // Upsert every doc, then delete anything not in the new set. Avoids TRUNCATE
  // entirely — CASCADE on a table with inbound FKs (e.g. categories, referenced by
  // listings.category_id) would silently empty the referencing tables too.
  async writeJson(docs) {
    await withTransaction(this.pool, async (client) => {
      const ids = [];
      for (const doc of docs) {
        const row = this._toRow(doc);
        await upsertRow(client, this.table, "id", row);
        ids.push(row.id);
      }
      if (ids.length) {
        await client.query(`DELETE FROM ${quoteIdent(this.table)} WHERE id != ALL($1)`, [ids]);
      } else {
        await client.query(`DELETE FROM ${quoteIdent(this.table)}`);
      }
    });
  }
}

function buildFlatConfigs(nextId) {
  const t = "text", i = "int", n = "numeric", b = "bool", ts = "timestamptz", arr = "textArray";
  const col = (c, type) => ({ col: c, type });

  return [
    {
      file: "ad-slots.json",
      table: "ad_slots",
      columns: {
        id: col("id", t), name: col("name", t), placementType: col("placement_type", t),
        defaultSize: col("default_size", t), isActive: col("is_active", b),
      },
    },
    {
      file: "ad-bookings.json",
      table: "ad_bookings",
      columns: {
        id: col("id", t), adSlotId: col("ad_slot_id", t), sellerId: col("seller_id", t),
        placementType: col("placement_type", t), creativeImageUrl: col("creative_image_url", t),
        targetUrl: col("target_url", t), headline: col("headline", t), categoryIds: col("category_ids", arr),
        startDate: col("start_date", ts), endDate: col("end_date", ts), priority: col("priority", i),
        status: col("status", t), amount: col("amount", n), impressionsServed: col("impressions_served", i),
        clicks: col("clicks", i), slotId: col("slot_id", t), listingId: col("listing_id", t),
        paymentRecordId: col("payment_record_id", t), createdAt: col("created_at", ts),
      },
    },
    {
      file: "blogs.json",
      table: "blogs",
      columns: {
        id: col("id", t), sellerId: col("seller_id", t), title: col("title", t), slug: col("slug", t),
        coverImage: col("cover_image", t), body: col("body", t), categoryId: col("category_id", t),
        tags: col("tags", arr), status: col("status", t), publishedAt: col("published_at", ts), views: col("views", i),
      },
    },
    {
      file: "boost-requests.json",
      table: "boost_requests",
      columns: {
        id: col("id", t), sellerId: col("seller_id", t), listingId: col("listing_id", t),
        boostType: col("boost_type", t), days: col("days", i), amount: col("amount", n), status: col("status", t),
        createdAt: col("created_at", ts), approvedAt: col("approved_at", ts),
      },
    },
    {
      file: "categories.json",
      table: "categories",
      columns: {
        id: col("id", t), name: col("name", t), slug: col("slug", t), parentId: col("parent_id", t),
        path: col("path", arr), type: col("type", t), icon: col("icon", t), description: col("description", t),
        facets: col("facets", arr), listingCount: col("listing_count", i), order: col("sort_order", i),
      },
    },
    {
      file: "category-suggestions.json",
      table: "category_suggestions",
      columns: {
        id: col("id", t), name: col("name", t), note: col("note", t), context: col("context", t),
        suggestedBy: col("suggested_by", t), status: col("status", t), count: col("count", i),
        createdAt: col("created_at", ts), updatedAt: col("updated_at", ts),
      },
    },
    {
      file: "collections.json",
      table: "collections",
      columns: {
        id: col("id", t), slug: col("slug", t), title: col("title", t), subtitle: col("subtitle", t),
        coverImage: col("cover_image", t), listingIds: col("listing_ids", arr), categorySlugs: col("category_slugs", arr),
        brandSlugs: col("brand_slugs", arr), order: col("sort_order", i), status: col("status", t),
        createdAt: col("created_at", ts),
      },
    },
    {
      file: "consultation-bookings.json",
      table: "consultation_bookings",
      columns: {
        id: col("id", t), expertId: col("expert_id", t), expertSlug: col("expert_slug", t),
        expertName: col("expert_name", t), packageId: col("package_id", t), packageTitle: col("package_title", t),
        name: col("name", t), mobile: col("mobile", t), email: col("email", t), preferredDate: col("preferred_date", t),
        preferredTime: col("preferred_time", t), mode: col("mode", t), message: col("message", t),
        status: col("status", t), userId: col("user_id", t), createdAt: col("created_at", ts),
      },
    },
    {
      file: "features.json",
      table: "features",
      columns: {
        id: col("id", t), name: col("name", t), group: col("group", t), description: col("description", t),
        audience: col("audience", t), plans: col("plans", arr), status: col("status", t), phase: col("phase", i),
      },
    },
    {
      file: "follows.json",
      table: "follows",
      columns: {
        id: col("id", t), followerId: col("follower_id", t), followingId: col("following_id", t),
        createdAt: col("created_at", ts),
      },
    },
    {
      file: "inquiries.json",
      table: "inquiries",
      columns: {
        id: col("id", t), buyerName: col("buyer_name", t), buyerMobile: col("buyer_mobile", t),
        buyerEmail: col("buyer_email", t), productName: col("product_name", t), quantity: col("quantity", t),
        message: col("message", t), listingId: col("listing_id", t), categoryId: col("category_id", t),
        intent: col("intent", t), sellerId: col("seller_id", t), createdAt: col("created_at", ts),
        stage: col("stage", t), buyerId: col("buyer_id", t),
      },
    },
    {
      file: "notifications.json",
      table: "notifications",
      columns: {
        id: col("id", t), userId: col("user_id", t), type: col("type", t), read: col("read", b),
        createdAt: col("created_at", ts),
      },
      nested: [
        {
          docKey: "data",
          fields: {
            followerId: col("data_follower_id", t), name: col("data_name", t), buyerId: col("data_buyer_id", t),
            inquiryId: col("data_inquiry_id", t), productName: col("data_product_name", t),
            message: col("data_message", t), link: col("data_link", t), bookingId: col("data_booking_id", t),
            packageTitle: col("data_package_title", t),
          },
        },
      ],
    },
    {
      file: "payment-records.json",
      table: "payment_records",
      columns: {
        id: col("id", t), sellerId: col("seller_id", t), relatedEntityType: col("related_entity_type", t),
        relatedEntityId: col("related_entity_id", t), amount: col("amount", n), paymentMethod: col("payment_method", t),
        paymentStatus: col("payment_status", t), validFrom: col("valid_from", ts), validTo: col("valid_to", ts),
        referenceNo: col("reference_no", t), notes: col("notes", t), markedPaidDate: col("marked_paid_date", ts),
        createdAt: col("created_at", ts),
      },
    },
    {
      file: "quotes.json",
      table: "quotes",
      columns: {
        id: col("id", t), inquiryId: col("inquiry_id", t), sellerId: col("seller_id", t), price: col("price", n),
        unit: col("unit", t), moq: col("moq", i), deliveryDays: col("delivery_days", i), note: col("note", t),
        validUntil: col("valid_until", ts), status: col("status", t), createdAt: col("created_at", ts),
      },
    },
    {
      file: "referrals.json",
      table: "referrals",
      columns: {
        id: col("id", t), userId: col("user_id", t), code: col("code", t), credits: col("credits", n),
        invitedUserIds: col("invited_user_ids", arr), createdAt: col("created_at", ts),
      },
    },
    {
      file: "reports.json",
      table: "reports",
      columns: {
        id: col("id", t), listingId: col("listing_id", t), reporterId: col("reporter_id", t),
        reason: col("reason", t), details: col("details", t), status: col("status", t),
        createdAt: col("created_at", ts), resolvedBy: col("resolved_by", t), resolvedAt: col("resolved_at", ts),
      },
    },
    {
      file: "reviews.json",
      table: "reviews",
      columns: {
        id: col("id", t), targetUserId: col("target_user_id", t), sellerId: col("seller_id", t),
        direction: col("direction", t), buyerId: col("buyer_id", t), buyerName: col("buyer_name", t),
        rating: col("rating", n), reviewText: col("review_text", t), status: col("status", t),
        createdAt: col("created_at", ts),
      },
    },
    {
      file: "shortlist.json",
      table: "shortlist",
      columns: {
        id: col("id", t), userId: col("user_id", t), listingId: col("listing_id", t), createdAt: col("created_at", ts),
      },
    },
    {
      file: "stories.json",
      table: "stories",
      columns: {
        id: col("id", t), sellerId: col("seller_id", t), caption: col("caption", t),
        linkListingId: col("link_listing_id", t), createdAt: col("created_at", ts), expiresAt: col("expires_at", ts),
        views: col("views", i), isHighlight: col("is_highlight", b), status: col("status", t),
      },
      nested: [{ docKey: "media", fields: { type: col("media_type", t), url: col("media_url", t) } }],
    },
    {
      file: "subscription-plans.json",
      table: "subscription_plans",
      columns: {
        id: col("id", t), name: col("name", t), tier: col("tier", t), billingCycle: col("billing_cycle", t),
        listingLimit: col("listing_limit", i), leadQuotaPerCycle: col("lead_quota_per_cycle", i),
        featuredCreditsPerCycle: col("featured_credits_per_cycle", i), rankBoostBaseline: col("rank_boost_baseline", n),
        verifiedBadgeIncluded: col("verified_badge_included", b), analyticsEnabled: col("analytics_enabled", b),
        perLeadPrice: col("per_lead_price", n), tierRank: col("tier_rank", i),
      },
      nested: [
        { docKey: "priceInfo", fields: { monthly: col("price_monthly", n), currency: col("price_currency", t), label: col("price_label", t) } },
      ],
    },
    {
      file: "conversations/index.json",
      table: "conversations",
      columns: {
        // lastMsgAt is Date.now() (epoch ms), NOT an ISO string — routes/chat.js sorts
        // conversations with plain numeric subtraction on it. See schema.sql for detail.
        id: col("id", t), listingId: col("listing_id", t), lastMsgSeq: col("last_msg_seq", i),
        lastMsgAt: col("last_msg_at", "bigint"), preview: col("preview", t), createdAt: col("created_at", ts),
      },
      custom: {
        toRow(doc, row) {
          row.participant_1 = doc.participants?.[0] ?? null;
          row.participant_2 = doc.participants?.[1] ?? null;
        },
        fromRow(row, doc) {
          doc.participants = [row.participant_1, row.participant_2];
        },
      },
    },
    {
      file: "verification-requests.json",
      table: "verification_requests",
      columns: {
        id: col("id", t), sellerId: col("seller_id", t), gstNumber: col("gst_number", t),
        panNumber: col("pan_number", t), note: col("note", t), status: col("status", t),
        createdAt: col("created_at", ts), reviewedBy: col("reviewed_by", t), reviewedAt: col("reviewed_at", ts),
      },
    },
  ].map((c) => ({ ...c, nextId }));
}

module.exports = { FlatCollectionStore, buildFlatConfigs };
