# CLAUDE.md — read this first

You are picking up **BharatSource**, a production-bound web app, with no prior context. This file is your onboarding: architecture, the rules you must not break, how to run and verify, and the traps. Read it fully before editing. Companion docs: **HANDOVER.md** (human setup), **SECURITY.md** (pre-go-live), **DIRECTORY.md** (the flagship product's flows + roadmap), **RECRUITMENT.md** (the second suite product's spec + build roadmap — fully built, currently gated behind a go-live flag, see §5 there and §1 below), and the older `DESIGN.md` / `BUILD-SPEC.md` / `FRONTEND-PAGES-SPEC.md` (partly stale — trust the code over them).

> Paths in this repo contain a space: `/Users/dev/Documents/Personal /Projects/IndiaMart/bharatsource`. **Always quote paths** in shell commands.

---

## 1. What this is

**BharatSource** is a multi-product **SUITE** (an umbrella brand over several products), aimed at a mostly non-technical, mobile-first Indian audience.

| Product | Route | Status | What it is |
|---|---|---|---|
| **Directory** | `/directory` | ✅ Live | B2B/B2C marketplace: buyers discover products & suppliers, send enquiries/RFQs. **Lead model — no payments, no cart, no checkout.** |
| **Recruitment** | `/recruitment` | 🔜 Built, gated | Post roles, connect with vetted candidates. Fully built (employer + candidate flows, apply-with-questions, self-serve ads, tabbed dashboard — see RECRUITMENT.md) but shown as "Coming soon" (`components/recruitment/RecruitmentComingSoon.tsx`, via `RecruitmentGate`) until `featureFlags.recruitmentLive` is turned on — env var (`RECRUITMENT_LIVE`, overrides) or admin Site Config. Default is **off**. |
| **Credit Card** | `/credit-card` | 🔜 Coming soon | Placeholder page. |
| **Mutual** | `/mutual` | 🔜 Coming soon | Placeholder page. |

The suite homepage (`/`) is an umbrella landing with an AI concierge search. One account works across all products.

**Consultations is no longer a promoted suite product** — Recruitment replaced it in the primary nav (`components/suite/SuiteNavMenu.tsx`), the Footer's product list, and the homepage hero. Its routes (`/consultations`, `/consultations/[slug]`), the seller dashboard's "Consultation requests" tab, and the backend consultation-bookings feature still exist in the codebase and weren't removed — they're just no longer linked from primary navigation. Don't add new Consultations entry points; any UI that references it (e.g. a listing/seller page breadcrumb) should point at Directory instead. `components/suite/products.tsx`'s `PRODUCTS` array and `components/suite/ProductsMenu.tsx` are unused legacy code from before this change (zero importers) — don't build on them.

**Business model:** the platform is a **mediator** — it never processes payments or holds inventory. Revenue levers (subscription plans, per-lead pricing, boosts, ads, verification) are all **admin-controlled** via `/admin`.

---

## 2. Non-negotiable rules

These come from the product owner and are enforced throughout the codebase. Breaking them is a regression.

**Design**
- **NO EMOJIS anywhere in the UI.** Icons are inline SVG line-glyphs only (`viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width` ~1.7). This applies to code comments-in-JSX too — keep emojis out of rendered output.
- **Prefer native `<select>` dropdowns** for filters and choices wherever possible. The audience is non-technical on mobile; custom dropdown widgets are discouraged for filters.
- **Zero horizontal overflow.** Every page must be responsive and not scroll sideways at 390px. Use `min-width: 0` on flex children, `flex-wrap`, `overflow-x:auto` only on deliberately-scrollable containers.
- **Local images only.** Use `/demo/*.jpg` (already in `frontend/public/demo/`) or user uploads. **Never** hot-link external image URLs (they won't load and violate the design constraint).
- Use the **light design system** (see §6). Brand blue `--brand` #2563EB, action orange `--action` #F97316.

**Data & money**
- **Storage: Postgres is the live backend as of the 2026-08 migration** (owner-approved — see **POSTGRES-MIGRATION.md** for schema, mappers, migration scripts). `backend/.env`'s `PG_URL` (or `DATABASE_URL`) selects it; `backend/lib/store.js` dispatches transparently to `backend/lib/pg-store.js` when set, or the original file-DB (`backend/DB/*.json|jsonl`) when unset — same interface either way (`all/findOne/findMany/getById/insert/update/remove/writeJson`), so route code never branches on which backend is active. **Do NOT swap storage backends again** (a different DB engine, a new ORM, bypassing `store.js`) without explicit owner approval — the *interface* is the deliberate architecture choice, not any one implementation behind it.
- **File uploads (résumés, photos, ad creatives, logos): same pattern, one level down.** `backend/routes/uploads.js` never touches disk/S3 directly — it always goes through `backend/lib/uploadStorage.js`'s `saveFile(buffer, ext, mime)`, which picks local-disk (`frontend/public/uploads/`) or S3 based on `backend/.env`'s `UPLOAD_STORAGE` (`local` default, or `s3`). Moving to S3 in production is env-var-only (`UPLOAD_STORAGE=s3` + `AWS_REGION`/`AWS_S3_BUCKET`, optionally `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`S3_PUBLIC_BASE_URL`) — no code change. See HANDOVER.md "File storage" for the bucket-access checklist (public-read policy or a CDN in front, since uploaded URLs are unauthenticated by design, matching local mode).
- **No payment processing.** The whole app is lead/directory based. Don't add carts, checkouts, or payment gateways.

**AI**
- **AI runs through the local `claude` CLI, not a paid API key.** The host machine is logged into a Claude Code subscription; the backend shells out to `claude -p "<prompt>"`. See `backend/lib/claudeCli.js`. Do not "fix" this by switching to `ANTHROPIC_API_KEY` unless the owner asks — it would start billing them.

**Contact & chat**
- **Seller contact (Call/WhatsApp) requires login; there is no in-app chat entry point on buyer-facing Directory pages.** `GET /api/sellers/:slug` (`routes/users.js`, `optionalAuth`) omits `contactMobile`/`contactEmail` unless the request is authenticated — everything else about a seller (company name, rating, badges, listings) stays public. Logged-out visitors tapping Call/WhatsApp on the listing page (`SellerContactCard.tsx`) or seller profile (`SellerHeader.tsx`) get an inline login/register modal (`components/auth/ContactAuthModal.tsx`), never the number. A seller viewing their own listing/profile never sees Call/WhatsApp buttons at all. The dashboard's Socket.IO chat (`routes/chat.js`, `conversations/`/`messages/`) still exists but is intentionally not surfaced from either of these two pages — don't re-add a "Chat with seller" button there.

---

## 3. Architecture at a glance

Two processes, one origin:

```
Browser ──▶ Next.js 14 (frontend, :3000)
                │  next.config.mjs rewrites  /api/*  ─▶  Express (backend, :4000)
                ▼
        Express API ──▶ lib/store.js ──▶ Postgres            (PG_URL set — POSTGRES-MIGRATION.md)
                                    └──▶ backend/DB/*.json|jsonl (file-DB fallback, PG_URL unset)
                   ├──▶ `claude` CLI (spawned)     (AI search / RFQ)
                   └──▶ Socket.IO (:4000)          (realtime chat)
```

- **Single origin trick:** the browser only ever talks to `:3000`. Next rewrites `/api/*` to the backend server-side (`frontend/next.config.mjs`), so one tunnel/port serves UI + API and there are no CORS issues. `NEXT_PUBLIC_API_URL` is intentionally empty for this.
- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind + a custom CSS-variable design system in `frontend/app/globals.css`. `frontend/lib/api.ts` is the single typed API client with a built-in per-URL in-flight de-dup (see §6) and shared session-wide catalog data via `lib/catalog.tsx`.
- **Backend:** Express (CommonJS), persistence via `backend/lib/store.js` (Postgres or file-DB — see §2). Deps of note: `bcryptjs` (password hashing), `jsonwebtoken` (JWT auth), `pg` (Postgres driver), `proper-lockfile` (file-write locking, file-DB mode), `minisearch` (search index), `zod` (validation), `socket.io`.
- **Node:** developed on Node 24. No `engines` pin — use Node 18+.

---

## 4. Run & verify

```bash
# Backend (terminal 1)
cd "…/bharatsource/backend"
cp .env.example .env            # first time — then set JWT_SECRET (see SECURITY.md)
npm install
node index.js                    # → http://localhost:4000  (logs: /tmp/bs-backend.log if backgrounded)

# Frontend (terminal 2)
cd "…/bharatsource/frontend"
cp .env.local.example .env.local # first time (can stay empty for single-origin)
npm install
npm run dev                      # → http://localhost:3000
```

The backend is plain `node index.js` (no nodemon) — **after editing backend route files you must restart it** to load changes:
```bash
lsof -tiTCP:4000 -sTCP:LISTEN | xargs kill ; (cd "…/backend" && nohup node index.js > /tmp/bs-backend.log 2>&1 &)
```

**Verification loop this project uses (do the same):**
- Types: `cd frontend && npx tsc --noEmit` must be clean before you call frontend work done.
- Endpoints: `curl -s http://localhost:4000/api/<route> | node -e 'JSON.parse(...)'`.
- Pages compile: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/<path>`.
- Visual + overflow: headless Chrome over CDP. Reusable scripts live in the session scratchpad; the key one measures elements past the viewport at 390px and reports a `clipped` count (must be 0).

---

## 5. Backend conventions (`backend/`)

- **`lib/store.js` is the ONLY persistence layer** (Postgres or file-DB — see §2). Use its API — never `fs.readFile`/query Postgres directly from a route:
  - `store.all(coll)`, `store.getById(coll,id)`, `store.findOne(coll,fn)`, `store.findMany(coll,fn)`
  - `store.insert(coll,doc,idPrefix)` (auto-IDs like `lst_…`, `usr_…` via `_counters.json`), `store.update(coll,id,patch)`, `store.remove(coll,id)`, `store.nextId(prefix)`
  - append-only ledgers use `.jsonl` (e.g. `leads-ledger.jsonl`).
  - **Postgres composite mappers must batch child-table reads, never loop per-row.** `lib/db/listings.js` and `lib/db/users.js`'s `all()` fetch every child table ONCE across all row ids (`WHERE id = ANY($1)`) and group in JS, instead of awaiting several queries per row — the per-row version was a genuine N+1 bug (~4-8 queries × every row) that made `/api/categories`/`/api/brands`/etc. take ~850ms; batching dropped that to ~30-90ms (see WORKFLOW.md, 2026-08-19 entry). `getById()`/other single-row paths are fine to hydrate per-row (N=1) — only `all()`-shaped bulk reads need batching. Follow this pattern for any new composite mapper.
- **Route style:** one `express.Router()` per file in `routes/`, mounted in `index.js`. Every handler is `try/catch` → `next(err)` and returns the envelope `{ success: true, data }` (or `{ success:false, error }`). Mirror `routes/blogs.js` / `routes/inquiries.js`.
- **Auth:** `middleware/authGuard.js` exports `authGuard` (401 if no valid JWT), `optionalAuth` (attaches `req.user` if present, else continues — used for guest-friendly endpoints like consultation booking), and role checks. `requireRole("admin")` guards admin ops.
- **Gating a single PII field behind login (not the whole endpoint):** don't wrap the route in `authGuard` (that 401s guests entirely) — use `optionalAuth` and branch on `req.user` when building the response, like `routes/users.js`'s `publicSeller(user, includeContact)` does for `contactMobile`/`contactEmail` on `GET /sellers/:slug`. Keeps the endpoint public (ratings, badges, listings still visible to guests) while the sensitive field is only ever included for authenticated requests — not merely hidden client-side.
- **The nested-admin-route pattern (important gotcha):** the blanket `app.use("/api/admin", require("./routes/admin"))` in `index.js` guards everything under `/api/admin`. To expose an admin sub-API from a *different* router, mount it **before** that line and put the op under an inner `/admin/*` path. Examples already in `index.js`: `/api/admin/entitlements`, `/api/admin/categories`, `/api/admin/collections`, `/api/admin/boosts`, `/api/admin/moderation`. Follow this pattern for new admin sub-APIs.
- **Config:** `lib/config.js` reads env. `JWT_SECRET` throws in production if unset (dev falls back to an insecure default). `express.json({ limit: "8mb" })` in `index.js` — needed for base64 photo uploads from phones; keep it.
- **AI:** `lib/claudeCli.js` (`isClaudeAvailable()`, `askClaude(prompt,{timeoutMs})`, `askClaudeJSON()`, a 2-permit semaphore, ~3s latency). `routes/ai.js` is **deterministic-search-first, then Claude-refines** only on weak/empty/low-confidence queries. AI must be **never-blank** — always guide the user, never return an empty/irrelevant result.

---

## 6. Frontend conventions (`frontend/`)

- **App Router.** Pages in `app/<route>/page.tsx`. Client components need `"use client"`. Use `usePathname()` for context (e.g. `Navbar.tsx` hides Directory-only nav on suite/Consultations pages via `showDirectoryNav`).
- **One API client:** `lib/api.ts`. It has `request<T>()` (returns `json.data`, injects the Bearer token, throws on `!success`), `toQuery()`, `getToken()`. Add new calls here; add types to `lib/types.ts`. Note: `request<T>` **drops any top-level `meta`** — if an endpoint returns `{data, meta}` (e.g. `getExperts`), write a raw `fetch` that keeps both. `request<T>` also **de-dupes concurrent identical GETs** (same URL, in-flight at once) into one network call — a safety net, not a cache; it doesn't touch non-GET requests.
- **Shared session-wide data lives in a Context provider, not a per-component fetch.** Before adding a `useEffect` that calls `getCategories()`/`getBrands()`/`getFeaturedSellers()`, use `lib/catalog.tsx`'s `useCategories()` / `useCategoryTree()` / `useBrands()` / `useFeaturedSellers()` instead — they're fetched once per session by `CatalogProvider` (mounted in `app/layout.tsx`). Landing on `/directory` used to fire `getCategories()` 3x and `getBrands()`/`getFeaturedSellers()` 2x each simultaneously (every component that needed one independently re-fetched it) — 15-20+ redundant concurrent requests on a single page load, which was the real cause of a "first click after page load does nothing" bug (the browser's ~6-connections-per-origin cap queued the navigation request behind the burst). Follow the same provider pattern (`lib/config.tsx` is the template: fetch-once-on-mount, safe empty defaults, non-throwing hook) for any other data every page-load component might independently want. `app/layout.tsx` also mounts `components/RouteProgress.tsx` — a slim top-of-viewport progress bar (not a full-page loader) that gives instant click feedback during navigation; leave it alone unless the ask is specifically about navigation feedback.
- **Design system (`app/globals.css`)** — use these tokens/classes, don't hardcode hex:
  - Colours: `--brand` #2563EB, `--action` #F97316, `--ink`, `--muted`, `--faint`, `--border`, `--bg-subtle`, `--brand-tint`, `--action-tint`, `--canvas`.
  - Classes: `.card` / `.card-flat`, `.btn` `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-sm` `.btn-lg` `.btn-block`, `.chip`, `.badge` (`.badge-new` etc.), `.container-bs`, `.eyebrow`, `.section-pad` / `.section-pad-sm`, `.line-clamp-1/2`, `.skeleton`, `.divider`.
- **Reusable atoms** (check before building new ones): `components/Avatar.tsx`, `Badge.tsx`, `Breadcrumbs.tsx`, `Modal.tsx`, `Rating.tsx`, `Button.tsx`, `components/home/SectionHeading.tsx`, `components/AISearchBar.tsx` (props `size:"hero"|"compact"`, `placeholder`, `examples`), `components/auth/ContactAuthModal.tsx` (inline login/OTP + register modal — the login-gate for any "this needs an account" click; mirrors `app/login/page.tsx`/`app/register/page.tsx`, takes `open`/`onClose`/`onSuccess`).
- **Money:** always `Number(x).toLocaleString("en-IN")` with a `₹` prefix; handle null → "Custom quote".
- The dashboard is one tabbed shell: `components/dashboard/DashboardShell.tsx` composes `*Tab.tsx` files; tabs can be gated by feature flags or (like the expert "Consultation requests" tab) by a user attribute.

---

## 7. Data model quick reference (`backend/DB/`)

Collection/field names below are the same whether the live backend is Postgres or the file-DB (`lib/store.js` normalizes the shape — see §2/§3); `backend/DB/*.json` is still the easiest way to eyeball the shape even when Postgres is what's actually serving requests. Full detail in **DIRECTORY.md §Data model**. The essentials:
- `users.json` — one record per person. Buyers are plain; sellers have a `sellerProfile` (companyName, slug, location, isVerified, plan/lead-quota fields, rating…). A Consultations **expert** is a seller whose `sellerProfile.expert` block is set (profession, registration, specializations, languages, packages…).
- `listings.json` — products AND services distinguished by `type: "product" | "service"`. Products carry a `product` block; services carry a `service` block (rateCard, timeline, deliverables). **Services belong to Consultations; products to the Directory.** Multi-vendor: the same product offered by many sellers is grouped by a `productKey`.
- Leads: `inquiries.json` (buyer enquiries/RFQs) → fan-out writes rows to `leads-ledger.jsonl`; seller replies in `quotes.json`.
- Consultations: `consultation-bookings.json` (booking requests to experts).
- Others: `categories.json`, `collections.json`, `reviews.json`, `shortlist.json`, `follows.json`, `boost-requests.json`, `ad-slots.json`/`ad-bookings.json`, `notifications.json`, `verification-requests.json`, `subscription-plans.json`, `features.json`, `settings.json`, `_counters.json`.

---

## 8. Current state (what already works)

The Directory and Consultations are **feature-built as a POC** — the next job is to **productionize + finish**, not build from scratch (see DIRECTORY.md roadmap). Working end-to-end today:
- Directory: category browse, keyword + AI concierge search, listing detail with view tracking, brands, multi-vendor "also offered by N sellers", compare, shortlist, follow, enquiry + broad RFQ fan-out → leads, quotes, reviews, collections/concepts. Seller contact (Call/WhatsApp, pre-filled `wa.me` message) is gated behind login — logged-out visitors see a login/register modal instead of the number; no in-app chat button on these pages (see §2 "Contact & chat"). Seller profile also has a Stories tab (`components/seller/SellerStoriesSection.tsx`) for 24h updates + highlights, flag-gated (`stories`/`storyHighlights`).
- Seller: register (main user, no company fields; own basic account lives at `/profile`, separate from anything Directory) → become-seller from the Directory dashboard's Profile tab (`/dashboard?tab=profile`) or auto-stubbed on first `/sell` listing → create/edit/bulk-upload listings, multi-location/PAN-India, verification, trust score, and a tabbed dashboard (overview/analytics/listings/leads & RFQs/promote-boosts/advertise/subscription/referral/reviews/blogs/stories/profile) — unlocked only once a `sellerProfile` exists.
- Consultations: expert directory with native-select filters, dedicated expert profile (packages, credentials, reviews, case studies), book-a-consultation modal (lead only), and an expert-side "Consultation requests" dashboard tab.
- Admin (`/admin`): sellers approve/suspend, categories CRUD, monetization/plans, ad slots, boost approval, moderation queue, verification queue, collections, feature catalog + entitlements matrix, site config.

---

## 9. Gotchas (learned the hard way)

- **Restart the backend after backend edits** — it's plain `node`, no hot reload.
- **`request<T>()` drops `meta`** — use a raw fetch when you need it.
- **Inline `node -e`/`-pe` test snippets** are error-prone in this shell; prefer writing a small `.cjs` file to the scratchpad and running it, or `node -e 'JSON.parse(require("fs").readFileSync(0))…'` reading stdin.
- **`require("./lib/x")` in a scratch script resolves relative to the script file, not cwd** — require an absolute path or run from the module's dir.
- Services (`type:"service"`) must not leak into Directory product browse, and vice-versa.
- Demo data lives in `backend/DB/` and is regenerated by the `scripts/seed-*.js` files (not a single command; see HANDOVER.md for order). Treat DB contents as **demo + PII** — see SECURITY.md before pushing anywhere.
- The old `README`/`DESIGN.md` describe a previous dark/Three.js look — the app is now the light design system above. When in doubt, the running app + this file win.
- **`next dev` compiles a route on first request after a (re)start** — a fresh page load or a route not yet visited this session can take several seconds with no visible feedback (no `loading.tsx` exists anywhere in the app; `RouteProgress`, §6, only signals that a click registered, it doesn't make the compile itself faster). `frontend/package.json`'s `dev` script runs `next dev --turbo` to shrink this. Don't mistake the delay for a broken click when testing manually — wait it out once per route per dev-server run.
- **Before assuming a slow endpoint needs a cache, check whether it's actually an N+1 query problem first** (see §5's Postgres composite-mapper note) — caching a query pattern that re-runs thousands of round-trips per request just hides the real cost under a warm cache; the `/api/categories`/`/api/brands` fix (WORKFLOW.md, 2026-08-19) was batching the query shape, not caching, that mattered most.
- **Logging in doesn't retroactively unlock data already fetched while logged out.** Since `GET /sellers/:slug` only includes `contactMobile`/`contactEmail` for authenticated requests (§2/§5), a page that fetched the seller profile before login has that field permanently `undefined` in its React state — `useAuth()`'s `user` becoming truthy doesn't change already-fetched props. `SellerContactCard.tsx`/`SellerHeader.tsx` take an `onContactUnlocked` callback that the parent page (`listing/[id]/page.tsx`, `seller/[slug]/page.tsx`) wires to a re-fetch of the seller profile, called from `ContactAuthModal`'s `onSuccess`. Any other gated-field UI needs the same explicit refetch-on-auth-change, not just a re-render.
- **`useState(someAsyncProp)` only captures whatever that prop was AT MOUNT — same bug class as the login-unlock one above, caught again in `ApplyModal.tsx`.** That component was mounted unconditionally on `job/[id]/page.tsx` (not gated on the "open" prop), so its `useState(cp?.resumeUrl || "")` initializer ran on the page's very first render, before `useAuth()`'s async `/api/auth/me` fetch resolved — `resumeUrl` then stayed `""` forever even after the real profile (with a résumé already on file) loaded a moment later, forcing every applicant through a redundant CV-upload step. Fixed by only mounting the modal once its `open` state is true (`{applyOpen && <ApplyModal ... />}`) — by then `user`/`candidateProfile` are guaranteed loaded, since the click handler that sets `open` already requires `user` to be truthy. **Any modal/component that seeds local state from `useAuth()`'s `user` (or another async-loaded prop) must either mount lazily (only when actually opened/needed) or resync via a `useEffect` keyed on that prop** — never trust a bare `useState` initializer to reflect data that might still be loading.
- **Recruitment pages must be wrapped in `<RecruitmentGate>` individually if they sit outside the `/recruitment/*` URL tree.** `frontend/app/recruitment/layout.tsx` covers `/recruitment`, `/recruitment/jobs`, `/recruitment/dashboard` automatically, but `/job/[id]`, `/post-job`, and `/employer/[slug]` don't inherit it (different top-level route) — each wraps its own default export in `RecruitmentGate` directly. Adding a new Recruitment-reachable route outside `/recruitment/*` needs the same explicit wrap, or it'll ship live regardless of `featureFlags.recruitmentLive` (RECRUITMENT.md §5).
