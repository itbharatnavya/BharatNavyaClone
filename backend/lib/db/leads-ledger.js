/**
 * leads-ledger.js — relational mapping for DB/leads-ledger.jsonl (append-only,
 * fixed shape { leadId, sellerId, buyerId, inquiryId, listingId, leadType,
 * deliveredDate, consumedFromQuota, chargeable, billingStatus, status }).
 */

function fromRow(r) {
  return {
    leadId: r.lead_id, sellerId: r.seller_id, buyerId: r.buyer_id, inquiryId: r.inquiry_id,
    listingId: r.listing_id, leadType: r.lead_type,
    deliveredDate: r.delivered_date instanceof Date ? r.delivered_date.toISOString() : r.delivered_date,
    consumedFromQuota: r.consumed_from_quota, chargeable: r.chargeable, billingStatus: r.billing_status,
    status: r.status,
    contactedAt: r.contacted_at instanceof Date ? r.contacted_at.toISOString() : (r.contacted_at ?? null),
    contactedVia: r.contacted_via ?? null,
  };
}

function createLeadsLedgerStore(pool) {
  return {
    async readAll() {
      const res = await pool.query(`SELECT * FROM leads_ledger ORDER BY delivered_date ASC NULLS LAST`);
      return res.rows.map(fromRow);
    },
    async append(lead) {
      await pool.query(
        `INSERT INTO leads_ledger (lead_id, seller_id, buyer_id, inquiry_id, listing_id, lead_type,
           delivered_date, consumed_from_quota, chargeable, billing_status, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          lead.leadId, lead.sellerId ?? null, lead.buyerId ?? null, lead.inquiryId ?? null,
          lead.listingId ?? null, lead.leadType ?? null, lead.deliveredDate ?? null,
          !!lead.consumedFromQuota, !!lead.chargeable, lead.billingStatus ?? null, lead.status ?? null,
        ]
      );
    },
    // The RFQ "Connect" feature — a seller records that they called/WhatsApp'd
    // the buyer directly for this delivered RFQ, instead of the removed
    // Quote-back flow. Scoped to just these two columns; nothing else on a
    // lead row is ever mutated after creation.
    async update(leadId, patch) {
      const res = await pool.query(
        `UPDATE leads_ledger SET contacted_at = $1, contacted_via = $2 WHERE lead_id = $3 RETURNING *`,
        [patch.contactedAt ?? null, patch.contactedVia ?? null, leadId]
      );
      return res.rowCount ? fromRow(res.rows[0]) : null;
    },
    // Bulk-replace (migration use): upsert every entry, then drop anything not in the set.
    async writeAll(items) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const ids = [];
        for (const lead of items) {
          await client.query(
            `INSERT INTO leads_ledger (lead_id, seller_id, buyer_id, inquiry_id, listing_id, lead_type,
               delivered_date, consumed_from_quota, chargeable, billing_status, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (lead_id) DO UPDATE SET
               seller_id=EXCLUDED.seller_id, buyer_id=EXCLUDED.buyer_id, inquiry_id=EXCLUDED.inquiry_id,
               listing_id=EXCLUDED.listing_id, lead_type=EXCLUDED.lead_type, delivered_date=EXCLUDED.delivered_date,
               consumed_from_quota=EXCLUDED.consumed_from_quota, chargeable=EXCLUDED.chargeable,
               billing_status=EXCLUDED.billing_status, status=EXCLUDED.status`,
            [
              lead.leadId, lead.sellerId ?? null, lead.buyerId ?? null, lead.inquiryId ?? null,
              lead.listingId ?? null, lead.leadType ?? null, lead.deliveredDate ?? null,
              !!lead.consumedFromQuota, !!lead.chargeable, lead.billingStatus ?? null, lead.status ?? null,
            ]
          );
          ids.push(lead.leadId);
        }
        if (ids.length) {
          await client.query(`DELETE FROM leads_ledger WHERE lead_id != ALL($1)`, [ids]);
        } else {
          await client.query(`DELETE FROM leads_ledger`);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createLeadsLedgerStore };
