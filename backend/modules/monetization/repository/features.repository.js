/**
 * features.repository.js — the `features` collection (the living Feature Catalog
 * behind the public /features & /pricing pages, admin-editable). Owned by
 * modules/monetization (BACKEND-AUDIT.md Phase 8.3).
 *
 * Plain flat repository over the `features` table — was `store.all/getById/
 * insert/update/remove("features.json")`. Contract-neutral: the same
 * `FlatCollectionStore` mapper the legacy store used.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("features.json");
