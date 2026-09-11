# WEB-REDESIGN.md — in-place frontend UI redesign

**Read alongside `CLAUDE.md` and `BACKEND-AUDIT.md`.** Standing context for the frontend visual
redesign. Load this at the start of any session that touches the redesign.

---

## Strategy

The UI developer redesigns **`frontend/` in place**, page by page. `backend/` is unchanged.
`Design/` (the Vite prototype) stays the visual + interaction reference.

There is **no separate `web/` app** — an earlier plan for that was dropped. Ignore any mention of
a `web/` folder in older notes or the plan file.

### Workflow

```
UI dev  -->  edits frontend/ on his task branch, one page/area per task
        -->  merges his branch on task completion, pushes

Owner   -->  git pull
        -->  run frontend/ + backend/, check the changed page works and nothing else broke
        -->  if good: merge into the safe branch
        -->  if broken: fix, or send back to UI dev
```

**Safe branch** = the known-good integration branch (currently `feature/backend-phase1`). The UI
dev's merged changes are only promoted there after the owner's check passes.

---

## `frontend-backup/` — local pre-redesign snapshot

A copy of `frontend/` (minus `node_modules`, `.next`, build artifacts) taken **before** the
redesign started, at repo root as `frontend-backup/`.

- **Gitignored** — local only, never committed. Exists for reference.
- Use it to diff the old UI against the new, recover a component/pattern the redesign dropped by
  mistake, or check original behaviour when a redesigned page regresses.
- Refresh it only if you deliberately want a new baseline:
  `robocopy frontend frontend-backup /MIR /XD node_modules .next /XF tsconfig.tsbuildinfo next-env.d.ts`
- Delete it once the redesign is done and signed off.

---

## Rules that still apply (from `CLAUDE.md` §2/§6)

Product-owner rules — the redesign must not break these:

- **No emojis in UI.** Line-glyph SVG icons only (`viewBox="0 0 24 24"`, `stroke="currentColor"`).
- **Native `<select>`** for filters/choices wherever possible.
- **Zero horizontal overflow** at 375–390px on every page.
- **Local images only** (`/demo/*.jpg` or uploads). Never hot-link external URLs.
- **No payments / cart / checkout.** Lead + directory model.
- **AI via the local `claude` CLI** through the backend. Never add `ANTHROPIC_API_KEY`.
- **Seller contact (Call/WhatsApp) stays login-gated**; no in-app chat button on buyer-facing
  pages.
- **Design system** — the app uses the `frontend/app/globals.css` CSS-variable system + Tailwind.
  If the redesign adopts `Design/`'s token architecture, it replaces `globals.css` tokens; it must
  not leave two conflicting palettes.

---

## What must keep working (do not let the redesign regress these)

The data/logic layer is visual-free and should survive untouched. If a redesigned page stops
using one of these, that's a red flag:

| Layer | Files |
|---|---|
| API client | `frontend/lib/api.ts` (~1857 lines, ~180 fns; unwraps `{success,data}`, Bearer token, `bs:session-expired` on 401) |
| Types | `frontend/lib/types.ts` |
| Contexts | `lib/auth.tsx`, `lib/config.tsx`, `lib/catalog.tsx`, `lib/shortlist.tsx`, `lib/i18n.tsx`, `lib/searchDock.tsx`, `components/Toast.tsx` |
| Guards / helpers | `lib/useRequireAuth.ts`, `lib/useGuestOnly.ts`, `lib/redirect.ts`, `lib/entitlements.ts`, `lib/socket.ts`, `lib/whatsapp.ts`, `lib/indiaGeo.ts`, `lib/directoryPaths.ts`, `lib/categoryTree.ts`, `lib/categoryImages.ts`, `lib/recruitmentProfile.ts` |
| Proxy | `frontend/next.config.mjs` — `/api/:path*` rewrite to the backend origin |

Known gotchas the redesign can re-trigger (see `CLAUDE.md` §9):

- **Auth-unlock refetch** — login-gated fields (`contactMobile`/`contactEmail` on
  `GET /sellers/:slug`) need the parent page to refetch on auth success, not just re-render.
  `SellerContactCard.tsx` / `SellerHeader.tsx` take `onContactUnlocked`.
- **Lazy-mount modals** — any modal seeding local state from `useAuth()`'s `user` must mount only
  when opened, or resync via `useEffect`. Bit `ApplyModal.tsx` on `job/[id]`.
- **`RecruitmentGate`** — Recruitment routes outside `/recruitment/*` (`/job/[id]`, `/post-job`,
  `/employer/[slug]`) each wrap their own gate.
- **Catalog fetch storm** — use `lib/catalog.tsx` hooks, never per-component
  `getCategories()`/`getBrands()` in a `useEffect`.

---

## Owner review checklist (per pulled change)

1. `cd frontend && npx tsc --noEmit` — clean.
2. `npm run dev` (frontend) + `node index.js` (backend) — the changed page loads (200), renders.
3. Overflow — no sideways scroll at 390px on the changed page.
4. Functional parity — every action/state the page had before still works (compare against
   `frontend-backup/` or the live old build if unsure).
5. States — loading / empty / error / signed-out all still render.
6. Spot-check neighbouring pages/shared components the change could have touched (Navbar, Footer,
   shared atoms in `components/`).
7. If clean → merge into `feature/backend-phase1` (the safe branch).

---

## Branching

- `feature/backend-phase1` — the safe integration branch (backend work + reviewed UI merges).
  Merge, never rebase (published).
- UI dev works on his own branch(es), merges + pushes per task; owner pulls, reviews, promotes.
- `Design/` prototype updates still flow one-way via the `design` branch merge
  (`BACKEND-AUDIT.md` → "Branching & UI integration").
- **`feature/design-integration`** — created 2026-09-09 from `feature/backend-phase1`. This is
  where the UI developer's full redesign (`origin/design`) is merged into the functional
  frontend, reviewed, and fixed. Delta at branch time: 8 commits, ~57 frontend code files,
  +4129 / -4927. Promote to `feature/backend-phase1` only once integration is stable.

---

## This integration pass — approach

The UI developer redesigned the frontend and merged it to `origin/design`. Goal on
`feature/design-integration`:

- **Replace the UI, keep the existing APIs.** Wire the new components to the current
  `frontend/lib/api.ts` functions so pages show **dynamic** results, not static mockup data.
- **Do NOT force old functionality to survive unchanged.** Some behaviour is expected to change
  with the new UI. Where the redesign dropped a feature, treat it as possibly intentional —
  note it in the log, don't blindly re-add.
- **`frontend-backup/`** (repo root, gitignored) is the pre-redesign reference. Use it to
  recover a dropped component/pattern or check original behaviour. No risk of code loss.
- Work sequence: pull `origin/design` onto this branch → review the incoming diff →
  fix wiring / regressions here → verify with the owner checklist above → promote.

---

## The new design flow (merged 2026-09-09)

Designer's own docs, merged with the code — read these for intent:
`HANDOFF.md`, `PRODUCT-DESIGN-MIGRATION.md`, `MIGRATION-CAPABILITY-MATRIX.md`, `AGENTS.md`,
`frontend-design-guide.md`, `frontend/docs/visual-directions/`.

**Public product is now three destinations: Home, Directory, Recruitment.** Consultations,
Credit Card and Mutual stay in the repo but are out of the shell. Directory is recomposed
**company/service-first** — product cards, category grids, brands, RFQ and quotation language
are deliberately absent from the primary journey (they still exist on legacy routes).

- **Shell** — `Navbar.tsx` 654 → 79 lines. Three links with route-family matching (`/directory`
  covers `/search` + `/seller/*`; `/recruitment` covers `/job/*` + `/employer/*`). Auth menu,
  notifications, both workspace links survive. Dropped: category strip + mega-menu, suite
  products menu, Advertise button, `/blog` + `/about` links, **all i18n** (labels are literals
  now). `Footer.tsx` is 14 lines, fully static.
- **Search (the big structural change)** — three surfaces share `lib/searchDock.tsx` (extended
  with `universalQuery`, `roleWorkplace`). Home's `components/home/UniversalSearch.tsx`
  classifies intent **client-side** (`classifyUniversalSearch` in `lib/productDesign.ts`, two
  regex lists, no API) and routes to `/search` or `/recruitment/jobs`; low confidence shows a
  "Where should we search?" chooser. `SectionSearchDock.tsx` serves Directory + Recruitment;
  `RoleSearchBar.tsx` (484 lines) serves the jobs workbench. Each docks a compact copy into the
  navbar on scroll. `SearchContextSwitch.tsx` adds Directory ↔ Recruitment correction links.
- **Evidence / updates layer** — `lib/livingEvidence.ts` normalises stories + blogs + reviews
  into one `PublicUpdate` shape for `components/evidence/*`. Prototype fallback content only
  renders when `NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW === "true"`. `EvidenceMedia` visibly stamps
  `Prototype media` on every `/seed-media/*` and `/demo/*` asset.
- **Frontend adapters standing in for missing backend fields** — `lib/productDesign.ts`
  (service families + capabilities, a **9-slug allowlist**), `lib/recruitmentDesign.ts`
  (prototype employer media, salary/freshness formatters), `lib/livingEvidence.ts`.

---

## API wiring plan

**Decisions (owner, 2026-09-09):** the 9-slug `alignedDirectorySlugs` allowlist **stays** for now
(Directory is a curated showcase) · this pass is **frontend-only**, backend gaps written up and
held for separate approval · order is **Home → Recruitment → Directory**.

Full working plan: `C:\Users\HP\.claude\plans\humming-rolling-turing.md`.
This section is the durable summary — update it as passes complete or the design changes.

### Current wiring status

| Surface | Wired today | Main gap |
|---|---|---|
| `/` Home | `getBlogs` (seller + employer) only | `HANDOFF.md` claims sellers/jobs/activity/promotion were connected — that code is **not in `app/page.tsx`**; later commits stripped it. `NativePromotionSlot` (only `getAds` caller in repo) is orphaned. |
| `/directory` | `useFeaturedSellers`, `getStories`, `getBlogs`, `getRecentActivity` | `/api/sellers/featured` returns **no `logo`** and is capped at 8 with no params; ∩ 9-slug allowlist may render almost nothing. Ad slot hardcoded. |
| `/search` | `getFeaturedSellers` + `searchSellers` ×2 | `family` + `city` read from URL but **never sent to API**; all filtering client-side over ≤50 rows |
| `/recruitment` | `getJobs({limit:18})`, `getJobFunctions`, `getBlogs`, `getStories` | company role counts wrong (18-job sample; old page used 50); ad slot hardcoded; testimonials + live open-roles total dropped |
| `/recruitment/jobs` | **fully wired** — 12-param `getJobs`, pagination, skeletons, error/empty/retry | city filter is free-text but backend matches city **exactly** → silent zero results; `recruitment_search_top` ad slot dropped |

### Endpoints that already exist and should be used (no backend change needed)

`GET /api/sellers?q=&limit=&page=` (returns `logo` — prefer over `/featured`) ·
`GET /api/jobs` (12 params, returns `total`) · `GET /api/job-functions` ·
`GET /api/stories?authorType=` · `GET /api/blogs?authorType=` · `GET /api/reviews/recent` ·
`GET /api/reviews/recruitment-recent` · `GET /api/ads?placement=` — live placements:
`home_hero`, `recruitment_home`, `recruitment_search_top`, `sponsored_row`, `banner`, `sidebar`.

### Pass 1 — Home  ☑ done 2026-09-09 (scoped down — no new UI)

- ☑ Mount `NativePromotionSlot` (their component, was orphaned; calls `getAds("home_hero")`,
  renders nothing when unbooked). Placed after the guides section in a plain `le-shell`.
- ☑ Gateway tile `<small>` text now live: `searchSellers({q:"",limit:1})` → company total,
  `getJobs({limit:1})` (only when `recruitmentLive`) → role total. Falls back to the original
  static copy when a count is unavailable. No markup / no CSS change.
- ✗ **Dropped from plan** — a new "live proof records" section (companies + roles + review
  activity). That was invented UI beyond "wire existing UI to APIs"; owner reverted it, incl.
  the ~25 lines of CSS it needed. If home should show live records later (HANDOFF.md said it
  once did), that is a separate design decision, not this pass.
- ✗ Recruitment-gateway gating not needed — `/recruitment` landing always renders (the gate
  only covers `/recruitment/jobs`, `/job/*`, `/employer/*`).
- `standards` + `journey` stay static — marketing copy, no backend equivalent.
- Files: `frontend/app/page.tsx` only. `npx tsc --noEmit` clean, `/` returns 200.

**Scope rule confirmed with owner mid-pass:** wire the new UI to existing APIs; do **not** add
new sections, markup, or CSS. If a page genuinely needs a surface the designer didn't build,
flag it and stop — don't build it. (Fixing an actual merge regression is still in scope —
see the universal-search fix below.)

**Bug fixed — Home universal search "not clickable / text invisible".** Merge regression, not
from Pass 1. `.le-hero` sets `color:white`; `.bn-universal-search input` had no `color` of its
own (unlike `.bn-section-search input`), so typed text and the caret were white on the ivory
field — looked dead. Fix: one rule in `counter-direction.css` setting
`color`/`caret-color: var(--counter-ink)` + a muted placeholder on
`.le-page .bn-universal-search input`. Verified: typing registers in the controlled input,
text now dark.

### Pass 2 — Recruitment  ☐ not started

- ☐ Raise landing fetch to `getJobs({limit:50})` so hiring-company counts are real; surface `total`
- ☐ Replace hardcoded landing ad with `getAds("recruitment_home")`
- ☐ Add `getAds("recruitment_search_top")` above the jobs results list
- ☐ **Fix the city trap** — `JobFilters` free-text city → native `<select>` over `ALL_CITIES`
  (`lib/indiaGeo.ts`), matching `RoleSearchBar` / `SectionSearchDock`. Backend matches city with
  exact equality, so any typo/case mismatch silently returns zero.
- ☐ Replace literal `✓` / `×` glyphs with inline SVG (CLAUDE.md §2)
- ☐ **Owner decision:** re-add candidate testimonials (`getRecruitmentRecentReviews`) or accept
  the cut and delete the dead import at `recruitment/page.tsx:35`

### Pass 3 — Directory + /search  ☐ not started

- ☐ **First:** verify at runtime how many companies survive `featured (max 8) ∩ allowlist (9)`.
  If near-zero, everything else here is cosmetic.
- ☐ Switch Directory source `useFeaturedSellers()` → `searchSellers({q:"",limit:50})` so `logo`
  populates. Keep `isAlignedDirectoryCompany`.
- ☐ Replace hardcoded Directory ad with `getAds("sponsored_row")`
- ☐ Drop the redundant `searchSellers({q:"",limit:50})` call on `/search` when `q` is present
- ☐ Document `NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW` in `frontend/.env.example`

### Backend requirements — written up, awaiting owner approval, no work yet

Ordered by how much they block the design.

| # | Need | Why |
|---|---|---|
| B1 | `logo` + `limit` on `GET /api/sellers/featured` | Directory company marks permanently null; 8-row cap |
| B2 | serviceFamily + capabilities as real `sellerProfile` fields (+ admin CRUD + seed) | the only thing keeping the 9-slug allowlist |
| B3 | Seller search filters `city`/`state`/`verified`/`family` + paging meta | `/search` filters client-side; params never reach the server |
| B4 | Public `GET /api/employers` with `openRoleCount` | Recruitment derives hiring companies from a jobs page |
| B5 | `salaryDisclosed` filter on `GET /api/jobs` | replaces the `minSalary=1` approximation |
| B6 | Case-insensitive / select-driven city match on `GET /api/jobs` | exact equality today → silent empty results |
| B7 | `icon`/`media` + open-role count on `GET /api/job-functions` | role-family covers are index-picked prototype images |
| B8 | Ad impression + click tracking | `getAds` serves creatives, nothing records delivery |
| B9 | Saved jobs + saved companies | shortlist is listings-only; blocks a unified Saved surface |
| B10 | SQL-side pagination on `GET /api/jobs` | fetches full match set, slices in JS (`jobs.routes.js:79-81`) |
| B11 | Aggregated public updates feed | `livingEvidence` composes three endpoints client-side |

---

## Daily task log

Append one dated block per working day. Record: what was integrated, what was removed or
changed (and why), what still needs API wiring, and any open regressions. When a pass above
completes, tick its boxes and note it here.

### 2026-09-09

- Created `feature/design-integration` from `feature/backend-phase1` (carried local
  `.gitignore` change + untracked `WEB-REDESIGN.md`).
- Fetched `origin/design` (`7370d9b..bcd7c74`), dry-ran the merge — **no conflicts** —
  committed it (`48642ff`). 8 commits, 153 files (incl. binary design screenshots + seed media),
  ~57 frontend code files +4129 / -4927. **No files deleted by the merge.**
  Large rewrites: `app/page.tsx`, `app/directory/page.tsx`, `app/recruitment/page.tsx`
  (-1141), `app/seller/[slug]/page.tsx` (-826), `app/job/[id]/page.tsx` (-487),
  `app/employer/[slug]/page.tsx` (-523), `components/Navbar.tsx` (-689),
  `components/Footer.tsx`, `app/pricing/page.tsx`. New: several CSS files, `lib/productDesign.ts`,
  `lib/recruitmentDesign.ts`, `lib/livingEvidence.ts`, `components/evidence/*`,
  `components/home/UniversalSearch.tsx`, `components/SectionSearchDock.tsx`,
  `scripts/validate-design-system.mjs`.

- **Protected data layer — intact.** `lib/api.ts`, `lib/types.ts`, `lib/auth.tsx`,
  `lib/catalog.tsx`, `lib/shortlist.tsx`, `lib/i18n.tsx`, all guards/helpers,
  `next.config.mjs`, `components/Toast.tsx` — untouched.
  - `lib/config.tsx` — brand rename BharatSource → Bharat Navya only, forces
    `siteName`/`logoText`/`tagline`; API shape preserved.
  - `lib/searchDock.tsx` — additive (`roleWorkplace`, `universalQuery`) + one behaviour change:
    the search query is no longer cleared on navigation (search intent now persists across Back /
    detail visits). Watch for cross-page query leak in the UI pass.

- **API wiring — 147/148 `lib/api.ts` functions still called.**
  - Dropped: `getRecruitmentRecentReviews` — new `recruitment/page.tsx` removed the recent-reviews
    section; import at line 35 now dead. Assume intentional UI cut; confirm with UI dev.

- **Orphaned components (still on disk, zero importers after the rewrite)** — revisit in phase 2/3:
  | Component | Old API wiring | Note |
  |---|---|---|
  | `components/dashboard/InboxTab.tsx` | `getConversations` `getMessages` `sendMessage` + socket | dashboard chat tab may be unlinked — check |
  | `components/seller/SellerHeader.tsx` | `getFollowStatus` + `onContactUnlocked` refetch | new seller page must keep follow + contact-unlock refetch |
  | `components/recruitment/JobResults.tsx` | `getJobs` | replaced by new jobs UI |
  | `components/home/TrendingRail.tsx` | `getListings` | old landing section, replaced |
  | `components/suite/SuiteStats.tsx` | `getCategories` `getFeaturedSellers` `getListings` | old landing section, replaced |
  | `components/sell/AutofillButton.tsx` | AI autofill on `/sell` | check `/sell` still has autofill |
  | `components/LanguageToggle.tsx` | — | i18n switch removed from UI |
  | `components/home/TopBrands.tsx`, `ActivityFeed.tsx`, `ValueProps.tsx`, `suite/ProductGrid.tsx` | — | old landing sections, replaced |
  | `components/home/NativePromotionSlot.tsx` | — | added by design branch but already orphan — dead on arrival |

- **Ran both servers** — backend `:4000` (`node index.js`, PG_URL + JWT_SECRET already in
  `backend/.env`), frontend `:3000` (`npm run dev`, Next 14.2.35 turbo). Both 200.

- **Reviewed the new design flow** for Home / Directory / Recruitment (dashboard + admin
  deliberately out of scope — designer still working on them). Findings folded into the
  "New design flow" and "API wiring plan" sections above. Key ones:
  - `/recruitment/jobs` is the best-wired page in the redesign; Home is the thinnest.
  - Only real defect found: the `/recruitment/jobs` free-text city filter against an
    exact-match backend → silent zero results.
  - 3 ad placements dropped (`home_hero`, `recruitment_home`, `recruitment_search_top`) though
    `GET /api/ads?placement=` works for all of them.
  - `lib/config.tsx` now hard-overrides `siteName`/`logoText`/`tagline` **after** spreading the
    API response — the admin Site Config brand fields are effectively dead. Intentional per the
    migration contract, but worth knowing.

- **Pass 1 (Home) done** — scoped down. Only `frontend/app/page.tsx`: mounted the orphaned
  `NativePromotionSlot`, made the two gateway tiles show live company/role totals. A live-proof
  records section was built then reverted at owner's request (invented UI + CSS, out of scope).
  Scope rule tightened: wire existing UI to APIs, add no new sections/markup/CSS.
  `tsc` clean, `/` 200.

- **Next:** Pass 2 (Recruitment) on owner confirmation — landing `getJobs` limit 18→50 for real
  company counts, wire the two dropped ad slots, fix the `/recruitment/jobs` free-text city
  filter (native `<select>`; backend matches city exactly), swap literal `✓`/`×` for SVG.

---

## Reference material

- `frontend-backup/` — pre-redesign `frontend/` snapshot (local, gitignored).
- `Design/` — Vite prototype: visual direction, `src/design-system/` tokens + primitives,
  `docs/DESIGN_SYSTEM.md` governance, screen compositions, the 13 approved page patterns.
- `frontend/` git history — every pre-redesign implementation.
