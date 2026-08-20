# WORKFLOW.md — living work tracker

This is a **running log**, not a spec. CLAUDE.md / HANDOVER.md / DIRECTORY.md / SECURITY.md
describe what the app *is*; this file tracks what changed, when, why, and what's still open —
so the next session (human or AI) can pick up without re-deriving context. Read the docs in
their usual order first (CLAUDE.md → HANDOVER.md → DIRECTORY.md), then this file for
"what's happened since DIRECTORY.md was last accurate."

**Convention:** newest entry at the **top** of §3. Each entry: what changed, why, files
touched, how it was verified, and anything left open. Don't rewrite history — append.

---

## 1. Baseline — what already existed (condensed from CLAUDE.md / DIRECTORY.md)

A multi-product suite: **Directory** (`/directory`, live, lead-based B2B/B2C marketplace) and
**Consultations** (`/consultations`, live, expert booking) share one engine; **Credit Card** /
**Mutual** are coming-soon placeholders. One account across all products. No payments, no
cart — every product is lead/enquiry based.

- **Frontend:** Next.js 14 App Router + TypeScript, `:3000`. Single typed API client
  (`frontend/lib/api.ts`). Design system in `frontend/app/globals.css` (brand `#2563EB`,
  action `#F97316`, no emojis, native `<select>`, local `/demo/*` images only).
- **Backend:** Express (CommonJS), `:4000`. Every route: `try/catch → next(err)`, response
  envelope `{success, data}` / `{success:false, error}`. Storage through `backend/lib/store.js`
  only — never touch a DB file/table directly.
- **Storage — reality check (see §2 below):** CLAUDE.md documents file-based JSON under
  `backend/DB/` as the architecture. **In this environment `backend/.env` has `PG_URL` set**,
  so `lib/store.js` actually dispatches to `lib/pg-store.js` (Postgres) — see
  POSTGRES-MIGRATION.md. Same interface either way (`all/findOne/findMany/getById/insert/
  update/remove/writeJson`), so route code doesn't care, but **seed/data work does** — see §2.
- **AI:** local `claude` CLI (`backend/lib/claudeCli.js`), deterministic search first,
  AI refines weak/empty queries only. Never blank.

**User flows (full detail: DIRECTORY.md §3):**
- **Main user:** register/login (`/register`, `/login`, redirect to `/` on success) — one
  identity, no company/business fields collected here. Their own account details (name,
  city/state, contact visibility, interests) live at **`/profile`** — a standalone page, not
  part of the Directory dashboard. No "dashboard" concept exists for a plain main user.
- **Buyer:** land/search (`/`, `/directory`, AI concierge) → browse category or keyword
  search → listing detail (view-tracked) → enquiry or broad RFQ (`/rfq`, fans out to ≤6
  sellers → `leads-ledger.jsonl`) → see quotes in dashboard → review seller.
- **Seller:** register (main user) → add business details from the **Directory dashboard's
  Profile tab** (`/dashboard?tab=profile` → "Become a seller" form: company name, GST,
  location) — or skip straight to `/sell` and publish a first listing, which auto-creates a
  minimal seller profile — either path unlocks the full tabbed dashboard (overview /
  analytics / listings / leads & RFQs / promote / bulk upload / inbox / **advertise** /
  reviews / blogs / stories / subscription / profile) → leads come in, reply with quotes.
  (`myrfqs` and `referral` stay available to any main user, seller or not — they aren't
  Directory-seller concepts.)
- **Admin (`/admin`):** approve/suspend sellers, categories CRUD, monetization/plans, ad
  slots + booking approval, moderation, verification, collections, feature entitlements,
  site config. Category/product/listing *administration* (taxonomy, moderation, approvals)
  is Admin's job; sellers still self-serve their own listings — Admin doesn't do sellers'
  data entry for them. One admin panel today; a split "main admin" vs. "Directory admin" is
  future work, not done.
- **Navbar profile-icon dropdown** differs by context: on Directory pages (and `/dashboard`
  itself) it offers **Dashboard** + **Profile** (→ `/dashboard?tab=profile`, business
  details) + Admin (if applicable); everywhere else it offers just **Profile** (→
  `/profile`, basic account) + Admin (if applicable).

**Main user vs. service profile.** One account (`users` table) is the identity across the
whole suite. A generic main user gets **no service-specific dashboard** — just their own
Profile — until a service attaches its own profile record to that same user (today:
`seller_profiles`, used by both Directory and Consultations — a Consultations "expert" is
just a seller whose `sellerProfile.expert` block is set). This is the pattern any future
service (Recruitment: employer company profile, or a job-seeker profile) should follow when
it's actually built — one login, per-service profile + dashboard, Zoho-style. Nothing is
built for Recruitment yet (still a coming-soon placeholder); this is documented now only so
the next person building it doesn't reach for a shared "main dashboard" concept instead.

**Feature inventory (Done / Partial / Missing):** see DIRECTORY.md §4 — this file doesn't
duplicate it, only tracks deltas against it.

---

## 2. Standing gotchas discovered this session (add to your mental model)

- **Postgres is live here, not file-mode.** `backend/.env` → `PG_URL` is set. Any seed/debug
  script that calls `store.insert/update/writeJson` writes to **Postgres only** — it does
  **not** also update the matching `backend/DB/*.json` file. If you want a fix or seed data to
  survive a fresh `migrate-all.js` run or a file-mode deployment, you must **also** hand-edit
  the JSON file (see the `ad-slots.json` fix in §3, which needed both).
- **`store.writeJson(coll, docs)` replaces the WHOLE collection** (deletes any row not in
  `docs`). Never use it to add data — use `store.insert(coll, doc, idPrefix)` per row instead.
  All new seed scripts in §3 follow this.
- **FK constraints exist in the Postgres schema that the JSON-file world never enforced.**
  E.g. `ad_bookings.ad_slot_id` → `ad_slots.id` (see the advertising bug in §3). When adding a
  new `id`-like string value anywhere (placements, category slugs used as FKs, etc.), check
  `backend/lib/db/schema.sql` for a matching `REFERENCES` clause before assuming a bare string
  insert will succeed.
- **Dev-mode first-hit latency.** `next dev` compiles a route on first request; a fresh page
  load can take several seconds before client fetches resolve. Don't mistake this for a bug
  when testing manually (see the headless-Chrome verification in §3, entry for advertising).
  `frontend/package.json`'s `dev` script now runs `next dev --turbo` (2026-08-19) to shrink
  this, and `components/RouteProgress.tsx` gives a visible top-bar signal that a click
  registered even while a route is still compiling — but the underlying one-time-per-route
  compile delay is inherent to `next dev` and hasn't been eliminated, just made visible/faster.
- **Before caching a slow endpoint, check whether it's actually an N+1 query problem.**
  `lib/db/listings.js`/`lib/db/users.js`'s composite mappers ran several queries **per row**
  in a loop (2026-08-19 fix, see §3) — caching that pattern would have hidden a ~1000x-worse
  query count behind a warm cache instead of fixing it. Any new Postgres composite mapper's
  `all()` must batch every child-table read once across all row ids
  (`WHERE id = ANY($1)`), never loop per-row.
- **Shared/session-wide frontend data goes through a Context provider, not a per-component
  fetch.** `lib/catalog.tsx` (`useCategories`/`useCategoryTree`/`useBrands`/`useFeaturedSellers`)
  fetches once per session — check there before adding a new `useEffect` that calls
  `getCategories()`/`getBrands()`/`getFeaturedSellers()` directly; several independent
  per-component fetches of the same data was the direct cause of the "first click does
  nothing" bug fixed 2026-08-19 (see §3).

---

## 3. Change log (newest first)

### 2026-08-20 (2) — Seller contact (Call/WhatsApp) now requires login; "Chat with seller" removed from the listing and seller-profile pages; sellers no longer see contact buttons on their own listing/profile

**Why:** `GET /api/sellers/:slug` returned a seller's `contactMobile`/`contactEmail` to **any**
unauthenticated request — anyone could pull a phone number straight off a public listing or
seller page without an account. Product-owner direction, IndiaMart-style: browsing, the
company profile, ratings, and listings all stay fully public; only the direct Call/WhatsApp
channel requires login. "Chat with seller" was removed from these two pages at the same
time — there's no in-app chat feature actually being finished/hardened (DIRECTORY.md already
flags realtime chat as partial/unverified), and the button was a dead end into it. Separately
requested as a follow-up: a seller viewing their own listing/profile shouldn't see Call/
WhatsApp buttons at all.

**Backend:**
- `backend/routes/users.js` — `GET /sellers/:slug` now runs through `optionalAuth` (was fully
  public, no middleware). `publicSeller(user, includeContact)` strips `contactMobile`/
  `contactEmail` from the response unless `includeContact` (`= !!req.user`) is true; every
  other field (ratings, badges, location, listings) is unchanged for logged-in and logged-out
  callers alike.

**Frontend:**
- New `frontend/components/auth/ContactAuthModal.tsx` — inline modal (mobile-OTP login,
  email/password login, register), reusing the exact same flows/validation as
  `app/login/page.tsx`/`app/register/page.tsx` rather than inventing new auth logic. Fires
  `onSuccess()` and closes on a successful login/register.
- `frontend/components/listing/SellerContactCard.tsx`, `frontend/components/seller/SellerHeader.tsx`
  — removed "Chat with seller"/`handleChat`/`createConversation`. Call/WhatsApp: logged in →
  unchanged real `tel:`/`wa.me` links (pre-filled enquiry via `lib/whatsapp.ts`, unchanged);
  logged out → the same buttons open `ContactAuthModal` instead of a dead link (the backend
  already omits the number, so there's nothing to link to yet regardless). Both also now hide
  Call/WhatsApp entirely when the logged-in viewer **is** that listing/profile's own seller
  (`user.id === seller.userId` / `=== userId`).
- `frontend/app/listing/[id]/page.tsx`, `frontend/app/seller/[slug]/page.tsx` — added a
  `refreshContact` callback (re-calls `getSeller(slug)`) passed down as `onContactUnlocked`,
  because logging in doesn't retroactively add the now-authorized field to state that was
  already fetched while logged out — see the gotcha added to CLAUDE.md §9 this round.

**Verified:**
- `cd frontend && npx tsc --noEmit` clean throughout.
- Backend restarted; `curl /api/sellers/<slug>` with no `Authorization` header →
  `contactMobile`/`contactEmail` both `undefined`, all other fields (companyName, rating,
  badges) present and unchanged. Same call with a valid Bearer token (demo login
  `rohan.mehta@example.com` / `demo123`) → real `contactMobile`/`contactEmail` returned.
- Reproduced `lib/whatsapp.ts`'s `waLink()` output for the fetched seller's real number
  (`9898989807`) — confirms the `wa.me` link targets that seller's **own** number (not a
  shared/generic one) with a message naming the seller and "BharatSource".
- **Not** click-tested in an actual browser this session (no browser automation available) —
  the modal's open/close, in-modal login/register, and post-login button-unlock are traced
  through the code and reuse API/auth calls the full `/login`/`/register` pages already prove
  out, but the modal UI itself and the own-listing hide-button behavior are visually
  unverified.

**Files touched:** `backend/routes/users.js`, `frontend/components/auth/ContactAuthModal.tsx`
(new), `frontend/components/listing/SellerContactCard.tsx`,
`frontend/components/seller/SellerHeader.tsx`, `frontend/app/listing/[id]/page.tsx`,
`frontend/app/seller/[slug]/page.tsx`, `CLAUDE.md`, `DIRECTORY.md`, `WORKFLOW.md`

**Open / follow-up:**
- Visual/click confirmation of the modal (both login tabs, register, own-listing hide-button
  case, mobile width) once a browser is available.
- `backend/routes/reviews.js`'s `GET /recent` also returns an unauthenticated `whatsappNumber`
  (same class of leak) — not gated this round since its only frontend consumer,
  `components/home/RecentActivity.tsx`, isn't mounted on any page today. Worth the same
  `optionalAuth` treatment if that component ever gets wired up.
- `publicSeller()` still spreads the rest of `sellerProfile` wholesale (plan/quota/boost/
  admin-notes fields) regardless of auth — a pre-existing over-exposure, unrelated to this
  round's fix, flagged but not addressed.
- Explicitly out of scope, per product-owner decision: the dashboard Inbox tab, Socket.IO,
  `/api/chat`, and the `conversations`/`messages` collections are untouched — only the two
  *entry points* into chat from buyer-facing Directory pages were removed.

### 2026-08-20 (1) — Seller Stories/Highlights reworked: new `SellerStoriesSection` (New/Highlights toggle) replaces `HighlightsRow` on the seller profile; StoryRail and the dashboard Stories tab overhauled; demo seed scripts added

**Why:** committed as a checkpoint of in-progress Stories-feature work already in the working
tree at the start of this session (product-owner request: commit it separately before starting
unrelated work, so it shows as its own diff). Commit `d34e7bb`.

**Changes (from the diff, `19 files changed, 1410 insertions(+), 440 deletions(-)`):**
- `backend/routes/stories.js` — gained `GET /active` (a seller's currently-live, not-yet-expired
  24h stories) and `DELETE /:id` (`authGuard` — a seller removing their own story), alongside
  the pre-existing `GET /`, `GET /highlights`, `POST /`, `PUT /:id/highlight`, `POST /:id/view`.
- `backend/routes/users.js` — `GET /sellers/:slug` response gained top-level `id`/`name`/
  `avatarUrl`/`city`/`state` fields (alongside the existing nested `seller` object) — the
  seller page's Stories tab needs the seller's own user id/avatar independent of the
  `sellerProfile` blob.
- `frontend/components/seller/SellerStoriesSection.tsx` (new, replaces the deleted
  `HighlightsRow.tsx`) — renders on the seller profile's "Stories" tab
  (`app/seller/[slug]/page.tsx`) with a New/Highlights toggle over a horizontally-scrolling
  rail, shown when either the `stories` or `storyHighlights` feature flag is on.
- `frontend/components/StoryRail.tsx`, `frontend/components/dashboard/StoriesTab.tsx` —
  substantially reworked (197 and 429 changed lines respectively); dashboard-side story
  creation/management and the homepage/directory rail both touched. Internals not re-derived
  line-by-line for this log entry — read the files directly for current behavior.
- `frontend/app/directory/page.tsx` — Stories section repositioned/simplified (net -85 lines
  in a page that's otherwise just section composition).
- New backend seed scripts: `scripts/seed-demo-stories.js`, `scripts/seed-steel-demo-stories.js`,
  `scripts/seed-steel-active-highlight-demo.js` — demo data generators for the reworked
  feature, following the existing `scripts/seed-*.js` convention (HANDOVER.md).
- Minor touches: `frontend/components/Footer.tsx` (204 changed lines — unrelated footer
  rework bundled into the same commit), `frontend/app/globals.css`, `frontend/app/layout.tsx`,
  `frontend/lib/api.ts`, `frontend/lib/config.tsx`, `frontend/lib/types.ts`,
  `backend/DB/settings.json` (feature-flag defaults).

**Verified:** `npx tsc --noEmit` clean (checked as part of the broader session's verification
loop; not re-run in isolation against just this commit).

**Open / follow-up:**
- This entry documents a commit made from pre-existing working-tree changes, not code written
  in this session — treat the "Changes" list above as a diff summary, not a design rationale.
  If the Stories feature needs deeper documentation (data model, flag semantics, highlight
  lifecycle), read `backend/routes/stories.js` and `StoriesTab.tsx` directly and add it here
  next time they're touched.
- Not visually verified (no browser automation available this session).

---

### 2026-08-19 (2) — Fixed app-wide "first click after page load does nothing" bug: batched a severe Postgres N+1 query pattern, deduped redundant frontend fetches, added click-feedback UI

**Why:** reported as "on load of the app, clicking any link does nothing the first time, works after a few seconds" — worst on `/directory`, but also present on the plain suite homepage's footer links. Investigation found **two independent, stacking mechanisms**, not one bug:
1. **Universal (every route, even fetch-free ones):** `next dev` compiles each route on demand after a (re)start, with zero visual feedback (no `loading.tsx` anywhere in the app) — a click during that compile looks identical to a broken click.
2. **Compounding on data-heavy pages:** `frontend/lib/api.ts` had no caching/de-dup (`cache: "no-store"` on every call), so independently-mounted components each re-fetched the same data — `/directory` fired `getCategories()` 3x, `getBrands()`/`getFeaturedSellers()` 2x each, ~15-20 concurrent requests on mount, saturating the browser's ~6-connections-per-origin cap and queuing the click's own navigation request behind the burst.

Backend investigation (see WORKFLOW.md §2 gotcha "Postgres is live here") then found the *real* root cause underneath #2: this environment runs Postgres (`PG_URL` set), and the original plan's file-DB caching layer (`backend/lib/store.js`) is a dead code path here. The actual bottleneck was **a severe N+1 query pattern** in the Postgres composite mappers: `lib/db/listings.js`/`lib/db/users.js`'s `all()` ran up to 4-8 sequential queries *per row* (media, product, specs, price tiers, variants, service, rate card, portfolio / seller profile, locations, expert profile, case studies, legacy) to reassemble each document. For ~700 listings that's 3,000-4,000 round-trips for one `store.all("listings.json")` call — raw Postgres itself answers a `SELECT * FROM listings` in ~18ms; the mapper layer was the cost.

**Backend changes:**
- `backend/lib/db/listings.js`, `backend/lib/db/users.js` — rewrote `all()` to batch every child-table read ONCE across all row ids (`WHERE id = ANY($1)`, grouped by id in JS) instead of looping per-row. `getById()`/single-row paths untouched (correct as-is, N=1). New `hydrateFromMaps()` in each file builds a doc synchronously from the pre-fetched maps; verified **byte-identical** output against the original per-row `hydrate()` path (product/service/media/location/expert/locations/legacy all diffed equal).
- `backend/lib/store.js` — added an in-memory read cache (`readJson`/`writeJson` keep a `Map<name, parsed>`, shallow-cloned on read so callers can't corrupt the cache by mutating their own copy) + `getVersion(name)` (monotonic counter bumped on every write). Lives in the file-DB branch only — **currently dormant in this environment** since Postgres is active, but correct and ready for local dev/CI without `PG_URL`.
- `backend/lib/pg-store.js` — added a `getVersion()` stub (`Date.now()`) so routes calling it don't crash under Postgres; effectively disables the Layer-2 memoization below when Postgres is active (every check reads as "changed"), which is fine — the batching fix above is what actually mattered on this backend.
- `backend/routes/categories.js`, `backend/routes/brands.js`, `backend/routes/users.js` (`/sellers`, `/sellers/featured`) — added `store.getVersion()`-keyed memoization of the expensive derived computations (`computeListingCounts`, brand aggregation, seller `activeCounts` scan) so a burst of concurrent identical requests shares one computation. Real effect only in file-DB mode (see above), but harmless and correct under Postgres too.

**Frontend changes:**
- New `frontend/lib/catalog.tsx` — `CatalogProvider` (mirrors `lib/config.tsx`'s house pattern: fetch-once-on-mount, safe empty defaults, non-throwing hooks), exposing `useCategories()` / `useCategoryTree()` / `useBrands()` / `useFeaturedSellers()`. Mounted in `app/layout.tsx` right after `ConfigProvider`.
- Migrated the call sites causing the duplicate-request burst to the new hooks: `CategoryMegaMenu.tsx` (`useCategoryTree` now a thin re-export — its 4 existing callers needed zero changes), `DirectorySearchBar.tsx` (mounted 2x in Navbar), `AISearchBar.tsx`, `TrustBar.tsx` (4 calls → 1, just its own `getListings`), `TopBrands.tsx`, `FeaturedSellers.tsx`, `FloatingRfqButton.tsx`, `app/directory/page.tsx`, `app/search/page.tsx`.
- **Deliberately left `components/discovery/BrandRail.tsx` untouched** — its `slug` prop can be any category depth (root or sub-category; `/[category]` is a single dynamic segment matching either), but the brand aggregation's `categorySlugs` field only stores each brand's *root-level* category slugs. A client-side `categorySlugs.includes(slug)` filter would silently break the brand rail on sub-category pages. It already benefits from the backend batching fix indirectly since it's not part of the duplicate-request problem.
- `frontend/lib/api.ts` — `request<T>()` now de-dupes concurrent identical **GET** requests (same URL, in-flight at once) into one shared promise. Not a cache — cleared the instant the request settles. Covers cases outside the catalog data too, e.g. `/compare`'s page and the globally-mounted `CompareBar` both independently calling `getListing(id)` for the same ids.
- New `frontend/components/RouteProgress.tsx` — a slim top-of-viewport progress bar (2-3px, brand gradient), **not a full-page loader** per explicit direction. Starts on any internal `<a href>` click (document-level listener, skips external/mailto/tel/new-tab/modifier-clicks), completes when `usePathname()` changes, with an 8s safety auto-hide. Deliberately uses `usePathname()` only (not `useSearchParams()`, which would force a Suspense-boundary requirement onto the whole app from the root layout) — a query-only navigation (same path) just rides out the safety timeout instead of snapping to 100% instantly.
- `frontend/package.json` — `dev` script now `next dev --turbo`, cutting on-demand route-compile latency in local dev (mechanism #1 above). No effect on production builds. Confirmed `three` isn't actually imported anywhere despite being a dependency, so Turbopack has nothing unusual to transpile.

**Verified:**
- Backend: `/api/categories`/`/api/brands` direct timing ~850-900ms → ~30-90ms; a burst of 6 concurrent `/api/categories` requests (mimicking a real page-load fetch storm) dropped from serializing to ~5s down to 291ms total. Correctness: batched-hydration output diffed byte-identical against the unchanged single-row path for both listings (`product`/`service`/`media`/`location`) and users (`expert`/`locations`/`legacy`).
- Frontend: `npx tsc --noEmit` clean throughout.
- **Real headless-browser verification** (Playwright, installed temporarily via `npm install --no-save playwright` at repo root — gitignored, no `package.json`/lockfile changes, safe to remove or leave): on `/directory`, `getCategories`/`getBrands`/`getFeaturedSellers` each fired **exactly once** (previously 2-3x). A single click (no retry) on a cold `/directory` page navigated to `/consultations` in 243ms. Home page (`/`) footer link: single click navigated immediately. `RouteProgress` bar visibly rendered on click (confirmed via screenshot — gradient bar across the top edge). Zero console errors on either page load or navigation.
- **A real bug caught by this verification pass**: the first test run mistakenly checked `/api/users/sellers/featured` (404 — the actual mount is `app.use("/api", require("./routes/users"))`, so the real path is `/api/sellers/featured`), which meant an earlier isolated HTTP-timing check of that endpoint had been silently measuring a 404 handler's speed, not the real route. Caught and corrected before relying on it; the store-layer correctness check (bypassing HTTP, calling `store.all("users.json")` directly) was unaffected and had already confirmed the fix was correct.

**Also updated:** CLAUDE.md §2 (storage is now documented as Postgres-live, not file-DB-only), §3 (architecture diagram), §5 (store.js/N+1-batching conventions for future composite mappers), §6 (CatalogProvider/dedup conventions — check before adding a new per-component fetch), §7, §9 (dev-compile-latency and N+1-before-cache gotchas) — all per explicit request to keep the docs current.

**Open / follow-up (deliberately deferred, not forgotten):**
- `backend/routes/listings.js` `GET /` (search/rank/facets — the single most expensive endpoint, 3+ chained O(n) passes) wasn't touched. It isn't part of the *duplicate-request* bug this round targeted, and already has a different partial cache (`lib/search.js`'s MiniSearch index, TTL+count based). Worth a dedicated pass if `/search`/browse latency itself becomes the next target.
- Admin-panel call sites (`CategoriesTab`, `AdsTab`, `CollectionsTab`, `ListingVerificationTab`), and a handful of single-mount low-traffic pages (`app/sell`, `app/rfq`, `app/profile`, `app/categories`, `dashboard/AdvertiseTab`, `BulkUploadTab`) still call `getCategories()` independently instead of using `lib/catalog.tsx`. Not part of the reported bug (they don't co-mount with duplicates), pure consistency cleanup if ever touched.
- `frontend/components/suite/SuiteStats.tsx` appears to be **dead code** — it duplicates `TrustBar.tsx`'s exact fetch pattern but isn't imported/rendered anywhere found during this session's audit. Worth confirming and deleting in a future pass rather than leaving it as a trap for someone to "fix" later.
- A combined "directory bootstrap" endpoint (one round-trip for categories+brands+featured-sellers+trending, replacing several separate calls) was considered and explicitly not built — the frontend `CatalogProvider` fix already removes the duplication that motivated it.
- Playwright (installed for this session's browser verification) is sitting in the repo-root `node_modules/` (gitignored, `--no-save`) — harmless to leave for future verification passes, or delete if disk space matters.

### 2026-08-19 — Fixed the Navbar's docked search suggestions dropdown rendering part-transparent (page content ghosting through) on `/directory`

**Why:** reported as an intermittent visual bug — the suggestions dropdown "sometimes" looked fine,
other times showed the page's own cards ghosted through it. Root cause, found by tracing the DOM
tree rather than guessing at a rendering/GPU glitch: on `/directory` only, Navbar's docked copy of
`DirectorySearchBar` sits inside a wrapper `<div>` whose `style` carries
`opacity: searchDockProgress` — a 0→1 value driven by scroll position (HomeHero's hero search
docking into the navbar as it scrolls out of view; see `lib/searchDock.tsx`). `searchDockProgress`
allows pointer interaction once it passes 0.5 (`pointerEvents: "auto"`) but is only fully opaque at
1. CSS `opacity` on an ancestor cascades to **every** descendant uniformly — including the
suggestions dropdown, which is a child of `DirectorySearchBar`'s own root and therefore a
descendant of that wrapper too, even though it's positioned outside the wrapper's visual box via
`position: absolute`. So any time a user focused/typed while still mid-scroll-transition (fully
possible: interactive from 0.5, opaque only at 1), the whole dropdown — not just the bar — rendered
at that same partial opacity, letting the page section behind it show through. Confirmed present in
both the desktop (`nav:flex` row) and mobile (docked row below the `h-16` header) copies — same
wrapper pattern in both.

**Fix:**
- `frontend/components/DirectorySearchBar.tsx`: added an optional `dockStyle?: React.CSSProperties`
  prop, applied only to the `<form>` element (the bar's own visible chrome) — never to the
  component's root `<div>`, which also parents the suggestions dropdown (a sibling of `<form>`).
- `frontend/components/Navbar.tsx`: both docked-search blocks (desktop + mobile) no longer put
  `opacity`/`transform` on the wrapper `<div>` that parents `<DirectorySearchBar>` — that wrapper
  now carries only `pointerEvents` gating (a boolean, not a partial value, so it doesn't cause
  visual bleed-through). The scroll-linked `opacity`/`transform`/`transition` moved into the new
  `dockStyle` prop, landing on `<form>` only. The dropdown, a sibling of `<form>` inside
  `DirectorySearchBar`, is now never affected by `searchDockProgress` and always renders fully
  opaque once open, regardless of scroll position.

**Verified:** `cd frontend && npx tsc --noEmit` clean. Not yet re-checked visually against a live
scroll-and-focus repro (dev server not running this session) — next session/human should scroll
`/directory` to roughly the 0.5–0.9 dock-progress zone, focus the navbar search box, type 2+
characters, and confirm the dropdown is fully opaque immediately (desktop and mobile widths both).

### 2026-08-18 — Home hero moved off `AISearchBar` onto the same plain `DirectorySearchBar` as the rest of Directory; category chip now replaces the text box instead of sitting beside it; unsubmitted typed text no longer leaks across navigation; RFQ reachable (and pre-filled) directly from search; `/search`'s last duplicate search bar removed

**Why:** five follow-on problems from the last round, all confirmed by re-reading the code before
changing anything:
1. `HomeHero.tsx` was still the one remaining Directory instance of `AISearchBar` (suggestion
   dropdown, AI wording) while every other Directory page already used the plain bar built last
   round — asked to make the home page match, **without deleting `AISearchBar.tsx`** (it stays
   live for Consultations, its only other caller — "hide it, don't remove it from code").
2. The category chip rendered *before* the city selector, with the text input still visible next
   to it, so a pinned category and unrelated leftover typed text could show at once.
3. `searchDock`'s `query` was written on every keystroke with nothing distinguishing "typed" from
   "searched" and nothing clearing it on navigation — so typing text, then clicking an unrelated
   category/product card elsewhere, left that never-submitted text showing on the destination
   page's search box.
4. No direct, always-available way to jump from a search into "post a requirement" — only a
   zero-results empty-state link, and `/rfq` couldn't be pre-filled with what was typed.
5. `/search` rendered **two** search bars at once: the Navbar's persistent copy (Navbar's
   `NON_DIRECTORY_PATHS` exclusion list never excluded `/search`) *and* the page's own embedded
   copy, both bound to the same `searchDock` state.

**Changes:**
- `frontend/components/DirectorySearchBar.tsx`: added an optional `size?: "hero"|"compact"`
  prop (default `"compact"`, so the two Navbar usages are unaffected) for the bigger touch
  target/type needed on the home hero. Reworked state to **commit-on-submit**: a local `draft`
  holds what's being typed; `onQueryChange` (→ `searchDock.setQuery`) is only called from
  `submit()`, never from the input's `onChange`. A `usePathname()`-keyed effect snaps `draft`
  back to the last committed `query` on every route change, so anything typed but never
  submitted is discarded the moment you navigate away by any means other than actually
  searching. When `selectedCategory` is set, its pill now renders **in the input's own flex
  slot** (input isn't rendered at all) instead of to the left of the city selector — "a selected
  category" and "free-typed text" are mutually exclusive by construction, not by
  reconciliation. `submit()` gained a category-only path: pressing search with no typed text but
  a category pinned navigates straight to that category's page.
- `frontend/components/home/HomeHero.tsx`: swapped `AISearchBar` → `DirectorySearchBar
  size="hero"`. `AISearchBar.tsx` itself untouched — still fully live, still the only bar on
  `app/consultations/page.tsx`.
- `frontend/app/rfq/page.tsx`: reads `?need=` via `useSearchParams()` and pre-fills the
  free-text "what do you need" box with it on mount (only if still empty). Wrapped the page in
  `Suspense` (`RfqInner` + a `null`-fallback default export), matching the pattern
  `useSearchParams()` requires elsewhere in this codebase (`app/search/page.tsx`).
- `frontend/app/search/page.tsx`: removed the page's own embedded `DirectorySearchBar` entirely
  — `/search` now relies solely on the Navbar's copy, same as every other Directory page
  (category, listing, seller). Added a small effect resolving the `?category=` URL param's
  display name from the already-fetched category list and syncing it into `searchDock` (without
  clobbering a chip DirectorySearchBar's own submit already committed a moment earlier) so the
  Navbar's bar still reflects the current search with no embedded copy driving it. Added a
  persistent "Didn't find what you need? Post a requirement →" link (shown whenever there's a
  query) next to the results heading, and updated the existing zero-result `EmptyState` CTAs
  (both in this file and in `DiscoveryResults.tsx`) to link to `/rfq?need=<query>` instead of a
  bare `/rfq`.
- `frontend/app/globals.css`: fixed a stale comment above `.search-city-select` that only
  credited `AISearchBar.tsx` — that CSS is consumed by `DirectorySearchBar.tsx` too.

**Verified:** `npx tsc --noEmit` clean. Live smoke tests against the running dev servers:
`/directory`, `/search`, `/search?q=steel`, `/rfq`, `/rfq?need=steel` all 200. `/search?q=steel`
now has the same `role="search"` count (2 — Navbar's desktop + mobile instances) as a category
page like `/abrasives`, confirming the third, embedded bar is gone. `/directory`'s SSR HTML has
no `role="combobox"` (the AI suggestion dropdown's marker) and does show the plain bar's
`aria-label="Search products, sellers and categories"`. `/rfq?need=steel` renders the textarea
pre-filled with "steel".

**Open:** the category-selected-state pill and the commit/discard-on-navigate behavior are both
client-side (`useEffect`) so they don't show up in curl'd SSR HTML — traced through the code but
not click-tested in an actual browser (none available in this environment), same caveat as every
prior round. Hero-size visual weight and chip layout at 390px are unverified for the same reason.

---

### 2026-08-17 (6) — Directory search bar rebuilt as a plain (no AI, no suggestion dropdown) box; `/search` rebuilt as a grouped Companies/Products/Categories overview

**Why:** the last round's fix ("submit navigates instead of an inline panel") wasn't the actual
ask — the product owner wanted the AI framing and as-you-type suggestion dropdown gone from the
Directory search bar entirely, replaced by: submit → loading → a results **overview** grouped
into three buckets (companies/sellers, products, categories matching the text), each with a few
previews and a "View all" to drill in. Research found products and categories buckets were
buildable from existing endpoints/data, but there was no way to search sellers by company name
anywhere in the backend — that needed a new endpoint. Routing approach (confirmed): one
`/search` page with a `scope` URL param switching between the overview and each bucket's full
view, rather than separate pages per bucket.

**Changes:**
- `backend/routes/users.js` — new `GET /sellers?q=&limit=&page=`, filtering approved sellers'
  `sellerProfile.companyName` (case-insensitive substring), returning `{sellers, total}` in the
  same per-seller shape as the neighboring `/sellers/featured` (field-compatible with
  `FeaturedSellers.tsx`'s `mapSeller()`). `frontend/lib/api.ts` gained a matching
  `searchSellers({q, limit, page})`.
- New `frontend/components/DirectorySearchBar.tsx` — a deliberately plain search box (text +
  optional city select + optional category chip display/clear) with **no dropdown, no
  suggestions, no AI wording**. Submit is a synchronous `router.push('/search?q=...')` — no API
  call before navigating, so no spinner on the bar itself. Replaces `AISearchBar` in
  `Navbar.tsx` (both compact instances) and `/search`'s own embedded bar.
- `frontend/components/AISearchBar.tsx` — reverted the `selectedCategory`/`onSelectCategory`/
  `onClearCategory`/`goToSearch`/`submitSearch` additions from the last two rounds (cleanup;
  its only remaining callers, `HomeHero` and Consultations, never used them). Its dropdown/
  clarify/inline-list AI-concierge behavior for those two is fully unchanged — this round didn't
  touch the `/directory` hero or Consultations at all.
- `frontend/app/search/page.tsx` — rebuilt around a `scope` param
  (`overview | products | companies | categories`, default `overview` whenever `q` is set; no
  `q` still falls back to the plain "browse everything" grid, unchanged from before). Overview
  fetches all three buckets independently (each with its own loading skeleton, reusing
  `FeaturedSellers.tsx`'s card-skeleton shape for companies, the existing grid skeleton for
  products, a small new tile skeleton for categories); a bucket with zero matches hides itself,
  and an all-empty query falls back to the existing `EmptyState`. Categories are matched
  client-side against the already-fetched ~280-row `getCategories()` list (fetched once, shared
  between the overview and the full categories view) — no backend change needed there. Products'
  full view reuses `DiscoveryResults` exactly as before; companies' full view is a new paginated
  `SellerCard` grid (`Pagination`'s `hrefBuilder`, same component `DiscoveryResults` already
  uses). Every "View all" / "Back to all results" is a real `<Link>` — no client routing state,
  normal back-button behavior.
- `frontend/components/discovery/DiscoveryResults.tsx` — found while wiring the products full
  view through `scope=products`: its `syncUrl` write-back rebuilt the URL from scratch,
  dropping any param it doesn't itself manage — so changing so much as the sort dropdown while
  on `scope=products` would have silently dropped back to the overview (`scope` erased). Fixed
  by seeding that rebuild from the current URL's params and only overwriting the keys this
  component actually owns.

**Verified:** `npx tsc --noEmit` clean; backend route `node -c` clean, restarted, live-tested —
`GET /api/sellers?q=a&limit=3` returns real sellers + `total`, `page=1` vs `page=2` return
different sellers (pagination confirmed working). For `q=steel`: products bucket 25 total,
sellers bucket 2 total, categories bucket 4 matches (all non-empty, confirms the overview would
render all three sections for a realistic query). All affected pages
(`/`, `/directory`, `/profile`, `/dashboard`, `/search`, `/search?q=steel`,
`/search?q=steel&scope=companies`, `/search?q=steel&scope=categories`, a listing page, a
category page, a seller page) return 200 with no runtime-error markers. Confirmed via SSR HTML:
`/directory`'s hero still has the suggestion `combobox` (unchanged), while `/abrasives` and
`/search` have none (dropdown fully gone from Directory bars).

**Open:** manual/visual confirmation of the overview's three-section layout, loading skeletons,
and both "View all" / pagination flows once a browser is available — same caveat as every prior
round of this feature.

### 2026-08-17 (5) — Removed the navbar "AI search" glitch (text search now navigates to `/search`); dropped the duplicate category-page search bar

**Why:** none of the Directory-context `AISearchBar` instances (`aiEnabled={false}`) passed an
`onResults` handler, so a normal keyword search (e.g. "steel sheets") never navigated anywhere
— `runAi()`'s `mode === "list"` branch fell through to an inline floating results panel (cards,
sparkle icon, "Found N vendors") popping out from under whichever compact bar it was submitted
from. Reported as a navbar UI glitch; the same thing would have happened on `/search`'s own
embedded bar too, stacking a redundant results UI on top of that page's own results grid.
Separately, category pages had two visible search bars (navbar + an embedded one added two
entries ago) — confirmed to drop the embedded one and keep search navbar-only everywhere,
matching listing/seller pages.

**Changes:**
- `frontend/components/AISearchBar.tsx` — added `goToSearch(text)` (builds
  `/search?q=...&city=...&category=...` from the bar's own controlled state and navigates) and
  `submitSearch(text)` (`aiEnabled ? runAi(text) : goToSearch(text)`); swapped all four
  submit-triggering call sites (form submit, Enter key, the pinned dropdown row, an example
  chip) from `runAi` to `submitSearch`. `runAi` itself, and everything for `aiEnabled=true`
  callers (`HomeHero`, Consultations), is unchanged. Removed the now-dead category-name
  text-folding block inside `runAi` from two entries ago — unreachable now that deterministic
  bars never call `runAi` for submit; the chip's job is supplying `goToSearch`'s real
  `&category=` param instead, a strictly more precise mechanism than folding into free text.
- `frontend/components/discovery/DiscoveryResults.tsx` — added
  `useEffect(() => setQ(query || ""), [query])`. Found while tracing the fix through: its
  internal `q` only seeded once from the `query` prop on mount and never re-read it — since
  Next doesn't remount `/search` for an in-place `?q=` change, a second search from the same
  page wouldn't have actually updated the results grid without this.
- `frontend/components/discovery/CategoryLanding.tsx` — removed the embedded `AISearchBar` block
  (and its now-unused import) added two entries ago. Kept the effect that self-pins the shared
  `selectedCategory` chip to the page's own loaded category — it now drives the navbar's chip
  instead of a page-local one.
- `frontend/components/Navbar.tsx` — the chip's × (`onClearCategory`) is now a shared
  `handleClearCategory()`: while standing on that category's own page (its URL matches the
  chip's slug), clicking × navigates to `/directory` instead of just clearing state — a plain
  clear there would have been immediately undone by `CategoryLanding`'s own pinning effect on
  the next render (the exact bug reported for the now-removed embedded bar's missing ×, just
  one level up). Everywhere else, × still just clears the chip, unchanged.

**Verified:** `npx tsc --noEmit` clean. Live smoke test — all affected pages return 200 with no
runtime-error markers; `/abrasives`'s search-bar count dropped to 2 (navbar desktop+mobile
only, embedded one gone) while `/search?q=steel` still shows 3 (navbar ×2 + its own embedded
bar, unchanged). The actual submit-navigates-to-`/search` behavior, the results-grid refetch on
a same-page re-search, and the ×'s leave-category navigation are all client-side interactions
not verifiable via `curl` — no browser automation available in this environment, same caveat as
the rest of this feature.

**Open:** manual/visual confirmation of all three interaction fixes above once a browser is
available.

### 2026-08-17 (4) — Picking a category suggestion now shows a removable chip instead of leftover typed text

**Why:** the previous entry made every Directory search bar share one `query` via
`searchDock`, which surfaced a bug: picking a **category** from `AISearchBar`'s suggestion
dropdown only navigated (`router.push`) — it never touched `query`, so every visible search
bar on the destination page kept showing whatever partial word was typed *before* the
suggestion was picked, not the category actually selected. Product-owner confirmed the fix
should split "a structured suggestion I picked" from "free text I'm still typing" as two
independent things in the same bar, not one field trying to be both.

**Changes:**
- `frontend/lib/searchDock.tsx` — added `selectedCategory: {slug,name} | null` +
  `setSelectedCategory` alongside the existing shared `query`/`city`.
- `frontend/components/AISearchBar.tsx` — new optional controlled props
  (`selectedCategory`/`onSelectCategory`/`onClearCategory`), all omitted by `HomeHero` and
  Consultations' own bar so neither ever shows a chip. Renders a small removable pill
  ("Category: Abrasives ×") to the left of the input when set. `selectItem()`'s category
  branch now sets the chip + clears `query` before navigating (was: navigate only); its
  listing branch clears `query` too (a picked listing goes straight to a single-item page —
  no results list left to refine, so no chip, just no stale text either). `runAi()` folds an
  active chip's category name into the text sent to `api.aiSearch` on submit, the same way
  the city selector already is — the endpoint has no separate category-scope parameter.
- `frontend/components/Navbar.tsx`, `frontend/app/search/page.tsx` — wired the new props from
  `useSearchDock()`, `onClearCategory` included (clearing there is meaningful — reverts to a
  plain global search, nothing else on the page is pinned to that category).
- `frontend/components/discovery/CategoryLanding.tsx` — same wiring, plus a new effect that
  self-sets the chip from the page's own loaded category whenever it doesn't already match —
  so the chip is correct however the page was reached (search suggestion, a category tile,
  the mega-menu, a direct link), not just the one reported path. Deliberately does **not**
  pass `onClearCategory`: caught during implementation that passing it would show a
  ×-button that immediately undid itself, because that same self-correcting effect would
  re-set the chip right back the instant it was cleared (the URL still pins you to that
  category) — omitting the prop hides the (non-functional) × there instead of shipping a
  button that visibly does nothing.

**Verified:** `npx tsc --noEmit` clean. Live smoke test — all affected pages (`/`, `/directory`,
`/profile`, `/dashboard`, `/search`, `/search?q=`, a listing page, a category page, a seller
page) return 200 with no runtime-error markers in the response body. The chip itself is
client-side interactive state (only appears after a suggestion pick or, on a category page,
after that page's own category fetch resolves), so its actual on-screen appearance and the
click-through behaviors described above are **not** verifiable via `curl` — no browser
automation available in this environment. Flagged as open, same as the rest of this feature's
visual checks.

**Open:** manual/visual confirmation of the chip (desktop + mobile, no overflow at 390px),
and a walk-through of the two `selectItem()` paths (category → chip, listing → just cleared),
once a browser is available.

### 2026-08-17 (3) — Directory search bar made persistent across the whole Directory product (navbar everywhere, embedded on listing pages), sharing one query/city via `searchDock`

**Why:** search only ever appeared in two places — the `/directory` hero, and a compact
navbar copy that docked in only once you scrolled that same hero out of view. Every other
Directory page (category, `/search`, a single listing, a seller/brand page) had no search bar
at all, even though the navbar's `showDirectoryNav` chrome flag (which also gates
`CategoryStrip`) was already true on all of them. `/search`'s own bar was hidden unless the
query "looked natural," and — even when shown — never reflected the URL's own `?q=`. Also
found while researching: `/profile` (the standalone main-user page from the previous entry)
was missing from `Navbar.tsx`'s `NON_DIRECTORY_PATHS` denylist, so Directory chrome incorrectly
leaked onto it.

**Changes:**
- `frontend/components/Navbar.tsx` — added `/profile` to `NON_DIRECTORY_PATHS` (bug fix).
  Added `isDirectoryHome`/`showNavSearch`: the scroll-fade dock animation (driven by
  `searchDockProgress`, published only by `HomeHero`'s `IntersectionObserver`) stays exactly
  as-is on `/directory`; on every other `showDirectoryNav` page the same compact `AISearchBar`
  now renders unconditionally at full opacity — desktop reuses the existing (previously empty)
  nav-row slot, mobile switches from the scroll-only absolute overlay to a normal-flow row
  (no hero to animate from off the home page, so no `IntersectionObserver`-desync risk).
- `frontend/components/discovery/CategoryLanding.tsx` — new embedded `AISearchBar` row
  directly below the category header band, controlled by the same `useSearchDock()` query/city
  as the navbar copy (not a separate local state), hydrated from the URL's seeded
  `query`/`initialFilters.city` on first mount for direct links/refreshes.
- `frontend/app/search/page.tsx` — replaced the conditional (`looksNatural`), uncontrolled bar
  with one that's always shown and controlled via `useSearchDock()`, same URL-hydration-on-mount
  approach — this also fixes the pre-existing gap where the visible input never reflected the
  URL's `?q=`.
- No changes to `listing/[id]`, `seller/[slug]`, `brand/[slug]` — they already fall under
  `showDirectoryNav`, so the navbar fix alone surfaces the persistent bar there; per spec, no
  embedded copy on these single-item pages.
- Because `SearchDockProvider` (`frontend/lib/searchDock.tsx`) is mounted once in the root
  layout and never unmounts during client-side navigation, and every Directory search bar now
  shares its one `query`/`city`, whatever the user last typed stays visible on the next page —
  including a listing/seller page where only the navbar copy renders. No new storage mechanism
  needed for that.

**Verified:** `npx tsc --noEmit` clean. Live smoke test via `curl` against the running dev
servers — SSR HTML instance counts of `aria-label="Vendor search"` matched expectations:
`/profile` and `/dashboard` and `/` → 0; `/directory` pre-scroll → 1 (hero only); a
listing/seller page → 2 (desktop + mobile navbar copies, no embedded one); `/search?q=steel` →
3 (2 navbar + 1 embedded). A category page (`/abrasives`) showed only the 2 navbar copies in
curl's SSR snapshot because — same as its breadcrumbs/heading/results grid — `CategoryLanding`
fetches the category client-side and renders a loading skeleton until that resolves; the
embedded bar is there in the loaded-state JSX, just not visible to a pre-hydration curl. No
browser automation available in this environment to confirm the post-hydration visual/no-overflow
result by hand — flagged as open.

**Open:** manual/visual confirmation (both counts and no horizontal overflow at 390px) of the
category-page embedded bar and the mobile always-on navbar row, once a browser is available.

### 2026-08-17 (2) — New standalone `/profile` page for the main user; "Become a seller" now lives only inside the Directory dashboard; register redirects home; interests picker cut from 280 chips to 24

**Why:** follow-up testing of the same-day main-user/seller split (previous entry below) found
three problems: (1) a freshly registered user landed on `/dashboard?tab=profile`, which
rendered `ProfileTab.tsx` — a component mixing generic account fields with the Directory
"Become a seller" company-details form — so a brand-new main user saw a seller-onboarding form
they hadn't asked for. Its interests chip picker also rendered **all 280 categories**
(`GET /api/categories` — 280 total, 24 top-level) as toggle chips, unusable. (2) The
product-owner clarified the intended model precisely: main-suite pages should offer a
lightweight main-user **Profile** (name/email/mobile/basics) from the navbar profile icon,
with no "Dashboard" concept at all; Directory pages (and `/dashboard` itself) should offer
**Dashboard** + **Profile** (business/company details) instead — "Become a seller" must never
appear on the main-user page. (3) Registration should land on `/` (home), not `/dashboard`.

**Changes:**
- New page `frontend/app/profile/page.tsx` (route `/profile`) — the main user's own basic
  account details: name (editable), email/mobile (read-only — no change-email/change-mobile
  flow exists in the backend yet), city/state, contact visibility, interests. Interests now
  sourced from **top-level categories only** (`categories.filter(c => !c.parentId)`, 24 chips
  instead of 280). Saves via the existing `updateProfile()` → `PUT /api/me/profile` (no
  backend change — that endpoint already only ever touched these exact fields). Password
  change, mobile/email change, and any new "verification" concept are **explicitly deferred**
  — no backend endpoints exist for them and building them (OTP re-verification for mobile,
  current-password confirmation) is real new work, not this round, per product-owner decision.
- `frontend/components/dashboard/ProfileTab.tsx` (the Directory dashboard's "profile" tab) —
  removed the "Account & preferences" section entirely (moved to `/profile` above). What's left
  is 100% seller/business content: "Seller profile"/"Become a seller" form, "Get verified"
  (GST/PAN), business locations, service areas — unchanged, just no longer sharing a component
  with generic account fields.
- `frontend/components/Navbar.tsx` — added `inDirectoryContext = showDirectoryNav || p ===
  "/dashboard"`, a second classification alongside the unchanged `showDirectoryNav` (chrome)
  flag. Profile-icon dropdown (desktop + mobile) now branches on it: Directory context →
  Dashboard + Profile (`/dashboard?tab=profile`); everywhere else → Profile (`/profile`). Admin
  link unchanged, shows in both. Dropped the separate "My listings"/"Inbox" quick links added
  earlier the same day — simplified per explicit spec, still one click away as dashboard tabs.
- `frontend/lib/i18n.tsx` — added `nav.dashboardProfile` ("Profile", for the Directory-context
  link) alongside the existing `nav.myProfile` ("My Profile", now used for `/profile`).
- `frontend/app/register/page.tsx` — default redirect changed from `/dashboard` to `/`
  (`?next=` still respected when present, e.g. from the assistant's "sell" suggestions).
- `backend/routes/assistant.js` — `buildActionReply`'s `"account"` branch and
  `resolveWithAI`'s `"dashboard"`-action handling now send a logged-in non-seller to `/profile`
  for account questions (was `/dashboard?tab=profile`, now wrong — that page is seller-only
  content). The `"sell"` branch's "Add business details" → `/dashboard?tab=profile` is
  unchanged, still correct. Updated `buildAssistantPrompt`'s prose (`sell`/`dashboard` action
  descriptions, the auth-state line, the "this matters" auth-precedence paragraph) to describe
  the two pages as separate and unrelated, so the AI stops conflating them.

**Files touched:** `frontend/app/profile/page.tsx` (new), `frontend/components/dashboard/ProfileTab.tsx`,
`frontend/components/Navbar.tsx`, `frontend/lib/i18n.tsx`, `frontend/app/register/page.tsx`,
`backend/routes/assistant.js`, `WORKFLOW.md`

**Verified:** `npx tsc --noEmit` clean. Backend restarted; `POST /api/assistant/chat` tested
with real JWTs for a non-seller and a seller user, both AI-on and forced off
(`AI_CLI_ENABLED=false`) — "how do I register" (non-seller, logged in) → "Go to My Profile" →
`/profile` in both AI and fallback paths; "how do I sell" (non-seller) → "Add business details"
→ `/dashboard?tab=profile` unchanged; "how do I register" (seller) → "Go to dashboard" →
`/dashboard` unchanged.

**Open / follow-up:**
- No browser automation available in this environment — the new `/profile` page, the two
  navbar dropdown variants, and the reduced interests chip list are unverified visually; verify
  manually or with a headless-Chrome CDP session next time one's available.
- `frontend/app/login/page.tsx` still defaults its post-login redirect to `/dashboard` —
  intentionally left unchanged, the request only covered registration. Worth asking whether
  login should also default to `/` for consistency.
- Password/mobile/email change and any new "verification" UI on `/profile` are deferred, not
  forgotten — flagged above per explicit product-owner scope decision.

---

### 2026-08-17 — Main user vs. seller flow: `/register`/`/login`/`/dashboard`/`/admin` no longer show Directory chrome, and a plain main user's dashboard is just their Profile

**Why:** two related problems reported. (1) Visiting `/register` or `/login` (and, it turned
out, `/dashboard`, `/admin`, `/pricing`, `/blog`, `/features`, `/offer`) incorrectly rendered
Directory-only chrome — category mega-menu, `CategoryStrip`, the standalone "Advertise"
button — while hiding the suite's own Products/Blog/About nav. Root cause:
`Navbar.tsx`'s `showDirectoryNav` denylist (previously named `SUITE_PATHS`) only listed 6
paths; everything else defaulted to "Directory," including these generic/account/admin
pages. (2) The `/dashboard` shell showed its full multi-tab seller UI (Analytics, My
listings, Promote, Bulk upload, Leads & RFQs, Reviews, Blogs, Stories, Advertise,
Subscription) to *every* logged-in user, seller or not — a freshly registered main user with
no business details saw a dashboard full of empty tabs for things they hadn't done.
Product-owner direction: a plain main user should see only their own Profile; the rest of the
dashboard should only appear once they've actually become a seller (added business details).
Admins should still reach `/admin` from the same profile icon regardless. No functionality
was removed from sellers — everything they could do before, they can still do, just gated
behind actually having a `sellerProfile` instead of shown unconditionally.

**Changes:**
- `frontend/components/dashboard/DashboardShell.tsx` — added `sellerOnly?: boolean` to
  `TabMeta`, marked on every Directory-seller tab (`overview, analytics, listings, promote,
  bulk, inbox, leads, reviews, blogs, stories, advertise, subscription`); filtered out unless
  `!!user.sellerProfile`. `myrfqs`, `referral`, `profile`, and the already-`expertOnly`
  `consultations` tab stay ungated. Default active tab now falls back to the first tab
  actually visible (`profile` for a non-seller, `overview` for a seller) instead of a
  hardcoded `"overview"`. When only one tab is visible (the non-seller case), the tab-strip
  nav chrome is skipped entirely — `/dashboard` for a plain main user renders as just their
  Profile, no dashboard shell around it.
- `frontend/components/Navbar.tsx` — `showDirectoryNav`'s denylist (renamed
  `NON_DIRECTORY_PATHS`) now also covers `/register, /login, /dashboard, /admin, /pricing,
  /features, /offer` plus a `/blog` prefix. Profile-icon dropdown (desktop + mobile) now
  branches on `user.sellerProfile`: sellers see Dashboard/My listings/Inbox as before (fixed
  two dead links along the way — `/dashboard/listings` and `/dashboard/inbox` aren't real
  routes; corrected to `/dashboard?tab=listings` / `?tab=inbox`), non-sellers see a single
  "My Profile" link (`/dashboard?tab=profile`). Admin link unchanged (independent of seller
  state).
- `frontend/lib/i18n.tsx` — added `nav.myProfile` key (en/hi).
- `backend/routes/assistant.js` — `buildAssistantPrompt`'s action descriptions and auth-state
  line now tell the AI a logged-in user might not be a seller yet, and that "sell" means
  account → business details (My Profile) → dashboard unlocked, not an automatic side-effect
  of registration. `buildActionReply` (deterministic fallback) and `resolveWithAI`'s
  action-to-suggestion mapping both gained a third branch (guest / logged-in-non-seller /
  logged-in-seller) for the `sell`, `account`, and `dashboard` actions, pointing
  logged-in-non-sellers at "Add business details" → `/dashboard?tab=profile` instead of
  either registration copy or straight to the full dashboard.

**Files touched:** `frontend/components/dashboard/DashboardShell.tsx`,
`frontend/components/Navbar.tsx`, `frontend/lib/i18n.tsx`, `backend/routes/assistant.js`,
`WORKFLOW.md`

**Verified:** `npx tsc --noEmit` clean. Backend restarted; `POST /api/assistant/chat` tested
with real JWTs for a non-seller user and a seller user (both `AI_CLI_ENABLED` on and forced
off via `AI_CLI_ENABLED=false`, 6 combinations total: guest/non-seller/seller ×
AI-on/AI-off) — all replies and suggestion links matched the new state-aware copy (e.g.
non-seller "how do i sell" → "Add business details" → `/dashboard?tab=profile` +
"Add a product" → `/sell`; seller → straight to "Add a product"; already-logged-in "how do i
register" → "Go to My Profile" for a non-seller vs. "Go to dashboard" for a seller).

**Open / follow-up:**
- No browser automation available in this environment — the Navbar chrome changes
  (`/register`, `/dashboard`, etc. no longer showing CategoryStrip/mega-menu) and the
  DashboardShell single-tab "just Profile" rendering are unverified visually; verify manually
  or with a headless-Chrome CDP session next time one's available.
- Recruitment: documented the main-user/service-profile pattern above but built nothing —
  per explicit product-owner decision, deferred until Recruitment has real fields to design
  against.

---

### 2026-08-15 — Breadcrumbs now show the actual product ("Directory"), and Dashboard/Admin are no longer Directory-gated

**Why:** two related "this treats Directory as if it were the whole app" problems. (1)
Breadcrumbs on every Directory sub-page (category, listing, seller, brands, collections,
compare, shortlist, categories) started with "Home / …", skipping the product entirely —
visitors had no crumb back to `/directory` itself, only to the suite root. (2) The navbar's
profile dropdown only showed Dashboard/My Listings/Inbox/Admin **while inside the Directory
product** (`showDirectoryNav` gate in `Navbar.tsx`) — everywhere else (suite home `/`,
`/recruitment`, `/about`, `/consultations/*`) a logged-in user's dropdown was just name/email
+ Log out. That's backwards: Dashboard and Admin are app-wide — the suite has multiple
products (Directory, Consultations, and eventually Recruitment), Directory is only one of
them, and Admin exists specifically to manage *all* of them. Per the reasoning given: a future
Recruitment product will have its own distinct user profile/dashboard, sharing only the login
identity (email/password/phone) with Directory — i.e. Dashboard access was never meant to be
Directory-exclusive infrastructure in the first place.

**Breadcrumb fix:** root crumb changed from `{ label: "Home", href: "/" }` to
`{ label: "Directory", href: "/directory" }` across every Directory-scoped page: category
landing (`components/discovery/CategoryLanding.tsx`, covers both `/[category]` and
`/[category]/[city]`), `app/seller/[slug]/page.tsx`, `app/brands/page.tsx`,
`app/brand/[slug]/page.tsx`, `app/collections/page.tsx`, `app/collection/[slug]/page.tsx`,
`app/compare/page.tsx`, `app/shortlist/page.tsx`, `app/categories/page.tsx`. Added i18n keys
`nav.directoryCrumb` / `nav.consultationsCrumb`. **`app/listing/[id]/page.tsx` is
conditional** — that route renders both products and services (`listing.type`), and services
belong to Consultations, not Directory (CLAUDE.md), so its root crumb is "Directory" for
products and "Consultations" for services, not a blanket "Directory". Left untouched (already
correct, or out of scope): `app/directory/page.tsx` itself (`Home / Directory` is correct —
it's the product's own landing page), `app/consultations/*` (sibling product, unaffected),
`app/offer/page.tsx` (suite-wide pricing/entitlements page, not Directory-specific),
`components/suite/ComingSoon.tsx` (Credit Card / Mutual placeholders).

**Nav fix:** in `components/Navbar.tsx`, moved the `Dashboard` `MenuLink` and the
`user.roles?.includes("admin") && <MenuLink href="/admin">` check **out of** the
`showDirectoryNav &&` gate in all three places they're rendered (desktop profile dropdown,
mobile profile dropdown, mobile hamburger-menu footer — the last one also gained an Admin
button it never had before, for parity). `My Listings` and `Inbox` were **left gated** to
Directory — those are Directory-specific dashboard tabs, not mentioned in the request, and a
more conservative default than un-gating everything.

**Files touched:** `frontend/components/Navbar.tsx`, `frontend/lib/i18n.tsx`,
`frontend/components/discovery/CategoryLanding.tsx`, `frontend/app/listing/[id]/page.tsx`,
`frontend/app/seller/[slug]/page.tsx`, `frontend/app/brands/page.tsx`,
`frontend/app/brand/[slug]/page.tsx`, `frontend/app/collections/page.tsx`,
`frontend/app/collection/[slug]/page.tsx`, `frontend/app/compare/page.tsx`,
`frontend/app/shortlist/page.tsx`, `frontend/app/categories/page.tsx`

**Verified:** `npx tsc --noEmit` clean. Headless-Chrome screenshots: `/agriculture-farming`
→ "Directory / Agriculture & Farming"; a product listing → "Directory / Gifts Crafts Sports /
…"; a service listing → "Consultations / Professional Consulting Services / IT Software
Services / …" (correctly NOT "Directory"); a seller page → "Directory / Sellers / …". Logged
in as a non-admin seller via the real `/api/auth/login` flow and confirmed the suite homepage
(`/`) profile dropdown now shows "Dashboard" (previously absent there). Admin visibility
reuses the exact pre-existing `user.roles?.includes("admin")` check, just relocated —
structurally identical to the already-proven Directory-only version, not re-verified with a
live admin session (no admin password available in this environment to log in with).

**Open / follow-up:**
- No admin credentials were available to visually confirm the Admin link renders on suite
  pages with a real admin session — logic is identical to the pre-existing (already-working)
  Directory-scoped version, just un-gated, so risk is low, but worth a manual click-through.
- Recruitment doesn't have a real dashboard/profile yet (still a "coming soon" placeholder per
  `app/recruitment/page.tsx`) — the shared-identity-different-profile model described in this
  request is a future-facing note, not something implemented now.

---

### 2026-08-15 — Ad slot polish: no more RFQ flash while loading, ad card height now matches its row

**Why:** follow-up report after the advertising fix below shipped — two UX problems on
`/directory`: (1) the ad slot briefly showed the static "Post a requirement" RFQ banner
before swapping to the real ad once `getAds("home_hero")` resolved (looked like a bug, not a
loading state), and (2) once loaded, the ad card was visibly **shorter** than the 4 promo
cards beside it in the same grid row.

**Root cause (height mismatch):** `AdSlider`'s inner card div sets an explicit
`height: clamp(120px, 42vw, 180px)`. The promo cards next to it only set `minHeight: 152` and
rely on the CSS Grid row's default `align-items: stretch` to match heights. An explicit
`height` doesn't participate in stretch — so on the `lg` breakpoint (6-col grid, where the ad
slot shares a row with the 4 cards) the ad box kept its own smaller clamp-computed height
instead of stretching to match its row.

**Fix:**
- `components/AdSlider.tsx` — new optional `fillHeight` prop. When true: the outer wrapper
  drops its `marginBottom: 24` (was inflating the grid row) and the inner card div uses
  `height: "100%"` instead of the fixed `clamp()`, so it participates in the grid's stretch
  alignment like a normal sibling. Default `false` preserves the original fixed-height
  standalone-banner sizing used on category pages (`CategoryLanding.tsx`) — unchanged there.
- `components/home/PromoBanner.tsx` — passes `fillHeight` when rendering `AdSlider`. Also
  added a real loading state: `ads` starts as `null` (loading) → renders a `.skeleton` block
  sized identically to the slot (not the RFQ banner); becomes `[]` or the fetched array once
  the request resolves → **only then** does it choose between the ad carousel (`ads.length >
  0`) or the RFQ fallback (`ads.length === 0`). The RFQ banner can no longer appear and then
  get replaced — it only shows when loading has genuinely finished with zero active
  campaigns.

**Files touched:** `frontend/components/AdSlider.tsx`, `frontend/components/home/PromoBanner.tsx`

**Verified:** headless-Chrome (CDP) snapshots at 150ms / 800ms / 6000ms after page load on
`/directory` — skeleton shown (no RFQ text) at 150ms/800ms, real ad carousel at 6000ms; grid
cell heights (`getBoundingClientRect().height`) measured **152px for both the ad slot and the
first promo card in all three snapshots** — exact match, no more visible height gap.
`npx tsc --noEmit` clean.

---

### 2026-08-15 — Advertising: fixed a real submission bug, replaced misplaced RFQ banner with real ads, added demo campaigns

**Why:** the Directory main page had a section literally commented
`ADVERTISEMENT + CATEGORY QUICK NAV` that actually rendered a static "Post a requirement"
RFQ promo card — real seller advertising had nowhere to show on the Directory homepage even
though the dashboard's Advertise tab and category-page `AdSlider` already existed. Asked to
verify the feature end-to-end and wire up the missing placement.

**Bug found and fixed:** `ad_bookings.ad_slot_id` has `REFERENCES ad_slots(id)`, but
`ad_slots` only had rows for `category_top` / `homepage_banner` / `listing_sidebar` /
`search_sponsored_row`. The seller-facing form (`AdvertiseTab.tsx`) and its backend whitelist
(`myAds.js` → `PLACEMENTS`) offer `category_top` / `search_top` / `home_hero`. **Any real
seller picking "Search top" or "Home hero" would have hit an FK violation and their campaign
submission would 500.** Confirmed by reproducing the failure, then fixing it by adding
`home_hero` and `search_top` rows to `ad_slots` — in **both** Postgres (`store.insert`) and
the physical `backend/DB/ad-slots.json` file (see §2 gotcha). Re-verified all three
placements succeed via a real logged-in `POST /api/my-ads` call.

**Frontend change:** `frontend/components/home/PromoBanner.tsx` now fetches active
`home_hero` ad bookings (`getAds("home_hero")`) and renders `AdSlider` (the same carousel
component category pages already use) in the slot that used to hardcode the RFQ banner. The
RFQ banner is kept as a **fallback only** — shown while loading or when there are zero active
campaigns — so the slot is never empty and RFQ discoverability isn't lost (still reachable via
nav / `/rfq` directly). Scope was deliberately **Directory-only**: the suite homepage (`/`)
and any "floating global ad" concept were explicitly out of scope for this pass.

**Demo data added:** `backend/scripts/seed-demo-ads.js` (new, idempotent, additive) —
3 `home_hero` campaigns (Jindal Steel & Metals, Surat Silk & Textile Mills, Bengaluru Circuit
& Electricals) for the Directory main page, and 2 `category_top` campaigns (Nashik AgroFarm →
Agriculture & Farming, Ludhiana AutoParts → Automotive Parts) for category pages. All
pre-approved (`status:"active"`) since this is demo data, not a pending real submission.

**Files touched:**
- `frontend/components/home/PromoBanner.tsx` (ad slot wiring)
- `backend/DB/ad-slots.json` (added `home_hero`, `search_top` rows)
- `backend/scripts/seed-demo-ads.js` (new)

**Verified:**
- `POST /api/my-ads` for all 3 placements as a real logged-in seller → 201 (previously
  `home_hero`/`search_top` would 500).
- `GET /api/ads?placement=home_hero` and `?placement=category_top&category=agriculture-farming`
  → correct active bookings.
- Headless Chrome (CDP) screenshots of `/directory` and `/agriculture-farming`: ad carousel
  renders with "Ad" badge, headline, arrows/dots, no horizontal overflow.
- `npx tsc --noEmit` clean.

**Open / follow-up:**
- `search_top` placement has **no frontend consumer yet** — nothing renders an `AdSlider` on
  `/search`. The booking pipeline now works for it (bug fixed), but there's no visible slot.
  Add one on `app/search/page.tsx` when that placement is prioritized.
- The pre-existing `homepage_banner` / `search_sponsored_row` slot ids in `ad_slots` are now
  unused legacy inventory (nothing creates bookings against them). Harmless, but worth
  reconciling naming with `category_top`/`search_top`/`home_hero` eventually.
- Seeded catalog/demo-ad data (this entry + the one below) currently lives **only in
  Postgres** — not reflected in `backend/DB/*.json` beyond the `ad-slots.json` fix. Fine for
  this environment (Postgres is what's actually running), but flag if someone needs
  file-mode parity.

---

### 2026-08-15 — Navbar "Advertise" now routes to the real dashboard flow instead of a "coming soon" toast

**Why:** the dashboard already had a working Advertise tab (`AdvertiseTab.tsx`,
`/dashboard?tab=advertise`, no feature-flag gating), but the top-nav "Advertise" button
(`Navbar.tsx`) still showed a stale "coming soon" toast for logged-in users, written before
that tab existed.

**Change:** `handleAdvertiseClick()` in `frontend/components/Navbar.tsx` now routes to
`/login` when logged out (unchanged) and `/dashboard?tab=advertise` when logged in (was: toast
+ no-op). Removed the now-dead `useToast`/`addToast` wiring that only existed for that toast.

**Files touched:** `frontend/components/Navbar.tsx`

**Verified:** `npx tsc --noEmit` clean; confirmed `advertise` tab has no `flag`/`expertOnly`
gate in `DashboardShell.tsx`'s `ALL_TABS`, so it's reachable by any logged-in user.

---

### 2026-08-15 — "Trending Searches Near You" no longer shows the wrong city

**Why:** `TrendingSearches.tsx` picked the city for its heading with
`user?.city || dockedCity`, i.e. it preferred the **logged-in account's stored profile city**
over the browser-geolocation-detected city (`dockedCity`, set in `HomeHero.tsx` via
`navigator.geolocation`). A demo account's stale/default profile city ("Mumbai") would show
even when the visitor was clearly somewhere else, reading as a location bug.

**Change (per explicit choice — see options offered):** rather than just re-prioritizing
geolocation over profile city, the heading **never names a specific city** now — always
"Trending Searches Near You". The underlying API call still passes the geolocation-detected
`dockedCity` (when available) to scope *which trends* come back; only the visible heading
text was made city-agnostic.

**Files touched:** `frontend/components/home/TrendingSearches.tsx`

**Verified:** `npx tsc --noEmit` clean; no remaining `user`/`useAuth` reference in the file.

---

### 2026-08-15 — Full-taxonomy demo catalog: 24 sellers, 593 listings across all 238 leaf categories

**Why:** requested scratch/demo data covering every category and sub-category (products +
services) with sellers in different cities, to exercise category browse, seller profiles, and
"more from this seller" end-to-end instead of the sparse original demo set.

**Scope decided (see options offered):** every leaf category in the taxonomy (238 of them,
including deep-spike branches like Cleaning → Cleaning Equipment → Vacuum Cleaners → Robotic
Vacuum Cleaners), 2–3 listings each; one seller company per **top-level** category (24 total,
each in a different Indian city); targeting Postgres (the environment's actual active store,
despite CLAUDE.md's file-based default — see §2).

**What it built:** `backend/scripts/seed-full-catalog.js` (new) — templated but
domain-aware generation: per-top-level config (city/state, company profile, brand pool,
unit/price band, or service pricing model) drives 432 products + 161 services. Categories
typed `"both"` (the 10 Beauty & Wellness leaves) get a mix of both. Local `/demo/*.jpg`
images only (CLAUDE.md rule). All 24 sellers use password `demo123`.

**Bug caught and fixed mid-build:** the first id scheme (`hash(leaf.slug) % 9000`) had a
non-trivial collision risk across 238 categories (birthday-paradox territory), which would
have silently upserted listings on top of each other via `ON CONFLICT DO UPDATE`. Switched to
a simple monotonic counter for ids, keeping the hash only for deterministic-but-varied pricing/
brand/spec selection.

**Second bug caught and fixed:** titles built from category names containing `&` (e.g.
"Cosmetics & Makeup") produced double-dashed slugs (`cosmetics--makeup...`) via the shared
`lib/search.js` slugify (which strips non-alphanumerics instead of collapsing them). Added a
local slug helper in the seed script rather than changing the shared utility other live routes
depend on.

**Files touched:** `backend/scripts/seed-full-catalog.js` (new)

**Verified:** every one of the 238 leaf categories has ≥1 new listing; every listing resolved
a valid `categoryId`; zero double-dash slugs after the fix; spot-checked product and service
document shapes round-trip correctly through the Postgres relational mapper
(`lib/db/listings.js`).

**Open / follow-up:**
- This data exists only in Postgres (see §2) — not merged into `backend/DB/listings.json` /
  `users.json`. If file-mode parity is ever needed, port the generation logic or re-run
  against a file-mode backend.
- Script is safe to re-run (`node scripts/seed-full-catalog.js`) — deterministic ids mean it
  upserts the same 593 rows rather than duplicating.

---

## 4. How to verify changes (project convention, restated)

```bash
# Types
cd frontend && npx tsc --noEmit         # must be clean

# Backend smoke
curl -s http://localhost:4000/api/config
curl -s "http://localhost:4000/api/ads?placement=home_hero"

# Page compiles
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/directory

# Visual + overflow (headless Chrome over CDP — see this session's scratchpad
# for a reusable cdp-check.js: navigates, waits for hydration, captures a
# screenshot, and can eval() the DOM for overflow / ad-slot checks).
```

Backend has **no hot reload** — restart `node index.js` after editing anything under
`backend/`. Frontend (`next dev`) hot-reloads, but the **first** request to any given route
after a restart recompiles and can take several seconds — don't mistake that latency for a
broken fetch when testing manually.

---

## 5. Next candidates (not started)

- Render an `AdSlider` for the `search_top` placement on `/search` (booking pipeline works,
  no visible slot yet — see the advertising entry above).
- Decide whether to keep or retire the now-unused `homepage_banner` / `search_sponsored_row`
  ad-slot ids.
- Port the full-catalog seed + demo-ad data into `backend/DB/*.json` if file-mode parity
  becomes a requirement (e.g. for a clone that doesn't set `PG_URL`).
- Optimize `backend/routes/listings.js` `GET /` (search/rank/facets) — the most expensive
  endpoint left untouched by the 2026-08-19 N+1 fix; see that entry's Open section.
- Migrate the remaining `getCategories()` call sites (admin tabs, `/sell`, `/rfq`, `/profile`,
  `/categories`, `dashboard/AdvertiseTab`, `BulkUploadTab`) to `lib/catalog.tsx` for
  consistency — not urgent, they aren't part of any duplicate-request bug.
- Confirm `frontend/components/suite/SuiteStats.tsx` is genuinely dead code (not rendered
  anywhere) and delete it, or wire it in if it was actually meant to be used somewhere.
- Update HANDOVER.md / SECURITY.md for the Postgres migration (POSTGRES-MIGRATION.md itself
  flags this as required "before this goes anywhere near main or production" — CLAUDE.md was
  updated 2026-08-19, the other two companion docs weren't in scope this round).
