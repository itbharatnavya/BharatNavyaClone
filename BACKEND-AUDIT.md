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

**Last worked: 2026-09-01 (IST). Branch: `feature/backend-phase1` (off `feature/ui-phase`; `design` branch merged in — see [Branching & UI integration](#branching--ui-integration-multi-dev) below).**

**Phase 7 sweep-3 landed 2026-09-02.** HEAD is the sweep-3 docs commit (code precedes it). Suite green (**117 pass / 0 fail**), `tsc --noEmit` clean, working tree clean, all pushed. **Resume point:** the **7-social** cluster (`follow`/`shortlist`/`stories`/`collections`/`blogs`/`categorySuggestions` — flat collections, lowest risk); `routes/referral.js` stays held for the monetization cluster (needs a concurrency design call). See **Next task** at the end of this section for the exact next unit and the sweep cadence to repeat.

| Phase | State |
|---|---|
| **0 — Safety net** | **Landed (2026-09-01).** `app.js` split (done earlier). `PG_URL_TEST` wiring + `scripts/setup-test-db.js` (`npm run test:setup` — clones the dev DB into a frozen `bharatsource_test`). `test/architecture.test.js` (5 boundary assertions, load-bearing from the first `modules/` commit). `test/golden.test.js` + `test/golden/` (37 fixtures: public Directory reads, public Recruitment reads, `GET /api/admin/users` × 17 branches). `test/pagination.test.js` (page 0 / past-last / limit 0 / limit 9999 / page-disjointness across `/api/jobs`, `/api/listings`, `/api/admin/users`). Suite is now serial (`--test-concurrency=1`) for determinism. **Follow-ups (not blockers):** version-controlled pinned seed (today it clones dev); golden coverage of authed recruitment endpoints (`/api/applications*`, `/api/admin/jobs`, `/api/admin/employers`). See [Phase 0 — Implementation log](#phase-0--implementation-log). |
| **1 — Security + cross-cutting** | **Landed & committed:** 1a (mass-assign allowlists), 1b (self-review 403/404), 1c (helmet + rate limiting → 429), 1d-partial (CSPRNG OTP, sweep, `/ai/rfq` auth, prompt cap), 1e-core (PG pool timeouts, graceful shutdown, `/health`), 1g (dead memoization deleted), 1h (login timing fix). See [Phase 1 — Implementation log](#phase-1--implementation-log) for the full table + test results. |
| **2 — Shared kernel** | **Landed (2026-09-01).** `backend/modules/_shared/`: `pool.js` (THE pool, moved from `pg-store.js` — one pool now), `repository.js` (`createRepository` — the criteria-grammar seam replacing JS predicates; `findById/findOne/findMany/count/page/insert/updateById/updateWhere/incrementById/deleteById/withTx`), `queryBuilder.js` (`eq ne in notIn gt gte lt lte ilike contains isNull` + `_or`; `orderBy` with `NULLS LAST` + `id` tiebreak), `mappings/flat.mappings.js` (one mapping source), `pagination.js` (deferred **1f** helper — not yet wired), `envelope.js`, `errors.js` (+ `errorHandler` passthrough), `crudRouter.js` (factory, not yet wired), `index.js`. `test/differential.test.js` = the Phase 2 gate (repo `deepEqual` legacy store across 6 flat collections + a key→column rename + `page()` + atomic `incrementById`). **No route touched.** See [Phase 2 — Implementation log](#phase-2--implementation-log). |
| **3 — Identity read-port** | **Landed (2026-09-01).** `modules/identity/index.js`: `getAuthUser(id)` (full hydrated user doc, byte-identical to `store.getById` — proven by `test/identity.test.js`), `get{Employer,Seller,Candidate}Card(s)` (narrow, contact-free, batched), `setEmployerApproval` (defined, not wired). `middleware/authGuard.js` loads `req.user` through it — no longer imports `lib/store`. Circular-dep (`authGuard→identity→_shared barrel→crudRouter→authGuard`) fixed: identity imports `_shared/pool` leaf directly; arch test exempts `_shared` from the deep-import rule (it's the kernel). **`routes/users.js` untouched.** See [Phase 3 — Implementation log](#phase-3--implementation-log). |
| **4 — Recruitment module** | **✅ COMPLETE 2026-09-01 (HEAD `2aa9589`).** `modules/recruitment/` owns: profile-gap helpers (4a), job + application service/policy helpers (4b — `routes/jobs.js`/`applications.js` thin glue), `PUT /api/jobs` allowlist as a zod `.strip()` schema (4c), **repositories for `jobs` / `applications` / taxonomy** (4d — C2 closed for recruitment; taxonomy enforced-graduated), the **`GET /api/jobs` browse rewrite** (4e — `lib/jobSearch.js` deleted → `service/jobSearch.service.js` + `repository/jobSearch.repository.js`; one SQL JOIN on the new `identity_employer_cards` view, **11 queries → 1**, proven by `test/jobs.querycount.test.js`), and **explicit mount ordering** (4f — `modules/recruitment/mount.js` + `mountRecruitment(app, phase)`; `app.js`'s positional admin-before-`/api/admin` lines replaced; `test/recruitment.mount.test.js` proves `/api/admin/jobs` stays admin-gated by its own `requireRole`). 98 pass, all goldens byte-identical throughout. |
| **5 — Directory module** | **5a–5f + loose-end landed 2026-09-01 (HEAD `e24922e`).** `modules/directory/` created. **5a:** `GET /api/categories`/`:slug` counts via `directory.listingCountsByCategory()` (`GROUP BY`, lateral `UNION` dedupe = old JS `Set`). **5b:** `reviews.json` writers → `directory.reviewsRepo`; migration `0014` `CHECK (buyer_id <> target_user_id)`; `reviews-for-seller` golden. **5c-1:** `GET /api/listings` browse off `store.all("users.json")` (×2) → `identity.getApprovedSellerIds`/`getSellerBrowseCards`/`getSellerPriorityTiers`. **5d:** `GET /api/listings/:id` view counter → atomic `directory.bumpListingViews` (**C2 closed for Directory**); `resolveSellerLocations` → `lib/sellerLocations.js`. **5e:** `adminListings`/`moderation` queue lookups off `store.all("users.json")` → `identity.getSellerCompanyNames`/`getAccountCards`. **5f:** `brands.js` off `store.all("listings.json")`/`store.all("users.json")` → `directory.activeBrandedListingsLean()` (one indexed JOIN) + `getSellerBrowseCards`; `brand-detail` golden. **5-loose:** `reviews.js` `/recent` + `/recruitment-recent` homepage feeds off `store.all("users.json")`/`("listings.json")` → `identity.getReviewFeedParties` + `directory.firstListingImageBySeller` (both id-scoped); `reviews-recent` / `reviews-recruitment-recent` goldens. 108 pass, goldens byte-identical throughout. **Remaining: 5c-2** (search/facets SQL — **blocked, needs owner call**: MiniSearch fuzzy `?q=` can't be byte-identical); loose end `inquiries.js` (`resolveTargets` fan-out + `leads-ledger`) still on `store`; composite listing *document* writes (bulk import, 114-line PUT) stay on `store` by design. |
| **6 — Identity module** | **✅ COMPLETE 2026-09-01 (HEAD `bc7a431`).** 6a + 6a-sec + 6b + 6c + 6d all landed; 114 pass, goldens byte-identical throughout. Every `store.all("users.json")` / `store.findOne`/`findMany` predicate scan in `routes/admin.js` (users surface), `routes/users.js` (public seller/employer surface) and `routes/auth.js` is now an indexed `identity` read; the admin write surface is allowlisted; `req.user` no longer carries `passwordHash`. **Deferred to Phase 7:** `GET /api/me/listings` + `/me/analytics` (authed seller dashboard, `req.user`-scoped). **6a:** `GET /api/admin/users` off `store.all("users.json")` (composite hydrate of every user + JS scope/type/status/planTier/featured/q pipeline + 7 summary counts + createdAt sort + page slice) → `identity.adminUserPage(params)` = 2 indexed statements (scope + `count(*) FILTER` ×7 summary; filtered page ids + filtered total, `LEFT JOIN <child>.user_id IS [NOT] NULL` hat tests, `sp/ep.status` by scope, `COALESCE(NULLIF(plan_tier,''),'free')`, ILIKE-escaped `q`, `ORDER BY created_at DESC NULLS LAST, id ASC`). `lib/db/users.js` gains `hydrateManyByIds(ids)` — `all()`'s 10-query batch hydrate scoped to a known id set, in order; the route hydrates only the ≤`limit` page ids, then maps with its own `adminUserRow`. All 17 `admin-users-*` goldens byte-identical; new `admin-users.querycount.test.js`. **6a-sec (1a-admin):** `routes/admin.js` `{...req.body}` spreads into `store.insert/update` for `POST|PUT /plans`, `POST|PUT /ad-slots`, `PUT /payments/:id` → a local `pick(body, keys)` + `PLAN_FIELDS`/`AD_SLOT_FIELDS`/`PAYMENT_FIELDS` allowlists (mapped columns − id − timestamps). `test/admin-write-allowlist.test.js` (injected id/createdAt/unknown keys dropped, legit fields round-trip, rows cleaned in `t.after`). **6b (`753831d` + `c6a8ae9`):** the whole `routes/users.js` public seller/employer surface off `store.all("users.json")`/`store.findOne`/`store.findMany` scans — `:slug` lookups → indexed `identity.get{Seller,Employer}BySlug`; `/sellers` + `/sellers/featured` → `getApprovedSellerIds` (user_id-ASC) + `hydrateUsersByIds` + `directory.activeListingCountsBySeller` GROUP BY; `:slug` listings/jobs → `directory.activeListingIdsForSeller` / `recruitment.jobsRepo`; slug-uniqueness → indexed probes. Goldens byte-identical; `/sellers` (no golden) proven identical old-vs-new. The `sellerProfile` write allowlist was already Phase-1a done. 112 pass. **Left for Phase 7:** `GET /api/me/listings` + `/me/analytics` (authed seller dashboard, `req.user`-scoped). **Remaining: 6c** (`routes/auth.js` + a new `auth.behavior.test.js`), **6d** (narrow `getAuthUser` projection + `req.user.*` audit). |
| **7 — Remainder + demolition** | **Sweep in progress 2026-09-02.** Owner call: do the small `store` consumers first. **7-sweep-1:** `reports`/`ads` → `repoForCollection`; `applications`/`reviews` `users.json` reads → `identity`. **7-sweep-2:** `adminEmployers` list/pending → `identity.getEmployerUserIds`+`hydrateUsersByIds`, approve/suspend → `identity.setEmployerApproval` (wired at last); `adminJobs` → `recruitment.jobsRepo` + `identity.getEmployerStatusCards` (view). **7-sweep-3:** `searchTrends.js` event reads → `directory.readSearchEvents()` (new `searchTrends.repository.js`, delegates to `lib/db/search-events`), category lookups → `repoForCollection("categories.json")`; route drops `lib/store` entirely. Goldens byte-identical throughout; old-vs-new proven for the golden-less lists/feeds; new `applications`/`recruitment-admin`/`searchTrends` querycount tests. **117 pass.** **Resume: 7-social cluster** (`follow`/`shortlist`/`stories`/`collections`/`blogs`/`categorySuggestions`); `referral.js` needs a concurrency call, take it with monetization. Then monetization cluster, `inquiries.js` fan-out, `/me/listings`+`/me/analytics`, AI → `modules/ai/` + C8, then delete `lib/store.js`+`lib/pg-store.js`. |

**Still open** (all deferred deliberately — none is an open security hole):
- **1d-full** — OTP + AI-budget → Postgres tables (needs a numbered migration; multi-process durability not yet in play).
- ~~**1e-pino**~~ — **done 2026-09-01.** `lib/logger.js` (pino — JSON in prod, pretty in dev, silent under `NODE_ENV=test`; `LOG_LEVEL` override), `middleware/requestLog.js` (`req.id` from inbound `X-Request-Id` or fresh uuid, echoed back as a response header, one access-log line per request on `finish`). `errorHandler.js` logs the same `req.id`; every runtime `console.*` (`index.js`, `lib/leads.js`, `modules/_shared/pool.js`) now goes through the logger.
- ~~**1f (wiring)**~~ — **done 2026-09-01.** `routes/jobs.js` + `routes/adminJobs.js` now call `_shared/pagination.paginationOf`; `GET /api/listings` capped at `MAX_LIMIT = 1000` (above every real caller — admin AdsTab 500, CollectionsTab 200 — so it only rejects abuse-sized `limit`; C9 closed).
- **2 (tidy)** — physically move `buildFlatConfigs` out of `lib/db/flat.js` into `_shared/mappings/flat.mappings.js` (today it re-exports). `differential.test.js` now also covers ordered/paged reads for jobs + applications; keep expanding as more collections graduate. Also still to add: the `lib/store.js` deprecation header + CLAUDE.md §5 "closed to new collections" line + dev-mode `store.findOne/findMany` call-site burn-down logging.
- **4 (tidy)** — `routes/adminJobs.js` / `routes/adminEmployers.js` still read `jobs` via `store` (`jobs.json` is not in `architecture.test.js` `GRADUATED_COLLECTIONS` — only the 3 taxonomy files are). Fold their reads onto `jobsRepo` / `identity` and add `jobs.json` + `applications.json` to `GRADUATED_COLLECTIONS` when the admin recruitment routes graduate (Phase 6, alongside the `/api/admin/*` surface).
- ~~**1a-admin**~~ — **done 2026-09-01** (Phase 6a-sec, `9bc4298`). `pick(body, keys)` + allowlists on `POST|PUT /api/admin/plans`, `POST|PUT /api/admin/ad-slots`, `PUT /api/admin/payments/:id`.
- ~~**1b-CHECK**~~ — **done 2026-09-01** (Phase 5b). `0014_add_review_self_check.sql` + the constraint in `schema.sql`'s `CREATE TABLE reviews`.
- **5 (loose end left)** — only `inquiries.js` (`resolveTargets` fan-out scan over `store.all("listings.json")` + `store.all("users.json")` + `leads-ledger` coupling — most entangled, arguably Phase 7 monetization-adjacent) still on `store`. `brands.js` (5f) and `reviews.js` `/recent`+`/recruitment-recent` (5-loose) are done.
- **1i** — **OWNER ACTION:** rotate every credential in `backend/DB/users.json` (38 bcrypt hashes + admin), then `git rm --cached backend/DB/users.json` + `.gitignore` it.

**To resume (new session or same):**

1. `cd backend && npm run test:setup` — rebuilds `bharatsource_test` by cloning the dev DB. **Stop `node index.js` first** (`CREATE DATABASE … TEMPLATE` needs zero open connections to the source). Unset `PG_URL_TEST` → the suite falls back to `PG_URL` like before. If the dev DB is behind, `npm run migrate-schema` first (Phase 4e added `0013`, Phase 5b added `0014`).
2. `npm test` → expect **117 pass, 0 fail**. `cd frontend && npx tsc --noEmit` → clean (no frontend change landed across Phases 0–7 so far; Frontend Fix Register rows 1a/1f/2/3/1e/4a–4f/5a–5f + 5-loose + 6a–6d + 7-sweep-1/2/3 all Resolved, only the pre-existing **429 handler** in `frontend/lib/api.ts:158-163` is still open).
3. Working tree is clean on `feature/backend-phase1`, everything pushed. The only untracked/modified files (`.gitignore`, `WEB-REDESIGN.md`) predate this work — leave them.

**Next task: continue the Phase 7 sweep.** Phases 0–6 landed; Phase 7 sweep-1 (`reports`/`ads`/`applications`/`reviews`) + sweep-2 (`adminEmployers`/`adminJobs`) + sweep-3 (`searchTrends`) done.

- **Resume at the 7-social cluster** — `routes/follow.js` (10), `routes/shortlist.js` (8), `routes/stories.js` (12), `routes/collections.js` (10), `routes/blogs.js` (10), `routes/categorySuggestions.js` (13). All flat collections, no live-money paths, lowest regression risk. Each: swap `store.all`/`findOne`/`findMany` scans → `repoForCollection(...)` criteria reads (or an `identity`/`directory` port where a `users.json`/`listings.json` scan is involved), equivalence-check, one querycount test, one code + one docs commit.
- **`routes/referral.js` — NOT a plain sweep; needs a concurrency design call first.** Uses `store.withLock`/`readJson`/`writeJson` on `referrals.json` (in-process promise-chain mutex) for genuine semantics: `ensureRow` double-insert guard + credit-increment race. Two options — (a) a UNIQUE-constraint migration on the referral row + atomic `UPDATE ... SET credits = credits + $1`, or (b) `repoForCollection(...).withTx`. Take it **with the monetization cluster**, not the small-files sweep.
- **Then, in order:** 7-social (`follow`/`shortlist`/`stories`/`collections`/`blogs`/`categorySuggestions` — flat collections, lowest regression risk, no live-money paths) → 7-monetization (`boosts`/`myAds`/`entitlements`/`adminInquiries` + `routes/admin.js` money surface + `referral.js`) → 7-inquiries (`inquiries.js` `resolveTargets` fan-out — most entangled) → 7-me-dashboard (`GET /api/me/listings` + `/me/analytics`, deferred from Phase 6) → 7-ai (`routes/ai.js` + `assistant.js` → thin `modules/ai/` over the other ports; fix C8 degraded-status flag — LAST) → 7-demolition (delete `lib/store.js` + `lib/pg-store.js` once `architecture.test.js` reports zero `store` consumers in `routes/`).
- **5c-2 stays owner-blocked** (MiniSearch fuzzy `?q=` can't be byte-identical). Full plan: [Phase 7 — Implementation log](#phase-7--implementation-log).

**Sweep cadence (repeat per sub-phase):** old-vs-new equivalence first (a scratch `.cjs` that reconstructs the old logic and diffs `JSON.stringify` via supertest) for any golden-less endpoint; keep every golden byte-identical (contract-neutral — regenerate only with `npm run goldens:update` if a change is genuinely additive); add one `*.querycount.test.js` proving the scan is gone; write-path tests that `insert` into the frozen test DB **must** clean up in `t.after` via `store.remove`; `npm test` (~140s serial) + `cd frontend && npx tsc --noEmit` both clean; **one code commit + one docs commit** (`refactor(backend): Phase 7 <name> — …` / `docs: Phase 7 <name> landed …`); `git push` after each; update this section + the [Phase 7 — Implementation log](#phase-7--implementation-log) row + the Frontend Fix Register row.
- **Phase 7 — Remainder + demolition.** Monetization (`boosts`/`myAds`/`ads`/`entitlements`/`payment-records`), admin, notifications, chat, AI (`routes/ai.js` + `assistant.js` → a thin `modules/ai/` over other modules' ports). Then delete `lib/store.js` + `lib/pg-store.js` once the architecture test reports zero consumers. Fold in: `inquiries.js` `resolveTargets` fan-out, the `/me/listings` + `/me/analytics` seller-dashboard scans, C8 (AI degraded-status flag). See the [Phase 7 section](#phase-7--remainder--demolition).
- **5c-2 — search/facets SQL — BLOCKED, needs an owner call.** `lib/search.js` `store.all("listings.json")` + MiniSearch BM25. No-query + facet paths SQL-ify byte-identically; the `?q=` fuzzy path cannot. Options in the [Phase 5 — Implementation log](#phase-5--implementation-log) "5c-2" row. The `search.js:172-173` spread-arg stack-overflow (`Math.min(...times)`) is worth fixing on its own regardless.
- **Phase 5 loose end left:** `inquiries.js` — `resolveTargets` fan-out scan over `store.all("listings.json")` + `store.all("users.json")` + `leads-ledger` coupling (most entangled; arguably fold into Phase 7 monetization).

**New schema across Phases 0–5b:** `0013_add_identity_employer_cards.sql` (VIEW `users JOIN employer_profiles`, Phase 4e) and `0014_add_review_self_check.sql` (`CHECK (buyer_id <> target_user_id)` on `reviews`, Phase 5b). Both mirrored into `schema.sql`; run `npm run migrate-schema` on any DB that predates them.

**New env vars added this pass** (all optional, safe defaults — see `backend/.env.example`): `PG_URL_TEST` (dedicated `npm test` database; unset → tests fall back to `PG_URL` as before). Earlier Phase 1 pass added: `RATE_LIMIT_ENABLED`, `RL_GLOBAL_MAX`, `RL_AUTH_MAX`, `RL_AI_MAX`, `AI_PROMPT_MAX`, `PG_STATEMENT_TIMEOUT_MS`, `PG_CONNECT_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_SSL`.

**New deps:** `helmet`, `express-rate-limit`, `pino` (prod), `supertest`, `pino-pretty` (dev).

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

### Phase 0 — Safety net  ✅ LANDED 2026-09-01
**Small · Contract impact: ✅ none — no runtime code changes** · full detail: [Phase 0 — Implementation log](#phase-0--implementation-log)

- ✅ Split `app` from `server.listen` so supertest can mount the app (`backend/app.js`).
- ✅ Golden-response harness: `supertest` + `test/golden/` fixtures via `test/golden/_harness.js` (sorts object keys, preserves array order, normalizes timestamps/tokens/runtime counters). 37 fixtures: public Directory reads (config, features, entitlements, categories + detail, brands, collections, listings browse + page 2 + detail, featured sellers, seller detail), public Recruitment reads (job-functions, job-roles, skills, jobs browse + page 2 + function filter, job detail, employer detail), and **`GET /api/admin/users` × 17 branches** (scope/type/status/planTier/featured/q/paging — `routes/admin.js:190-266`, impossible to reconstruct after the Phase 6 rewrite). Regenerate deliberately with `npm run goldens:update`. *Follow-up: authed recruitment endpoints (`/api/applications*`, `/api/admin/jobs`, `/api/admin/employers`) not yet covered.*
- ✅ **Pagination edge cases** (`test/pagination.test.js`) across `/api/jobs`, `/api/listings`, `/api/admin/users`: page 0 / negative → clamp to 1; page past last → empty + envelope intact; `limit=0` → sane default; `limit=9999` → capped (jobs 50, admin 100; listings uncapped — C9, asserted as-is so a future cap is a deliberate change); **page-1 ∩ page-2 = ∅** disjointness assertion.
- ✅ `test/architecture.test.js` — 5 assertions: no `modules/` file requires `lib/store`/`lib/pg-store`; no cross-module deep imports (only `modules/x` / `modules/x/index.js` importable); `GRADUATED_COLLECTIONS` names absent from `routes/`; no module references another module's physical tables (via a future `schema/tables.js` manifest); harness-is-wired self-check. Vacuously green until `modules/` exists — **load-bearing from the first Phase 4 commit**.
- ✅ Dedicated `PG_URL_TEST` database — `lib/config.js` prefers `PG_URL_TEST` when `NODE_ENV=test` (set by `test/_env.js`); `scripts/setup-test-db.js` (`npm run test:setup`) drops + rebuilds `bharatsource_test`. Default mode clones the dev DB (`CREATE DATABASE … TEMPLATE`) — a frozen copy, not dev data that drifts under the suite; `--fresh` mode applies `schema.sql` + all `schema-migrations/` with no data. *Follow-up: a version-controlled pinned-fixture seed to replace the dev-clone.*
- Suite made **serial** (`--test-concurrency=1`) so a mutating test (e.g. the Phase 1 listing-PUT test) can never race a golden capture.

**Gate:** `npm run test:setup && npm test` green (**76 pass**); a deliberate boundary violation makes `architecture.test.js` fail; a deliberate response-shape change makes a golden fail until `goldens:update` is run.
**Rollback:** purely additive — new test files + scripts + one `PG_URL` fallback clause in `config.js`.

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

## Phase 0 — Implementation log

**Status: landed 2026-09-01 (IST). Contract impact: none (test/infra only).**

### New files

| File | Purpose |
|---|---|
| `backend/test/_env.js` | Loaded via `node --test --require ./test/_env.js`. Sets `NODE_ENV=test` before `lib/config.js` is first required, so `config.PG_URL` resolves to `PG_URL_TEST`. Also defaults `RATE_LIMIT_ENABLED=false` for the suite (`phase1-security.test.js` re-enables it with tiny ceilings in its own process). |
| `backend/scripts/setup-test-db.js` | `npm run test:setup`. Default `--template`: `DROP DATABASE IF EXISTS bharatsource_test WITH (FORCE)` then `CREATE DATABASE … TEMPLATE bharatsource` — an exact frozen copy of the dev DB (needs no open connections to the source; errors clearly if the backend is still running). `--fresh`: empty DB with `schema.sql` + every `lib/db/schema-migrations/*.sql` applied and recorded, no data. Refuses if `PG_URL` and `PG_URL_TEST` name the same database. |
| `backend/scripts/update-goldens.js` | `npm run goldens:update`. Cross-platform wrapper (no inline `VAR=1`, no `cross-env` dep) that re-runs `test/golden.test.js` with `UPDATE_GOLDENS=1`. |
| `backend/test/golden/_harness.js` | `golden(t, name, buildReq)` — supertest call → normalize → compare/write `test/golden/<name>.json`. Normalizer: sort object keys (key order isn't a JSON contract), **preserve array order** (it IS the contract — catches nondeterministic `ORDER BY`), map timestamp/token keys → `"<volatile>"`, ISO-8601 strings → `"<timestamp>"`, runtime counters (`views`/`viewCount`/`applicationCount`/…) → `0`. |
| `backend/test/golden.test.js` | The manifest: mints admin/employer/candidate/seller tokens locally with `auth.signToken` against seed-stable ids (`usr_admin`, `usr_emp4`, `usr_000026`, `usr_s007` — no password, `authGuard` re-loads the row), then 37 `golden(...)` calls. |
| `backend/test/golden/*.json` | 37 committed fixtures. Byte-identical across every non-security phase, after normalization. |
| `backend/test/pagination.test.js` | Edge-case matrix (page 0 / negative / past-last, `limit=0`, `limit=9999`, page-disjointness) over `/api/jobs`, `/api/listings`, `/api/admin/users`. |
| `backend/test/architecture.test.js` | Module-boundary guardrails (see Phase 0 list above). Green while `backend/modules/` is absent — that's the intended state; the self-check test proves the file is actually running. |

### Modified

| File | Change | Contract |
|---|---|---|
| `backend/lib/config.js` | `PG_URL` now resolves `PG_URL_TEST` / `DATABASE_URL_TEST` first **when `NODE_ENV==="test"`**, else the existing `PG_URL` / `DATABASE_URL`. Unset `PG_URL_TEST` → identical to before. | ✅ none — dev/prod boot unchanged; only the test env sees a new value. |
| `backend/package.json` | Scripts: `test:setup`, `test:goldens`, `goldens:update`; `test` now `node --test --test-concurrency=1 --require ./test/_env.js test/*.test.js` (serial for determinism, `_env.js` preloaded). No dependency change (`supertest` was already a devDependency from Phase 1). | ✅ none |
| `backend/.env` / `.env.example` | Documented `PG_URL_TEST`. | ✅ none |

### Test results — 2026-09-01 (IST)

`npm run test:setup` → `bharatsource_test` built (52 public tables — users:125 listings:724 jobs:50). `npm test` → **76 pass, 0 fail** (29 pre-existing + 5 architecture + 4 pagination + 38 golden sub-tests). Run twice back-to-back without re-seeding → identical (counter normalization holds; serial execution keeps mutating tests off the golden rows). `cd frontend && npx tsc --noEmit` → unaffected (no frontend change), still clean.

### Known limitations / follow-ups (not blockers for Phase 2)

- **Seed is a dev-DB clone, not a version-controlled pinned fixture set.** Deterministic between `test:setup` runs (the test DB isn't touched by dev work), and the manifest only asserts seed-stable ids — but a true pinned seed (`--fresh` + a committed `seed-test.js`) is the eventual target so the goldens survive a dev-DB reset. Tracked here.
- **Golden coverage gap:** authed recruitment endpoints (`GET /api/applications`, `/api/applications/mine`, `/api/applications/:id`, `/api/admin/jobs`, `/api/admin/employers`) and the Directory write paths aren't golden'd yet. Add before Phase 4 touches recruitment.
- The Phase 1 listing-PUT test still calls the local `claude` CLI (~8s) — unchanged from Phase 1; serial mode makes the whole suite ~130s.

---

## Phase 1 — Implementation log

**Status: partially landed.**
- **2026-08-31 15:14 IST (+05:30)** — security-critical + cross-cutting items 1a, 1b, 1c, 1e (load-bearing part), 1h, plus the low-risk parts of 1d: implemented, tested, green.
- **2026-08-31 15:32 IST (+05:30)** — **1g done** (dead memoization deleted). See its own row below.

Still deferred (reasons below): 1d Postgres-backed OTP + AI-budget tables, 1i. (Done later: 1e pino/`req.id`, 1f, 1b DB CHECK in Phase 5b, 1a-admin in Phase 6a-sec.)

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
| **1e** — pino structured logger + `req.id` + access log | ~~Deferred~~ — **done 2026-09-01** (`lib/logger.js` + `middleware/requestLog.js`; standalone commit on the Phase 2 kernel). | — |
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

- ~~Tests run against whatever `PG_URL` points at (no dedicated `PG_URL_TEST` yet)~~ — **resolved in Phase 0** (`PG_URL_TEST` + `npm run test:setup`). `register()`-created users still accumulate in the test DB between `test:setup` runs; a re-`test:setup` clears them.
- The listing-create test path invokes the local `claude` CLI for verification (~8s per run). Acceptable now; consider stubbing `verifyListing` in test mode if the suite slows further.

---

## Phase 2 — Implementation log

**Status: landed 2026-09-01 (IST). Contract impact: none — no route touched; goldens byte-identical; 85 pass.**

### New files (`backend/modules/_shared/`)

| File | What it is |
|---|---|
| `pool.js` | The single `pg` `Pool` for the whole backend — moved verbatim from `lib/pg-store.js` (same Phase 1 §1e hardening: `statement_timeout`, `connectionTimeoutMillis`, `idleTimeoutMillis`, opt-in `ssl`, `pool.on("error")`). Exports `pool`, `ping()`, `close()`. **Anti-divergence mechanism #3 (one pool).** |
| `repository.js` | `createRepository({ pool, mapping })` where `mapping` is one entry from `buildFlatConfigs()`. Methods: `findById` `findOne` `findMany` (`{where,orderBy,limit,offset}`) · `count` · `page` (items + total in one round trip via `count(*) OVER()`) · `insert` `updateById` `updateWhere` (bulk scalar patch) · **`incrementById`** (`SET col = COALESCE(col,0)+n` — the atomic fix for **C2**) · `deleteById` · `withTx`. Row↔doc translation delegates to `FlatCollectionStore`'s own `_toRow`/`_fromRow` — the **same** code the legacy store runs (**mechanism #2**). No cache (**#4**). |
| `queryBuilder.js` | Criteria → parameterized SQL. `where` ops: `eq ne in notIn gt gte lt lte ilike contains isNull` + `_or`; multi-key = AND. `contains` escapes `% _ \` (trap #1). `buildOrderBy` accepts `"createdAt"` / `"-createdAt"` / `[["k","DESC"],…]`, appends `NULLS LAST` to every term (trap #3) and a trailing `"id" ASC` tiebreak unless `id` is already sorted (trap #2). Never interpolates a value. |
| `mappings/flat.mappings.js` | `module.exports = require("../../../lib/db/flat")` — **mechanism #1 (one mapping source)**. Physical move of `buildFlatConfigs` is a later tidy; callers already import from here. |
| `pagination.js` | `paginationOf(query,{defaultLimit,maxLimit}) → {page,limit,offset}` + `totalPagesFor`. Closes deferred **1f** (the helper). Not yet imported by `routes/jobs.js` / `routes/adminJobs.js` / `routes/listings.js`. |
| `envelope.js` | `ok(res,data,status?)`, `okPaged(res,{items,total,page,totalPages,...extra})` — `extra` is spread so `facets` / `summary` keys survive. |
| `errors.js` | `AppError` (+ `BadRequest` 400 / `Unauthorized` 401 / `Forbidden` 403 / `NotFound` 404 / `Conflict` 409). Set `err.status` — the name `errorHandler.js` already keys off. |
| `crudRouter.js` | `crudRouter(repo,{role,writeSchema,listOrderBy})` → REST router for the ~10 thin admin-taxonomy routers. Shipped, not yet wired. |
| `index.js` | Barrel — `require("../_shared")`. |
| `backend/test/differential.test.js` | The Phase 2 gate. Per collection (`categories`, `job-functions`, `jobs`, `reviews`, `collections`, `features`): `repo.findMany({})` `deepEqual` `store.all`; `repo.findById(mid)` `deepEqual` `store.getById`; `repo.findMany({where:X})` `deepEqual` `store.findMany(predicateFor(X))` — including a JS-key→column rename (`jobFunction`→`job_function`). Plus `page()` shape and `incrementById` (+5 then −5, nets to zero). |

### Modified

| File | Change | Contract |
|---|---|---|
| `backend/lib/pg-store.js` | Deleted the local `new Pool(...)` + `pool.on` + `ping`/`close`; now `const { pool, ping, close } = require("../modules/_shared/pool")`. Dead `require("./config")` removed. `module.exports` unchanged (still re-exports `ping`/`close`). **Import redirection #1.** | ✅ none — same pool config, same behaviour. |
| `backend/middleware/errorHandler.js` | `status` now also reads `err.statusCode`; when a typed error carries `err.code` and status ≠ 500, the code is included in the body (same shape as the existing `rate_limited` / `account_suspended` responses). | ✅ additive — a key only ever *appears*, and only for typed kernel errors that opt in. |

### Test results — 2026-09-01 (IST)

`npm test` → **85 pass, 0 fail** (76 Phase 0 baseline + 9 differential). `node -e "require('./lib/store'); require('./app')"` → boots clean. All 37 golden fixtures **byte-identical** (the pool redirection + errorHandler change touched no response). Re-run back-to-back → stable.

### Not done / follow-ups

- Repository wired into **zero routes** — deliberate (graduation starts Phase 3+; reads may straddle, only writes graduate atomically per collection).
- `_shared/crudRouter.js` shipped but unused. (`_shared/pagination.js` is now wired — jobs / adminJobs / listings-cap, 2026-09-01.)
- `buildFlatConfigs` still physically in `lib/db/flat.js` (re-exported).
- Still to add (Phase 2 "keeping new code off the old interface"): `lib/store.js` deprecation header, CLAUDE.md §5 "closed to new collections" line, dev-mode `store.findOne/findMany` call-site burn-down logging.

### After the kernel — small standalone commits (2026-09-01)

- **1f wiring** — `routes/jobs.js` + `routes/adminJobs.js` now use `_shared/pagination.paginationOf`; `GET /api/listings` capped at 1000 (C9). 85 pass, goldens unchanged.
- **1e-pino** — `lib/logger.js` (pino) + `middleware/requestLog.js` (`req.id`, `X-Request-Id` header, one access line per request); `errorHandler.js` + `index.js` + `lib/leads.js` + `modules/_shared/pool.js` moved off `console.*`. Silent under `NODE_ENV=test`. 85 pass, goldens unchanged (bodies/status untouched; the new header isn't asserted).

---

## Phase 3 — Implementation log

**Status: landed 2026-09-01 (IST). Contract impact: none — only `middleware/authGuard.js`'s user load changed, and it returns the identical document. 91 pass; goldens byte-identical.**

### New files

| File | What it is |
|---|---|
| `backend/modules/identity/index.js` | The read-port onto `users` — the one named seam every other module uses instead of touching `users` / `*_profiles`. **`getAuthUser(id)`** → the FULL hydrated user doc via `createUsersStore(pool).getById` (same composite hydrate `pg-store` runs); byte-identical to `store.getById("users.json", id)`. **`getEmployerCard(id)` / `getEmployerCards(ids)`**, `getSellerCard(s)`, `getCandidateCard(s)` — narrow, contact-free projections; batched variants dedupe and (for now) fan out per id. **`setEmployerApproval(userId, status, actorId)`** — the only write this port will expose; defined, **not yet wired** (`routes/adminEmployers.js` still patches `employerProfile.status` directly until Phase 4). Imports `_shared/pool` + `lib/db/users` only — never `lib/store`. |
| `backend/test/identity.test.js` | The load-bearing gate: `getAuthUser(id)` `deepEqual` `store.getById("users.json", id)` for admin / seller / employer / candidate seed users. Plus: missing/null id → null (no throw); employer-card key set is exactly `{id,companyName,slug,logo,city,state,isVerified}` with no `contact*`/`phone`/`email`; batch readers equal N single reads and dedupe. |

### Modified

| File | Change | Contract |
|---|---|---|
| `backend/middleware/authGuard.js` | `require("../lib/store")` → `require("../modules/identity")`; `loadUser` calls `identity.getAuthUser(payload.sub)` instead of `store.getById("users.json", …)`. Used by both `authGuard` and `optionalAuth`. | ✅ none — same document on `req.user`. |
| `backend/test/architecture.test.js` | Cross-module deep-import check now skips `target === "_shared"` — the kernel is a shared layer, not a domain module, so importing `_shared/pool` (etc.) at any depth is allowed. | test-only |

### The circular dependency (caught + fixed)

First boot after wiring logged `Warning: Accessing non-existent property 'requireRole' … inside circular dependency`: `authGuard → modules/identity → modules/_shared (barrel) → crudRouter → middleware/authGuard`. Fixed by importing the leaf — `require("../_shared/pool")` — in `identity/index.js` instead of the barrel, so identity no longer transitively pulls `crudRouter`. Boot is now clean.

### Test results — 2026-09-01 (IST)

`npm test` → **91 pass, 0 fail** (85 + 6 identity). `node -e "require('./app')"` → clean, no circular-dep warning. All 37 goldens byte-identical (auth path returns the same `req.user`). `routes/users.js` unchanged and still on `store.js`.

### Deferred to Phase 4+

- `identity_employer_cards` / `identity_candidate_cards` / `identity_seller_cards` SQL views + migration — 4e is the first consumer needing the JOIN-based "approved employer" gate; until then the batch card readers fan out per id (fine at N≈12).
- `lib/jobSearch.js` `employerMiniOf` still lives in recruitment — becomes a thin call to `identity.getEmployerCard` in Phase 4 (identity's card already matches its shape).
- `setEmployerApproval` not wired; `getAuthUser` projection still full (Phase 6 narrows, with its own `req.user.*` audit).

---

## Phase 4 — Implementation log

**Status: ✅ COMPLETE (2026-09-01, IST). All six sub-phases landed; each was its own commit + golden run; goldens stayed byte-identical throughout. 98 pass. HEAD `2aa9589`.**

| Sub-phase | State |
|---|---|
| **4a — pure move** | ✅ **2026-09-01.** `modules/recruitment/index.js` (public port) + `service/employerProfile.service.js` (verbatim `lib/recruitmentProfile.js`, now deleted). `routes/jobs.js` / `routes/applications.js` / `routes/assistant.js` import `{ searchJobs, employerMiniOf, candidateProfileGaps, employerProfileGaps }` from `modules/recruitment`. `searchJobs`/`employerMiniOf` are re-exported from `lib/jobSearch.js` (it still uses the predicate store — physically moves + rewrites in **4e**). 91 pass; goldens unchanged; recruitment unit tests (`_internal`) unaffected. |
| **4b — extract services** | ✅ **2026-09-01** (2 commits). `service/job.service.js` (`jobsPaginationOf`, `toBool`, `toNumberOrNull`, `normalizeQuestions`, `buildLocation`, `buildSalaryRange`, `normalizeStringList`, `VALID_*` sets) + `service/application.service.js` (`VALID_STATUSES`, `candidateMiniOf`, `jobMiniOf`) + `policy.js` (`isAdmin`, `isJobOwnerOrAdmin`, `canViewApplication`). `routes/jobs.js` / `routes/applications.js` are now thin glue importing from `modules/recruitment`; `module.exports._internal` hooks retired — `test/jobs.unit.test.js` / `test/applications.unit.test.js` point at the module. Still on `store.js`. 91 pass; goldens unchanged. |
| **4c — zod schemas** | ✅ **2026-09-01 (scoped).** `PUT /api/jobs/:id`'s hand-written `JOB_EDITABLE` Set → `schema/job.schema.js` `updateJob` (`.strip()` — unknown keys dropped, not rejected, so contract-neutral), wired via a recruitment-local `http/validateBody.js` that keeps the exact `{success:false,error:"<msg>"}` 400 shape (NOT `lib/validate.js`'s `{error:"Validation failed",issues}`). Enum/normalization stay inline (moving them risks shifting a 400 message). POST `/api/jobs` + the application endpoints read named fields (no allowlist to replace) — schema'd later. 91 pass; goldens unchanged; `phase1-security` "unknown fields ignored" still 200. |
| **4d — repositories** | ✅ **2026-09-01 (5 commits).** Prep (`b97eea9`): ordered-query differential + 3 authed-recruitment goldens. Kernel (`744ab49`): `nextId`/`seedCounter` → `_shared/ids.js`, `_shared.repoForCollection(file)`. **`jobs` (`5e33b1a`):** `routes/jobs.js` fully off `store` — CRUD via `jobsRepo`; view-count + `applicationCount` (in `applications.js`) → atomic `incrementById`, **closes C2 for both**; employer mini via `identity.getEmployerCard`. **`applications` (`702cafe`):** `routes/applications.js` off `store` for `applications`+`jobs` (only `users.json` reads left → Phase 6); file-DB `store.withLock` dup-guard dropped — the `(job_id,candidate_id)` UNIQUE index is the real backstop. **taxonomy:** `job-functions`/`job-roles`/`skills` public + admin routes off `store`; added to `architecture.test.js` `GRADUATED_COLLECTIONS` (enforced absent from `routes/`). Every step: 96 pass, goldens byte-identical. `lib/jobSearch.js` browse path is Phase 4e. |
| **4e — searchPublic rewrite** | ✅ **2026-09-01 (`827c01f`).** Migration `0013_add_identity_employer_cards.sql` + mirrored into `schema.sql` — `CREATE OR REPLACE VIEW identity_employer_cards` (`user_id, company_name, slug, status, is_verified, logo, location_city, location_state, name, avatar_url` — `users JOIN employer_profiles`). `lib/jobSearch.js` **deleted**, split into `modules/recruitment/service/jobSearch.service.js` (stopwords + `significantTokens` + filter normalization) and `repository/jobSearch.repository.js` (**the one SQL statement**: `jobs j JOIN identity_employer_cards e ON e.user_id = j.employer_id WHERE j.status='active' AND e.status='approved'` + filters, `count(*) OVER()::int AS __total`, `ORDER BY j.posted_at DESC NULLS LAST, j.id ASC`, optional `LIMIT`). `j.*` through `jobsFlat._fromRow` (not a projection); `employer` sub-object built from `emp_*`-aliased view columns, byte-identical to `employerMiniOf`. Traps: `%`/`_`/`\` escaped into every `LIKE` pattern (`replace(/[\\%_]/g, "\\$&")` + `ESCAPE '\'`); `, j.id ASC` tiebreak (**not `id DESC`** — matches the old stable JS sort over id-ascending `store.all()`; `job_demo2/3/4` share a `posted_at` and proved it); `NULLS LAST`. `routes/jobs.js`/`routes/assistant.js` import `searchJobs` from `modules/recruitment` unchanged. **Gate:** `jobs-browse`/`jobs-page2`/`jobs-filter-function`/`job-detail` goldens byte-identical; new `test/jobs.querycount.test.js` wraps `pool.query` with a counter → `GET /api/jobs` issues **1** query (asserts ≤ 2). 97 pass. |
| **4f — mounts** | ✅ **2026-09-01 (`2aa9589`).** `modules/recruitment/mount.js` — `MOUNTS = [{path, router, phase}]` (`phase` ∈ `"admin-sub" | "public"`) for all 10 recruitment routers + `mountRecruitment(app, phase)`. `backend/app.js` dropped the 10 positional `app.use(...)` lines (68–77) for `mountRecruitment(app, "admin-sub")` then `mountRecruitment(app, "public")`, both before the `/api/admin` catch-all. `mount.js` requires the route files straight from `routes/` and is imported by `app.js` directly (not via `index.js` — `routes/jobs.js` already requires `modules/recruitment`, so a barrel re-export would cycle). New `test/recruitment.mount.test.js`: `GET /api/admin/jobs` → 401 (anon) / 403 (candidate token, from `adminJobs` `requireRole`) / 200 (admin) — proves the router is reachable and admin-gated by its own guard, not shadowed or opened by the catch-all. 98 pass. |

---

## Phase 5 — Implementation log

**Status: 5a + 5b + 5c-1 + 5d + 5e + 5f + the `reviews.js` feed loose end landed 2026-09-01 (IST); 5c-2 blocked on an owner call. Each sub-phase = its own commit + golden run; goldens byte-identical throughout. Every PUBLIC Directory read + the admin queues + both homepage review feeds are now off the full composite/user scans. `listings` composite document writes "stay as-is" (BACKEND-AUDIT.md). Only remaining loose end on `store`: `inquiries.js` (`resolveTargets` fan-out + `leads-ledger`).**

| Sub-phase | State |
|---|---|
| **5a — categories counts** | ✅ **2026-09-01 (`e33db2b`).** `modules/directory/` created (`index.js` public port). `repository/listingStats.repository.js` → `listingCountsByCategory()`: one `SELECT cat_id, count(*) FROM (… CROSS JOIN LATERAL (SELECT l.category_id WHERE … UNION SELECT c.id FROM categories WHERE c.slug = ANY(l.category_path)) …) WHERE l.status='active' GROUP BY cat_id`. The lateral `UNION` (not `UNION ALL`) dedupes categories per listing — exactly the old JS `new Set()` per listing — so a leaf whose `category_id` and a `category_path` slug resolve to the same category isn't double-counted. Proven byte-identical to the old `computeListingCounts()` against the seed (280 categories). `routes/categories.js` `GET /` + `GET /:slug` call it instead of `store.all("listings.json")` (a full composite scan on a homepage-hot endpoint). `categories.json` itself still reads via `store` (many routes touch it — reads straddle). New `test/categories.querycount.test.js`: `GET /api/categories` ≤ 3 queries, no `SELECT * FROM listings`. 99 pass; `categories`/`category-detail` goldens byte-identical. |
| **5b — reviews repo + self-review CHECK** | ✅ **2026-09-01 (`e7697d6`).** `repository/review.repository.js` = `repoForCollection("reviews.json")` (exported as `directory.reviewsRepo`). `routes/reviews.js` is the ONLY writer of `reviews.json` → graduates atomically: `POST /` uses `reviewsRepo.findMany` (per-buyer/-target lookup, replacing `store.findOne(predicate)` = a full scan) + `updateById` + `insert(doc, "rev")`; `GET /` uses `reviewsRepo.findMany({where:{_or:[{targetUserId},{sellerId}]}})`. The NULL-context-means-"directory" rule stays a JS filter over the (tiny) per-target set — not expressible in the grammar. Migration `0014_add_review_self_check.sql` (+ `CONSTRAINT reviews_no_self_review` in `schema.sql`'s `CREATE TABLE reviews`): `CHECK (buyer_id IS NULL OR target_user_id IS NULL OR buyer_id <> target_user_id)` — DB backstop for S2, idempotent via a `DO $$ … EXCEPTION WHEN duplicate_object` block so `--fresh` (schema has it) + migration replay don't collide. `store` reads in `/recent`, `/recruitment-recent`, `routes/admin.js`, `routes/users.js` straddle (not graduated). New `reviews-for-seller` golden (`GET /api/reviews?targetUserId=usr_s002&context=directory`, 2 rows). 100 pass; goldens byte-identical; old-vs-new GET result proven identical JSON. |
| **5c-1 — browse off the users hydrate** | ✅ **2026-09-01 (`a46778e`).** The browse handler (`routes/listings.js` `GET /`) did `store.all("users.json")` **twice** — once directly (approved-seller allow-list + per-card seller mini) and once inside `lib/ranking.js` (`priorityTier`, one string per seller). Both replaced with targeted `identity` reads: `getApprovedSellerIds()` (`SELECT user_id FROM seller_profiles WHERE status='approved'`), `getSellerBrowseCards(ids)` (one JOIN over just the ~12 page sellers, exact `{id,name,companyName,slug,city,state,logo,isVerified,rating,reviewCount,responseRate}` shape), `getSellerPriorityTiers(ids)` (Map passed into `rankListings({…, tierBySeller})`; the full-load path kept only as a fallback for a caller that omits it — there is none). `search`/`rank`/`computeFacets` logic untouched → `listings-browse`/`listings-page2` goldens byte-identical. New `test/listings.querycount.test.js` asserts no `SELECT * FROM users`. 101 pass. |
| **5c-2 — search/facets SQL** | **BLOCKED — needs an owner call.** `lib/search.js` still `store.all("listings.json")` (full composite scan) then MiniSearch BM25 (prefix + fuzzy 0.2 + field boosts) + `computeFacets` (9 JS passes) + spread `Math.min/max` at `search.js:172-173` (stack-overflow past ~100k rows). Moving the no-query + facet paths to SQL is mechanical, but **MiniSearch fuzzy relevance has no byte-identical SQL equivalent** — a `?q=` rewrite changes result ordering/membership, which the governing constraint forbids without sign-off. Decision needed: (a) keep MiniSearch, only SQL-ify the no-query + facet paths (goldens stay identical for `?q=`); (b) adopt Postgres FTS / `pg_trgm` for `?q=` and regenerate the `?q=` goldens with review; (c) leave 5c-2 for later. The spread-arg crash (a) is worth fixing regardless (`reduce` instead of `Math.min(...arr)`). |
| **5d — listings C2 + route import** | ✅ **2026-09-01 (`4c323d5`).** `GET /api/listings/:id` view counter: `store.update("listings.json", id, {views: read+1})` (read-modify-write = **C2** lost-update race, and it re-upserted every child table for a display metric) → `directory.bumpListingViews(id)` = `UPDATE listings SET views = COALESCE(views,0)+1 WHERE id=$1`. New `modules/directory/repository/listing.repository.js` owns this one surgical statement — the composite full-document hydrate/upsert (`lib/db/listings.js`) still goes through `store` ("stays as-is", see below). `resolveSellerLocations` (a **pure** helper) moved `routes/users.js` → `lib/sellerLocations.js`, killing the `routes/listings.js → routes/users.js` route→route import. New `test/listing-views.test.js` (two overlapping bumps ⇒ +2). 102 pass; `listing-detail` golden byte-identical (`views` is a VOLATILE_KEY). **Not done** (deliberately — the composite document write "stays as-is", BACKEND-AUDIT.md): the 170-line bulk import + 114-line PUT + `adminListings`/`boosts` `store.update("listings.json", …)` document writes are unchanged. Full listings-writer graduation would need a composite write repo parallel to `lib/db/listings.js` — a separate, larger design, not in the current plan. |
| **5f — brands endpoints** | ✅ **2026-09-01 (`1fe4707`).** `routes/brands.js` aggregated free-text `product.brand` by `store.all("listings.json")` (full composite hydrate of every listing — media + product + service + spec EAV) plus `store.all("users.json")` for `GET /:slug`. New `directory.activeBrandedListingsLean()` — one indexed JOIN (`listings JOIN listing_products WHERE status='active' AND brand<>''`) + a `listing_media` batch — returns just the fields `computeBrandsList`/`computeBrandDetail` read; the JS grouping logic is **unchanged**. `GET /:slug` lean-scans for the brand's ids (`slugify` is JS), hydrates only the matches, and builds `seller` via `identity.getSellerBrowseCards` (the same 11-key shape from 5c-1). Dead `sellerMini` removed. Existing `brands` golden **byte-identical** (the transitive proof the lean rows are faithful) + new `brand-detail` golden + `test/brands.querycount.test.js`. 105 pass. |
| **5e — admin listing + moderation queues** | ✅ **2026-09-01 (`a4c59c6`).** `routes/adminListings.js` `sellerLookup()` and `routes/moderation.js` `authorLookup()` each did `store.all("users.json")` — a full composite hydrate of every user — for 1–2 string fields per row. Replaced with `identity.getSellerCompanyNames(ids)` (`{company, name}` — seller-only, LEFT JOIN) and `identity.getAccountCards(ids)` (`{company, name, type}` — seller-OR-employer, matching `authorLookup`'s fallback + type logic). Both scoped to the ids actually present (filtered listing rows / blog+story+verification rows), `WHERE id = ANY($1)`. Old-vs-new proven identical across every seed id (0 diffs / 54 sellers, 0 / 25 authors). No goldens cover these admin endpoints, so `test/admin-directory.querycount.test.js` (no `SELECT * FROM users ORDER BY`) + the equivalence check are the net. The `store.update("listings.json"/"users.json", …)` verification/approval writes stay composite (unchanged). 103 pass. |
| **5-loose — homepage review feeds** | ✅ **2026-09-01 (`e24922e`).** `routes/reviews.js` `GET /recent` (Directory "Recent Activity") and `GET /recruitment-recent` (Recruitment testimonials) each did `store.all("users.json")` — full composite hydrate of every user — plus, for `/recent`, `store.all("listings.json")` (every listing) just to attach the reviewed party's public business fields and one representative photo. Now: `reviewsRepo.findMany({where:{status:"approved"}})` (context stays a JS filter — NULL-means-"directory" isn't in the grammar); `identity.getReviewFeedParties(ids)` — one `WHERE id = ANY($1)` LEFT JOIN over just the target+buyer ids, returning only the seller/employer card subset + reviewer name/avatar those handlers read; `directory.firstListingImageBySeller(ids)` — one `DISTINCT ON (seller_id) … ORDER BY seller_id, l.id ASC, m.position ASC` for the photo, matching the old id-ASC `Array.find(l => l.media && l.media[0])`. Old-vs-new output proven byte-identical across `limit`/`city` variants (6/20/2 rows `/recent`, 6/12 `/recruitment-recent`). New `reviews-recent` / `reviews-recruitment-recent` goldens + `test/reviews-recent.querycount.test.js` (no `SELECT * FROM (users|listings) ORDER BY`). 108 pass. |

---

## Phase 6 — Implementation log

**Status: ✅ COMPLETE 2026-09-01 (IST). All of 6a + 6a-sec + 6b + 6c + 6d landed, each its own commit + test run; 114 pass, goldens byte-identical throughout. The `sellerProfile` write allowlist 6b was flagged for turned out already done in Phase 1a. `GET /api/me/listings` + `/me/analytics` (authed seller dashboard) deferred to Phase 7.**

| Sub-phase | State |
|---|---|
| **6a — `GET /api/admin/users` rewrite** | ✅ **2026-09-01 (`abf52e0`).** The route did `store.all("users.json")` — the composite mapper's `SELECT * FROM users ORDER BY id ASC` + 9 child-table `= ANY` batches over EVERY user — then scope / type / status / planTier / featured / q filtering, the 7 summary counts, the `new Date(createdAt)` sort and the page slice all in JS. Now `identity.adminUserPage({scope,type,status,planTier,featured,q,page,limit})` runs two indexed statements: (1) scope predicate + `count(*) FILTER (WHERE …)` ×7 for `summary` (over the scoped set, before type/status — tab badges stay stable); (2) a `filtered` CTE (scope + type + `sp/ep.status = $` switched by scope + `COALESCE(NULLIF(sp.plan_tier,''),'free') = $` + `COALESCE(sp.is_featured_seller,false) = $` + an ILIKE-escaped `q` OR-group over `u.name/u.email/u.mobile/sp.company_name/ep.company_name/cp.headline`) selecting `(SELECT count(*) FROM filtered) AS total` and `array_agg(id ORDER BY created_at DESC NULLS LAST, id ASC)` over the `LIMIT/OFFSET` window. **`id ASC` tiebreak** (not the audit's earlier `id DESC` draft) = the old stable JS sort over `store.all`'s id-ASC output. `lib/db/users.js` gains **`hydrateManyByIds(ids)`** — `all()`'s 10-query batch hydrate scoped to a known id set, returned in the given order; the route hydrates only the ≤`limit` page ids through it, then maps with its own `adminUserRow` (`hatsOf`/`acctStatus`/`adminUserRow` presentation stays in the route, unchanged). All **17 `admin-users-*` goldens byte-identical**. New `test/admin-users.querycount.test.js`: no `SELECT * FROM users ORDER BY`, and a `WHERE id = ANY($1)` page hydrate present. 109 pass. |
| **6a-sec — admin.js write allowlist (1a-admin)** | ✅ **2026-09-01 (`9bc4298`).** `POST|PUT /api/admin/plans`, `POST|PUT /api/admin/ad-slots`, `PUT /api/admin/payments/:id` spread `{...req.body}` into `store.insert/update` — a caller could set `id`, `createdAt`, or any other mapped column the form never means to touch. Added a local `pick(body, keys)` + `PLAN_FIELDS` (11) / `AD_SLOT_FIELDS` (4) / `PAYMENT_FIELDS` (11), each exactly (mapped columns − id − timestamps) — same allowlist-not-blocklist shape as `routes/listings.js` `LISTING_EDITABLE`. POST base-defaults (`{billingCycle:"monthly"}` / `{isActive:true}`) and the payments settle→`markedPaidDate` branch unchanged. Reports/ad-bookings/payments-POST already built explicit objects (not spreads) — untouched. New `test/admin-write-allowlist.test.js`: injected `id`/`createdAt`/unknown keys dropped, legit fields round-trip, PK not rewritable; created rows removed in `t.after` so the `entitlements` golden (reads `subscription-plans.json`) stays stable. 110 pass. |
| **6b — `routes/users.js` public surface off the full scans** | ✅ **2026-09-01 (`753831d` + `c6a8ae9`).** **`753831d`:** `GET /api/sellers/:slug` + `GET /api/employers/:slug` off `store.findOne("users.json", u => u.<profile>.slug === slug)` (full composite hydrate of every user then `.find`) → `identity.getSellerBySlug` / `getEmployerBySlug` — one indexed probe on `<profile>_profiles.slug` (`UNIQUE NOT NULL`, indexed) → `user_id` → `hydrateManyByIds([id])`, byte-identical (UNIQUE ⇒ SQL single-row = old first-match-in-id-order). `test/public-profile-slug.querycount.test.js`. **`c6a8ae9`:** `GET /api/sellers` + `GET /api/sellers/featured` off `store.all("users.json")` + `store.all("listings.json")` → `identity.getApprovedSellerIds` (now `ORDER BY user_id ASC`, so the later stable JS rating/reviewCount sort breaks ties identically) + `hydrateUsersByIds` (approved sellers only) + `directory.activeListingCountsBySeller()` (one GROUP BY); `computeApproved`/`computeFeaturedSellerCards` take the count Map directly, `getActiveListingCounts` deleted. `GET /api/sellers/:slug` listings: `store.findMany("listings.json", pred)` → `directory.activeListingIdsForSeller` (indexed, id-ASC) + per-id `store.getById` (composite doc read stays on `store`). `GET /api/employers/:slug` jobs: `store.findMany("jobs.json", pred)` → `recruitment.jobsRepo.findMany({where:{employerId,status:"active"}})` (jobs graduated in 4d; `"id" ASC` default = old order). `uniqueSlug`/`uniqueEmployerSlug`: slug-set from `store.all` → `identity.sellerSlugTaken`/`employerSlugTaken` probes. `sellers-featured`/`seller-detail`/`employer-detail` goldens byte-identical; `GET /api/sellers` (no golden) proven old-vs-new identical across q/page/limit incl. tie-ordering; new `test/sellers-directory.querycount.test.js`. 112 pass. **The `sellerProfile` write allowlist this sub-phase was flagged for was already Phase-1a done** — every write path in `routes/users.js` carries a field allowlist, no raw `{...req.body}` into any profile. **Left for Phase 7 / a Directory follow-up:** `GET /api/me/listings` + `GET /api/me/analytics` (the authed seller's own dashboard — `store.all("listings.json")` + inquiries/reviews/leads-ledger, `req.user`-scoped, no goldens). |
| **6c — `routes/auth.js` user lookups** | ✅ **2026-09-01 (`05afb5b`).** `register` / `verify-otp` / `login` each did `store.findOne("users.json", u => u.mobile|email === x)` — `SELECT * FROM users ORDER BY id ASC` + 9 child `= ANY` batches over every user, then `.find` — on the live credential path. New `identity.getUserByMobile` / `getUserByEmail`: one indexed probe (`users.mobile`/`users.email` both indexed) `ORDER BY id ASC LIMIT 1` (reproduces `store.findOne`'s first-match-in-id-order) + one single-row composite hydrate via `usersStore.getById`. `store` stays for `nextId` + `insert`. No behaviour change — the enumeration-safe login (one bcrypt compare vs the real hash or `DUMMY_HASH`), the suspended-account 403, the OTP auto-create are untouched. New `test/auth.behavior.test.js` (written FIRST — goldens skip security endpoints): `passwordHash` never in a response, JWT on every success, dup-mobile 409, wrong-password and unknown-email return an identical 401, `/me` sanitized, suspended blocked. New `test/auth.querycount.test.js`. |
| **6d — strip `passwordHash` from `req.user`** | ✅ **2026-09-01 (`bc7a431`).** `identity.getAuthUser` (the only thing `middleware/authGuard.js` uses to build `req.user`) returned the full composite doc **including `passwordHash`**. No route reads `req.user.passwordHash` (codebase-wide grep) and `GET /api/auth/me` already `sanitizeUser`s it out — so `getAuthUser` now `delete`s the key as defence-in-depth: a future `res.json(req.user)` slip can't leak the hash. Scoped to `req.user` only — the login password-check uses `getUserByEmail`, which keeps the hash. **Deeper projection-narrowing deliberately not done:** routes read `sellerProfile`/`employerProfile`/`candidateProfile`/`roles`/`recruitmentRole*`/`name`/`mobile`/`email`/`city`/`state` off `req.user`, `/me` echoes the rest of the sanitized doc, and a buyer's child-profile blocks are already `null` after hydrate — no consumer wants them gone and it would change the `/me` shape. `test/identity.test.js` load-bearing assertion now compares `getAuthUser` vs `store.getById` **minus `passwordHash`**, and asserts the key is absent. |
| **6b — `routes/users.js` onto the port + profile write allowlist** | ⏳ `routes/users.js` (955) — seller-profile CRUD, become-seller, `GET /api/sellers/:slug` — onto `identity`. Add a `sellerProfile` write allowlist: the profile-update path is reachable by any logged-in user and a raw spread lets a seller self-set `isVerified`/`planTier`/`priorityTier`/`leadQuota…`. Read side frozen by `seller-detail`/`sellers-featured` goldens. |
| **6c — `routes/auth.js`** | ⏳ register / login / OTP / `/api/auth/me` (145). New `test/auth.behavior.test.js` FIRST (goldens skip security endpoints by design). Review in isolation: hash never in a response, minimal JWT claims, OTP rate-limited, no user-enumeration in error text. |
| **6d — narrow `getAuthUser` projection** | ⏳ Deferred from Phase 3. Grep every `req.user.*` read across all routes → the exact field set → trim the port's projection. Payoff: `req.user` stops carrying `passwordHash` + child-table PII into every authed handler. Cross-cutting + silent-break-prone → LAST. |

---

### Phase 2 — Shared kernel  ✅ LANDED 2026-09-01
**Small · Contract impact: ✅ none — no route touched** · full detail: [Phase 2 — Implementation log](#phase-2--implementation-log)

```
backend/modules/_shared/
  pool.js            # ✅ THE pg Pool, moved from lib/pg-store.js; pg-store now imports it
  repository.js      # ✅ createRepository({pool, mapping})
  queryBuilder.js    # ✅ criteria object -> SQL WHERE/ORDER/LIMIT
  pagination.js      # ✅ shipped (deferred 1f) — helper only, not yet wired into routes
  envelope.js        # ✅ ok(res,data) / okPaged(res,{items,total,page,totalPages,...extra})
  errors.js          # ✅ AppError/BadRequest/Unauthorized/Forbidden/NotFound/Conflict -> errorHandler
  crudRouter.js      # ✅ factory for thin admin-taxonomy routers — not yet wired
  mappings/flat.mappings.js   # ✅ re-exports buildFlatConfigs from lib/db/flat.js (physical move = later tidy)
  index.js           # ✅ barrel: require("../_shared")
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

**Gate:** goldens green. **The differential test** (per collection: `repo.findMany({where:{}})` `deepEqual` `store.all(coll)`; `repo.findMany({where:X})` `deepEqual` `store.findMany(coll, predicateFor(X))`; `repo.findById(id)` `deepEqual` `store.getById(coll,id)`). This is the single most important assertion in the migration — it makes divergence structurally impossible rather than merely discouraged. It is the last test you delete, when `store.js` dies. — **Landed as `backend/test/differential.test.js`**; 85 pass total.
**Rollback:** additive plus two import redirections (`pg-store.js` → `_shared/pool`, `flat.mappings.js` → `lib/db/flat`).

**Not done in this pass** (deliberately): the `createRepository` seam is wired into **no route** yet (that begins Phase 3+ — "reads may straddle, only writes graduate"); `_shared/crudRouter.js` shipped but unused; `buildFlatConfigs` still physically in `lib/db/flat.js`; the `store.js` deprecation header + CLAUDE.md §5 "closed to new collections" line + dev-mode call-site burn-down logging still to add. (`_shared/pagination.js` and 1e-pino were done right after, as standalone commits — see above.)

---

### Phase 3 — Identity read-port only  ✅ LANDED 2026-09-01
**Medium · Contract impact: ✅ none — `routes/users.js` is not touched** · full detail: [Phase 3 — Implementation log](#phase-3--implementation-log)

`modules/identity/index.js` publishes narrow, purpose-named readers — never the raw user document:

```js
getAuthUser(id)
getEmployerCard(userId) / getEmployerCards(userIds)     // BATCH mandatory — CLAUDE.md §5
getCandidateCard(id)    / getCandidateCards(ids)
getSellerCard(id)       / getSellerCards(ids)
setEmployerApproval(userId, status, actorId)            // the ONLY write path
```

`employerMiniOf` (`lib/jobSearch.js:39-51`) is already exactly this shape — it *becomes* `identity.getEmployerCard` and is deleted from recruitment.

Plus a schema migration creating **identity-owned views** — `identity_employer_cards`, `identity_candidate_cards`, `identity_seller_cards`. Other modules may join these views; they may never join `users` or `*_profiles` directly. Needed because the "approved employer" gate must be a `JOIN`, not a post-filter, or you are back to loading every user. The coupling is real but named, greppable, and single-point — and the architecture test asserts it. — **DEFERRED to Phase 4** (4e is the first consumer that needs the JOIN; the Phase 3 `get*Cards` batch readers currently fan out per-id, which is fine at N≈12 for the job-results page).

Then repoint `middleware/authGuard.js:21` at `identity.getAuthUser(id)`. — **Done.** `loadUser` now calls `identity.getAuthUser`; `authGuard.js` no longer requires `lib/store`.

> **⚠️ The trap.** Routes read arbitrary fields off `req.user` — `employerProfile` (`routes/jobs.js:212`), `sellerProfile`, `recruitmentRole` (`jobs.js:205`), `roles`, `status`. So `getAuthUser` must **initially return the full hydrated document**, byte-identical to `store.getById("users.json", id)`. Narrowing its projection is a separate, later step with its own audit. Slimming it here breaks a scattered subset of routes silently. — **Honoured:** `getAuthUser` delegates to `createUsersStore(pool).getById(id)` (the same composite hydrate `pg-store` runs); `test/identity.test.js` asserts `deepEqual` against `store.getById` for admin/seller/employer/candidate. Projection-narrowing stays in Phase 6.

**Gate:** goldens unchanged ✅; `routes/users.js` still on `store.js` and untouched ✅; `npm test` 91 pass.
**Rollback:** revert the one import + `loadUser` body in `authGuard.js`.

---

### Phase 4 — Recruitment module (the template)  ✅ LANDED 2026-09-01
**Large · Contract impact: ✅ none — every sub-phase kept goldens byte-identical** · full detail: [Phase 4 — Implementation log](#phase-4--implementation-log)

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

### Phase 5 — Directory module  ◐ 5a–5f + reviews-feed loose end LANDED 2026-09-01 · 5c-2 (blocked) + `inquiries.js` remaining
**Very large · Highest performance payoff · Contract impact: ✅ none intended, ⚠️ highest regression risk — this is live traffic** · progress + 5c/5d start steps: [Phase 5 — Implementation log](#phase-5--implementation-log)

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

### Phase 6 — Identity module proper  ✅ COMPLETE 2026-09-01 (6a + 6a-sec + 6b + 6c + 6d)
**Large · Contract impact: ✅ none intended** · progress: [Phase 6 — Implementation log](#phase-6--implementation-log)

`routes/users.js` (955) + `routes/auth.js` (145) + `routes/admin.js`'s user surface. Last among the big domains, precisely because everything else now talks to it through the port — its internals are finally free to move. Sliced by safety-net strength (not size): **6a** admin/users read rewrite (golden-guarded), **6a-sec** admin.js write allowlist, **6b** `routes/users.js` + `sellerProfile` write allowlist, **6c** `routes/auth.js` + dedicated behavior tests, **6d** narrow `getAuthUser` projection (last, own `req.user.*` audit).

**6a — `GET /api/admin/users` rewrite (`routes/admin.js:190-266`) — ✅ landed `abf52e0`.** `summary`'s 7 counts → one `count(*) FILTER (WHERE …)` ×7 over the scoped set; `isSeller/isEmployer/isCandidate` → `LEFT JOIN <child>.user_id IS [NOT] NULL`; `q` across `users` + 3 profile tables → ILIKE-escaped OR-group; `ORDER BY u.created_at DESC NULLS LAST, u.id ASC` (`id ASC` = the old stable JS sort's tiebreak, **not** the `id DESC` this section first drafted). Two indexed statements + a `hydrateManyByIds` batch hydrate of only the ≤`limit` page ids — not "2 queries flat" (rows still need the composite hydrate), but the every-user scan + JS pipeline is gone. ~15 branch combinations, all covered by the 17 Phase 0 `admin-users-*` goldens — byte-identical after the rewrite.

Also: narrow `getAuthUser`'s projection (6d, deferred from Phase 3), with its own audit of every `req.user.*` read.

**🔧 FRONTEND FIX (optional, coordinate separately):** `frontend/lib/api.ts:783` `adminUsers` and `:856` `adminAdBookings` are **dead functions whose declared types contradict the backend** (they claim `User[]`/`AdBooking[]`; the endpoints return `{items,total,page,totalPages,summary}`). Delete them. The UI already uses `adminApi.ts`'s versions.

---

### Phase 7 — Remainder + demolition  ◐ sweep started 2026-09-01
**Medium · Contract impact: ✅ none** · progress: [Phase 7 — Implementation log](#phase-7--implementation-log)

Monetization (`boosts`/`myAds`/`ads`/`entitlements`/`payment-records`), admin, notifications, chat, AI. Then delete `lib/store.js` + `lib/pg-store.js` when the architecture test reports zero consumers. Also folds in: `inquiries.js` `resolveTargets` fan-out, `routes/users.js` `/me/listings` + `/me/analytics` seller-dashboard scans (deferred from Phase 6), C8 (AI degraded-status flag).

**Approach (owner call 2026-09-01): sweep the small `store` consumers first** — the 1–5-call route files graduate onto `repoForCollection` / `identity` quickly, shrinking the `store.js` consumer list before the bigger monetization + AI clusters.

`routes/ai.js` (856) and `assistant.js` (970) are 1,826 lines of *orchestration over other domains* — they modularize **last**, into a thin `modules/ai/` calling only other modules' public ports, never their repositories. Their internal logic (`lib/nlp.js`, intent detection, `lib/claudeCli.js`) moves largely unchanged. Fix C8 here: return a distinguishable status or an explicit `degraded` flag when the AI path fails, rather than a 200 that looks normal.

---

## Phase 7 — Implementation log

**Status: sweep in progress (2026-09-02). Small `store` consumers done through sweep-3 (`searchTrends`); 7-social cluster is next, then monetization / inquiries / me-dashboard / AI clusters + the `store.js` demolition. 117 pass.**

| Pass | State |
|---|---|
| **7-sweep-1 — small consumers** | ◐ **2026-09-01 (`706fbe3`).** Surgical 1–2-call swaps: `routes/reports.js` `store.nextId`+`store.insert("reports.json")` → `repoForCollection("reports.json").insert(doc, "rpt")` (response rebuilt to the exact old shape — the repo row also carries null `resolvedBy`/`resolvedAt` the old handler didn't echo); `routes/ads.js` `store.all("ad-bookings.json")` → `repoForCollection("ad-bookings.json").findMany({})` (same id-ASC, same mapper); `routes/applications.js` `store.findMany("users.json", pred)` → `identity.hydrateUsersByIds`, `store.getById("users.json")` → `identity.getAuthUser` (dead `store` require removed); `routes/reviews.js` POST existence check `store.getById("users.json")` → `identity.getAuthUser` (dead `store` require removed). `reports.json`/`ad-bookings.json` NOT added to `GRADUATED_COLLECTIONS` — `routes/admin.js` still writes both. `applications-received`/`applications-mine` goldens byte-identical; new `test/applications.querycount.test.js`. 115 pass. |
| **7-sweep-2 — recruitment-admin lists** | ✅ **2026-09-01 (`0991bfc`).** `routes/adminEmployers.js` `GET /` + `GET /pending` off `store.findMany("users.json", u => !!u.employerProfile)` (full composite scan) → `identity.getEmployerUserIds([status])` (indexed `employer_profiles` probe, user_id-ASC) + `identity.hydrateUsersByIds`; **approve/suspend finally wired to `identity.setEmployerApproval`** (response `{id,status}` unchanged; its `statusDecidedBy/At` keys aren't `employer_profiles` columns so the mapper drops them — stored shape identical). `routes/adminJobs.js` `store.all("jobs.json")` + `store.all("users.json")` → `recruitment.jobsRepo.findMany({where})` (status/employerId → SQL) + `identity.getEmployerStatusCards` (`identity_employer_cards` view) for just the employerIds present; `q`/sort/page unchanged. Old-vs-new byte-identical for both across status/q/page variants (no goldens). New `test/recruitment-admin.querycount.test.js`. 116 pass. `jobs.json`/`applications.json` still can't join `GRADUATED_COLLECTIONS` — `routes/admin.js` analytics + `GET /users/:id` still read them. |
| **7-sweep-3 — search trends** | ✅ **2026-09-02.** `routes/searchTrends.js` dropped `lib/store` entirely. `store.readJsonl("search-events.jsonl")` (×2) → `directory.readSearchEvents()` — new `modules/directory/repository/searchTrends.repository.js`, which creates `lib/db/search-events`'s mapper against `_shared/pool` and exposes `readAll()` (byte-identical; the jsonl ledger never graduates onto `repoForCollection` — flat collections only, this port is how the route reaches it). `store.all("categories.json")` (×2) → `repoForCollection("categories.json").findMany({})`. The 14-day-window / city-substring / group-by passes stay in the route (JS) — no golden here, SQL push-down deferred. Equivalence proven: `search-events` (33 rows) + `categories` slug→name (280 rows) identical old-vs-new; `/trending` + `/popular` + `POST /log` unchanged. New `test/searchTrends.querycount.test.js` (route source has no `lib/store` require; both endpoints issue `FROM search_events` + `FROM categories`). `categories.json` NOT added to `GRADUATED_COLLECTIONS` — other routes still read it via `store`. 117 pass. |
| **7-sweep-4+** | ⏳ `routes/referral.js` (`store.withLock`/`readJson`/`writeJson` on `referrals.json` — needs a concurrency call; take it with monetization). |
| **7-monetization** | ⏳ `routes/boosts.js` (12), `routes/myAds.js` (6), `routes/entitlements.js` (5), `routes/adminInquiries.js` (9), the `routes/admin.js` monetization surface (37 calls total). |
| **7-social** | ⏳ `routes/follow.js` (10), `routes/shortlist.js` (8), `routes/stories.js` (12), `routes/collections.js` (10), `routes/blogs.js` (10), `routes/categorySuggestions.js` (13). |
| **7-inquiries** | ⏳ `routes/inquiries.js` (11) — `resolveTargets` fan-out over `store.all("listings.json")` + `store.all("users.json")` + `leads-ledger` coupling. Most entangled. |
| **7-me-dashboard** | ⏳ `routes/users.js` `GET /me/listings` + `GET /me/analytics` (deferred from Phase 6). |
| **7-ai** | ⏳ `routes/ai.js` (856) + `routes/assistant.js` (970) → thin `modules/ai/` over other ports; fix C8 (degraded flag). LAST. |
| **7-demolition** | ⏳ delete `lib/store.js` + `lib/pg-store.js` once `architecture.test.js` reports zero `store` consumers in `routes/`. |

---

## Frontend Fix Register

Grep this list at every phase boundary. Everything not listed here is contract-stable by construction.

| Phase | Backend change | Frontend file | What to do | Blocking? |
|---|---|---|---|---|
| 1a | Mass-assignment allowlists | `frontend/lib/api.ts` `updateListing`/`updateJob` call sites; `/sell`, `/post-job` forms | ✅ **DONE 2026-08-31 — audit complete, no frontend change needed.** Every field the 4 callers post is inside the allowlist (`ListingsTab.tsx`, `ListingVerificationTab.tsx`, `post-job/page.tsx`, admin/recruitment job dashboards). | Resolved |
| 1b | Self-review → 403/404 | `frontend/lib/api.ts` `postReview` caller | ⏳ **Open (non-blocking).** Backend landed 2026-08-31. `request<T>` already throws `Error(json.error)`, so callers showing `err.message` are correct today; friendly-toast polish still wanted. | No |
| 1c/1d | Rate limiting → **429** (a status this API has never returned) | `frontend/lib/api.ts:158-163` | ⏳ **Open — still required.** Backend landed 2026-08-31 (`code:"rate_limited"` in the body). Add a `429` branch beside the `401` handling; friendly retry message. Until then a 429 surfaces as a raw thrown `Error` (not a silent no-op, but not friendly). | ⚠️ Yes |
| 1f | `/api/listings` gains a `limit` cap | `getListings` call sites | ✅ **DONE 2026-09-01 — no frontend change needed.** Cap set to **1000**, above every real caller (`AdsTab` 500, `CollectionsTab`/`SupplierPicker` 200, `vendorAuthors` 100). A caller asking for `>1000` would get a truncated page — none do. | Resolved |
| 2 | Shared kernel (`modules/_shared/`) | — | ✅ No frontend change. No route touched; `errorHandler` only *adds* a `code` key for typed errors (additive). | Resolved |
| 3 | Identity read-port; `authGuard` loads `req.user` via `identity.getAuthUser` | — | ✅ No frontend change. `getAuthUser` returns the byte-identical user doc (proven by `test/identity.test.js`); `req.user` unchanged. | Resolved |
| 1e | pino logger + `req.id` + access log | — | ✅ No frontend change. Adds an `X-Request-Id` **response header** (additive, not consumed by the client); no body/status change. | Resolved |
| 4a–4f | Recruitment module (`modules/recruitment/`) — extraction + repositories + `GET /api/jobs` SQL rewrite + explicit mount ordering | — | ✅ No frontend change. Pure refactor; routers stay thin glue. 4c's zod schemas use a recruitment-local `validateBody` keeping the exact current 400 shape `{success:false,error:"<same message>"}`. 4e rewrote the browse query (11→1) but the `{jobs,total,page,totalPages}` response is byte-identical — `jobs-browse`/`jobs-page2`/`jobs-filter-function`/`job-detail` goldens unchanged; the `employer` sub-object is the same 7 keys. 4f only reorders `app.use` mounts (distinct prefixes; all before `/api/admin`). Goldens byte-identical throughout. | Resolved |
| 5a–5f + 5-loose | Directory module (`modules/directory/`) — categories counts via GROUP BY; `reviews.json` writers + `0014` CHECK; `GET /api/listings` browse + `adminListings`/`moderation` queues + `brands` endpoints + both `reviews.js` homepage feeds (`/recent`, `/recruitment-recent`) off the full composite/`users` scans; atomic listing view counter (C2); `resolveSellerLocations` out of `routes/` | — | ✅ No frontend change. Categories `listingCount`, `POST`/`GET /api/reviews`, `GET /api/listings` (`seller` = JOIN, same 11 keys), the admin listing/moderation queue rows, `GET /api/brands`, and both review feeds are all byte-identical (old-vs-new proven for each; the untouched `brands` golden is the proof the 5f lean rows are faithful; new `reviews-recent`/`reviews-recruitment-recent` goldens lock the feed shapes). The `0014` CHECK only fires on a self-review the app already 403s. 5d's view counter is atomic + `views` is a golden VOLATILE_KEY. Composite listing document writes (bulk import, PUT) untouched. Goldens byte-identical throughout. | Resolved |
| 6a | `GET /api/admin/users` rewrite (`identity.adminUserPage` + `hydrateManyByIds`) | — | ✅ No frontend change. All 17 `admin-users-*` goldens byte-identical — `{items,total,page,totalPages,summary}` shape, row shape (`adminUserRow` unchanged), branch counts, and createdAt-desc ordering all preserved. | Resolved |
| 6a-sec | `routes/admin.js` `plans`/`ad-slots`/`payments` writes → `pick` allowlists (1a-admin) | — | ✅ No frontend change. Allowlists = (mapped columns − id − timestamps), a superset of every field the admin forms send; only injected `id`/`createdAt`/unknown keys are newly dropped. `test/admin-write-allowlist.test.js` proves legit fields still round-trip. | Resolved |
| 6b | `routes/users.js` public seller/employer surface (`:slug` lookups, `/sellers`(+`/featured`), `:slug` listings/jobs, slug-uniqueness) off the `store.all`/`findOne`/`findMany` scans → `identity` + `directory` + `recruitment` reads | — | ✅ No frontend change. `sellers-featured` / `seller-detail` / `employer-detail` goldens byte-identical; `GET /api/sellers` (no golden) proven identical old-vs-new across q/page/limit incl. tie-ordering (`getApprovedSellerIds` is `user_id`-ASC so the stable JS sort ties break identically). | Resolved |
| 6c | `routes/auth.js` register/verify-otp/login → `identity.getUserByMobile`/`getUserByEmail` (indexed probes, were full-user scans) | — | ✅ No frontend change. Same envelopes, same 401/403/409 codes + messages; `test/auth.behavior.test.js` (new) pins the credential-path contract (goldens skip security endpoints). | Resolved |
| 6d | `identity.getAuthUser` strips `passwordHash` from `req.user` | — | ✅ No frontend change. `GET /api/auth/me` already `sanitizeUser`d the hash out, so its response is unchanged; every other authed endpoint that echoes the user also sanitizes. Defence-in-depth only. | Resolved |
| 7-sweep-1 | `reports`/`ads` → `repoForCollection`; `applications`/`reviews` `users.json` reads → `identity` | — | ✅ No frontend change. `POST /api/reports` response rebuilt to the exact old field set; `GET /api/ads` same docs/order; `applications-received`/`-mine` goldens byte-identical; `candidateMiniOf` fed the same full doc via `getAuthUser`/`hydrateUsersByIds`. | Resolved |
| 7-sweep-2 | `adminEmployers` (list/pending/approve/suspend) + `adminJobs` off the `store.all(users/jobs)` scans → `identity` + `recruitment.jobsRepo` | — | ✅ No frontend change. Both endpoints golden-less; old-vs-new proven byte-identical across status/q/page variants. `setEmployerApproval`'s `statusDecidedBy/At` aren't `employer_profiles` columns → mapper drops them, stored + response shape identical. | Resolved |
| 7-sweep-3 | `searchTrends.js` event reads → `directory.readSearchEvents()`; category lookups → `repoForCollection("categories.json")`; route drops `lib/store` | — | ✅ No frontend change. `/api/search/trending`, `/api/search/popular`, `POST /api/search/log` unchanged — same data source underneath (`lib/db/search-events` mapper, same flat `categories` mapping), all JS filtering/aggregation untouched. Equivalence proven old-vs-new (33 event rows, 280 category rows). | Resolved |
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
cd backend && npm run test:setup   # once / after a dev-DB change — builds bharatsource_test
cd backend && npm test             # 117 pass as of Phase 7 sweep-3

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
| 0 Safety net | small | none | prerequisite | ✅ — **landed 2026-09-01** (golden harness · pagination edge tests · architecture test · `PG_URL_TEST` DB; 76 pass. Follow-ups: pinned seed, authed-recruitment goldens — see Phase 0 Implementation log) |
| 1 Security + cross-cutting | **small** | low | **highest** | 🔧 3 fixes — **partially landed 2026-08-31** (1a/1b/1c/1e-core/1g/1h + 1d-partial done & tested; 1e-pino/1f done later; **1a-admin done 2026-09-01 (Phase 6a-sec)**; 1d-full/1i still deferred — see Phase 1 Implementation log) |
| 2 Shared kernel | small | low | prerequisite | ✅ — **landed 2026-09-01** (`modules/_shared/` + `differential.test.js`; 85 pass; no route touched). Plus standalone follow-ups: **1f wiring** + **1e-pino** done. Remaining: `store.js` deprecation notice. See Phase 2 Implementation log. |
| 3 Identity read-port | medium | medium (auth path) | high | ✅ — **landed 2026-09-01** (`modules/identity/` + `identity.test.js`; `authGuard` repointed; 91 pass; goldens unchanged. Deferred to P4: `identity_*_cards` views, `employerMiniOf` move — see Phase 3 Implementation log) |
| 4 Recruitment | large | low (gated off) | template | ✅ — **COMPLETE 2026-09-01** (HEAD `2aa9589`; `modules/recruitment/` owns jobs+applications+taxonomy repos + the browse SQL rewrite (11→1 queries, `identity_employer_cards` view) + explicit mount ordering; routers thin; C2 closed for recruitment; 98 pass, goldens byte-identical throughout). |
| 5 Directory | very large | high (live traffic) | highest perf | ◐ — **5a–5f + the `reviews.js` feed loose end landed 2026-09-01** (HEAD `e24922e`; `modules/directory/` — categories counts via GROUP BY, `reviews.json` writer flip + `0014` CHECK, browse + admin/moderation queues + `brands` + both homepage review feeds off the composite/`users` scans, atomic view counter (C2), route→route import killed; 108 pass). Only **5c-2** (search/facets SQL — blocked, needs owner call) + **`inquiries.js`** (`resolveTargets` fan-out + `leads-ledger`) remain; composite listing document writes stay on `store` by design — see Phase 5 Implementation log. |
| 6 Identity module | large | high | high | ✅ — **COMPLETE 2026-09-01** (HEAD `bc7a431`; `GET /api/admin/users` → `identity.adminUserPage` + `hydrateManyByIds` (17 goldens byte-identical); `routes/admin.js` `plans`/`ad-slots`/`payments` writes → `pick` allowlists (1a-admin closed); whole `routes/users.js` public seller/employer surface + `routes/auth.js` register/verify-otp/login off `store.all`/`findOne`/`findMany` scans → indexed `identity` reads; `req.user` no longer carries `passwordHash` (6d); 114 pass, goldens byte-identical throughout). `/me/listings` + `/me/analytics` seller-dashboard scans deferred to Phase 7. |
| 7 Remainder + demolition | medium | low | closure | ◐ — **sweep in progress 2026-09-02** (sweep-1 `reports`/`ads`/`applications`/`reviews`, sweep-2 `adminEmployers`/`adminJobs`, sweep-3 `searchTrends` off the `store` scans → `repoForCollection` / `identity` / `directory` ports; 117 pass). Small-consumers-first per owner call; social + monetization + `inquiries` + AI clusters + `store.js` demolition ahead — see [Phase 7 — Implementation log](#phase-7--implementation-log). |

### Fitting this into a 2-day agent budget

**Achievable in 2 days: Phases 0 → 4.** That is the safety net, every security fix, the repository seam, the identity read-port, and the full recruitment module as the proven template. Suggested split:

- **Day 1 — Phases 0, 1, 2.** Phase 1 alone is most of the near-term value and depends on none of the restructure. Ending day 1 here is a complete, shippable outcome even if day 2 never happens.
- **Day 2 — Phases 3, 4.** Recruitment is gated off in production (`RECRUITMENT_LIVE=false`), so this is the one large phase that can move fast without live-traffic risk.

**Not achievable in 2 days: Phases 5, 6, 7.** Phase 5 alone is ~3,000 route lines against live Directory traffic, including the `lib/search.js` rebuild and the 170-line bulk-import path. Compressing it into the same window means shipping the `.slice()` → `LIMIT` rewrites without golden coverage — which is exactly the failure mode listed under *Where this typically goes wrong*. Treat 5-7 as follow-on work; the template built in Phase 4 is what makes them mechanical when you get to them.

**The real rate limit is the gates, not the code.** Each phase's gate — golden diffs, the differential repository test, the query-count assertion — needs a human to look at it. An agent can produce Phase 4 in an afternoon and still be wrong in a way only the goldens reveal. Budget the review, not the writing.
