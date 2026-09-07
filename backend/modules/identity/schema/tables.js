/**
 * identity/schema/tables.js — the Postgres tables modules/identity owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * This list is the boundary contract enforced by test/architecture.test.js
 * ("no module references another module's physical tables"): only identity code
 * may name these tables in raw SQL (FROM / JOIN / INTO / UPDATE). Everything else
 * reads them through modules/identity's public port (getAuthUser,
 * hydrateUsersByIds, createUser, updateUser, allUsers, the get*Card readers, …).
 *
 * NOT listed on purpose: the `identity_employer_cards` VIEW. A view is a published,
 * stable read API — modules/recruitment JOINs it deliberately (see
 * recruitment/repository/jobSearch.repository.js) as the sanctioned cross-module
 * seam. Base tables are private; the view is the interface.
 */

module.exports = [
  "users",
  "user_legacy",
  "seller_profiles",
  "seller_locations",
  "expert_profiles",
  "expert_case_studies",
  "candidate_profiles",
  "candidate_education",
  "candidate_work_history",
  "employer_profiles",
  "referrals",
];
