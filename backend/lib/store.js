/**
 * store.js — file-based storage abstraction for BharatSource.
 *
 * The whole app persists to plain files under backend/DB/ (no external database).
 * This module is the ONLY place that touches the filesystem for data, so the rest
 * of the codebase stays swappable to a real DB later (see DESIGN.md §2, §11).
 *
 * Guarantees:
 *  - Atomic whole-file writes: write to a temp file, then rename() (atomic on POSIX),
 *    so a reader never observes a half-written JSON document.
 *  - Append-only JSONL for high-write logs (chat messages, lead ledger): appending a
 *    single line never rewrites history; a crash mid-write at worst leaves one torn
 *    trailing line, which readJsonl() detects and skips.
 *  - Per-key async mutex: read-modify-write on a collection is serialized so concurrent
 *    requests can't clobber each other (lost-update). Different keys never contend.
 *  - Monotonic, prefixed IDs from a persisted counter (not raw Date.now(), which collides).
 */

const config = require("./config");
const usePostgres = Boolean(config.PG_URL);

if (usePostgres) {
  module.exports = require("./pg-store");

} else {
  const fs = require("fs");
  const fsp = require("fs/promises");
  const path = require("path");

  const DB_DIR = path.join(__dirname, "..", "DB");

  /* ---------------------------------------------------------------- paths ---- */

  function dbPath(...parts) {
    return path.join(DB_DIR, ...parts);
  }

  /** Ensure the DB directory (and any nested subdir for a given file) exists. */
  async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
  }

  // Create the base layout once at module load (sync is fine — happens at boot).
  for (const sub of ["", "conversations", "messages", "read-state"]) {
    fs.mkdirSync(dbPath(sub), { recursive: true });
  }

  /* ------------------------------------------------------------- mutex ------- */
  // A promise-chain lock keyed by an arbitrary string (collection name, conversation
  // id, "_counters", ...). Each withLock() call queues behind the previous one for the
  // same key, so the critical section runs to completion before the next starts.

  const _locks = new Map();

  function withLock(key, fn) {
    const prev = _locks.get(key) || Promise.resolve();
    // Chain: run fn only after prev settles (success OR failure — never deadlock).
    const next = prev.then(fn, fn);
    // Keep the chain alive but swallow errors so one failure doesn't poison the lock.
    _locks.set(
      key,
      next.then(
        () => { },
        () => { }
      )
    );
    return next;
  }

  /* --------------------------------------------------------- JSON documents -- */
  // In-memory read cache, keyed by collection filename. readJson() parses a
  // file from disk at most once; every call after that returns a shallow
  // clone of the cached value (cheap — copies references, not a deep clone —
  // and means callers that mutate their own returned array/object, e.g.
  // insert()'s rows.push(), can never corrupt what's cached). writeJson()
  // is the only way the cache changes: it writes to disk exactly as before,
  // then replaces the cache entry with the data it just wrote, so the cache
  // is always exactly what's on disk — no TTL, no staleness window. This
  // also means a burst of concurrent requests for the same collection (e.g.
  // several components fetching categories the instant a page mounts) only
  // ever pays for one disk read + JSON.parse instead of N.
  const _cache = new Map();

  function shallowClone(data) {
    if (Array.isArray(data)) return data.slice();
    if (data && typeof data === "object") return { ...data };
    return data;
  }

  /** Read a JSON collection file; returns `fallback` (default []) if it doesn't exist. */
  async function readJson(name, fallback = []) {
    if (_cache.has(name)) return shallowClone(_cache.get(name));
    const file = dbPath(name);
    let data;
    try {
      const raw = await fsp.readFile(file, "utf-8");
      data = raw.trim() === "" ? fallback : JSON.parse(raw);
    } catch (err) {
      if (err.code === "ENOENT") data = fallback;
      else throw err;
    }
    _cache.set(name, data);
    return shallowClone(data);
  }

  /** Atomically write a JSON collection file (temp file + rename). */
  async function writeJson(name, data) {
    const file = dbPath(name);
    await ensureDir(path.dirname(file));
    const tmp = `${file}.tmp.${process.pid}.${_tmpCounter++}`;
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await fsp.rename(tmp, file); // atomic on POSIX
    _cache.set(name, data);
  }
  let _tmpCounter = 0;

  /* ----------------------------------------------------------- JSONL logs ---- */

  /** Append one object as a single JSON line to an append-only log. */
  async function appendJsonl(name, obj) {
    const file = dbPath(name);
    await ensureDir(path.dirname(file));
    await fsp.appendFile(file, JSON.stringify(obj) + "\n", "utf-8");
  }

  /**
   * Read a JSONL log into an array. Silently skips a torn trailing line (a crash can
   * leave the last line half-written); every complete prior line is preserved.
   */
  async function readJsonl(name) {
    const file = dbPath(name);
    let raw;
    try {
      raw = await fsp.readFile(file, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
    const out = [];
    for (const line of raw.split("\n")) {
      if (line.trim() === "") continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        // Torn/partial line (only ever the last one in practice) — skip it.
      }
    }
    return out;
  }

  /**
   * Patch one lead row by leadId (the RFQ "Connect" contact-status fields).
   * leads-ledger.jsonl is otherwise append-only; this is the one place a row
   * in it is mutated after creation, so it rewrites the whole log atomically
   * (temp file + rename) rather than exposing a general JSONL update API.
   */
  async function updateLead(leadId, patch) {
    return withLock("leads-ledger.jsonl", async () => {
      const rows = await readJsonl("leads-ledger.jsonl");
      const i = rows.findIndex((r) => r.leadId === leadId);
      if (i === -1) return null;
      rows[i] = { ...rows[i], ...patch, leadId };
      const file = dbPath("leads-ledger.jsonl");
      await ensureDir(path.dirname(file));
      const tmp = `${file}.tmp.${process.pid}.${_tmpCounter++}`;
      const content = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
      await fsp.writeFile(tmp, content, "utf-8");
      await fsp.rename(tmp, file);
      return rows[i];
    });
  }

  /* -------------------------------------------------------------- IDs -------- */
  // Persisted monotonic counters, one per prefix, in DB/_counters.json.

  async function nextId(prefix) {
    return withLock("_counters", async () => {
      const counters = await readJson("_counters.json", {});
      const n = (counters[prefix] || 0) + 1;
      counters[prefix] = n;
      await writeJson("_counters.json", counters);
      // e.g. usr_000001 — zero-padded for stable sorting.
      return `${prefix}_${String(n).padStart(6, "0")}`;
    });
  }

  /* ------------------------------------------------ collection CRUD helpers -- */
  // Convenience document-store API over a JSON array file. Every mutation takes the
  // collection lock so read → modify → write is atomic.

  /** All documents in a collection. */
  async function all(name) {
    return readJson(name, []);
  }

  /** First document matching a predicate, or null. */
  async function findOne(name, predicate) {
    const rows = await readJson(name, []);
    return rows.find(predicate) || null;
  }

  /** Document by id, or null. */
  async function getById(name, id) {
    const rows = await readJson(name, []);
    return rows.find((r) => r.id === id) || null;
  }

  /** All documents matching a predicate. */
  async function findMany(name, predicate) {
    const rows = await readJson(name, []);
    return rows.filter(predicate);
  }

  /**
   * Insert a document. If it has no `id`, one is generated from `idPrefix`.
   * Returns the inserted document.
   */
  async function insert(name, doc, idPrefix) {
    return withLock(name, async () => {
      const rows = await readJson(name, []);
      const id = doc.id || (idPrefix ? await nextId(idPrefix) : undefined);
      const row = { ...doc, ...(id ? { id } : {}) };
      rows.push(row);
      await writeJson(name, rows);
      return row;
    });
  }

  /**
   * Shallow-merge a patch into the document with `id`. Returns the updated document,
   * or null if not found. The `id` field is never overwritten.
   */
  async function update(name, id, patch) {
    return withLock(name, async () => {
      const rows = await readJson(name, []);
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return null;
      rows[i] = { ...rows[i], ...patch, id };
      await writeJson(name, rows);
      return rows[i];
    });
  }

  /** Remove the document with `id`. Returns true if one was removed. */
  async function remove(name, id) {
    return withLock(name, async () => {
      const rows = await readJson(name, []);
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return false;
      rows.splice(i, 1);
      await writeJson(name, rows);
      return true;
    });
  }

  // Parity with pg-store's health/shutdown hooks — the file-DB has no pool to probe
  // or drain, so both are no-ops. Keeps index.js / GET /health backend-agnostic.
  async function ping() {}
  async function close() {}

  module.exports = {
    DB_DIR,
    dbPath,
    ping,
    close,
    withLock,
    readJson,
    writeJson,
    appendJsonl,
    readJsonl,
    updateLead,
    nextId,
    all,
    findOne,
    findMany,
    getById,
    insert,
    update,
    remove,
  };
}
