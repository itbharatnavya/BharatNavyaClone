/**
 * category.repository.js — the `categories` collection for the Directory domain
 * (BACKEND-AUDIT.md Phase 8.2).
 *
 * Categories are stored FLAT (each row carries `parentId` + `path[]`; the tree is
 * assembled in JS by the routes), so this is a plain flat repository over the
 * `categories` table — the same criteria grammar the rest of the migration uses.
 * Consumers: routes/categories.js (public taxonomy), routes/adminCategories.js
 * (admin CRUD), routes/categorySuggestions.js (approve → create a category).
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("categories.json");
