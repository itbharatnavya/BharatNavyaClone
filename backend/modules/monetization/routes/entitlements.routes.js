/**
 * entitlements.js — the composed tier × feature ENTITLEMENTS matrix.
 *
 * Single source of truth for "who gets what": it stitches together the two
 * existing data files —
 *   • features.json          → each feature's `plans` array = which tiers include it
 *   • subscription-plans.json → each tier's per-cycle LIMITS
 * — into one payload the runtime gating layer and the public "What we offer" page
 * both read.
 *
 * GET  /api/entitlements        → PUBLIC read of the composed matrix.
 * PUT  /api/admin/entitlements  → admin bulk save (feature plans + plan limits).
 *
 * The same router serves both; the PUT handler is guarded with authGuard +
 * requireRole("admin") so mounting it at the admin prefix (or anywhere) is safe.
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../../_shared");
const { authGuard, requireRole } = require("../../../middleware/authGuard");

const featuresRepo = repoForCollection("features.json");
const plansRepo = repoForCollection("subscription-plans.json");

// Per-tier LIMIT fields the admin matrix may edit (subscription-plans.json rows).
const LIMIT_FIELDS = [
  "listingLimit",
  "leadQuotaPerCycle",
  "featuredCreditsPerCycle",
  "verifiedBadgeIncluded",
  "analyticsEnabled",
  "perLeadPrice",
  "priceInfo",
];

/**
 * Compose the entitlements payload from features.json + subscription-plans.json.
 * Tiers are ordered by tierRank; features keep features.json order but are emitted
 * group-by-group in first-seen group order (so the matrix groups render stably and
 * any newly-added feature simply appears as a new row).
 */
async function compose() {
  const [features, plans] = await Promise.all([
    featuresRepo.findMany({}),
    plansRepo.findMany({}),
  ]);

  const tiers = [...plans]
    .sort((a, b) => (a.tierRank ?? 0) - (b.tierRank ?? 0))
    .map((p) => ({
      key: p.tier,
      name: p.name,
      tierRank: p.tierRank ?? 0,
      limits: {
        listingLimit: p.listingLimit ?? null,
        leadQuotaPerCycle: p.leadQuotaPerCycle ?? null,
        featuredCreditsPerCycle: p.featuredCreditsPerCycle ?? null,
        verifiedBadgeIncluded: !!p.verifiedBadgeIncluded,
        analyticsEnabled: !!p.analyticsEnabled,
        perLeadPrice: p.perLeadPrice ?? null,
        priceInfo: p.priceInfo || null,
      },
    }));

  // First-seen group order.
  const groupOrder = [];
  for (const f of features) {
    const g = f.group || "Other";
    if (!groupOrder.includes(g)) groupOrder.push(g);
  }

  const composedFeatures = [];
  for (const g of groupOrder) {
    for (const f of features) {
      if ((f.group || "Other") !== g) continue;
      composedFeatures.push({
        id: f.id,
        name: f.name,
        group: g,
        description: f.description || "",
        status: f.status || "live",
        plans: Array.isArray(f.plans) ? f.plans : [],
      });
    }
  }

  return { tiers, features: composedFeatures };
}

// ------------------------------------------------------------ public read ----
router.get("/", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await compose() });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------- admin bulk save (PUT) ----
// Body: { features?: [{ id, plans:[...] }], planLimits?: { free?:{...}, silver?:{...}, gold?:{...} } }
router.put("/", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const body = req.body || {};

    // 1) Feature × tier inclusion — rewrite each feature's `plans` array.
    if (Array.isArray(body.features)) {
      for (const entry of body.features) {
        if (!entry || !entry.id || !Array.isArray(entry.plans)) continue;
        const plans = entry.plans.filter((p) => typeof p === "string");
        await featuresRepo.updateById(entry.id, { plans });
      }
    }

    // 2) Per-tier LIMITS — patch the subscription-plans row matching each tier key.
    if (body.planLimits && typeof body.planLimits === "object") {
      const rows = await plansRepo.findMany({});
      for (const [tier, limits] of Object.entries(body.planLimits)) {
        if (!limits || typeof limits !== "object") continue;
        const row = rows.find((r) => r.tier === tier);
        if (!row) continue;
        const patch = {};
        for (const f of LIMIT_FIELDS) {
          if (f in limits) patch[f] = limits[f];
        }
        if (Object.keys(patch).length) {
          await plansRepo.updateById(row.id, patch);
        }
      }
    }

    return res.json({ success: true, data: await compose() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
