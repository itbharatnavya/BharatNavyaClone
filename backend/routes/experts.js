/**
 * experts.js — public directory for the "Consultations" product (DESIGN: Consultations).
 *
 * An EXPERT is a service-provider seller carrying a sellerProfile.expert block; their
 * fixed-price service listings are PACKAGES. This router is READ-ONLY discovery — the
 * booking flow lives in routes/consultations.js. All shaping is in lib/experts.js so the
 * router stays thin (filter + sort + envelope).
 *
 *   GET /api/experts         → filtered/sorted expert summaries + filter meta
 *   GET /api/experts/:slug   → one expert's full profile
 */

const express = require("express");
const router = express.Router();
const experts = require("../lib/experts");

/** Case/space-insensitive contains for the free-text `q` match. */
function includesCI(haystack, needle) {
  return String(haystack || "")
    .toLowerCase()
    .includes(needle);
}

/**
 * Sort comparators keyed by the `sort` param. priceLow/priceHigh push experts without a
 * priceFrom (quote-only) to the end so the priced ones lead the list either way.
 */
const SORTERS = {
  rating: (a, b) => (b.rating || 0) - (a.rating || 0),
  experience: (a, b) => (b.experienceYears || 0) - (a.experienceYears || 0),
  newest: (a, b) => String(b.id).localeCompare(String(a.id)),
  priceLow: (a, b) =>
    (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity),
  priceHigh: (a, b) =>
    (b.priceFrom ?? -Infinity) - (a.priceFrom ?? -Infinity),
};

/* ----------------------------------------------------- GET /api/experts ---- */
// List experts with optional filters. Filter meta (professions + cities) is always
// computed from the UNFILTERED set so the filter options don't collapse as the user
// narrows the results.
router.get("/", async (req, res, next) => {
  try {
    const { profession, city, mode, language, q, sort } = req.query;

    const all = await experts.listExperts();

    // Meta is derived from the full set (stable filter options).
    const meta = {
      professions: experts.professionsWithCounts(all),
      cities: experts.citiesFrom(all),
    };

    let list = all;
    if (profession) list = list.filter((x) => x.professionKey === profession);
    if (city) {
      const c = String(city).toLowerCase();
      list = list.filter((x) => String(x.city || "").toLowerCase() === c);
    }
    if (mode) list = list.filter((x) => (x.consultationModes || []).includes(mode));
    if (language) {
      const lang = String(language).toLowerCase();
      list = list.filter((x) =>
        (x.languages || []).some((l) => l.toLowerCase() === lang)
      );
    }
    if (q) {
      const needle = String(q).toLowerCase().trim();
      list = list.filter(
        (x) =>
          includesCI(x.name, needle) ||
          includesCI(x.headline, needle) ||
          includesCI(x.profession, needle) ||
          (x.specializations || []).some((s) => includesCI(s, needle))
      );
    }

    const sorter = SORTERS[sort] || SORTERS.rating;
    list = [...list].sort(sorter);

    return res.json({ success: true, data: list, meta });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- GET /api/experts/:slug ---- */
// One expert's full profile (packages + reviews). 404 when no approved expert matches.
router.get("/:slug", async (req, res, next) => {
  try {
    const expert = await experts.getExpertBySlug(req.params.slug);
    if (!expert) {
      return res.status(404).json({ success: false, error: "Expert not found" });
    }
    return res.json({ success: true, data: expert });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
