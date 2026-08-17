# CLAUDE.md — read this first

You are picking up **BharatSource**, a production-bound web app, with no prior context. This file is your onboarding: architecture, the rules you must not break, how to run and verify, and the traps. Read it fully before editing. Companion docs: **HANDOVER.md** (human setup), **SECURITY.md** (pre-go-live), **DIRECTORY.md** (the flagship product's flows + roadmap), and the older `DESIGN.md` / `BUILD-SPEC.md` / `FRONTEND-PAGES-SPEC.md` (partly stale — trust the code over them).

> Paths in this repo contain a space: `/Users/dev/Documents/Personal /Projects/IndiaMart/bharatsource`. **Always quote paths** in shell commands.

---

## 1. What this is

**BharatSource** is a multi-product **SUITE** (an umbrella brand over several products), aimed at a mostly non-technical, mobile-first Indian audience.

| Product | Route | Status | What it is |
|---|---|---|---|
| **Directory** | `/directory` | ✅ Live | B2B/B2C marketplace: buyers discover products & suppliers, send enquiries/RFQs. **Lead model — no payments, no cart, no checkout.** |
| **Consultations** | `/consultations` | ✅ Live | Hire experts (CAs, lawyers, consultants…): expert profiles, fixed-price service **packages**, **book a consultation** (also lead-only). |
| **Credit Card** | `/credit-card` | 🔜 Coming soon | Placeholder page. |
| **Mutual** | `/mutual` | 🔜 Coming soon | Placeholder page. |

The suite homepage (`/`) is an umbrella landing with an AI concierge search. One account works across all products.

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
- **File-based storage only.** JSON/JSONL under `backend/DB/`. **Do NOT introduce an external database** (Postgres, Mongo, etc.) without explicit owner approval — it's a deliberate architecture choice.
- **No payment processing.** The whole app is lead/directory based. Don't add carts, checkouts, or payment gateways.

**AI**
- **AI runs through the local `claude` CLI, not a paid API key.** The host machine is logged into a Claude Code subscription; the backend shells out to `claude -p "<prompt>"`. See `backend/lib/claudeCli.js`. Do not "fix" this by switching to `ANTHROPIC_API_KEY` unless the owner asks — it would start billing them.

---

## 3. Architecture at a glance

Two processes, one origin:

```
Browser ──▶ Next.js 14 (frontend, :3000)
                │  next.config.mjs rewrites  /api/*  ─▶  Express (backend, :4000)
                ▼
        Express API ──▶ backend/DB/*.json|jsonl   (file-DB via lib/store.js)
                   └──▶ `claude` CLI (spawned)     (AI search / RFQ)
                   └──▶ Socket.IO (:4000)          (realtime chat)
```

- **Single origin trick:** the browser only ever talks to `:3000`. Next rewrites `/api/*` to the backend server-side (`frontend/next.config.mjs`), so one tunnel/port serves UI + API and there are no CORS issues. `NEXT_PUBLIC_API_URL` is intentionally empty for this.
- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind + a custom CSS-variable design system in `frontend/app/globals.css`. `frontend/lib/api.ts` is the single typed API client.
- **Backend:** Express (CommonJS), file-DB via `backend/lib/store.js`. Deps of note: `bcryptjs` (password hashing), `jsonwebtoken` (JWT auth), `proper-lockfile` (file-write locking), `minisearch` (search index), `zod` (validation), `socket.io`.
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

- **The file-DB (`lib/store.js`) is the ONLY persistence layer.** Use its API — never `fs.readFile` a DB collection directly:
  - `store.all(coll)`, `store.getById(coll,id)`, `store.findOne(coll,fn)`, `store.findMany(coll,fn)`
  - `store.insert(coll,doc,idPrefix)` (auto-IDs like `lst_…`, `usr_…` via `_counters.json`), `store.update(coll,id,patch)`, `store.remove(coll,id)`, `store.nextId(prefix)`
  - append-only ledgers use `.jsonl` (e.g. `leads-ledger.jsonl`).
- **Route style:** one `express.Router()` per file in `routes/`, mounted in `index.js`. Every handler is `try/catch` → `next(err)` and returns the envelope `{ success: true, data }` (or `{ success:false, error }`). Mirror `routes/blogs.js` / `routes/inquiries.js`.
- **Auth:** `middleware/authGuard.js` exports `authGuard` (401 if no valid JWT), `optionalAuth` (attaches `req.user` if present, else continues — used for guest-friendly endpoints like consultation booking), and role checks. `requireRole("admin")` guards admin ops.
- **The nested-admin-route pattern (important gotcha):** the blanket `app.use("/api/admin", require("./routes/admin"))` in `index.js` guards everything under `/api/admin`. To expose an admin sub-API from a *different* router, mount it **before** that line and put the op under an inner `/admin/*` path. Examples already in `index.js`: `/api/admin/entitlements`, `/api/admin/categories`, `/api/admin/collections`, `/api/admin/boosts`, `/api/admin/moderation`. Follow this pattern for new admin sub-APIs.
- **Config:** `lib/config.js` reads env. `JWT_SECRET` throws in production if unset (dev falls back to an insecure default). `express.json({ limit: "8mb" })` in `index.js` — needed for base64 photo uploads from phones; keep it.
- **AI:** `lib/claudeCli.js` (`isClaudeAvailable()`, `askClaude(prompt,{timeoutMs})`, `askClaudeJSON()`, a 2-permit semaphore, ~3s latency). `routes/ai.js` is **deterministic-search-first, then Claude-refines** only on weak/empty/low-confidence queries. AI must be **never-blank** — always guide the user, never return an empty/irrelevant result.

---

## 6. Frontend conventions (`frontend/`)

- **App Router.** Pages in `app/<route>/page.tsx`. Client components need `"use client"`. Use `usePathname()` for context (e.g. `Navbar.tsx` hides Directory-only nav on suite/Consultations pages via `showDirectoryNav`).
- **One API client:** `lib/api.ts`. It has `request<T>()` (returns `json.data`, injects the Bearer token, throws on `!success`), `toQuery()`, `getToken()`. Add new calls here; add types to `lib/types.ts`. Note: `request<T>` **drops any top-level `meta`** — if an endpoint returns `{data, meta}` (e.g. `getExperts`), write a raw `fetch` that keeps both.
- **Design system (`app/globals.css`)** — use these tokens/classes, don't hardcode hex:
  - Colours: `--brand` #2563EB, `--action` #F97316, `--ink`, `--muted`, `--faint`, `--border`, `--bg-subtle`, `--brand-tint`, `--action-tint`, `--canvas`.
  - Classes: `.card` / `.card-flat`, `.btn` `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-sm` `.btn-lg` `.btn-block`, `.chip`, `.badge` (`.badge-new` etc.), `.container-bs`, `.eyebrow`, `.section-pad` / `.section-pad-sm`, `.line-clamp-1/2`, `.skeleton`, `.divider`.
- **Reusable atoms** (check before building new ones): `components/Avatar.tsx`, `Badge.tsx`, `Breadcrumbs.tsx`, `Modal.tsx`, `Rating.tsx`, `Button.tsx`, `components/home/SectionHeading.tsx`, `components/AISearchBar.tsx` (props `size:"hero"|"compact"`, `placeholder`, `examples`).
- **Money:** always `Number(x).toLocaleString("en-IN")` with a `₹` prefix; handle null → "Custom quote".
- The dashboard is one tabbed shell: `components/dashboard/DashboardShell.tsx` composes `*Tab.tsx` files; tabs can be gated by feature flags or (like the expert "Consultation requests" tab) by a user attribute.

---

## 7. Data model quick reference (`backend/DB/`)

Full detail in **DIRECTORY.md §Data model**. The essentials:
- `users.json` — one record per person. Buyers are plain; sellers have a `sellerProfile` (companyName, slug, location, isVerified, plan/lead-quota fields, rating…). A Consultations **expert** is a seller whose `sellerProfile.expert` block is set (profession, registration, specializations, languages, packages…).
- `listings.json` — products AND services distinguished by `type: "product" | "service"`. Products carry a `product` block; services carry a `service` block (rateCard, timeline, deliverables). **Services belong to Consultations; products to the Directory.** Multi-vendor: the same product offered by many sellers is grouped by a `productKey`.
- Leads: `inquiries.json` (buyer enquiries/RFQs) → fan-out writes rows to `leads-ledger.jsonl`; seller replies in `quotes.json`.
- Consultations: `consultation-bookings.json` (booking requests to experts).
- Others: `categories.json`, `collections.json`, `reviews.json`, `shortlist.json`, `follows.json`, `boost-requests.json`, `ad-slots.json`/`ad-bookings.json`, `notifications.json`, `verification-requests.json`, `subscription-plans.json`, `features.json`, `settings.json`, `_counters.json`.

---

## 8. Current state (what already works)

The Directory and Consultations are **feature-built as a POC** — the next job is to **productionize + finish**, not build from scratch (see DIRECTORY.md roadmap). Working end-to-end today:
- Directory: category browse, keyword + AI concierge search, listing detail with view tracking, brands, multi-vendor "also offered by N sellers", compare, shortlist, follow, enquiry + broad RFQ fan-out → leads, quotes, reviews, collections/concepts.
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
