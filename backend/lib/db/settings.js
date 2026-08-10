/**
 * settings.js — singleton admin config (DB/settings.json). Ranking-algorithm scalars
 * are real typed columns (lib/ranking.js compares them directly); the free-form admin
 * UI config blocks (branding, homepage, featureFlags, contact, footer) stay jsonb.
 * tierBaseline is a fixed priorityTier -> boost map (none/premium/star/leader), so it's
 * flattened into 4 columns rather than treated as a scalar.
 */

const num = (v) => (v === null || v === undefined ? null : Number(v));

function fromRow(row) {
  if (!row) return null;
  return {
    wOrganic: num(row.w_organic),
    wPaid: num(row.w_paid),
    tierBaseline: {
      none: num(row.tier_baseline_none),
      premium: num(row.tier_baseline_premium),
      star: num(row.tier_baseline_star),
      leader: num(row.tier_baseline_leader),
    },
    maxSponsoredPerPage: row.max_sponsored_per_page,
    relevanceFloorThreshold: num(row.relevance_floor_threshold),
    sponsoredRowEnabled: row.sponsored_row_enabled,
    branding: row.branding,
    homepage: row.homepage,
    featureFlags: row.feature_flags,
    contact: row.contact,
    footer: row.footer,
  };
}

function createSettingsStore(pool) {
  return {
    async read(fallback = {}) {
      const res = await pool.query(`SELECT * FROM settings WHERE singleton = true`);
      return res.rowCount ? fromRow(res.rows[0]) : fallback;
    },
    async write(data) {
      const tb = data.tierBaseline || {};
      await pool.query(
        `INSERT INTO settings (singleton, w_organic, w_paid, tier_baseline_none, tier_baseline_premium,
           tier_baseline_star, tier_baseline_leader, max_sponsored_per_page,
           relevance_floor_threshold, sponsored_row_enabled, branding, homepage, feature_flags, contact, footer)
         VALUES (true, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (singleton) DO UPDATE SET
           w_organic=EXCLUDED.w_organic, w_paid=EXCLUDED.w_paid,
           tier_baseline_none=EXCLUDED.tier_baseline_none, tier_baseline_premium=EXCLUDED.tier_baseline_premium,
           tier_baseline_star=EXCLUDED.tier_baseline_star, tier_baseline_leader=EXCLUDED.tier_baseline_leader,
           max_sponsored_per_page=EXCLUDED.max_sponsored_per_page,
           relevance_floor_threshold=EXCLUDED.relevance_floor_threshold,
           sponsored_row_enabled=EXCLUDED.sponsored_row_enabled, branding=EXCLUDED.branding,
           homepage=EXCLUDED.homepage, feature_flags=EXCLUDED.feature_flags, contact=EXCLUDED.contact,
           footer=EXCLUDED.footer`,
        [
          data.wOrganic ?? null, data.wPaid ?? null, tb.none ?? null, tb.premium ?? null, tb.star ?? null,
          tb.leader ?? null, data.maxSponsoredPerPage ?? null, data.relevanceFloorThreshold ?? null,
          data.sponsoredRowEnabled ?? null, data.branding ?? null, data.homepage ?? null, data.featureFlags ?? null,
          data.contact ?? null, data.footer ?? null,
        ]
      );
    },
  };
}

module.exports = { createSettingsStore };
