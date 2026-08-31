# BharatSource Backend — Audit + Modular Monolith Migration

## Context

The backend is a 43-file Express monolith (10,579 route lines) that grew as a POC and is now being productionised. Postgres is live (`PG_URL` set in `backend/.env`); `backend/DB/*.json` are stale fixtures.

Three things prompted this plan:

1. **Exploitable defects reachable by any logged-in user today** — most importantly `PUT /api/listings/:id` lets a seller grant themselves paid boosts, the verified badge, and a fake 5-star rating for free.
2. **A data-access interface that cannot scale.** `store.findOne/findMany` take a *JavaScript predicate*. A predicate can never be pushed into SQL, so every one of them is `SELECT * FROM table` followed by `Array.filter` in Node. ~100% of filtering, sorting and pagination in the app happens in JS after loading whole tables. The 47 `CREATE INDEX` statements in `lib/db/schema.sql` are almost entirely dead.
3. **No module boundaries.** Roughly 8,500 of 10,579 route lines are domain logic, not HTTP plumbing. `routes/listings.js:21` imports from `routes/users.js` — a route importing a route.

Intended outcome: a safe-to-expose API, queries that use the indexes that already exist, and domain modules with enforced boundaries — reached incrementally, with the running frontend never breaking.

**Decisions already made:** combined roadmap (security + performance + restructure); incremental strangler (`modules/` and a repository layer grow *alongside* `store.js`, which dies only when its last consumer is gone); execution budget is **2 days with an AI agent**, which reaches Phases 0-4 — see [Fitting this into a 2-day agent budget](#fitting-this-into-a-2-day-agent-budget).

Every finding below was verified by reading the code at the cited line, not inferred.

---

## RESUME HERE — current state

**Last worked: 2026-08-31 (IST). Branch: `feature/backend-phase1` (off `feature/ui-phase`; `design` branch merged in — see [Branching & UI integration](#branching--ui-integration-multi-dev) below).**

| Phase | State |
|---|---|
| **0 — Safety net** | Partial. `app.js` split from `index.js` (supertest can mount it). `test/phase1-security.test.js` added (9 tests). **Not done:** golden-response harness, `test/architecture.test.js`, `PG_URL_TEST` DB, pagination edge-case tests. |
| **1 — Security + cross-cutting** | **Landed & committed:** 1a (mass-assign allowlists), 1b (self-review 403/404), 1c (helmet + rate limiting → 429), 1d-partial (CSPRNG OTP, sweep, `/ai/rfq` auth, prompt cap), 1e-core (PG pool timeouts, graceful shutdown, `/health`), 1g (dead memoization deleted), 1h (login timing fix). See [Phase 1 — Implementation log](#phase-1--implementation-log) for the full table + test results. |
| **2 — Shared kernel** | Not started. |
| **3–7** | Not started. |

**Still open from Phase 1** (all deferred deliberately — none is an open security hole):
- **1d-full** — OTP + AI-budget → Postgres tables (needs a numbered migration; do in Phase 2).
- **1e-pino** — structured logger + `req.id` + access log (do with the Phase 2 kernel).
- **1f** — shared `pagination.js` + `/api/listings` limit cap (it's a Phase 2 `_shared/` file).
- **1a-admin** — `routes/admin.js` raw-spread writes → allowlist (admin-gated; fold into Phase 6).
- **1b-CHECK** — DB `CHECK (buyer_id <> target_user_id)` on reviews (needs a migration; Phase 5).
- **1i** — **OWNER ACTION:** rotate every credential in `backend/DB/users.json` (38 bcrypt hashes + admin), then `git rm --cached backend/DB/users.json` + `.gitignore` it.

**To resume:** verify green with `cd backend && npm test` (expect 29 pass) and `cd frontend && npx tsc --noEmit` (clean). Then either finish the remaining Phase 1 items above, or start **Phase 2 — Shared kernel** (`backend/modules/_shared/`: `pool.js`, `repository.js`, `queryBuilder.js`, `pagination.js`, `envelope.js`, `errors.js`, `crudRouter.js`, `mappings/flat.mappings.js`) per the [Phase 2](#phase-2--shared-kernel) spec.

**New env vars added this pass** (all optional, safe defaults — see `backend/.env.example`): `RATE_LIMIT_ENABLED`, `RL_GLOBAL_MAX`, `RL_AUTH_MAX`, `RL_AI_MAX`, `AI_PROMPT_MAX`, `PG_STATEMENT_TIMEOUT_MS`, `PG_CONNECT_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_SSL`.

**New deps:** `helmet`, `express-rate-limit` (prod), `supertest` (dev).

### Branching & UI integration (multi-dev)

`feature/backend-phase1` is the **single integration branch** — "latest" for both backend work and the incoming redesign.

```
main
 └─ feature/ui-phase          existing app UI baseline
     └─ design                UI dev: only adds/updates the Design/ folder → pushed to origin
 └─ feature/backend-phase1    INTEGRATION BRANCH: backend + design pulls + UI port work
     └─ feature/ui-<screen>   short-lived: port one screen from Design/ into real frontend/
```

- **`Design/`** (merged 2026-08-31, merge commit `883f0c9`, from branch `design`) is a **self-contained Vite+React+TS redesign prototype** — its own `package.json` / `tsconfig` / `.gitignore`, zero overlap with `backend/`, `frontend/`, or root. It is a **read-only reference for porting**, never built or imported by the real app.
- **Pull design updates** whenever the UI dev pushes: `git fetch origin` → compare `git diff --name-only feature/backend-phase1...origin/design` (expect everything under `Design/`) → `git merge --no-ff origin/design` → `git push`. Anything in that diff **outside `Design/`** is a review point.
- **Rules:** merge, never rebase this branch (it's published); flow is one-way (`design` → here, never back); watch root + `frontend/package-lock.json` on each merge (only realistic conflict source).
- **Porting:** per screen, branch `feature/ui-<screen>` off here, rebuild in real `frontend/` components using `frontend/app/globals.css` tokens + CLAUDE.md §6 rules; PR back; delete that slice of `Design/` when done. When touching `frontend/lib/api.ts`, also land the deferred **429 handler** fix (Frontend Fix Register 1c/1d).

---

## The governing constraint: the frontend must never break

Every phase ships to a working frontend. The rule that makes this true:

> **API responses may only gain keys. Never remove, rename, or retype an existing key.**

Additive is safe — `frontend/lib/api.ts` unwraps `json.data` and reads named keys, so extra keys are ignored. Removals and renames are not safe.

Where a phase genuinely *cannot* stay additive, it is tagged **🔧 FRONTEND FIX** with the exact frontend file and what changes. Every such tag is also collected in the [Frontend Fix Register](#frontend-fix-register) so you can grep one list at any phase boundary.

Three contract rules enforced throughout:

- **Renames get a deprecation window.** Ship both keys for one phase, migrate the frontend, drop the old key a phase later. Never in one commit.
- **New status codes count as a contract change.** `429` has never been returned by this API; `frontend/lib/api.ts:158-163` only special-cases `401`.
- **Silently-persisted fields count too.** Tightening mass assignment stops persisting fields the frontend may currently be sending. That needs an audit, not an assumption.

---

## Findings

### Exploitable today

| # | Finding | Location | Impact |
|---|---|---|---|
| S1 | **Mass assignment.** Blocklist strips only `id, sellerId, createdAt`; everything else merges into the listing. Client-writable: `isFeatured`, `featuredStartDate/EndDate`, `rankBoostScore`, `isSponsored`, `manualPinRank`, `isVerifiedSeller`, `rating`, `reviewCount`, `views`, `verification` | `routes/listings.js:895` → `:993` | Revenue bypass (free boosts), trust-badge forgery, fake ratings. **2-step moderation bypass**: PUT `verification.status:"approved"`, then PUT `status:"active"` — the gate at `:909-917` reads the *stored* listing, not the patch |
| S2 | **Self-review.** No check that `targetUserId !== req.user.id`; target existence never verified; `status:"approved"` hardcoded; then `recomputeSellerRating` runs | `routes/reviews.js:191-252` | Any user raises their own public rating. Registration is unthrottled and passwords optional, so competitor 1-star brigading is equally cheap |
| S3 | **No rate limiting anywhere.** `express-rate-limit` absent from `package.json` | `index.js` | Unlimited password brute force, unlimited 6-digit-OTP guessing (`lib/auth.js:50` uses `Math.random()`, not CSPRNG), unlimited OTP generation against an unbounded never-swept `Map` (`lib/auth.js:47`) |
| S4 | **Unauthenticated AI.** `POST /api/ai/rfq` has *no* guard; `/api/ai/search` and `/api/assistant/chat` are `optionalAuth`. No length cap on the prompt. All three spawn the `claude` CLI (`MAX_CONCURRENT = 2`) | `routes/ai.js:816`, `:388`, `routes/assistant.js:856` | Two concurrent requests starve all AI. Once `ANTHROPIC_API_KEY` is set — which READY-TO-PRODUCTION.md §8 Part 2 plans — this becomes an anonymous, unbounded billing hole |
| S5 | **Prompt injection into the moderation gate.** User `title`/`description` interpolated undelimited into the verification prompt | `lib/listingVerification.js:118-128` | Crafted listing text can flip `contentOk`/`score` and auto-approve itself |
| S6 | **Upload mime is self-declared.** Only the data-URL header is checked, never magic bytes; file lands in the web-served `frontend/public/uploads/`. Returned URLs then accepted verbatim as `resumeUrl`/`media.url`/`logo` with no scheme validation | `routes/uploads.js:52-59`, `lib/uploadStorage.js:92` | Extension is forced from the allowlist so it won't serve as HTML, but a `javascript:` URL passing into `media.url` is a stored-XSS path |
| S7 | **No helmet.** No security headers at all | `index.js:18-21` | — |

### Correctness / robustness

| # | Finding | Location |
|---|---|---|
| C1 | **All 6 memoization sites are dead.** `getVersion()` returns `Date.now()` under Postgres, so the version check is always false. Two `Map` caches in `brands.js` grow unbounded while never being read | `lib/pg-store.js:162`; `routes/categories.js:55`, `routes/users.js:149/206/284`, `routes/brands.js:137/189` |
| C2 | **Lost-update race.** `update()` is read-modify-write with no `FOR UPDATE`; hit constantly by fire-and-forget view counters | `lib/db/flat.js:71-78`; `routes/listings.js:414`, `routes/jobs.js:179` |
| C3 | **Three single-process state stores** that break the moment a second Node process exists: the `_locks` mutex, the OTP map, the AI budget limiter | `pg-store.js:19`, `lib/auth.js:47`, `routes/assistant.js:27` |
| C4 | **Pool config is `{connectionString, max:10}` and nothing else** — no `statement_timeout`, `connectionTimeoutMillis`, `idleTimeoutMillis`, `ssl`, or `pool.end()` | `lib/pg-store.js:18` |
| C5 | **No graceful shutdown, no logger, no request IDs, no access log.** Only 5 `console.*` sites runtime-wide; `errorHandler.js:6` logs `err.message` but never `err.stack` | `index.js:88`, `middleware/errorHandler.js` |
| C6 | **Health check never probes its dependencies** — returns `status:"ok"` with Postgres down | `index.js:24-26` |
| C7 | **User-enumeration timing oracle.** `!user \|\| !(await verifyPassword(...))` short-circuits, so a nonexistent email returns without a bcrypt compare | `routes/auth.js:116` |
| C8 | **AI failures return 200.** `catch (_err) {}` → deterministic fallback with `fallback:true`. An outage is indistinguishable from a normal answer | `routes/ai.js:407/416/601/827`, `assistant.js:945` |
| C9 | **`GET /api/listings` has no `limit` cap** — unlike every other paginated route (jobs caps at 50, admin at 100) | `routes/listings.js:294` |
| C10 | **`backend/DB/users.json` is git-tracked** with 38 bcrypt hashes + PII, including the admin account | — |

### Validation

`lib/validate.js` is well-built (`safeParse`, 400 with `issues[]`, replaces `req[source]`) and **imported by 2 of 43 route files, covering 5 endpoints of ~189.** Zero query-param validation anywhere. Three inconsistent styles coexist:

| Style | Where | Verdict |
|---|---|---|
| Allowlist loop | `routes/users.js:564-575`, `:458-472`, admin taxonomy routers | ✅ the pattern to standardise on |
| Blocklist destructure | `routes/listings.js:895`, `routes/jobs.js:270` | ❌ S1 |
| Raw spread | `routes/admin.js:412/421/440/449/616/690` | ❌ admin-gated, still wrong |

### Architecture

- **The predicate interface** (`flat.js:45-53`, `users.js:386`, `listings.js:265`) is the root constraint. The only DB-side predicates in the entire codebase are `WHERE id = $1`, the `= ANY($1)` child batches inside `all()`, and two chat/lead lookups. No route ever emits `LIMIT`/`OFFSET`/`ORDER BY`/business `WHERE`.
- **Worked example — `GET /api/jobs`:** `store.all("users.json")` hydrates *every user with all 9 child tables* (10 queries) just to check `employerProfile.status === "approved"`, then `findMany("jobs.json")` scans the whole jobs table, then sorts and `.slice()`s in JS. **11 queries and 2 full table scans to return 12 rows.**
- **Business logic sits in routers.** `routes/ai.js` is 812/856 lines of logic before its 3 routes; `assistant.js` 855/970; `listings.js` has ~250 helper lines + a 112-line browse handler + a 170-line bulk import + a 114-line PUT. The two real extractions (`lib/leads.js`, `lib/listingVerification.js`) happened only when a second caller appeared.
- **Envelope is genuinely consistent** — all ~189 handlers return `{success,data}`. Exactly one endpoint breaks it.
- **No shared pagination helper.** `paginationOf` at `routes/jobs.js:80` is file-local; `routes/adminJobs.js:29` reimplements it.
- **No SQL injection.** All queries parameterized; identifiers come from static config through `quoteIdent`. Verified across every mapper.
- **Not vulnerabilities** (checked, cleared): `/api/admin/entitlements`, `/api/admin/collections`, `/api/admin/boosts` all resolve to handlers that are correctly guarded for the data they return. Confusing naming, not auth bypasses.

---

## Migration principle

The valuable thing is **killing the predicate interface**, not moving files into `modules/`. File moves look like progress and reduce zero risk. So the order is **seam first, module second, file moves last.**

Domain boundaries visible in the data: Identity · Directory · Recruitment · Consultations · Monetization · Admin · AI · Chat · Notifications. `users` is the shared table every domain touches.

---

## Phases

Each phase is independently shippable and independently revertible. **Contract impact** is stated per phase.

### Phase 0 — Safety net
**Small · Contract impact: ✅ none — no runtime code changes**

- Split `app` from `server.listen` (`index.js:84-90`) so supertest can mount the app. ~10 lines.
- Golden-response harness: `supertest` + `test/golden/` fixtures, normalizing generated ids / `createdAt` / `Date.now()`-derived fields. Coverage: every recruitment endpoint (~25), the 12 highest-traffic Directory reads, and **`GET /api/admin/users` across ~15 branch combinations** (`routes/admin.js:190-266` — these branches are impossible to reconstruct after the Phase 6 rewrite).
- **Pagination edge cases**, where `.slice()` → `LIMIT` breaks: page 0, page past last, `limit=0`, `limit=9999`, and a **disjointness assertion** (fetch pages 1 and 2, assert no overlapping ids). That last one is the only test that catches nondeterministic `ORDER BY`.
- `test/architecture.test.js` (~40 lines, `node --test`, no new dep). Asserts: no file under `modules/` requires `lib/store`; no cross-module deep imports; graduated collection names appear nowhere in `routes/`; no module references another module's physical tables. **Build it now, before it can catch anything** — so it is already load-bearing when Phase 4 starts.
- Dedicated `PG_URL_TEST` database with a **pinned** seed. Never golden against dev data.

**Gate:** `npm test` green; a deliberate boundary violation makes the architecture test fail.
**Rollback:** purely additive.

---

### Phase 1 — Security + cross-cutting
**Small · Highest value in the plan · Depends on nothing downstream — do not let this queue behind the restructure**

| Item | Change | Contract |
|---|---|---|
| 1a | **S1 mass assignment.** `routes/listings.js:895` and `routes/jobs.js:270` blocklist → allowlist, modelled on `routes/users.js:564-575`. Same for `routes/admin.js:421/440/449/616/690` | ⚠️ see below |
| 1b | **S2 self-review.** 403 when `targetUserId === req.user.id`; verify target exists. Add DB `CHECK (buyer_id <> target_user_id)` in a numbered migration so it can't recur | ⚠️ new 403 |
| 1c | **S3/S7 helmet + express-rate-limit**, mounted before `index.js:29`. Global 300/15min; `/api/auth/*` 10/15min keyed on IP+mobile; `/api/ai/*` + `/api/assistant/*` 20/hr keyed on `req.user?.id ?? req.ip` | ⚠️ new 429 |
| 1d | **S4 unauthenticated AI.** All three AI endpoints behind the limiter; `/api/ai/rfq` gets `optionalAuth` at minimum. Cap prompt length. Move the in-process budget (`assistant.js:27`) and the OTP store (`lib/auth.js:47`) into Postgres tables so they survive a second process (**C3**). Switch OTP to `crypto.randomInt` | ⚠️ new 429 |
| 1e | **C4/C5/C6.** `statement_timeout: 10000`, `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 30000`, `ssl` from env. SIGTERM → `server.close()` → `io.close()` → `pool.end()`. `/health` runs `SELECT 1`. pino + `req.id` + access log; log `err.stack` | ✅ none |
| 1f | **C9 shared pagination.** Ship `modules/_shared/pagination.js` *before any module exists*. `routes/jobs.js:81` and `routes/adminJobs.js:29` import it; `GET /api/listings` gets its first limit cap | ⚠️ see below |
| 1g | **C1.** Delete `store.getVersion` and its 6 dead call sites + the two unbounded `brands.js` Maps. Remove the memoization recommendation from CLAUDE.md §5 | ✅ none |
| 1h | **C7.** Always run a bcrypt compare against a dummy hash when the user is not found | ✅ none |
| 1i | **C10.** `git rm --cached backend/DB/users.json`, add to `.gitignore`, rotate every credential it contains. History rewrite is a separate decision | ✅ none |

**🔧 FRONTEND FIX — 1a:** the allowlist stops persisting fields the frontend may currently be sending. **Before writing each allowlist, diff it against what the frontend actually posts** (`frontend/lib/api.ts` `updateListing` / `updateJob` call sites and the `/sell` + `/post-job` forms). Anything the UI legitimately sends must be in the allowlist. Anything it doesn't send is safe to drop.

**🔧 FRONTEND FIX — 1b/1c/1d:** `frontend/lib/api.ts:158-163` handles only `401`. Add `429` → a friendly "too many attempts, try again in a minute" toast, and surface the `403` bodies (`{success:false,error}`) rather than a generic failure. Without this the user sees a silent no-op.

**🔧 FRONTEND CHECK — 1f:** capping `/api/listings` `limit` changes behaviour only if the frontend requests more than the cap. Grep the `getListings` call sites for large `limit` values before choosing the number. Set the cap above the largest legitimate request.

**Gate:** goldens byte-identical for every non-security endpoint. New negative tests: mass-assign attempt leaves the field unchanged; self-review 403; 11th auth attempt 429; `/api/ai/rfq` rate-limited; `/health` fails with PG down; SIGTERM drains in-flight requests.
**Rollback:** each item is a standalone commit, revertible in isolation.

---

## Phase 1 — Implementation log

**Status: partially landed.**
- **2026-08-31 15:14 IST (+05:30)** — security-critical + cross-cutting items 1a, 1b, 1c, 1e (load-bearing part), 1h, plus the low-risk parts of 1d: implemented, tested, green.
- **2026-08-31 15:32 IST (+05:30)** — **1g done** (dead memoization deleted). See its own row below.

Still deferred (reasons below): 1d Postgres-backed OTP + AI-budget tables, 1e pino/`req.id`, 1f, 1i, 1a-admin, 1b DB CHECK.

### What changed

New files:

| File | Purpose |
|---|---|
| `backend/app.js` | The Express app, split out of `index.js` so `supertest` can mount it without binding a port (Phase 0 prerequisite). All route mounts, `helmet`, the rate limiters, `/`, and the new `/health` live here. |
| `backend/lib/security.js` | `helmet` config + three `express-rate-limit` limiters (global, auth, AI). All return the standard `{success:false,error,code:"rate_limited"}` envelope with HTTP 429. `validate:false` (deliberate custom key generators; trusted single origin). |
| `backend/test/phase1-security.test.js` | 9 regression tests — keep permanently. |

Modified:

| Item | File(s) | Change | Contract impact |
|---|---|---|---|
| **1a** | `routes/listings.js` (PUT `/:id`), `routes/jobs.js` (PUT `/:id`) | Blocklist destructure → explicit allowlist `Set`. Listings: `title, slug, description, category, categoryId, legacyCategory, categoryPath, keywords, media, location, locationId, panIndia, serviceCities, city, state, pincode, status, product, service`. Jobs: the 16 create-route fields. Everything else (`isFeatured`, `rankBoostScore`, `isSponsored`, `manualPinRank`, `isVerifiedSeller`, `rating`, `reviewCount`, `verification`, `employerId`, `viewCount`, …) is now dropped on the floor. | **Verified frontend-safe.** Diffed the allowlist against every caller: `updateListing` is sent only `{title, description, status, media, product}` (`components/dashboard/ListingsTab.tsx:112`) and `{title, description, media, product}` (`components/admin/ListingVerificationTab.tsx:493`); `updateJob` is sent the create-form body (`app/post-job/page.tsx:138`) or `{status}` (admin/recruitment dashboards). All within the allowlist. No frontend change needed. |
| **1b** | `routes/reviews.js` (POST `/`) | 403 when `targetUserId === req.user.id`; 404 when the target user does not exist. Both before any write / `recomputeSellerRating`. | ⚠️ New 403/404 on `POST /api/reviews`. `frontend/lib/api.ts request<T>` already throws `Error(json.error)` for any non-2xx, so callers that surface `err.message` show the real message. The friendly-toast polish is still open (see Register). |
| **1c** | `lib/security.js`, `app.js`, `lib/config.js` | `helmet` (CSP off — JSON API; CORP `cross-origin`). Global limiter 1000/15min (coarse DoS guard; tunable `RL_GLOBAL_MAX`). Auth limiter 10/15min keyed `ip\|mobile-or-email` (`RL_AUTH_MAX`). AI limiter 30/hr keyed `user.id ?? ip`, on `/api/ai/*` **and** `/api/assistant/*` (`RL_AI_MAX`). `app.set("trust proxy", 1)` so `req.ip` is the real client behind the Next rewrite. All limiters honour `RATE_LIMIT_ENABLED=false`. | ⚠️ New **429** — a status this API never returned. `frontend/lib/api.ts:158-163` still only special-cases 401; a 429 currently surfaces as a thrown `Error` (not a silent no-op, but not friendly). **Frontend fix still required** — see Register. |
| **1d** (partial) | `lib/auth.js`, `routes/ai.js` | `POST /api/ai/rfq` gains `optionalAuth` (was fully unauthenticated) and is under the AI limiter. Free-text prompt cap `AI_PROMPT_MAX` (4000) on `/api/ai/rfq` `need`, `/api/ai/search` `query`, `/api/assistant/chat` `message` → 400 when exceeded. OTP generator switched `Math.random()` → `crypto.randomInt` (CSPRNG); the in-memory OTP `Map` is now swept of expired entries on every read/write so it can't grow unbounded. | ✅ none — `/api/ai/rfq` stays public (guests still get a draft); the cap only rejects abuse-sized input. |
| **1e** (partial) | `lib/pg-store.js`, `lib/store.js`, `index.js`, `app.js`, `middleware/errorHandler.js` | PG `Pool`: `statement_timeout` 10s, `connectionTimeoutMillis` 5s, `idleTimeoutMillis` 30s, opt-in `ssl` (`PG_SSL`), plus a `pool.on("error")` guard. New `store.ping()` / `store.close()` (real for PG, no-ops for the file-DB). `GET /health` runs `SELECT 1` → 200 `{status:"ok",db:"up"}` or 503 `{error:"db_unavailable"}`. `index.js` handles `SIGTERM`/`SIGINT` → `server.close()` → `io.close()` → `store.close()` → exit, with a 10s hard cap. `errorHandler` now logs `err.stack`. | ✅ none — `/` unchanged; `/health` is additive. **pino + `req.id` + access log deferred** (see below). |
| **1h** | `lib/auth.js`, `routes/auth.js` | `auth.DUMMY_HASH` (a real bcrypt hash computed once at load). `POST /api/auth/login` always runs one `bcrypt.compare` — against the real hash or the dummy — so a non-existent email costs the same wall-clock time as a wrong password. | ✅ none. |
| **1g** (2026-08-31 15:32) | `lib/pg-store.js`, `lib/store.js`, `routes/categories.js`, `routes/brands.js`, `routes/users.js`, `CLAUDE.md` §5 | Deleted `store.getVersion` (both backends) + the file-DB `_versions` Map + its bump in `writeJson`. The 6 memo call sites (`getListingCounts`, `getBrandsList`, `getBrandDetail`, `getActiveListingCounts`, `getApprovedSellerCards`, `getFeaturedSellerCards`) now call their `compute*` directly; the 4 module-level cache `Map`/`let` vars (2 in `brands.js`, 2 in `users.js`, 1 in `categories.js`) are gone. Under Postgres `getVersion()` returned `Date.now()`, so every check was already an unconditional recompute — behaviour is byte-identical, the dead caches (which under Postgres only ever grew, never hit) are removed. Removed the memoization recommendation from CLAUDE.md §5. | ✅ none — pure deletion; responses unchanged. |

### Deferred (not done this pass) — with reason

| Item | Why deferred | Follow-up |
|---|---|---|
| **1d** — OTP store + AI-budget limiter into Postgres tables (C3) | Needs a numbered schema migration + a store surface for both; multi-process durability isn't yet in play (single `node index.js`). The security-relevant parts (CSPRNG, sweep, `/rfq` auth, prompt cap, rate limit) are done. | Add `otp_codes` + `ai_budget` tables when a second process / horizontal scale is on the table. |
| **1e** — pino structured logger + `req.id` + access log | Observability, not a hole. Larger diff (touches every `console.*` path). The load-bearing part of 1e (pool timeouts, graceful shutdown, `/health`) is done. | Do alongside Phase 2's `_shared` kernel. |
| **1f** — shared `pagination.js` + `/api/listings` limit cap | This is really a Phase 2 kernel artifact; near-zero security value. `GET /api/listings` still has no cap. | Ship in Phase 2 (`modules/_shared/pagination.js`); pick the cap after grepping `getListings` call sites. |
| **1i** — `git rm --cached backend/DB/users.json` + `.gitignore` + **credential rotation** | The mechanical part is trivial, but the important half — rotating the 38 bcrypt-hashed accounts + the admin credential — is an owner action, and un-tracking a file that the file-DB fallback still reads deserves an explicit owner call. | Owner: rotate creds, then `git rm --cached`, `.gitignore backend/DB/users.json`. History rewrite is a separate decision. |
| **1a** — `routes/admin.js` raw-spread writes (`:412/421/440/449/616/690`) | Admin-gated (lower risk than the seller-reachable listings/jobs PUT, which are fixed). | Fold into Phase 6 (identity/admin module) or a standalone admin-hardening commit. |
| **1b** — DB `CHECK (buyer_id <> target_user_id)` on reviews | Needs a numbered migration. The application-layer 403 is in place. | Add the constraint in Phase 5 (reviews → schema). |

### Test results — 2026-08-31 15:14 IST (re-run 15:32 after 1g)

`cd backend && npm test` → **29 pass, 0 fail** (20 pre-existing + 9 new). `cd frontend && npx tsc --noEmit` → **clean (exit 0)**. After 1g: same **29 pass / 0 fail**; live smoke of the memo-touched endpoints (`/api/categories`, `/api/brands`, `/api/brands/:slug`, `/api/sellers`, `/api/sellers/featured`) all return their prior status codes.

New tests (`test/phase1-security.test.js`):

| Test | Asserts |
|---|---|
| `GET /health reports db up` | 200, `data.status === "ok"` |
| `GET / keeps its legacy shape` | 200, `data.version === 2` — contract unchanged |
| `POST /api/reviews — cannot review yourself` | 403 |
| `POST /api/reviews — target must exist` | 404 for `usr_000000` |
| `PUT /api/listings/:id — privileged fields are ignored` | PUT with `isFeatured/isSponsored/rankBoostScore/manualPinRank/isVerifiedSeller/rating/reviewCount/verification` → 200, but re-GET shows every one unchanged; the allowed `title` did update |
| `PUT /api/jobs/:id — employerId and unknown fields are ignored` | `employerId`, `viewCount`, `applicationCount`, `someBogusField` all rejected; `title` updated |
| `POST /api/auth/send-otp — 429 after RL_AUTH_MAX` | 4th call in the window → 429, `body.code === "rate_limited"` |
| `POST /api/ai/rfq — works for a guest` | 200 without a token — never crashes |
| `POST /api/ai/rfq — rejects an over-long prompt` | 5000-char `need` → 400 |

Live smoke (`node index.js`, curl):

- `GET /` → unchanged body. `GET /health` → `{"success":true,"data":{"status":"ok","db":"up"}}`.
- Response headers now include `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control: off`, `RateLimit-*`; `X-Powered-By` is gone.
- `POST /api/auth/send-otp` ×12 with a fixed mobile → `200 ×10, 429 ×2` (matches `RL_AUTH_MAX` default 10).
- `POST /api/ai/rfq` as guest → 200 draft; 5000-char `need` → 400.
- `GET /api/listings?limit=3`, `GET /api/categories` → still 200 (unaffected).
- `SIGTERM` → process drains and exits cleanly (no hang, no error).

### Dependencies added

`backend/package.json`: `helmet ^8.3.0`, `express-rate-limit ^8.7.0` (deps); `supertest ^7.2.2` (devDep). `package-lock.json` updated. No frontend dependency change.

### New environment variables (all optional, safe defaults)

`RATE_LIMIT_ENABLED` (default on), `RL_GLOBAL_MAX` (1000), `RL_AUTH_MAX` (10), `RL_AI_MAX` (30), `AI_PROMPT_MAX` (4000), `PG_STATEMENT_TIMEOUT_MS` (10000), `PG_CONNECT_TIMEOUT_MS` (5000), `PG_IDLE_TIMEOUT_MS` (30000), `PG_SSL` (false). Add the rate-limit + `PG_SSL` lines to `backend/.env.example`.

### Known limitations of this pass

- Tests run against whatever `PG_URL` points at (no dedicated `PG_URL_TEST` yet — Phase 0 item). New rows are best-effort cleaned in `test.after`, but the users created by `register()` accumulate. Stand up `PG_URL_TEST` with a pinned seed before this suite grows.
- The listing-create test path invokes the local `claude` CLI for verification (~8s per run). Acceptable now; consider stubbing `verifyListing` in test mode if the suite slows further.

---

### Phase 2 — Shared kernel
**Small · Contract impact: ✅ none — no route touched**

```
backend/modules/_shared/
  pool.js            # THE pg Pool, moved out of lib/pg-store.js:18
  repository.js      # createRepository({pool, mapping})
  queryBuilder.js    # criteria object -> SQL WHERE/ORDER/LIMIT
  pagination.js      # (already shipped in 1f)
  envelope.js        # ok(res,data) / okPaged(res,{items,total,page,totalPages})
  errors.js          # AppError/NotFound/Forbidden/Conflict -> errorHandler
  crudRouter.js      # factory for thin admin-taxonomy routers
  mappings/flat.mappings.js   # buildFlatConfigs moved from lib/db/flat.js:105-415
```

**The repository interface** — replaces the predicate with a *closed criteria grammar*. Criteria are data, so they compile to SQL; predicates are code, so they can't:

```js
createRepository({ pool, mapping }) → {
  findById, findOne, findMany,      // { where, orderBy, limit, offset }
  count, page,                       // page() = items + total in ONE round trip, count(*) OVER()
  insert, updateById, updateWhere,
  incrementById,                     // atomic SET view_count = view_count + 1  → fixes C2
  deleteById, withTx,
}
```

`where` operators: `eq ne in notIn gt gte lt lte ilike contains isNull` plus `_or`. Anything the grammar can't express gets a **named repository method owning handwritten SQL** — never SQL in a service or router.

**Four mechanisms keep the two layers from diverging:**

1. **One mapping source.** `flat.mappings.js` is *imported* by both `FlatCollectionStore` and `createRepository` — not copied.
2. **One translation layer.** Both engines return documents through `rowToDoc`/`nestedFromRow` (`lib/db/util.js:51-58, 122-131`). Mandatory even for handwritten SQL — so `searchPublic` selects `j.*`, not a projection. Skipping this leaks `Date` objects and numeric-as-string into JSON responses. **This is the #1 silent-divergence bug in this migration** and it is invisible to a smoke test.
3. **One pool.** Single place for timeouts and drain.
4. **No cache in either layer.** Stale-cache divergence is what kills these migrations.

**Collection-level atomic graduation:** once a collection has a repository, every *writer* of it uses the repository. Reads may straddle briefly — reads can't diverge, only writes can.

**Keeping new code off the old interface** (all four, cheapest first): the architecture test from Phase 0; a deprecation header on `lib/store.js` + one line in CLAUDE.md §5 ("`store.js` is legacy and closed to new collections"); dev-mode call-site logging in `store.findOne/findMany` giving a live burn-down inventory; and `getVersion` already deleted in 1g.

**Gate:** goldens green. **The differential test** (per collection: `repo.findMany({where:{}})` `deepEqual` `store.all(coll)`; `repo.findMany({where:X})` `deepEqual` `store.findMany(coll, predicateFor(X))`; `repo.findById(id)` `deepEqual` `store.getById(coll,id)`). This is the single most important assertion in the migration — it makes divergence structurally impossible rather than merely discouraged. It is the last test you delete, when `store.js` dies.
**Rollback:** additive plus two import redirections.

---

### Phase 3 — Identity read-port only
**Medium · Contract impact: ✅ none — `routes/users.js` is not touched**

`modules/identity/index.js` publishes narrow, purpose-named readers — never the raw user document:

```js
getAuthUser(id)
getEmployerCard(userId) / getEmployerCards(userIds)     // BATCH mandatory — CLAUDE.md §5
getCandidateCard(id)    / getCandidateCards(ids)
getSellerCard(id)       / getSellerCards(ids)
setEmployerApproval(userId, status, actorId)            // the ONLY write path
```

`employerMiniOf` (`lib/jobSearch.js:39-51`) is already exactly this shape — it *becomes* `identity.getEmployerCard` and is deleted from recruitment.

Plus a schema migration creating **identity-owned views** — `identity_employer_cards`, `identity_candidate_cards`, `identity_seller_cards`. Other modules may join these views; they may never join `users` or `*_profiles` directly. Needed because the "approved employer" gate must be a `JOIN`, not a post-filter, or you are back to loading every user. The coupling is real but named, greppable, and single-point — and the architecture test asserts it.

Then repoint `middleware/authGuard.js:21` at `identity.getAuthUser(id)`.

> **⚠️ The trap.** Routes read arbitrary fields off `req.user` — `employerProfile` (`routes/jobs.js:212`), `sellerProfile`, `recruitmentRole` (`jobs.js:205`), `roles`, `status`. So `getAuthUser` must **initially return the full hydrated document**, byte-identical to `store.getById("users.json", id)`. Narrowing its projection is a separate, later step with its own audit. Slimming it here breaks a scattered subset of routes silently.

**Gate:** goldens unchanged; `routes/users.js` still on `store.js` and untouched; auth-path latency measured before/after.
**Rollback:** revert one import line in `authGuard.js`.

---

### Phase 4 — Recruitment module (the template)
**Large · Contract impact: ✅ none intended — this is the phase that proves the method**

**Why recruitment goes first:** it is feature-gated off in production (`featureFlags.recruitmentLive` defaults off), so a regression in the first slice is invisible to real users — nothing else in the repo gives you that. It is also the only domain with tests (all 3 test files are recruitment); its tables are the newest and ship 11 indexes that are currently dead; its collections are pure `flat.js` mappers (no composite-mapper rewrite); and it is ~1,180 of 10,579 route lines with exactly one cross-domain dependency — `users` — which is precisely what you must solve once on a small surface before repeating it eight times.

Target shape (`modules/recruitment/`): `index.js` (the public interface — the *only* importable file) · `mount.js` · `http/*.router.js` · `service/*.js` · `repository/*.js` · `schema/*.js` · `policy.js`.

| Layer | Contains | Must not contain |
|---|---|---|
| `http/` | Router, try/catch → next(err), zod validation, envelope, status codes | any SQL, any business rule, any repository import |
| `service/` | All domain logic, gating rules, notification fan-out, cross-module port calls | `req`/`res`, HTTP status codes, raw SQL |
| `repository/` | Every SQL statement in the module. Returns documents via `rowToDoc` | domain rules, auth checks |
| `schema/` | zod `.strict()` — **the schema IS the allowlist**, structurally replacing 1a's hand-written ones | business-policy defaults |
| `policy.js` | Pure predicates: who may do what | I/O |

Six sub-phases, each its own commit and its own golden run:

- **4a — Pure move.** Skeleton; `lib/jobSearch.js` → `service/jobSearch.service.js` and `lib/recruitmentProfile.js` → `service/employerProfile.service.js`, **unchanged**. Routers just require the new path.
- **4b — Extract services.** Helpers out of `routes/jobs.js:49-118` and `applications.js` into `service/` + `policy.js`. Routers go thin. Still on `store.js`. The `module.exports._internal` test hook (`jobs.js:320`) disappears — those helpers get normal exports.
- **4c — Zod schemas** for every recruitment endpoint, wired through the **existing** `validate(schema, source)` at `lib/validate.js:11-27`. Do not invent a second validation mechanism; three already coexist.
- **4d — Repositories.** Flip services off `store.js` **one collection at a time**: `jobs` → `applications` → taxonomy. Separate commit + golden run per collection.
- **4e — `searchPublic` rewrite.** `GET /api/jobs`: **11 queries + 2 full table scans → 1 query**, driven by `jobs_status_idx` / `jobs_posted_at_idx` / `jobs_job_function_idx` / `employer_profiles_status_idx`, all of which already exist and are dead. `count(*) OVER()` preserves the `{jobs,total,page,totalPages}` shape without a second round trip. Also `routes/jobs.js:179`'s view counter → `incrementById`, killing C2 for this collection.
- **4f — Mounts.** Recruitment's mounts move into `modules/recruitment/mount.js`.

> **Three behaviour-preservation traps in 4e — these generalize to every list endpoint:**
> - `significantTokens` (`jobSearch.js:94-97`) uses JS `String.includes`, which treats `%` and `_` literally. `ILIKE` does not. Escape them (`replace(/[\\%_]/g, "\\$&")`) or a user searching `100%` matches everything.
> - `Array.prototype.sort` is stable; `ORDER BY` is not. Without a `, j.id DESC` tiebreak, page 2 randomly duplicates and drops rows. Every migrated list endpoint needs a deterministic tiebreak.
> - `Date.parse(undefined) || 0` sorts missing `postedAt` to the bottom; Postgres `DESC` puts NULLs **first**. Needs `NULLS LAST`.

> **The admin-ordering constraint (CLAUDE.md §5).** `index.js:58`'s blanket `app.use("/api/admin", …)` guards everything under `/api/admin`, and recruitment's five admin sub-APIs work *only* because they are mounted above that line. Positional ordering across files will not survive modularization. Replace it with **explicit named ordering**: each module's `mount.js` exports `{path, router, phase: "admin-sub" | "public"}`, and `index.js` mounts all `admin-sub` entries, then `/api/admin`, then `public`. Add a test hitting `/api/admin/jobs` with a non-admin token asserting the 403 comes from `adminJobs.js:22`'s own `requireRole` — getting this wrong silently *opens* admin sub-APIs rather than closing them.

**Gate per sub-phase:** goldens byte-identical across all 8 recruitment route files; architecture test now asserts `"jobs.json"` appears nowhere outside `_shared/mappings`; **query-count assertion: `GET /api/jobs` issues ≤2 queries (was 11).**
**Rollback:** per-commit. 4d/4e are the only risky steps, and `RECRUITMENT_LIVE=false` means production traffic never touches them.
**Honest cost:** budget 3× what 4a-4c feel like. The extraction is easy; the behaviour-equivalence proof is not.

---

### Phase 5 — Directory module
**Very large · Highest performance payoff · Contract impact: ✅ none intended, ⚠️ highest regression risk — this is live traffic**

~3,000 route lines (`listings` 1036, `adminListings` 322, `collections` 318, `inquiries` 283, `reviews` 265, `moderation` 235, `brands` 222, `searchTrends` 174, `categories` 127) plus `lib/search.js`, `lib/ranking.js`, `lib/leads.js`, `lib/listingVerification.js`, and the second composite mapper `lib/db/listings.js`.

Sub-order — easiest and highest immediate win first:

1. **categories / brands** — read-mostly; the 1g memo deletion left these recomputing per request.
2. **reviews / inquiries** — carries the S2 fix into a schema.
3. **listings browse** — the 112-line handler. `lib/search.js` currently rebuilds the MiniSearch index roughly per request (3s TTL) and `computeFacets` makes 9 more full passes before pagination. Two spread `Math.min/max` calls over the full array (`search.js:172-173`) will stack-overflow past ~100k rows.
4. **listings write** — the 170-line bulk import and the 114-line PUT; `routes/listings.js:414` view counter → `incrementById`.
5. **admin / moderation.**

Also resolves the route→route import at `routes/listings.js:21` by replacing `resolveSellerLocations` with an `identity` port call.

**Gate:** goldens + a measured load comparison on `GET /api/listings` before/after.

---

### Phase 6 — Identity module proper
**Large · Contract impact: ✅ none intended**

`routes/users.js` (955) + `routes/auth.js` (145) + `routes/admin.js`'s user surface. Last among the big domains, precisely because everything else now talks to it through the port — its internals are finally free to move.

Includes the **`GET /api/admin/users` rewrite** (`routes/admin.js:190-266`): `summary`'s 7 counts → one `SELECT count(*) FILTER (WHERE …)` ×7; `isSeller/isEmployer/isCandidate` → `LEFT JOIN … IS NOT NULL`; `q` across `users` + 3 profile tables → `ILIKE` over joined columns; `ORDER BY u.created_at DESC, u.id DESC`. **2 queries replacing a full 10-query hydrate of every user with all 9 child tables.** Do it here, not earlier — it has ~15 branch combinations, which is exactly why Phase 0 golden-tests them.

Also: narrow `getAuthUser`'s projection (deferred from Phase 3), with its own audit of every `req.user.*` read.

**🔧 FRONTEND FIX (optional, coordinate separately):** `frontend/lib/api.ts:783` `adminUsers` and `:856` `adminAdBookings` are **dead functions whose declared types contradict the backend** (they claim `User[]`/`AdBooking[]`; the endpoints return `{items,total,page,totalPages,summary}`). Delete them. The UI already uses `adminApi.ts`'s versions.

---

### Phase 7 — Remainder + demolition
**Medium · Contract impact: ✅ none**

Monetization (`boosts`/`myAds`/`ads`/`entitlements`/`payment-records`), admin, notifications, chat, AI. Then delete `lib/store.js` + `lib/pg-store.js` when the architecture test reports zero consumers.

`routes/ai.js` (856) and `assistant.js` (970) are 1,826 lines of *orchestration over other domains* — they modularize **last**, into a thin `modules/ai/` calling only other modules' public ports, never their repositories. Their internal logic (`lib/nlp.js`, intent detection, `lib/claudeCli.js`) moves largely unchanged. Fix C8 here: return a distinguishable status or an explicit `degraded` flag when the AI path fails, rather than a 200 that looks normal.

---

## Frontend Fix Register

Grep this list at every phase boundary. Everything not listed here is contract-stable by construction.

| Phase | Backend change | Frontend file | What to do | Blocking? |
|---|---|---|---|---|
| 1a | Mass-assignment allowlists | `frontend/lib/api.ts` `updateListing`/`updateJob` call sites; `/sell`, `/post-job` forms | ✅ **DONE 2026-08-31 — audit complete, no frontend change needed.** Every field the 4 callers post is inside the allowlist (`ListingsTab.tsx`, `ListingVerificationTab.tsx`, `post-job/page.tsx`, admin/recruitment job dashboards). | Resolved |
| 1b | Self-review → 403/404 | `frontend/lib/api.ts` `postReview` caller | ⏳ **Open (non-blocking).** Backend landed 2026-08-31. `request<T>` already throws `Error(json.error)`, so callers showing `err.message` are correct today; friendly-toast polish still wanted. | No |
| 1c/1d | Rate limiting → **429** (a status this API has never returned) | `frontend/lib/api.ts:158-163` | ⏳ **Open — still required.** Backend landed 2026-08-31 (`code:"rate_limited"` in the body). Add a `429` branch beside the `401` handling; friendly retry message. Until then a 429 surfaces as a raw thrown `Error` (not a silent no-op, but not friendly). | ⚠️ Yes |
| 1f | `/api/listings` gains a `limit` cap | `getListings` call sites | Deferred to Phase 2. Grep for large `limit` values; set the cap above the largest legitimate one | No — verify first |
| 6 | — | `frontend/lib/api.ts:783`, `:856` | Delete `adminUsers` / `adminAdBookings` — dead, and their types contradict the backend | No |
| — | Normalize `GET /api/experts` to the standard envelope | `frontend/lib/api.ts:1633-1665` | Delete the duplicate raw-fetch client and route `getExperts` through `request<T>` | **Separate ticket** — see below |
| — | — | `frontend/components/admin/adminApi.ts:46-70` | Second full HTTP client, **missing the 401 session-expiry handling** at `api.ts:158-163`. Merge into `lib/api.ts` | **Separate ticket** |

**Two frontend items deliberately kept out of the phases.** `routes/experts.js:81` is the only endpoint emitting top-level `meta`, and that single anomaly forced the duplicate client at `frontend/lib/api.ts:1633-1665` (the code comment says so). The fix is worth doing — but as a coordinated frontend ticket, not inside a migration phase. Doing it there couples backend risk to frontend risk for no reason. Same for the `adminApi.ts` merge.

**Not worth changing:** the `201` vs `200` inconsistency on create endpoints (12 return 201, ~9 return 200). Normalizing it is a contract change that buys nothing and risks status-code checks in the UI. Leave it.

---

## What explicitly stays as-is

- **`lib/db/users.js` and `lib/db/listings.js` composite mappers.** Correct, batched, and the fix for a real ~850ms → ~30ms N+1 (CLAUDE.md §5, WORKFLOW.md 2026-08-19). The repository sits *beside* them for query-shaped reads; the composite hydrate stays for "give me the whole document."
- **`lib/store.js`** until its last consumer is gone. No parallel-write shim, no dual-write, no sync job — collection-level atomic graduation makes all of that unnecessary.
- **Chat.** `realtime/chat.js` + `lib/db/chat.js` + the `isMessagesPath` string-routing is a genuinely different (append-only log) shape. High effort, low payoff at current volume. Last, then decide whether to touch it at all.
- **Stateless utilities** (`lib/geo.js`, `badges.js`, `trustScore.js`, `entitlements.js`, `nlp.js`, `claudeCli.js`, `uploadStorage.js`, `sellerRating.js`) — no persistence, no boundary to enforce. Modularizing them is pure churn.
- **The `{success,data}` envelope** — untouched, all ~189 handlers.
- **Postgres, no ORM** (CLAUDE.md §2). The *interface* is what's being replaced, not the engine.
- **TypeScript, DI containers, CommonJS→ESM.** Each is a separate, larger project. CommonJS + JSDoc is not what's hurting you.
- **Full service/repository triads for the 10 thin admin-taxonomy routers.** Give them the shared `_shared/crudRouter(repo, schema, {role})` factory — ~330 lines collapse to ~60. Ceremony would be worse than the disease.

## Where this typically goes wrong

- **Big-banging the mounts.** `index.js`'s 44 lines encode a security-relevant ordering. Change it exactly once, in 4f, with the non-admin-token test.
- **Chasing the module boundary before the seam.** Moving 43 files into `modules/` up front *looks* like progress and reduces zero risk. Hold the order.
- **The `.slice()` → `LIMIT` gap** — stable-sort loss, `ILIKE` wildcard injection, `NULLS FIRST`. Invisible to a smoke test; caught only by golden fixtures with the page-disjointness assertion.
- **Type drift on handwritten SQL** — any read bypassing `rowToDoc` leaks `Date` objects and numeric strings into JSON.
- **Slimming `getAuthUser` too early** (Phase 3) — breaks a scattered subset of routes silently.

---

## Verification

Per-phase gates are stated inline above. Standing checks:

```bash
# Types (frontend must stay clean throughout)
cd frontend && npx tsc --noEmit

# Backend tests — goldens, differential, architecture
cd backend && npm test

# Backend smoke (restart first — no hot reload)
curl -s http://localhost:4000/api/config
curl -s "http://localhost:4000/api/jobs?limit=12"
curl -s http://localhost:4000/health          # after 1e — must fail when PG is down

# Pages still compile
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/directory
```

**Two standing assertions that keep the goals true a year from now:**

- **Query count.** Wrap the shared pool in test mode with a counter; assert `GET /api/jobs` ≤2 queries and (post-Phase-6) `GET /api/admin/users` ≤2. Without this, someone adds an innocent-looking `store.all()` and you are back to 11 queries with every test green.
- **Security regressions from Phase 1, kept permanently:** mass-assignment attempt, self-review, rate-limit trip, unauthenticated `/api/ai/rfq`.

## Cost summary

Effort is stated in relative size, not calendar time — the work is done by an AI agent, so the binding constraint is **review and verification bandwidth**, not typing speed.

| Phase | Effort | Risk | Value | Contract |
|---|---|---|---|---|
| 0 Safety net | small | none | prerequisite | ✅ |
| 1 Security + cross-cutting | **small** | low | **highest** | 🔧 3 fixes — **partially landed 2026-08-31** (1a/1b/1c/1e-core/1g/1h + 1d-partial done & tested; 1d-full/1e-pino/1f/1i/1a-admin deferred — see Phase 1 Implementation log) |
| 2 Shared kernel | small | low | prerequisite | ✅ |
| 3 Identity read-port | medium | medium (auth path) | high | ✅ |
| 4 Recruitment | large | low (gated off) | template | ✅ |
| 5 Directory | very large | high (live traffic) | highest perf | ✅ |
| 6 Identity module | large | high | high | 🔧 1 cleanup |
| 7 Remainder + demolition | medium | low | closure | ✅ |

### Fitting this into a 2-day agent budget

**Achievable in 2 days: Phases 0 → 4.** That is the safety net, every security fix, the repository seam, the identity read-port, and the full recruitment module as the proven template. Suggested split:

- **Day 1 — Phases 0, 1, 2.** Phase 1 alone is most of the near-term value and depends on none of the restructure. Ending day 1 here is a complete, shippable outcome even if day 2 never happens.
- **Day 2 — Phases 3, 4.** Recruitment is gated off in production (`RECRUITMENT_LIVE=false`), so this is the one large phase that can move fast without live-traffic risk.

**Not achievable in 2 days: Phases 5, 6, 7.** Phase 5 alone is ~3,000 route lines against live Directory traffic, including the `lib/search.js` rebuild and the 170-line bulk-import path. Compressing it into the same window means shipping the `.slice()` → `LIMIT` rewrites without golden coverage — which is exactly the failure mode listed under *Where this typically goes wrong*. Treat 5-7 as follow-on work; the template built in Phase 4 is what makes them mechanical when you get to them.

**The real rate limit is the gates, not the code.** Each phase's gate — golden diffs, the differential repository test, the query-count assertion — needs a human to look at it. An agent can produce Phase 4 in an afternoon and still be wrong in a way only the goldens reveal. Budget the review, not the writing.
