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

---

## 3. Change log (newest first)

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
