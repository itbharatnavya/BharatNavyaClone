/**
 * identity — the read-port every other module goes through to touch `users`
 * (BACKEND-AUDIT.md Phase 3). `users` is the one table shared by all domains; this
 * module is the single, named, greppable seam onto it.
 *
 * Phase 3 is READ-PORT ONLY:
 *   - getAuthUser(id) returns the FULL hydrated user doc, byte-identical to
 *     store.getById("users.json", id) — routes read arbitrary fields off req.user
 *     (employerProfile, sellerProfile, recruitmentRole, roles, status, …), so
 *     narrowing the projection is a later step with its own audit (Phase 6).
 *   - the get*Card(s) readers return the narrow, contact-free shapes other modules
 *     actually need. Batched variants exist so a list endpoint never loops per row;
 *     the single-query view-backed versions land in Phase 4 (identity_*_cards).
 *   - setEmployerApproval is the ONLY write this port will ever expose. Defined now,
 *     not yet wired (routes/adminEmployers.js still writes directly until Phase 4).
 *
 * Internals use the users composite mapper (lib/db/users.js) directly — never
 * lib/store — so the architecture test stays green.
 */

// Import the pool leaf directly (not the _shared barrel) — the barrel pulls in
// crudRouter, which requires middleware/authGuard, which requires this module:
// a cycle. The kernel's leaves are meant to be imported at any depth.
const { pool } = require("../_shared/pool");
const { createUsersStore } = require("../../lib/db/users");

// identity never inserts a user — a throwing stub makes that explicit.
const usersStore = createUsersStore(pool, () => {
  throw new Error("identity does not create users");
});

/** Full hydrated user document — the shape middleware/authGuard.js puts on req.user. */
async function getAuthUser(id) {
  if (!id) return null;
  return usersStore.getById(id);
}

/* --------------------------------------------------------------- cards ------ */
// Narrow, public-safe projections. NEVER include contact fields (contactMobile /
// contactEmail / phone) — those are only ever served from the dedicated
// GET /api/sellers/:slug and GET /api/employers/:slug handlers.

/** Public job-card employer info. Same shape as lib/jobSearch.js `employerMiniOf`
 *  (which becomes a thin call to this in Phase 4). */
function employerCardOf(user) {
  if (!user) return null;
  const ep = user.employerProfile || {};
  return {
    id: user.id,
    companyName: ep.companyName || user.name || null,
    slug: ep.slug || null,
    logo: ep.logo || user.avatarUrl || null,
    city: (ep.location && ep.location.city) || null,
    state: (ep.location && ep.location.state) || null,
    isVerified: !!ep.isVerified,
  };
}

function sellerCardOf(user) {
  if (!user) return null;
  const sp = user.sellerProfile || {};
  return {
    id: user.id,
    companyName: sp.companyName || user.name || null,
    slug: sp.slug || null,
    logo: sp.logo || user.avatarUrl || null,
    city: sp.location && sp.location.city ? sp.location.city : user.city || null,
    state: sp.location && sp.location.state ? sp.location.state : user.state || null,
    isVerified: !!sp.isVerified,
    rating: sp.rating ?? null,
    planTier: sp.planTier || "free",
  };
}

function candidateCardOf(user) {
  if (!user) return null;
  const cp = user.candidateProfile || {};
  return {
    id: user.id,
    name: user.name || null,
    headline: cp.headline || "",
    skills: cp.skills || [],
    city: user.city || null,
    state: user.state || null,
  };
}

const mapCard = (fn) => async (id) => fn(await getAuthUser(id));
// TODO Phase 4: replace the per-id fan-out with one query over the
// identity_*_cards views (BACKEND-AUDIT.md Phase 3 — "BATCH mandatory").
const mapCards = (fn) => async (ids = []) =>
  Promise.all([...new Set(ids)].map(async (id) => fn(await getAuthUser(id))));

const getEmployerCard = mapCard(employerCardOf);
const getEmployerCards = mapCards(employerCardOf);
const getSellerCard = mapCard(sellerCardOf);
const getSellerCards = mapCards(sellerCardOf);
const getCandidateCard = mapCard(candidateCardOf);
const getCandidateCards = mapCards(candidateCardOf);

/* --------------------------------------------------------------- writes ----- */

/** The one write this port exposes. Not yet wired — routes/adminEmployers.js still
 *  patches employerProfile.status directly until Phase 4. */
async function setEmployerApproval(userId, status, actorId) {
  const user = await getAuthUser(userId);
  if (!user || !user.employerProfile) return null;
  return usersStore.update(userId, {
    employerProfile: {
      ...user.employerProfile,
      status,
      statusDecidedBy: actorId || null,
      statusDecidedAt: new Date().toISOString(),
    },
  });
}

module.exports = {
  getAuthUser,
  getEmployerCard, getEmployerCards,
  getSellerCard, getSellerCards,
  getCandidateCard, getCandidateCards,
  setEmployerApproval,
};
