/**
 * architecture.test.js — module-boundary guardrails for the modular-monolith
 * migration (BACKEND-AUDIT.md Phase 0 + Phase 2 "Keeping new code off the old
 * interface").
 *
 * Built BEFORE `backend/modules/` exists, on purpose: it must already be
 * load-bearing the moment Phase 4 creates the first module, so a boundary
 * violation fails CI from the very first commit that could introduce one. While
 * `modules/` is absent every assertion below is vacuously true — that is the
 * intended state today, and the "harness is wired" test at the bottom makes sure
 * this file is actually running and not silently skipped.
 *
 * What it enforces once modules exist:
 *   1. No file under modules/ requires lib/store or lib/pg-store (the predicate
 *      interface being migrated away from). New code uses a module repository.
 *   2. No cross-module DEEP import: modules/a/* may import "modules/b" or
 *      "modules/b/index.js" (the public port) — never "modules/b/service/..." etc.
 *      Exception: `_shared` is the kernel, not a domain module — its leaves
 *      (`_shared/pool`, `_shared/repository`, …) are importable at any depth.
 *   3. A graduated collection's *.json name never appears in routes/ again (once a
 *      collection is owned by a module, route code must go through that module).
 *   4. No file under modules/a/ references another module's physical tables
 *      (checked via each module's schema/tables.js manifest, once those exist).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const BACKEND = path.join(__dirname, "..");
const MODULES_DIR = path.join(BACKEND, "modules");
// Phase 8.9: every route file now lives inside its owning module
// (modules/<domain>/routes/*.routes.js). The old flat backend/routes/ is gone.
const ROUTE_DIRS = fs
  .readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(MODULES_DIR, e.name, "routes"))
  .filter((d) => fs.existsSync(d));

/**
 * Collections that have been migrated into a module and are now OFF-LIMITS to
 * routes/. Phase 4 appends "job-functions.json", "jobs.json", "applications.json";
 * Phase 5 appends the directory collections; etc. Keep in sync as each collection
 * graduates (BACKEND-AUDIT.md "Collection-level atomic graduation").
 */
const GRADUATED_COLLECTIONS = [
  // Phase 4d — recruitment master data, fully owned by modules/recruitment now.
  "job-functions.json",
  "job-roles.json",
  "skills.json",
  // Phase 7 sweep-11 — the last routes/ readers (admin.js analytics + GET /users/:id,
  // adminJobs/adminEmployers earlier) are off store; modules/recruitment owns these.
  "jobs.json",
  "applications.json",
];

/* ------------------------------------------------------------------ helpers -- */

function listJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function readRequires(file) {
  const src = fs.readFileSync(file, "utf-8");
  const specs = [];
  const re = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) specs.push(m[1]);
  return specs;
}

/** modules/<name>/... -> "<name>", for any path under MODULES_DIR. */
function moduleOf(file) {
  const rel = path.relative(MODULES_DIR, file);
  return rel.split(path.sep)[0];
}

/** Resolve a relative require spec from `fromFile` to an absolute path (no ext). */
function resolveSpec(fromFile, spec) {
  return path.resolve(path.dirname(fromFile), spec);
}

const moduleFiles = listJsFiles(MODULES_DIR);

/* -------------------------------------------------------------------- tests -- */

// The runtime layers that must be 100% off the legacy store after the Phase 8
// demolition. lib/store.js is DELETED; lib/pg-store.js survives only for offline
// seed scripts + test oracles, so no server-path file may import it either.
const STORE_FREE_DIRS = [MODULES_DIR, path.join(BACKEND, "realtime")];
const LEGACY_STORE_ABS = new Set([
  path.join(BACKEND, "lib", "store"),
  path.join(BACKEND, "lib", "pg-store"),
]);

test("no runtime file imports the legacy store (lib/store deleted; lib/pg-store is offline-only)", () => {
  const offenders = [];
  for (const dir of STORE_FREE_DIRS) {
    for (const file of listJsFiles(dir)) {
      for (const spec of readRequires(file)) {
        if (!spec.startsWith(".")) continue;
        if (LEGACY_STORE_ABS.has(resolveSpec(file, spec))) {
          offenders.push(`${path.relative(BACKEND, file)} -> ${spec}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `runtime files importing the legacy store:\n${offenders.join("\n")}`);
});

test("lib/store.js is gone (Phase 8.10 demolition)", () => {
  assert.ok(!fs.existsSync(path.join(BACKEND, "lib", "store.js")), "lib/store.js should be deleted");
});

test("modules/ has no cross-module deep imports (only the public port is importable)", () => {
  const offenders = [];
  for (const file of moduleFiles) {
    const self = moduleOf(file);
    for (const spec of readRequires(file)) {
      if (!spec.startsWith(".")) continue;
      const abs = resolveSpec(file, spec);
      if (!abs.startsWith(MODULES_DIR + path.sep)) continue;
      const target = path.relative(MODULES_DIR, abs).split(path.sep)[0];
      if (target === self) continue; // same module: any depth is fine
      if (target === "_shared") continue; // the kernel is importable at any depth
      const rest = path.relative(path.join(MODULES_DIR, target), abs);
      const isPublicPort = rest === "" || rest === "index" || rest === "index.js";
      if (!isPublicPort) {
        offenders.push(`${path.relative(BACKEND, file)} -> ${spec} (reaches into modules/${target}/)`);
      }
    }
  }
  assert.deepEqual(offenders, [], `cross-module deep imports:\n${offenders.join("\n")}`);
});

test("graduated collections are not referenced in any module route file", () => {
  if (GRADUATED_COLLECTIONS.length === 0) return;
  const offenders = [];
  const routeFiles = ROUTE_DIRS.flatMap((d) => listJsFiles(d));
  for (const file of routeFiles) {
    const src = fs.readFileSync(file, "utf-8");
    for (const coll of GRADUATED_COLLECTIONS) {
      if (src.includes(`"${coll}"`) || src.includes(`'${coll}'`)) {
        offenders.push(`${path.relative(BACKEND, file)} still references ${coll}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `routes/ referencing a graduated collection:\n${offenders.join("\n")}`);
});

test("no module references another module's physical tables", () => {
  // Enforced once modules ship a schema/tables.js manifest (Phase 4). Until then
  // there are no module-owned tables to cross-reference.
  const manifests = moduleFiles.filter((f) => /[\\/]schema[\\/]tables\.js$/.test(f));
  if (manifests.length === 0) return;

  const owned = new Map(); // table name -> owning module
  for (const f of manifests) {
    const list = require(f);
    for (const t of Array.isArray(list) ? list : list.tables || []) owned.set(t, moduleOf(f));
  }
  const offenders = [];
  for (const file of moduleFiles) {
    if (/[\\/]schema[\\/]/.test(file)) continue;
    const self = moduleOf(file);
    const src = fs.readFileSync(file, "utf-8");
    for (const [table, ownerMod] of owned) {
      if (ownerMod === self) continue;
      if (new RegExp(`\\b${table}\\b`).test(src)) {
        offenders.push(`${path.relative(BACKEND, file)} references modules/${ownerMod}'s table "${table}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], `cross-module table access:\n${offenders.join("\n")}`);
});

test("architecture harness is wired (this file runs)", () => {
  assert.ok(ROUTE_DIRS.length > 0, "at least one modules/<domain>/routes/ dir should exist");
  assert.ok(Array.isArray(moduleFiles));
});
