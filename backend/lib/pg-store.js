/**
 * pg-store.js — Postgres-backed implementation of the store.js interface, dispatching
 * each collection name to its relational mapper (lib/db/*). Every mapper exposes the
 * same shape { all, findOne, findMany, getById, insert, update, remove, writeJson },
 * so most of this file is just routing; see lib/db/schema.sql for the actual tables.
 */

const { pool, ping, close } = require("../modules/_shared/pool");
const { nextId, seedCounter } = require("../modules/_shared/ids");
const { FlatCollectionStore, buildFlatConfigs } = require("./db/flat");
const { createUsersStore } = require("./db/users");
const { createListingsStore } = require("./db/listings");
const { createChatSupport, isMessagesPath, isReadStatePath } = require("./db/chat");
const { createLeadsLedgerStore } = require("./db/leads-ledger");
const { createSearchEventsStore } = require("./db/search-events");
const { createSettingsStore } = require("./db/settings");

// The pool, its hardening (Phase 1 §1e), and ping()/close() now live in
// modules/_shared/pool.js — one pool shared by this legacy store and every module
// repository (Phase 2). Re-exported below so store.js consumers are unaffected.
const _locks = new Map();

// nextId / seedCounter moved to modules/_shared/ids.js (Phase 4d) — imported above,
// re-exported below so lib/pg-store.js consumers (migration scripts) are unaffected.

/* -------------------------------------------------------------- mutex ------- */

function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  _locks.set(key, next.then(() => {}, () => {}));
  return next;
}

/* ------------------------------------------------------- collection registry -- */

const flatStores = {};
for (const cfg of buildFlatConfigs(nextId)) {
  flatStores[cfg.file] = new FlatCollectionStore(pool, cfg);
}
const usersStore = createUsersStore(pool, nextId);
const listingsStore = createListingsStore(pool, nextId);
const chatSupport = createChatSupport(pool);
const leadsLedgerStore = createLeadsLedgerStore(pool);
const searchEventsStore = createSearchEventsStore(pool);
const settingsStore = createSettingsStore(pool);

function resolveCollectionStore(name) {
  if (name === "users.json") return usersStore;
  if (name === "listings.json") return listingsStore;
  if (flatStores[name]) return flatStores[name];
  throw new Error(`No relational mapping registered for collection: ${name}`);
}

/* --------------------------------------------------- document-store interface -- */

async function all(name) {
  return resolveCollectionStore(name).all();
}
async function findOne(name, predicate) {
  return resolveCollectionStore(name).findOne(predicate);
}
async function findMany(name, predicate) {
  return resolveCollectionStore(name).findMany(predicate);
}
async function getById(name, id) {
  return resolveCollectionStore(name).getById(id);
}
async function insert(name, doc, idPrefix) {
  return resolveCollectionStore(name).insert(doc, idPrefix);
}
async function update(name, id, patch) {
  return resolveCollectionStore(name).update(id, patch);
}
async function remove(name, id) {
  return resolveCollectionStore(name).remove(id);
}

async function readJson(name, fallback = []) {
  if (name === "settings.json") return settingsStore.read(fallback);
  if (isReadStatePath(name)) return chatSupport.readReadState(name, fallback);
  if (Array.isArray(fallback)) return resolveCollectionStore(name).all();
  throw new Error(`readJson: no relational mapping for singleton document ${name}`);
}

async function writeJson(name, data) {
  if (name === "settings.json") return settingsStore.write(data);
  if (isReadStatePath(name)) return chatSupport.writeReadState(name, data);
  if (Array.isArray(data)) return resolveCollectionStore(name).writeJson(data);
  throw new Error(`writeJson: no relational mapping for singleton document ${name}`);
}

async function appendJsonl(name, obj) {
  if (name === "leads-ledger.jsonl") return leadsLedgerStore.append(obj);
  if (name === "search-events.jsonl") return searchEventsStore.append(obj);
  if (isMessagesPath(name)) return chatSupport.appendMessage(name, obj);
  throw new Error(`appendJsonl: no relational mapping for log ${name}`);
}

async function readJsonl(name) {
  if (name === "leads-ledger.jsonl") return leadsLedgerStore.readAll();
  if (name === "search-events.jsonl") return searchEventsStore.readAll();
  if (isMessagesPath(name)) return chatSupport.readMessages(name);
  throw new Error(`readJsonl: no relational mapping for log ${name}`);
}

/** Bulk-replace (migration use only — see scripts/migrate-collection.js). */
async function writeJsonl(name, items) {
  if (name === "leads-ledger.jsonl") return leadsLedgerStore.writeAll(items);
  if (isMessagesPath(name)) return chatSupport.writeMessages(name, items);
  throw new Error(`writeJsonl: no relational mapping for log ${name}`);
}

/** Patch one lead row by leadId (the RFQ "Connect" contact-status fields). */
async function updateLead(leadId, patch) {
  return leadsLedgerStore.update(leadId, patch);
}

module.exports = {
  ping,
  close,
  withLock,
  readJson,
  writeJson,
  appendJsonl,
  readJsonl,
  writeJsonl,
  updateLead,
  nextId,
  seedCounter,
  all,
  findOne,
  findMany,
  getById,
  insert,
  update,
  remove,
};
