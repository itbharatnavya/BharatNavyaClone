# POSTGRES-MIGRATION.md — file-DB → Postgres migration

**Status: exploratory, opt-in, not yet adopted.** CLAUDE.md's rule stands: *file-based
storage under `backend/DB/` is the project's database.* This branch (`feature/setup-db`)
adds an **optional** Postgres backend behind one env var, for evaluation. Nothing here
changes default behavior — a clone with no `PG_URL` set runs exactly as before, on the
file-DB. Don't merge this to `main` without the owner's explicit sign-off (see CLAUDE.md
§2, "Data & money").

If you're an AI agent picking this up cold, read **CLAUDE.md** first, then this file.

---

## What this is

A **real relational schema** — one typed column per JSON key, not a JSON blob column.
Nested arrays of objects become child tables; the one genuinely open-ended key/value map
(`listings[].product.specifications`, which varies per product category) is an EAV table;
simple string lists become native Postgres `text[]` columns. See `lib/db/schema.sql` for
the full DDL — it's hand-authored and is the source of truth for the shape.

```
backend/
├── lib/
│   ├── store.js          ← unchanged public interface; routes to file-store or pg-store
│   │                        based on whether PG_URL is set (lib/config.js)
│   ├── pg-store.js        ← Postgres implementation of that same interface — dispatches
│   │                         each collection name to its mapper below
│   └── db/
│       ├── schema.sql     ← the DDL (source of truth for the schema)
│       ├── util.js        ← shared doc<->row helpers (type conversion, upsert, transactions)
│       ├── flat.js         ← generic engine + config for collections with no child tables
│       ├── users.js        ← composite mapper: users + seller_profiles + expert_profiles
│       │                      + seller_locations + expert_case_studies + user_legacy
│       ├── listings.js     ← composite mapper: listings + listing_products (+ specs EAV,
│       │                      price tiers, variants) + listing_services (+ rate card,
│       │                      portfolio) + listing_media
│       ├── chat.js         ← messages/<id>.jsonl and read-state/<id>.json (dynamic paths)
│       ├── leads-ledger.js ← leads-ledger.jsonl
│       └── settings.js     ← settings.json (singleton; typed ranking scalars + jsonb UI config)
└── scripts/
    ├── setup-pg-schema.js  ← applies lib/db/schema.sql (idempotent — safe to re-run)
    ├── migrate-collection.js ← migrate one DB/ file into Postgres
    └── migrate-all.js        ← migrate every DB/ file, in FK-dependency-safe order
```

Every mapper in `lib/db/` implements the same shape store.js already exposes —
`all / findOne / findMany / getById / insert / update / remove / writeJson` — so
**no route file changes**. `findOne`/`findMany` still fetch rows and filter in JS for
now (same as the file-store always did); the data itself is fully relational and
directly queryable in Postgres, but rewriting hot-path queries to native SQL `WHERE`
clauses is a deliberate follow-up, not part of this pass.

---

## Prerequisites

- A running Postgres instance (local install, Docker, or a managed instance) and its
  connection string.
- Node 18+, `npm install` already run in `backend/` (`pg` is in `package.json`).

---

## First-time setup (new clone / new contributor)

```bash
cd "…/bharatsource/backend"
cp .env.example .env        # if you don't already have one
```

Add your connection string to `backend/.env`:

```
PG_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

(`DATABASE_URL` also works if that's what your Postgres host provides — `lib/config.js`
accepts either.) Leave it **unset** to keep using the file-DB.

```bash
npm install                 # picks up the `pg` dependency
npm run setup-pg-schema     # applies lib/db/schema.sql — creates all 42 tables (idempotent)
npm run migrate-all         # copies every backend/DB/*.json(l) file into Postgres
```

That's the whole flow. `migrate-all` walks `backend/DB/` recursively (covers
`conversations/`, `messages/`, `read-state/` too), migrates every collection in an
explicit FK-safe order (users → categories → ad-slots → listings → inquiries →
conversations → everything else → counters last), and verifies row counts as it goes.
It's **idempotent** — safe to re-run any time the source JSON changes; it upserts and
removes anything no longer present, never `TRUNCATE`s (which would risk cascading into
unrelated tables through inbound FKs).

Then just run the backend as usual — `node index.js` (or `npm run dev`) — it picks up
Postgres automatically because `PG_URL` is set:

```bash
node index.js
```

---

## Commands reference

| Command | What it does |
|---|---|
| `npm run setup-pg-schema` | Applies `lib/db/schema.sql`. Safe to re-run — every statement is `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`. Does **not** pick up column changes on an existing table (see Troubleshooting). |
| `npm run migrate-all` | Migrates every file under `backend/DB/` in dependency-safe order, then seeds `_counters.json` into the `counters` table last (raises counters only — `GREATEST`, never lowers). |
| `npm run migrate-collection -- <file>` | Migrates one file, e.g. `npm run migrate-collection -- users.json`. Useful after editing one seed file. **Caution:** if the file has inbound FK dependents that don't exist yet (e.g. running `listings.json` before `users.json` on an empty DB), it'll fail with a foreign-key error — use `migrate-all` for a from-scratch load. |

Both migration scripts refuse to run if `PG_URL`/`DATABASE_URL` isn't set (loud failure,
not a silent no-op).

---

## Verifying it worked

```bash
# Row counts landed
node -e "require('./lib/pg-store').all('users.json').then(r => console.log(r.length))"

# Backend boots and serves from Postgres
node index.js &
curl -s http://localhost:4000/api/categories | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.length))"
```

A full fidelity check (deep-compares every collection's original JSON against what
round-trips back out of Postgres) was run during development — the only differences
found were benign and expected:
- Timestamp formatting (`"...Z"` → `"...000Z"`) — same instant, `TIMESTAMPTZ` round-trips
  via `Date.toISOString()`, which always includes milliseconds. Nothing in the codebase
  does string-equality on these.
- Optional array fields that were absent in the source (e.g. a user with no `interests`)
  come back as `[]` rather than an absent key — array columns are `NOT NULL DEFAULT '{}'`.
  Every consumption pattern in the codebase (`(x || []).map(...)`) treats these identically.

If you change the seed data and re-migrate, re-run the deep-compare pattern above
per-collection if you want the same guarantee.

---

## Switching back to the file-DB

Unset (or delete) `PG_URL` in `backend/.env` and restart the backend. `lib/store.js`
re-checks `config.PG_URL` at module load, so nothing else needs to change — `backend/DB/`
is untouched by any of this (migration only *reads* from it).

---

## Design notes / known tradeoffs

- **`listings[].product.specifications`** (spec key/value pairs that vary per product
  category — `Material`, `Thickness`, `Wattage`, 25+ distinct keys seen already) is an
  EAV table (`listing_product_specifications`), not fixed columns — there's no sensible
  fixed column set for a genuinely open-ended map.
- **`product.priceTiers` / `product.variants` / `service.portfolio`** have never been
  populated in the real data, so their exact shape is unconfirmed. Each row keeps the
  complete original item in an `extra jsonb` column alongside a couple of guessed typed
  columns — reconstruction reads from `extra` directly, so round-tripping is lossless
  regardless of whether the guessed columns match the real shape once real data appears.
- **`inquiries.category_id` has no FK constraint.** The real demo data has an inquiry
  referencing a category from before a category re-seed (a genuine orphan). Inquiries are
  immutable historical records of what a buyer asked for at the time — hard-FK'ing here
  would mean a category rename/reseed could invalidate or block old inquiry history.
- **`conversations.last_msg_at` / `messages.ts` are `BIGINT`, not `TIMESTAMPTZ`** — the
  app writes `Date.now()` (epoch ms) into these, and `routes/chat.js` sorts conversations
  with plain numeric subtraction (`b.lastMsgAt - a.lastMsgAt`). Storing them as a real
  timestamp and reading them back as an ISO string would silently break that sort (`NaN`).
- **`update()` on composite collections (users/listings) does a full read-merge-rewrite**,
  matching the file-store's shallow-merge semantics exactly (`{...existing, ...patch, id}`)
  — patching `sellerProfile` replaces the whole sub-object, same as before. This does more
  DB writes than a surgical per-field update would, which is fine at this data scale;
  reconsider if a collection grows into a genuine high-write hot path.
- **`findOne`/`findMany` fetch all rows and filter in JS** (same as the file-store always
  did) rather than pushing predicates down to SQL `WHERE` clauses. The data is real and
  queryable now; rewriting call sites to native SQL is future work, scoped out of this pass.

---

## Where to go next

- Schema changes → edit `lib/db/schema.sql`, re-run `npm run setup-pg-schema`. Column
  *additions* apply cleanly; changing an existing column's type does not (Postgres
  `CREATE TABLE IF NOT EXISTS` is a no-op on an existing table) — drop the affected
  table(s) and re-run `setup-pg-schema` + `migrate-all` in a dev environment, or write a
  proper `ALTER TABLE` migration if there's real data at stake.
- Adding a new collection → add a config entry to `lib/db/flat.js` (if it has no child
  tables) or a new composite mapper module (if it does), plus the matching `CREATE TABLE`
  in `schema.sql`.
- Before this goes anywhere near `main` or production: get the owner's explicit
  sign-off (CLAUDE.md marks the file-DB as a deliberate architecture choice), then update
  CLAUDE.md itself, HANDOVER.md's run instructions, and SECURITY.md (backup story changes
  from "back up `backend/DB/`" to "back up the Postgres database").
