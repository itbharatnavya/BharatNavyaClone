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

## Workspace/dashboard gating audit (owner-reported, 2026-09-11)

Owner spot-checked the merged design against old frontend behaviour for the workspace/
dashboard side (the UI dev has so far only pushed login/register + Directory/Recruitment/Admin
*workspace* pages — public Directory pages are still pending on his branch). Scope: functional
gates only; static/placeholder imagery on these pages is fine for now, subject to client
sign-off later.

**Confirmed regression — Admin link missing from the account menu.**
New `Navbar.tsx` destructures `useAuth()` without `isAdmin` and hardcodes exactly two links
("Directory workspace", "Recruitment workspace") for every logged-in user — no admin branch at
all. `/admin` itself is still safely gated server-side-equivalent (`useAuth().isAdmin`, redirects
non-admins) — this was a **nav-discoverability** bug, not a security hole: an admin had no link
to find their own console.

**Confirmed UX regression — both workspace links always shown, no page-context gating.**
Old Navbar showed exactly one of Dashboard(+Profile)/Recruitment-Dashboard/My-Profile, chosen by
**which product's pages you're currently browsing** (`inDirectoryContext`/`inRecruitmentContext`
in the pre-redesign `Navbar.tsx`), not by role/profile ownership — `DashboardShell.tsx` and
`RecruitmentDashboardShell.tsx` both self-onboard a non-member (Directory: non-seller sees only
a Profile tab; Recruitment: no `recruitmentRole` yet shows a role-selection chooser), so linking
there pre-membership was never actually broken plumbing, just inconsistent with the old UX.
Verified live with a fresh seller-only test account: account menu showed
`['Directory workspace', 'Recruitment workspace', 'Sign out']` even though that user has no
`recruitmentRole` at all.

**Owner decision:** restore the old context-based single-link behaviour (Directory pages →
Directory workspace; Recruitment pages → Recruitment workspace; elsewhere → My Profile) **and**
restore the Admin link (shown whenever `isAdmin`, independent of context) — this is exactly the
pre-redesign `Navbar.tsx` account-menu logic, just re-applied inside the new markup/classes.
Frontend-only, `components/Navbar.tsx`.

**API-wiring audit of all three workspaces — clean, nothing broken.** The merge touched
`DashboardShell.tsx`, `RecruitmentDashboardShell.tsx`, `admin/page.tsx`, and
`admin/users/[id]/page.tsx` **only to add CSS classnames** (`counter-dashboard-page`,
`counter-admin-page`, `counter-workspace-nav-item`, …) — zero logic changed. Spot-checked every
tab's data source (`OverviewTab`, `AnalyticsTab`, `ListingsTab`, `LeadsTab`, `ReviewsTab`,
`ProfileTab`, `MyJobsTab`, `ApplicationsTab`, `MyApplicationsTab`, `CompanyProfileTab`,
`CandidateProfileTab`, admin `UsersTab`/`EmployersTab` via `./adminApi`, `CategoriesTab`,
`JobsAdminTab`, `SiteConfigTab`) — all call real `lib/api.ts` / `admin/adminApi.ts` functions,
none mocked. `counter-workspace.css` (new, 419 lines) explicitly sets `color: var(--counter-ink)`
on every `.input/.select/.textarea` inside auth/dashboard/admin pages and only uses white text on
genuinely dark backgrounds (`.counter-auth-aside`, active nav states) — no repeat of the home
white-on-white bug.

**Live-verified** by registering 3 fresh throwaway accounts (seller via `POST /api/become-seller`,
recruiter via `POST /api/me/recruitment-role` + `POST /api/become-employer`, candidate via
`POST /api/me/recruitment-role`) and loading each dashboard with the issued JWT:
- Seller `/dashboard` → all 16 seller-eligible tabs render, no sign-in false-gate.
- Recruiter `/recruitment/dashboard` → Overview/My jobs/Applications/Profile/Stories/Blogs/
  Reviews/Advertise — correct recruiter-only tab set.
- Candidate `/recruitment/dashboard` → Overview/My applications/Profile only, plus the
  "switch role before you finish setting up" hint (profile incomplete) — correct.

**Fixed and verified live 2026-09-11** — `components/Navbar.tsx`: pulled `isAdmin` from
`useAuth()`, added `inDirectoryContext`/`inRecruitmentContext` (reusing the existing `links[]`
route-match functions + `/dashboard`/`/recruitment/dashboard`), rebuilt the account-menu to show
exactly one contextual link (Directory workspace+profile / Recruitment workspace / My profile)
plus Admin whenever `isAdmin`. `tsc` clean. Live-verified with 3 fresh throwaway accounts
(seller/recruiter/candidate) across 4 contexts — all four matched the pre-redesign behaviour:

| Test | Menu shown |
|---|---|
| Seller on `/dashboard` | Directory workspace, Directory profile, Sign out |
| Seller elsewhere (`/`) | My profile, Sign out |
| Recruiter on `/recruitment/dashboard` | Recruitment workspace, Sign out |
| Candidate on `/directory` | Directory workspace, Directory profile, Sign out |

**Admin link live-verified 2026-09-11** (owner supplied the `admin@bharatsource.in` password).
Account menu on `/` → `["My profile", "Admin", "Sign out"]`. `/admin` loads: Control Center, all
3 sections (Global/Directory/Recruitment), Overview tab shows real live counts (Users 131,
Sellers 61, Employers 21, Candidates 23, Listings 724 — not mock). 390px: 0px overflow, input
text dark ink — no repeat of the home white-text bug. **Both owner-reported points fully closed.**

Test accounts left in the local DB for future reference: `9000000011`/`9000000012`/`9000000013`
(seller/recruiter/candidate, password `TestPass123!`) — harmless demo rows, delete via admin
Users tab whenever convenient.

---

## Public page-by-page audit (in progress, 2026-09-11 onward)

Owner is checking each redesigned public page one at a time — read-only checks first (findings
logged here), fixes only after owner picks which bugs to act on. Directory public pages are
**pending** — the UI dev has not pushed them yet (only login/register + Directory/Recruitment/
Admin *workspace* pages so far). Recruitment is being checked now, page by page.

### `/recruitment` (home) — checked, not fixed

- **Search suggestions dropped.** Hero uses `RecruitmentSectionSearch`
  (`components/SectionSearchDock.tsx`) — text input + city `<select>` + workplace `<select>` +
  submit, **no autocomplete/suggestion dropdown**. Old page used `RoleSearchBar` — live
  as-you-type suggestions (12 curated searches + job-function chips), full keyboard nav
  (`role="combobox"`). A static 3-example "Popular searches" row remains below the bar, not an
  interactive typeahead. `RoleSearchBar` itself still exists, still used on `/recruitment/jobs`.
- **Workplace dropdown — "On-site"/"Hybrid" are silent no-ops.** City `<select>` options come
  from the static `ALL_CITIES` list (`lib/indiaGeo.ts`, same list used app-wide) — verified all
  12 real job cities match verbatim, city filter works correctly end to end. Workplace `<select>`
  options (`All workplaces`/`On-site`/`Hybrid`/`Remote`) are hardcoded, and the backend has
  **no "hybrid" concept at all** — only a boolean `remote` column. Live-verified: 47 total jobs,
  `remote=true` → 5. `jobs/page.tsx` only checks `workplace === "remote"`, so picking "On-site"
  or "Hybrid" silently returns all 47 jobs unfiltered — same as "All workplaces" — while implying
  a filter was applied.
- Already-known from the Pass 2 plan, still open: landing samples only 18 jobs for company role
  counts (old used 50); 2 unused ad slots (`recruitment_home` 4 ads, `recruitment_search_top` 3
  ads, both ready, neither called); live "open roles" total dropped; candidate testimonials
  dropped (`getRecruitmentRecentReviews`, zero callers); literal `✓`/`×` glyphs in 3 spots
  (`jobs/page.tsx:32,135`, `ApplicationStepper.tsx:11`) instead of inline SVG.
- **Working correctly, live-verified:** apply gate (candidate-profile-complete — real modal,
  matches RECRUITMENT.md), post-job gate (employer-profile-complete — real checklist), public
  employer profile (`/employer/[slug]`, real data, 0px overflow at 390px), `/recruitment/jobs`'s
  own filter+pagination (already fully wired to real `getJobs`).

**Next:** owner to say whether to fix any of the above now or keep checking pages first
(`/recruitment/jobs`, `/job/[id]`, `/employer/[slug]` individually, then Directory once pushed).

### `/recruitment` search suggestions + workplace type — done 2026-09-11

Two approved changes, both live-verified. **Correction mid-pass:** first attempt swapped the
hero to `RoleSearchBar` (a different, already-built component) — owner corrected this: the UI
dev's actual `RecruitmentSectionSearch` component must stay exactly as built; suggestions get
added *into* it, not replaced. Reverted the swap, implemented as below.

**1. Suggestion dropdown, added into `RecruitmentSectionSearch` itself**
(`components/SectionSearchDock.tsx`) — the UI dev's own component, markup/layout/city-select/
workplace-select/submit-button all untouched. Added: job-function fetch on mount, a shared
`POPULAR_SEARCHES` list (exported from `RoleSearchBar.tsx` so there's one list, not a fork),
client-side filtering as you type, full keyboard nav (arrows/enter/escape, `role="combobox"`),
click-outside-close. Picking a popular search submits through the same city/workplace-aware
`go()` the form itself uses; picking a job-function suggestion jumps straight to
`/recruitment/jobs?jobFunction=<slug>` (mirrors `RoleSearchBar`'s existing convention). New CSS
(`.bn-section-search-wrap/-dropdown/-dropdown-label/-opt`) added to `bharat-navya-home.css`
next to the existing `.bn-section-search` rules, matching that file's tokens/minified style —
`npm run validate:design` (the UI dev's own lint) passes. Because `RecruitmentDockedSearch` and
the mobile drawer reuse this same component, they picked up suggestions too, at no extra cost.
Live-verified: typing "sof" filters to "Software Engineer" under "Popular searches"; keyboard
nav + Enter navigates to `/recruitment/jobs?q=...`; 0px overflow at 390px with the dropdown open.

**2. Workplace type (on-site/hybrid/remote) — real field, backend to UI, in one pass:**
- **Backend:** migration `0015_add_job_workplace_type.sql` adds `jobs.location_workplace_type`
  (backfilled from the old boolean, indexed). `location_remote` is **kept**, not dropped —
  `job.service.js`'s `buildLocation()` now derives it FROM `workplaceType` on every write, so
  every existing boolean-only reader keeps working unmodified. Same free-text convention as
  Directory's `listings.service_mode` ("onsite"/"hybrid"/"remote"), not a new naming style.
  Wired through `flat.mappings.js` (one line — the generic repo does the rest), validated on
  `POST`/`PUT /api/jobs` (400 on an invalid value, mirrors `employmentType`/`experienceLevel`),
  and added as an independent filter on `GET /api/jobs` (`jobSearch.repository.js`) alongside
  the untouched `remote` filter. Live-verified end to end via curl: create with `workplaceType`,
  edit it, invalid value rejected (400), browse filter counts correct (47 total → 42 onsite / 5
  remote / 0 hybrid, matching backend truth exactly).
- **Frontend:** `JobFilters.tsx`'s "Remote roles only" checkbox replaced with a native
  `<select>` (On-site/Hybrid/Remote) — this **closes the earlier-reported bug** where On-site/
  Hybrid were silent no-ops. `/recruitment/jobs/page.tsx` now parses the `workplace` URL param
  into the real enum instead of only ever checking `=== "remote"`. `/post-job` (the single
  create-and-edit form) gets the same native select; city/state fields hide only when Remote is
  selected (Hybrid still shows them, since a hybrid role has a base office — On-site unchanged).
  Display formatters updated to surface "Hybrid" distinctly, not just collapse it into
  non-remote: `lib/recruitmentDesign.ts`'s `jobLocation()`, `MyJobsTab.tsx` (now reuses that
  same formatter), `JobsAdminTab.tsx`. (`JobCard.tsx`/`RecruitmentJob`/`mapRecruitmentJob` were
  left alone — confirmed dead code, zero live importers, pre-existing from the redesign merge.)
  Live-verified: `/recruitment/jobs`'s new Workplace select actually changes the result count
  (47→42→5); `/post-job`'s select shows/hides city correctly.
- `npx tsc --noEmit` clean throughout both changes.

### `/recruitment` follow-ups: hero paint-order bug, real suggestion matching — done 2026-09-11

**Hero dropdown hidden under "Hiring updates" section.** Two independent bugs in the shared
`.le-hero` (`living-evidence.css`), both root-caused via headless-Chrome DOM inspection, not
guessed:
1. `.le-hero{overflow:hidden}` clipped the dropdown at the hero's own bottom edge. Fixed by
   moving the decorative `::before`/`::after` orbit circles onto a new absolutely-positioned
   `.le-hero-decor` child (its own `overflow:hidden`, sized `inset:0`) so only the decorative
   circles clip — the hero itself no longer does. Added `<div className="le-hero-decor" />` to
   all 4 `.le-hero` usages (home, directory, recruitment, `/design-system`).
2. Even unclipped, the dropdown still painted *under* the "Hiring updates" cards below: `.le-hero`
   had `isolation:isolate` + `position:relative` but `z-index:auto` — and a later-in-DOM element
   elsewhere on the page (`.le-update-card-author`, `z-index:1`) won the tie at that stacking
   bucket. Fixed with an explicit `.le-hero{z-index:2}` (still under the sticky header's `60`).
   Verified via `elementFromPoint` at the overlap coordinate, both desktop and 390px.

**Suggestion dropdown was fully static — replaced with real matching.** Investigating "is Popular
Searches real" surfaced that the whole dropdown (`RecruitmentSectionSearch` in
`SectionSearchDock.tsx`, and the twin implementation in `RoleSearchBar.tsx` used on
`/recruitment/jobs`) was: a hardcoded `POPULAR_SEARCHES` list shown even on empty focus, plus
real job-functions as the only genuine data. Per owner direction:
- Dropdown now opens **only once the visitor types** — empty focus/click shows nothing.
- `POPULAR_SEARCHES` array deleted outright (was dead static copy, not data) from both files.
- Three real groups once typing starts: **Matching categories** (job-function catalog,
  client-filtered, ≤3), **Matching roles** and **Matching companies** — both debounced (250ms)
  off one shared `GET /api/jobs?q=` fetch (≤8 rows), same pattern as `DirectorySearchBar`'s
  `getListings` suggestions. Backend: `jobSearch.repository.js`'s free-text OR-match now also
  includes `e.company_name` (was title+description+jobFunction only) — a company-name query like
  "TechNova" now surfaces that employer's roles, verified via curl (0→3 results).
- **Bug found and fixed twice** (owner caught both by testing): the shared job-fetch is OR-matched
  across title/description/jobFunction/company in one SQL pass, so a job can land in the result
  set because *either* field matched. Naively deriving "Matching roles" and "Matching companies"
  from that same list leaked cross-matches (typing "developer" showed the employer of a matching
  role as a company suggestion; typing "technova" showed that employer's roles as role
  suggestions even though the role titles didn't contain "technova"). Fixed by re-checking each
  group's own field client-side (`job.title.includes(term)` for roles, `company.includes(term)`
  for companies) before including it — confirmed independently correct in both directions via
  headless Chrome.
- Selecting a role suggestion goes straight to `/job/:id`; a company suggestion to
  `/employer/:slug` (mirrors Directory's listing-suggestion → `/listing/:id` convention).
- `tsc`/`validate:design` clean throughout; live-verified on both `/recruitment` and
  `/recruitment/jobs`.

**TODO (explicitly deferred by owner, not forgotten):** the static 3-example "Popular searches"
chip row below the search bar (`app/recruitment/page.tsx:77`, and Directory's matching "Popular
needs" row at `app/directory/page.tsx:67`) stays hardcoded for now. Real backend support
(`GET /api/search/trending`/`/popular`) exists but is Directory-only and category-keyed
(`searchTrends.routes.js` aggregates strictly on `categorySlug` against `categories.json`) — making
it real for Recruitment needs a parallel `jobFunctionSlug`-keyed aggregation (or a shared
`product`/`source` field on the search-event) plus wiring Recruitment's search bar to log picks,
same as `DirectorySearchBar` does via `POST /api/search/log`. Not started.

**Confirmed real, not static:** the "Hiring updates" rail (`UpdateRail`, `resolvePublicUpdates()`
in `lib/livingEvidence.ts`) merges real `getStories("employer")` (0 groups today — none created
yet) with real `getBlogs({authorType:"employer"})` (6 real posts, cross-checked via curl against
the rendered company names — TechNova, FinEdge, NextGen EdTech, Vantage Logistics, Zenith Auto,
UrbanCart). The static `prototypeCopy` fallback array in that same file only activates when real
stories are empty AND `NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW=true` — currently `false` in
`.env.local`, so it never renders today.

**TODO (copy mismatch, found but not fixed):** `UpdateRail`'s subtitle "Fresh company and hiring
context" (`components/evidence/UpdateRail.tsx:17`) reads as a hiring-activity signal, but on
`/recruitment` the underlying data is career-advice blog guides ("Write a resume recruiters
actually read", "Acing a video interview") — not job-opening news. Old frontend never conflated
these: its "Companies hiring now" rail was 100% jobs-derived (real per-company open-role count),
matching today's separate `hiringCompanies` section further down the same page ("See the teams
behind the openings" grid, `recruitment/page.tsx:61-65`, real `getJobs()`-derived) — that section
is the correct "latest hiring companies" list; `UpdateRail` is a different, newer abstraction
(shared with Directory) for general company-authored content. Reword `UpdateRail`'s title/subtitle
when used on `/recruitment` (e.g. "Guides from hiring teams") so it stops reading as a hiring-list.
Not started — text-only change, no API/data involved.

### Directory public pages (category browse, listing detail, company profile) — checked, punch-list sent to UI dev — 2026-09-28

Owner reviewed the merged build locally and found regressions/gaps against the old pre-redesign
pages. Not fixed in-session — written up as screenshots + a page-by-page punch-list and sent
directly to the UI dev to action on their next pass.

- **Category browse pages** (e.g. `/education-training-events`): still the old list-view UI with a
  List/Grid toggle — should match the new Directory `/search` results UI instead (same cards,
  same layout). Possible duplicate/repeated filter bars too.
- **Category landing banner** pages: an old floating chat bubble / "Need help navigating?" widget
  is still live and overlaps page content on some pages — needs removing or repositioning.
- **Listing/service detail page**: empty gap above the Share/Report sidebar box; "More services
  from this company" grid reuses the same stock photo across cards; Post Requirement button +
  chat bubble overlap the last card's View button (z-index/positioning).
- **Company/seller profile page**: breadcrumb → cover → identity → stats spacing inconsistent;
  sponsored-company ad card sits almost touching the stats row above it; sidebar CTA card text
  overlaps the "Sign in to inquire" button; an inner section has an unwanted scroll that only
  shows partial data; **Reviews and Products sections are missing entirely** from the new page —
  UI dev asked to reference the old company page and rebuild those sections in the new UI style.

**Next:** waiting on UI dev's next pass; re-check against this list once pushed.

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

### 2026-09-11

- Committed Pass 1 on `feature/design-integration` (`0de6995`): live gateway counts, mounted
  `NativePromotionSlot`, the universal-search white-text fix, this doc.
- Pulled `origin/design` again (`bcd7c74..c98b666`, 6 commits, 26 files, **frontend-only** —
  first diffed against our own merge commit and it looked like a 268-file/44k-line backend
  demolition; that was comparing against the wrong base (`feature/backend-phase1`'s modules/
  architecture that the `design` line never had). Diffed against the correct prior tip
  (`bcd7c74`) instead — confirmed clean, no backend touched, no history rewrite.
  - **What the UI dev pushed:** purely visual — "Extend Counter direction to workspaces" (login,
    register, sell, profile, shortlist, post-job, recruitment/dashboard, admin all get the
    Counter class/copy treatment), a new `DecisionJourney` stepper component +
    `counter-workspace.css` (419 lines), a pinned scroll-driven homepage journey section,
    "Compact status cards to image previews", and **"Fix public search contrast and journey
    scroll"** — the same white-text search bug I'd just fixed, independently, same day.
  - **One real conflict:** `counter-direction.css`, both fixing the same bug. Resolved by
    keeping their broader selector (`:is(.bn-universal-search,.bn-section-search) :is(input,select)`
    — also covers Directory/Recruitment section-search selects) plus my `caret-color` (theirs
    didn't set it). `page.tsx` auto-merged clean (their journey-scroll code and my API wiring
    don't overlap). Committed as `3246241`.
  - Verified post-merge: `tsc` clean; `/`, `/directory`, `/recruitment`, `/login`, `/register`,
    `/sell`, `/profile`, `/shortlist`, `/recruitment/dashboard`, `/post-job` all 200; home
    gateway counts + dark search text both survived the merge; no horizontal overflow at 390px.

- **Next:** Pass 2 (Recruitment) on owner confirmation — landing `getJobs` limit 18→50 for real
  company counts, wire the two dropped ad slots, fix the `/recruitment/jobs` free-text city
  filter (native `<select>`; backend matches city exactly), swap literal `✓`/`×` for SVG.

---

### Pulled `origin/design` again (`c98b666..7790b50`) — merged 2026-09-11

11 new commits from the UI dev, merged into `feature/design-integration` as `54394f7`. One
conflict (`app/directory/page.tsx` hero copy vs. this session's `.le-hero-decor` fix — kept both).
`tsc`/`validate:design` clean; 10 spot-checked routes (incl. `/search?scope=products`, `/job/:id`,
`/post-job`) all 200; 0px horizontal overflow at 390px on Directory/Search/Recruitment.

**1. "Soft Counter" design system — new shared visual layer, sitewide, mostly CSS-only.**
New `app/counter-soft-system.css` (1124 lines, loaded last in `layout.tsx`) redefines the shared
`--bn-radius-*`/`--bn-shadow-*` tokens (radius: 15px controls / 22px cards / 30px sections;
two shadow levels) scoped to every `.le-page`/`.counter-*` page wrapper — this reskins Directory,
Recruitment, dashboards, admin, and auth/profile/sell/post-job flows **without touching their
JSX**, since it overrides variables those pages' existing CSS already consumes. This session's own
new dropdown CSS (`.bn-section-search-dropdown`, added for the suggestion-box work) inherits these
tokens automatically — confirmed no conflict. Per the UI dev's own `docs/SOFT_COUNTER_MIGRATION.md`,
all 5 phases (Foundation+Home, Directory+Recruitment, Access+creation, Operational workspaces,
Release audit) are marked complete on `design`.

**2. Directory gets real product listings back** (`app/search/page.tsx`, `app/directory/page.tsx`,
new `components/directory/ProductListingRail.tsx`, `DiscoveryResults.tsx` +`showTypeFilter` prop):
- `/search` now has a **Companies ↔ Products scope switch** (`?scope=products`) — product mode
  renders the existing `DiscoveryResults` component (the full listing search UI) instead of the
  company-card grid. This is a real functional addition, not copy-only — reintroduces
  product/listing search into Directory's primary journey after the redesign had deliberately
  narrowed it out.
- Company results also gained an **"Order by" sort** (Best fit / Highest rated / Best response
  rate / Company name) — client-side over the already-fetched `searchSellers` result set, same
  as the existing filtering.
- `/directory`'s landing page gained a new **"Products with terms you can compare"** section
  (`ProductListingRail`) linking to `/search?scope=products`, plus updated hero copy ("Find the
  right company, service or product") reflecting the scope broadening.

**Next (pages to review before touching further):** with this pull, walk `/search` (both scopes),
`/directory` (new product rail), and re-check Recruitment/admin/dashboard pages for the Soft
Counter re-skin — same routes already covered this session (`/recruitment`, `/recruitment/jobs`,
`/job/:id`, `/post-job`) render 200 post-merge but haven't been visually inspected against the new
radius/shadow tokens yet.

**Regression from this pull, found and fixed same session:** the hero search-suggestion dropdown
(fixed earlier today) went back to being clipped/hidden under "Hiring updates" after this merge.
Root cause, confirmed via CDP's `CSS.getMatchedStylesForNode` (not guessed): a new Soft Counter
rule, `:is(.counter-directory-page,.counter-recruitment-page) > section { overflow: hidden; ... }`
(`counter-soft-system.css:567`) — a generic "every top-level section is a rounded card" treatment
— matches `.le-hero` too (it's a direct-child `<section>`), reintroducing the exact clip removed
earlier. The earlier `z-index:2` fix was untouched and still correct; only `overflow` regressed.
Fixed with one additive, higher-specificity rule in `living-evidence.css` (the file that owns
`.le-hero`, not the UI dev's file): `:is(.counter-directory-page,.counter-recruitment-page)>.le-hero
{overflow:visible}` — class+class beats class+element, no `!important`, touches only `overflow`.
Re-verified via CDP on both desktop and 390px: dropdown paints correctly again.

---

### 2026-09-16

**1. Suggestion-dropdown border-radius parity fix** (`app/bharat-navya-home.css`) — the
Recruitment/Directory suggestion dropdown's corners didn't match the rest of the theme. First
attempt wrongly assumed "cornered" meant literal `border-radius:0` (based on the pervasive
`border-radius:0` rules elsewhere in `counter-direction.css`); before reporting it done, checked
the actual winning radius on the neighbouring search bar via CDP and found `15px`, not `0` — so
that fix was an overcorrection. Corrected to match the real sitewide reference,
`RoleSearchBar.tsx`'s pre-existing `.rsb-dropdown`/`.rsb-opt`: removed the dropdown's own
`border-radius` override so it inherits `.card`'s base 12px, and changed the option radius from
`.6rem` to `8px`. Verified via CDP against `.rsb-dropdown` directly.

**2. Directory home: real story rail, old-frontend parity — superseded by the designer's own fix,
see below.** Originally implemented here as: Directory's top-of-page rail was showing blogs/reviews
mixed in with stories (via the shared `UpdateRail`/`resolvePublicUpdates`), unlike old frontend's
stories-only, uncapped, hide-if-empty behaviour, so it was switched to mount the pre-existing
`components/StoryRail.tsx` directly. Before this was committed, a fresh `origin/design` pull showed
the UI dev had independently made the **exact same change**, for **both** Directory and Recruitment
(commit "Restore API-backed status stories": `UpdateRail` → `StoryRail` on both `app/directory/page.tsx`
and `app/recruitment/page.tsx`, new `.counter-story-rail` styling, headings "Company statuses" /
"Hiring statuses"). Per instruction, this session's own version was **reverted** (`git checkout --`
on `app/directory/page.tsx` and `components/evidence/UpdateRail.tsx`) before pulling, so the merge
took the designer's version cleanly with no conflict on that part. User confirmed the designer's
story rail "is working nice as it is, no need to change anything."

**3. Directory home search: real suggestion dropdown, matching Recruitment's pattern**
(`components/SectionSearchDock.tsx`'s `DirectorySectionSearch`) — Directory's hero/header search
had no suggestions at all (plain query + city, submit-only). Brought it in line with the
Recruitment dropdown built earlier this project (real data, closed until typing, grouped +
labelled with icons) using old frontend's `DirectorySearchBar.tsx` as the API reference:
- Dropdown stays closed until `query` is non-empty; no static/curated list.
- Debounced (250ms) `Promise.allSettled([searchSellers({q,limit:5}), getListings({q,limit:5})])`
  populates two real groups — **Matching companies** (`GET /api/sellers?q=`, already matches on
  `companyName` only server-side, so no cross-contamination filtering needed unlike Recruitment's
  shared OR-matched job query) and **Matching products & services** (`GET /api/listings?q=`).
- Picking a company goes to `/seller/:slug`; picking a listing goes to `/listing/:id`; picking
  neither and hitting Enter/submit goes to `/search?q=...&city=...` as before.
- Reuses the same `bn-section-search-dropdown`/`bn-section-search-opt` CSS classes (and therefore
  the just-fixed border-radius) and the same keyboard/outside-click handling as Recruitment's
  dropdown — no new CSS needed.
Verified live via CDP: dropdown closed on focus before typing; typing "textile" showed real
grouped results (2 companies, 4 listings) from the live DB; clicking a company suggestion
navigated to its real `/seller/:slug` page; 0px horizontal overflow at 390px with the dropdown
open; `tsc`/`validate:design` clean.

---

### Pulled `origin/design` again (`7790b50..276a6c1`) — merged 2026-09-16

11 new commits from the UI dev, merged as `219ed8f` (`git merge --no-commit` first so conflicts
could be reviewed before committing anything, then a plain one-line commit — no push). Two
conflicts, both resolved: `Navbar.tsx` (non-overlapping additions on adjacent lines — kept both
`inDirectoryContext`/`inRecruitmentContext` and the new `searchResultsRoute`), and
`app/directory/page.tsx`'s hero (kept this session's `.le-hero-decor` overflow-fix div, took the
UI dev's new hero copy "Find the right service or product."). `tsc`/`validate:design` clean;
`/directory`, `/recruitment`, `/search` all 200 post-merge.

**What the UI dev changed, for reference:**
1. **Story rail parity** — see the superseded note above; both Directory and Recruitment now show
   real, uncapped stories via `StoryRail` instead of the mixed `UpdateRail` feed.
2. **Directory repositioned listing-first, not company-first** — hero copy dropped "company" from
   the headline; family links and the product rail now use `/search?type=service` / `?type=product`
   instead of the previous `/search?family=` / `?scope=products`.
3. **`/search` fully rewritten** — the old company-card grid + product-scope-switch is gone,
   replaced by one new component, `components/directory/UnifiedListingWorkbench.tsx`.
4. Smaller polish: `seller/[slug]/page.tsx` (company cover/metrics split), `listing/[id]/page.tsx`
   (progressive preview, toolbar overflow fix), recruitment card selection/header spacing, `Footer`,
   `ChatAssistant`, `ListingCard`, `PriceBlock`.

**4. `/search` page: suggestion dropdown + native city select, brought to full parity with
Directory home and old frontend** (`app/search/page.tsx`, `app/directory-design.css`,
`components/directory/UnifiedListingWorkbench.tsx`) — with the new `UnifiedListingWorkbench`
in place, `/search`'s own search bar (`.directory-search`, distinct chrome from the home bar) had
no suggestions and a free-text city `<input>` instead of a `<select>`. Brought fully in line:
- City input replaced with a native `<select>` over `ALL_CITIES` (matches home/Recruitment).
- Added the same real suggestion dropdown contract as Directory home and old frontend's
  `DirectorySearchBar` exactly: **Matching categories** (client-filtered from the session-wide
  catalog), **Matching companies** (`GET /api/sellers?q=`), **Matching products & services**
  (`GET /api/listings?q=`), and a pinned **"Search for '...'"** row always last — gated closed
  until 2+ characters (old frontend's threshold). Applied the same categories + pinned-row
  additions to Directory home's own dropdown (`components/SectionSearchDock.tsx`) for consistency
  between the two surfaces.
- **Bug found and fixed — dropdown was clipped.** `counter-soft-system.css` gives
  `.directory-results-head`/`.recruitment-results-head` `overflow:hidden` (a generic rounded-card
  treatment), which cut off the dropdown since it's `position:absolute` and taller than that
  header section — same bug class as the earlier home-hero dropdown clip. Fixed with one additive,
  higher-specificity override in `directory-design.css`:
  `.directory-listing-results > .directory-results-head{overflow:visible}`.
- **Bug found and fixed — suggestion clicks (and the pre-existing "Update results" submit button)
  silently didn't navigate at all**, confirmed via CDP `history.pushState`/`replaceState` logging
  (real target route fetched successfully — 200 — but the browser URL never updated). Root cause:
  `UnifiedListingWorkbench`'s own URL-sync `useEffect` calls `router.replace()` on every fire, even
  when the computed target URL is identical to the current one (a no-op) — and that no-op replace,
  firing around component mount, was winning the race against this page's own `router.push()` to
  `/seller/:slug`, `/listing/:id`, `/{category}`, or `/search?q=`, silently discarding it. Fixed
  with two changes in `UnifiedListingWorkbench.tsx`: (a) removed `pathname`/`searchParams`/`router`
  from that effect's dependency array — only the user's own filter/sort/page picks should re-run
  it, not the identity of hooks it merely reads; (b) added a guard to skip `router.replace()`
  entirely when the computed target URL already equals the current one. This was a pre-existing
  bug in the UI dev's newly-merged component, not something introduced by the dropdown work, but
  it blocked the dropdown (and that button) from working at all, so it was fixed with the owner's
  explicit go-ahead.
Verified live via CDP after the fix: all four suggestion kinds navigate correctly (category →
`/{slug}`, company → `/seller/{slug}`, listing → `/listing/{id}`, pinned row → `/search?q=...`);
native city `<select>` renders with all cities; 0px horizontal overflow at 390px with the dropdown
open; `tsc`/`validate:design` clean.

All of the above (border-radius fix, post-merge overflow regression fix, `/search` page
suggestion-dropdown + city-select + `UnifiedListingWorkbench` race-condition fix) committed and
pushed to `feature/design-integration` as `c77ff8f`.

---

### Category suggestion routing fix — 2026-09-17

Picking a category from the suggestion dropdown (Directory home and `/search`) landed on the
standalone `/{slug}` category-landing route instead of staying on the new listing-first `/search`
flow. Confirmed `/search?category=<slug>` is a real, fully wired param end to end
(`parseDiscoverySeed` → `UnifiedListingWorkbench` → `GET /api/listings?category=`, backend matches
by slug at any category depth). Fixed both dropdowns (`SectionSearchDock.tsx`,
`app/search/page.tsx`) to route to `/search?category=<slug>` instead — on `/search` itself, also
clears the free-text `q` param, same as old frontend's category pick replacing typed text.
Verified live: Directory home and `/search` category clicks both land on
`/search?category=technical-textiles` with real filtered listings rendering. Committed as
`93e6bab`.

---

### Pulled `origin/design` again (`276a6c1..7827120`) — merged 2026-09-16/17

11 new commits. No backend files touched. What the UI dev changed:
- New `ApiAdvertisingSlot.tsx` — real, API-backed ad placements (`GET /api/ads?placement=`),
  replacing the static `AdvertisingSlot` on Home, Directory and Recruitment.
- `UnifiedListingWorkbench.tsx` — quick filter pills (All/Services/Products/Verified) replacing
  the old single "Refine listings" toggle button; expanded-listing-row styling. Merged clean, no
  conflict with this session's own fix in that file (different region of the effect/JSX).
- "Restore universal public header on search" — reverted an earlier compact-header-on-search
  experiment; `/search` now shares the same header as every other page.
- Backend: real bug fix in `seed-demo-stories.js` — `authorType` was hardcoded to `"seller"`
  regardless of the caller, silently breaking employer story seeding (confirmed the EMPLOYERS loop
  explicitly passes `authorType: "employer"`, which the hardcoded version ignored). Took their fix.
- Visual: Recruitment's brand colour switched from near-black to indigo sitewide; the home
  decision-journey's decorative step-map stepper removed (simplified to just the copy card).

Four conflicts, all resolved: `Navbar.tsx` (they removed `searchResultsRoute`, a dead var after
the header-restore; kept our `inDirectoryContext`/`inRecruitmentContext` block), `app/page.tsx`
(combined their new `ApiAdvertisingSlot` with our existing live-count feature, kept our multi-line
guides JSX), `backend/package.json` (combined their new `seed-demo-stories` script with our
existing test scripts), `backend/scripts/seed-demo-stories.js` (took their `authorType` fix, see
above). Committed as `8e576ee`, pushed.

---

### Pulled `origin/design` again (`7827120..aace218`) — merged 2026-09-22

2 new commits, "polish Bharat Navya frontend experience" (~1900 lines, 45 files) + "unify search
page hero spacing". No backend files touched — the one new feature that talks to the backend
(`HomeAgent.tsx`) calls `assistantChat()` → `POST /api/assistant/chat`, an endpoint that already
existed and was already used by `ChatAssistant.tsx`, so no new backend work required.

**Direct collision with this session's own work:** the UI dev independently rewrote
`SectionSearchDock.tsx`'s suggestion dropdowns from scratch for both Directory and Recruitment —
their own `SearchSuggestionMenu` component, response caching, starters, keyboard nav, pinned
"Search for…" row. Functionally close to what this session built earlier, but **their Directory
version has no company/seller matching at all** (only categories + listings — no `searchSellers`
call), a regression against the old-frontend contract this session specifically restored. Per
owner's explicit instruction ("keep our company matching feature"), resolved by keeping this
session's entire `SectionSearchDock.tsx` as-is (`git checkout --ours`) rather than adopting their
rewrite — their new dropdown UI was discarded for this file, not merged piecemeal.

Other changes taken as-is (no functional overlap):
- New `HomeAgent.tsx` (192 lines) — redesigned AI chat widget, now the home hero's primary entry
  point in place of `UniversalSearch`, plus a new third "Growth OS" (coming soon) gateway tile.
  `app/page.tsx` conflict resolved by taking this new layout but keeping our live company/role
  count strings (`directorySignal`/`recruitmentSignal`) in the Directory/Recruitment tile copy
  instead of their static text.
- New `lib/routePresentation.ts` — centralises the route-matching booleans (`isDirectoryRoute`,
  `isCounterPublicRoute`, etc.) that `Navbar.tsx` used to compute inline. `Navbar.tsx` conflict
  resolved by adopting these new helpers, keeping our `inDirectoryContext`/`inRecruitmentContext`
  account-menu logic (unrelated concern, no overlap).
- Large CSS pass (`counter-soft-system.css` alone +~1200 lines): search-hero spacing, workspace
  styling, listing-card polish.
- `app/design-system/page.tsx` (dev-only gallery page) — trivial conflict, took their updated
  copy, kept our `.le-hero-decor` overflow-fix div.

`tsc` clean. Committed as `b3bbe41`, pushed. `/`, `/directory`, `/recruitment`, `/search` all 200
post-merge with both servers running locally for owner review.

**Known gap left open:** Recruitment's suggestion dropdown still runs on this session's older,
pre-existing implementation (unaffected by this collision either way, since we kept our file
entirely) — worth a future pass to see if the UI dev's Recruitment-side rewrite (job functions +
jobs + pinned row, same file) has anything worth adopting once Directory's own dropdown direction
is settled.

---

### Pulled `origin/design` again (`aace218..3d404fc`) — merged 2026-09-22/23

2 new commits: "integrate live search suggestions" (`72b9fa4`), "Integrate Feni content across
public frontend" (`3d404fc`). Closes the gap noted above.

**Suggestion dropdowns — took the UI dev's version wholesale this time.** Both `RoleSearchBar.tsx`
(Recruitment) and `search/page.tsx` (Directory results page) had two independently-built, fully
parallel implementations of the same suggestion feature sitting in the same file after the
text-merge — on `search/page.tsx` git's line-merge left two conflicting `type ResultsSuggestion`
declarations *outside* any conflict marker (a duplicate-identifier bug invisible until you read
past the markers; `tsc` only runs once markers are gone). Rather than hand-blend two untested
debounce/filter algorithms, took the UI dev's finished version whole (`git checkout --theirs`) for
both files — it's the actively-developed feature this merge exists to pull in, and this session's
own CSS overflow fix in `living-evidence.css` targets shared class names/structure, not either
side's specific markup, so it still applies either way.

**Post-merge bug found in the UI dev's own file:** their `RoleSearchBar.tsx` had a genuine CSS
syntax bug — `.rsb-input { ... }` was missing its closing brace before `.rsb-compact .rsb-input`,
which corrupts the rest of that `<style jsx>` block's parse. Effect: the suggestion dropdown fell
back to global default button styling (solid orange pills, no grouping/labels) instead of the
intended `.rsb-dropdown`/`.rsb-opt` look — this is what the owner's screenshot caught. One-line
fix (added the missing `}`), verified brace-balanced, `tsc` clean, redeployed. Committed
separately as `c8c9b7d` since the merge itself (`6904ad4`) had already been pushed.

Other conflicts, all copy-only — took the UI dev's new hero headlines/subcopy on Home, Directory,
and Recruitment (`directory-design.css`, `directory/page.tsx`, `app/page.tsx`,
`recruitment/page.tsx`), dropping the `.le-hero-decor` decorative div per their simplification on
all three. `app/page.tsx`: their new copy no longer displays live company/role counts, so the
`companyTotal`/`jobTotal`/`recruitmentLive` fetch effect added in the previous pass (see prior
entry) became dead code — removed it and its now-unused imports (`getJobs`, `searchSellers`,
`useConfig`) rather than leave it firing two pointless API calls per page load.

`tsc` clean throughout. Committed `6904ad4` (merge) + `c8c9b7d` (brace fix), pushed.

---

### Pulled `origin/design` again (`3d404fc..2c01e52`) — merged 2026-09-28

2 new commits: "complete visual direction across secondary pages" (`9bbd41d`), "audit and unify
frontend visual system" (`2c01e52`). 306 non-image files changed — mostly a broad className/token
consistency sweep (2-4 line diffs across admin tabs, dashboard tabs, home components). Larger
rewrites: `counter-soft-system.css` (432 lines), `SectionSearchDock.tsx` (483 lines), `Navbar.tsx`,
`JobFilters.tsx`, `CategoryLanding.tsx`, `UnifiedListingWorkbench.tsx`, `recruitment/jobs/page.tsx`,
`post-job/page.tsx`, `pricing/page.tsx`, `sell/page.tsx`.

Clean auto-merge, zero conflicts this pass. `tsc` clean; both servers run locally for owner review
(`/`, `/directory`, `/recruitment`, `/search`, `/recruitment/jobs` all 200) before commit.

Owner's review of the running app found real regressions against the old pre-redesign pages —
logged under "Directory public pages ... punch-list sent to UI dev" above, not fixed here.
Committed `4b0e64d`, pushed.

---

### Pulled `origin/design` again (`2c01e52..4e92ac7`) — merged 2026-09-29

3 new commits: "establish canonical frontend handoff" (`acd81c0`), "restore original repository
layout" (`964d4d1`), "reconcile Mahir feedback" (`4e92ac7`). 29 non-image files changed
(+1303/-593), plus the logo binary. New doc: `frontend/docs/MAHIR_FEEDBACK_RECONCILIATION_SPEC.md`
— a formal spec (FR-1..24, NFR-A/R/V, AC-1..19) for a named client review round ("Mahir's review",
reviewer Parth Akholkar, source: "Approved implementation plan and BN - IT WhatsApp review"). Read
in full before merging — it's the actual client-change record this pass implements; summarized
below, not reproduced.

**What the spec covers, and what's now live:**
- **Brand mark (FR-1/FR-2)** — `bharat-navya-logo.png` replaced with the approved BN-arrow mark,
  no Ashoka Chakra, no tagline; text wordmark "Bharat Navya" kept in `Navbar.tsx`/`Footer.tsx`.
  Verified: file shrank 327KB → 27KB (new asset, not a recompress).
- **Assistant renamed (FR-3/FR-4)** — floating widget is now "Navya AI Agent" everywhere
  (`ChatAssistant.tsx`: trigger aria-label, panel title, greeting copy) while Home's hero guide
  stays "Ask Navya" — explicitly two distinct, non-conflated names per FR-3/AC-3. One assistant
  entry point per route (FR-15) — the legacy floating requirement widget is not globally mounted.
- **Back-to-top (FR-9/FR-10/FR-11)** — new `components/BackToTop.tsx` (53 lines), mounted once in
  `app/layout.tsx`'s shared shell. Verified present and wired.
- **Counter token pass (FR-5/FR-6)** — `counter-soft-system.css` +326 lines: strong-border token,
  shared grid rhythm/min-height on the three Home gateway cards (Directory/Recruitment/Growth OS
  — names/states unchanged per OS-4), flat indigo/saffron/green signal rail (no gradients, NFR-V1).
- **Auth full-height panel (FR-13)** — `login/page.tsx`/`register/page.tsx` trimmed (-2 lines
  each) to drop the unused strip above/below the desktop context panel; OTP/email-password/
  redirect/validation behaviour untouched per FR-8/FR-12 (confirmed no Google/intl-phone control
  added — OS-1/OS-2 explicitly out of scope, consistent with this branch not touching
  `oauth.routes.js`/`GoogleSignInButton.tsx`).
- **Circular truthful statuses (FR-14)** — `StoryRail.tsx` (-107/+... net smaller) moves to
  circular status portraits; empty state stays compact, no simulated activity.
- **Company profile completeness (FR-20)** — `seller/[slug]/page.tsx` now renders all four:
  Services, Products, Work evidence, Reviews — each with a truthful empty state string (not a
  hidden section), closing the "Reviews and Products sections are missing entirely" gap from the
  2026-09-28 punch-list. Verified via source read (`CompanyOfferings` for Services/Products, plain
  sections for Work evidence/Reviews, each with its own "No … yet" fallback).
- **Recommendation imagery (FR-19)** — `ListingCard.tsx` (+45/-… ) gets an honest no-image
  treatment instead of repeating the same stock photo across "More services from this company"
  cards — closes another 2026-09-28 punch-list item.
- **Detail-page ad spacing (FR-16)**, **category-page unification (FR-17)**, **floating-control
  overlap (FR-18)** — `CategoryLanding.tsx`, `directory-design.css`, `listing/[id]/page.tsx` touched;
  these directly close the remaining 2026-09-28 punch-list items (List/Grid toggle on category
  pages, floating chat bubble overlap, Post-Requirement/chat-bubble overlapping the last listing
  card). Not independently re-verified pixel-by-pixel this pass — spot-checked via `tsc` + 200s
  only; flag for a follow-up visual pass against the exact punch-list screenshots if regressions
  reappear.
- **Search suggestions rewritten (FR-21/22/23/24)** — see conflict resolution below.

**Two conflicts, both resolved by taking `origin/design`:**
- `SectionSearchDock.tsx` (522 → 367 lines) — the UI dev rewrote both Directory's and
  Recruitment's suggestion dropdowns from scratch again. Unlike the 2026-09-22 collision (their
  Directory version back then had **no** company/seller matching, a real regression this session
  fought to keep out), this rewrite was checked line-by-line before accepting: `searchSellers`
  company matching is present for Directory, category-suggestion routing still goes to
  `/search?category=<slug>`, the pinned `Search for "…"` row and full keyboard/combobox nav are
  all intact. Taken wholesale (`git checkout --theirs`) — the earlier gap this doc flagged as
  "worth a future pass" is now closed by the UI dev's own work, no manual porting needed.
- `UnifiedListingWorkbench.tsx` — one-hunk conflict in the URL-sync effect. Both sides kept the
  no-op-guard fix from the 2026-09-16/17 race-condition bug (skip `router.replace()` when the
  computed target already equals the current URL, so a same-page filter-sync doesn't cancel a
  suggestion click's real `router.push()`); origin/design's version additionally adds
  `fixedCategory` to the effect's dependency array. Took origin/design's version — same fix,
  cleaner deps.

**Verification:** `tsc --noEmit` clean. Both dev servers were already running locally (backend
`:4000`, frontend `:3000`); spot-checked `/`, `/directory`, `/recruitment`, `/search`,
`/recruitment/jobs`, `/listing/1`, `/search?category=technical-textiles` — all 200 post-merge.
Committed `342507d`, not yet pushed. Local uncommitted WIP (`backend/scripts/seed-demo-stories.js`
— an `upsertStory()` fix for a duplicate-key abort bug, unrelated to this pull) was stashed before
merging and restored after, untouched by the merge.

**Not yet done this pass:** full visual/screenshot re-check of the 2026-09-28 Directory punch-list
items against this new code (spacing, sponsored-card overlap, sidebar CTA overlap, inner-section
scroll) — the spec's FR-16/17/18/20 line up with those items but weren't independently confirmed
pixel-for-pixel here, only via source presence + `tsc`/200-status. Promote to `feature/backend-
phase1` only after that visual pass, per the owner review checklist above.

---

### Spec audit — `MAHIR_FEEDBACK_RECONCILIATION_SPEC.md` vs running app — 2026-09-29

Owner asked to run both servers locally and check every FR/AC in the spec against the actual
merged code (post `f71e205`/`0c4d413`). Both servers were already up (`:4000`/`:3000`). Verified
via source reads + a scratch Playwright script (`chromium`, not committed — deleted after use;
re-write from scratch next time, don't look for it on disk).

**Confirmed live and working (no action needed):**
- FR-1/FR-2 — BN-arrow logo live (`/bharat-navya-logo.png`, 44×44 in the shell), no Chakra/tagline,
  "Bharat Navya" wordmark kept in `Navbar.tsx`/`Footer.tsx`.
- FR-3/FR-4/AC-2/AC-3 — `/directory`'s floating trigger aria-label is "Open Navya AI Agent"; Home
  still shows "Ask Navya" ×2 and zero "Navya AI Agent" text — the two names stay distinct.
- FR-6 — Home's three `.le-gateway` cards all render at identical 288px height (equal grid rhythm).
  The one `linear-gradient` left in `counter-soft-system.css:2356` is a pure CSS caret-icon trick
  on `<select>` arrows, not a decorative gradient — NFR-V1 still clean.
- FR-9/FR-10/FR-11 — back-to-top appears after scrolling `/directory` past 600px and a click
  returns `window.scrollY` to 0, live-verified.
- FR-13 — `/login`'s desktop context panel is 827px tall inside a 900px viewport starting at y=69
  (bottom ≈896/900) — no meaningful unused strip.
- FR-14/AC-11 — `.story-card-avatar` (`globals.css:686`) is `border-radius:50%`, genuinely
  circular, not a square placeholder (first probe grabbed the wrong `<img>` and had to be
  corrected — the real avatar is a `<span>` with `background-image`, not an `<img>`).
- FR-15/FR-18 — exactly one assistant mount, `<ChatAssistant />` in `app/layout.tsx`. The legacy
  `components/rfq/FloatingRfqButton.tsx` has zero importers anywhere in `frontend/` — not globally
  mounted (see pending #3 below on whether that's fully intentional).
- FR-17 — `/abrasives` (a real category-landing route, not `/search?category=`) renders through
  the unified workbench: 0 List/Grid toggle text, one coherent filter rail
  (`directory-listing-filter-rail` → `-panel`/`-quick`/`-content`/`-ad`), not duplicate bars.
- FR-20 — `/seller/coimbatore-precision-machinery-works` renders all 4 real headings: Services,
  Products, Work evidence, Reviews.
- FR-21/FR-22 — Directory dropdown groups categories+companies+products (source-verified: design
  branch's `SectionSearchDock.tsx` still calls `searchSellers`); Recruitment groups roles+companies
  (live-verified: typing "TechNova" surfaces a "Matching companies" group).
- FR-24 — suggestion dropdown's parent has `overflow:visible`; not clipped.
- NFR-R1 — `document.documentElement.scrollWidth === clientWidth` (both 390) on all 7 routes
  checked at 390px (`/`, `/directory`, `/recruitment`, `/search`, `/login`, `/register`,
  `/recruitment/jobs`) — no document-level horizontal overflow anywhere, despite some individual
  elements (e.g. 84 on `/directory`) whose own bounding box extends past the viewport inside
  `overflow:hidden` containers (carousels, closed dropdowns) — that's normal, not a page-scroll bug.

**Pending / needs owner attention before next merge:**

1. **FR-16 (ad spacing near detail pages) — untestable right now, not a known bug.** No ad slot is
   currently booked (`recruitment` landing: 0 ad elements rendered; `/listing/1`'s
   `ApiAdvertisingSlot` didn't render either) — the "shared-shell margins, clear separation from
   neighbours" fix can't be visually confirmed with nothing on screen to check. **Next merge:**
   book a test ad on `listing_detail`/`recruitment_home`/`recruitment_search_top` via
   `/admin`, then re-check spacing against the footer and the card above/below.
2. **FR-19 (recommendation imagery) — only the fallback got exercised, not the "prefer distinct
   real image" path.** `/listing/1` has no other listings from the same seller, so "More services
   from this company" never rendered. Confirmed the honest placeholder exists
   (`ListingCard.tsx`'s `.lc-media-placeholder` — initial letter + "Service"/"Product" label, no
   fabricated stock photo). **Next merge:** find/seed a listing whose company has 2+ listings
   sharing one demo image and confirm distinct images get preferred over the repeat.
3. **`FloatingRfqButton.tsx` is fully orphaned — confirm with the UI dev whether that's
   intentional.** It's the "Post Requirement" widget the 2026-09-28 punch-list flagged as
   overlapping the last listing card's View button. It now looks removed rather than
   repositioned. If it's meant to still exist somewhere (a dedicated `/rfq` entry point per its own
   top-of-file comment), confirm that route/trigger still works; if it's meant to be gone, delete
   the dead file.
4. **AC-9 (200% browser zoom) — not covered by this pass.** Only 390px and 1440px were checked
   this round; zoom-specific overflow wasn't simulated. Add a zoom check next time (CDP
   `Emulation.setDeviceMetricsOverride` with a `scale` factor, or a browser's native zoom via a
   real device-pixel-ratio bump) before signing off AC-9 as fully verified.
5. **Seller-profile sidebar CTA / stats-vs-ad overlap (from the 2026-09-28 punch-list) — same root
   cause as #1.** Nothing renders in the ad slot to actually check for overlap against. Re-check
   once #1's test ad is booked.

**Method note for next time:** the probe script was scratch/throwaway (Playwright via
`chromium.launch()`, run from repo root so `require('playwright')` resolves against the root
`node_modules`, deleted after the run). Rewrite it fresh rather than looking for it on disk. Key
gotchas hit while writing it: the story avatar is a `<span style="background-image">`, not an
`<img>` — selecting `img` for status portraits gives false positives; and an element's own
bounding box extending past the viewport is not the same as document-level horizontal overflow —
always compare `scrollWidth` vs `clientWidth` on `document.documentElement`, not per-element boxes.

---

### Pulled `origin/design` again (`4e92ac7..b909c44`) — merged 2026-09-30

One new commit from the UI dev ("polish auth and editorial UI"), merged into
`feature/design-integration` after this session's own local work (`95db77f`, the product-tagged
chat + FCM push feature — see `CHAT-PLAN.md`) was committed first so the merge had a clean base.
Per owner direction this pass: **UI developer's code — both visual and functional — wins over
ours on every conflict**, not just styling. `tsc --noEmit` clean after resolution.

**What the UI dev changed:**
- **Public footer + login context panel: black → Counter indigo.** `bn-footer.is-counter-public`
  and `.counter-auth-aside` both switch from `var(--counter-ink)` to `var(--counter-indigo)`
  (`counter-direction.css`, `counter-workspace.css`), with matching `--counter-on-indigo` text/
  border tokens. Registration keeps its existing green. Auth form card itself stays light — only
  the aside/footer background changed.
- **Google sign-in button rewritten** (`components/auth/GoogleSignInButton.tsx`) — fixes a stale-
  closure bug (credential handler is now held in a ref, updated via `useEffect`, so a re-render
  with a new `onCredential` doesn't get silently ignored), handles the Google script already being
  on the page from a prior mount (listens for its `load` event instead of assuming `window.google`
  is ready), sizes the button responsively off its container, and shows a disabled/busy state via
  CSS (`.google-signin-shell[aria-busy]`) instead of unmounting. Took this version wholesale —
  strictly more correct than ours, nothing lost.
- **Back-to-top control moved left → right**, repositioned above the floating Navya AI Agent
  (`bottom: 5.5rem` instead of `1rem`) so the two no longer collide, and simplified to an arrow-
  only icon (dropped the text label + its screen-reader-only mobile variant, kept the accessible
  name via `aria-label`). `counter-soft-system.css`/`counter-workspace.css`.
- **New About-page blog preview** (`components/about/AboutBlogPreview.tsx`, mounted in
  `app/about/page.tsx`) — API-backed (`getBlogs`), up to 4 posts, responsive grid (4 cols desktop
  → 3 at intermediate widths → 2 tablet → 1 phone), `counter-about-blog*` CSS. Companion change:
  the equivalent blog-card preview that used to sit on the Home page is gone — "Home stays focused
  on product discovery," per the UI dev's own `HANDOFF.md` note; not re-added here (matches this
  doc's "don't force old functionality to survive unchanged" rule).
- `frontend/.env.example` — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` comment reworded.

**Conflicts (7 files, all resolved in the UI dev's favor per the owner's priority call):**
- `frontend/.env.example`, `frontend/lib/api.ts`, `frontend/lib/auth.tsx` — trivial (comment
  wording / formatting only), took theirs.
- `frontend/components/auth/GoogleSignInButton.tsx` (add/add) — took theirs wholesale, see above.
- `frontend/app/login/page.tsx` — took the UI dev's `counter-auth-social`/`counter-auth-or`
  class-based Google-button layout over this session's inline-styled divider. Also found and fixed
  a **pre-existing duplicate `handleGoogleCredential` definition** in this file (two byte-identical
  copies, left over from an earlier auto-merge that didn't flag a conflict since both sides added
  the same code) — not part of this pull, just noticed and cleaned up while in the file.
- `frontend/app/directory/page.tsx`, `frontend/app/recruitment/page.tsx` — the hero search-dock
  focus/blur handling conflicted: this branch had refactored it into a shared `lib/useDockOnScroll.ts`
  hook (commit `fc42ae0`, a bug fix, never pushed to `design`), while the UI dev's side kept the
  original inline `heroFocusedRef`/`pendingDockRef` implementation. Per the owner's "UI dev's
  functional changes win too" instruction, took the UI dev's inline version whole for both pages
  (refs, the `IntersectionObserver` effect, and the hero `<div>`'s handlers) — **not** just the one
  changed line. `lib/useDockOnScroll.ts` is now unused by both callers; left the file in place
  (dead code, not deleted) rather than guessing whether something else still wants it.

**Not yet done:** visual verification of the indigo footer/aside and the new About blog grid in a
real browser (no browser tool available this session) — `tsc` clean and dev server 200s were
checked, per the owner checklist above items 2/3/5/6 still need a manual pass before promoting.

---

### Pulled `origin/design` again (`b909c44..9c40584`) — merged 2026-10-01

Three new commits from the UI dev. Same owner rule as last pull: UI dev's code wins conflicts,
visual or functional. `tsc --noEmit` clean after resolution.

**What the UI dev changed:**
- **Back-to-top placement/visibility fix** (`be9dfa9`, `9c40584`) — follow-up correction to the
  right-side arrow-only control from the previous pull; `counter-soft-system.css` +
  `BackToTop.tsx`, `HANDOFF.md` updated.
- **Guest phone-number UI** — new `lib/phone.ts` + `components/auth/InternationalPhoneField.tsx`,
  gated behind a new `NEXT_PUBLIC_INTERNATIONAL_PHONE_ENABLED` flag (default `false` — per its own
  comment, stays off "until the backend OTP provider and auth validation accept E.164 numbers").
  New `components/auth/GuestAccountNudge.tsx` wired into `ContactAuthModal.tsx`, `login`/
  `register` pages.
- **Brand page ad rail modernized** (`app/brand/[slug]/page.tsx`) — swapped the old `AdRail`/
  `useAds` sponsored-rail approach for `ApiAdvertisingSlot`, the same component the rest of the
  redesign (directory/recruitment/search) already uses. Related trims in `DiscoveryResults.tsx`,
  `UnifiedListingWorkbench.tsx`, `recruitment/jobs/page.tsx`.

**One conflict, resolved — `app/brand/[slug]/page.tsx`.** Not a real disagreement: this branch had
separately added pagination (`Pagination`, `PAGE_SIZE`, `pageItems`/`totalPages`) to this file —
unrelated prior work, nothing to do with the chat/FCM feature, just sitting uncommitted and swept
into the `95db77f` commit. Orthogonal to the UI dev's ad-rail swap, so kept both: took
`ApiAdvertisingSlot` from their side, kept pagination from ours. **Bug caught while resolving:**
git's own auto-merge of the surrounding (non-conflicting) render JSX had quietly left the list/grid
views mapping over the full unpaginated `sorted` array instead of `pageItems` — the `Pagination`
control would have rendered but done nothing. Fixed by hand; not something `tsc` would have caught
(both are `Listing[]`).

**Not yet done:** same as last pull — no browser available this session to visually check the
back-to-top fix or the new guest phone/nudge UI.

---

### Spec re-audit — `MAHIR_FEEDBACK_RECONCILIATION_SPEC.md` vs `edf899d` — 2026-10-01

Re-checked the spec against the branch tip after the two newer pulls above (`b909c44..9c40584`,
merged as `edf899d`). Both dev servers were already running locally (owner's own session,
`:4000`/`:3000`) — left them running rather than restarting, since the backend has no hot reload
and killing someone else's in-progress session is riskier than trusting Next's file-watcher kept
the frontend current. Spec file itself (`frontend/docs/MAHIR_FEEDBACK_RECONCILIATION_SPEC.md`)
is unchanged since `4e92ac7` — still 207 lines, FR-1..24/AC-1..19 as audited 2026-09-29. Re-verified
every item from that prior pass still holds (no regressions since), plus specifically checked the
5 open items — status below. Scratch Playwright script again, written fresh and deleted after use.

**Changed status since the 2026-09-29 audit:**

- **FR-11 — now a confirmed spec violation, not just unverified.** The "back-to-top
  placement/visibility fix" pulled in this pass (`be9dfa9`/`9c40584`) moved the control
  right→right-doubled-down, not right→left. Current CSS
  (`counter-soft-system.css:1475`): `.back-to-top{position:fixed;right:1.5rem;bottom:1.5rem}`,
  and `body:has(.navya-agent-trigger) .back-to-top{right:5.5rem}` — i.e. back-to-top sits in the
  **same lower-right corner** as the Navya AI Agent trigger, just shifted left by 4rem to avoid
  overlapping it. Live-verified at 1440px: back-to-top box `x:1300`, assistant box `x:1364`, both
  `y:824` — adjacent, same corner. **Spec (FR-11) explicitly requires lower-LEFT** ("away from
  the lower-right assistant and requirement controls" implies opposite corners, not the same one
  with a gap). The collision/visibility bug this pass fixed is real and welcome, but the
  **side is still wrong** — this needs a follow-up CSS change (`left` instead of `right`) before
  FR-11/AC-7 can be marked done. (For reference, the dialog z-index check passed: `Modal.tsx` uses
  `zIndex:2000` vs back-to-top's `110`, so "below the z-index of open dialogs" is already correct —
  only the corner is wrong.)
- **Pending #3 (`FloatingRfqButton.tsx`) — still orphaned, unchanged.** Re-grepped: only self-
  references and one unrelated z-index comment in `DiscoveryResults.tsx`. Still needs the UI-dev
  confirmation call from the 2026-09-29 entry.
- **Pending #1/#5 (ad spacing, FR-16) — still untestable.** `/listing/1` and `/brand/supreme` both
  render zero ad elements; no placement is currently booked in `/admin`. Unchanged blocker.
- **Pending #2 (FR-19 recommendation imagery) — unchanged**, still only the honest-fallback path
  was exercised, not the "prefer distinct image" path.
- **Pending #4 (AC-9, 200% zoom) — still not covered.**
- **NFR-R1 — still clean.** Re-checked `/`, `/directory`, `/recruitment`, `/login`, `/register`,
  and the new `/brand/supreme` page at 390px — `scrollWidth === clientWidth` (390/390) on all six.

**New since 2026-09-29, not in the original spec (informational, not a spec item):** this pass
also added guest phone-number UI (`InternationalPhoneField`, gated off by default via
`NEXT_PUBLIC_INTERNATIONAL_PHONE_ENABLED`) and `GuestAccountNudge.tsx` (mounted globally in
`app/layout.tsx`). Neither rendered on `/login` during this check — the phone field is correctly
gated off, and the nudge is presumably trigger-conditional (not tested further, out of scope for
this spec's FR list; OS-1/OS-2 already cover "no new auth provider / no intl phone" as out-of-
scope for the *Mahir* spec specifically, so this is a separate later increment, not a spec
violation).

### Task-list summary (for the next merge check)

**Done (verified live on `edf899d`):** FR-1, FR-2, FR-3, FR-4, FR-6, FR-9, FR-10, FR-13, FR-14,
FR-15, FR-17, FR-18, FR-20, FR-21, FR-22, FR-24, NFR-R1, NFR-V1, AC-2, AC-3, AC-11.

**Pending:**
1. **FR-11/AC-7 — back-to-top is in the wrong corner** (lower-right instead of lower-left).
   Confirmed via live bounding-box check, not just "untested" — this is a concrete fix needed:
   swap `right` for `left` in `.back-to-top` and its `body:has(.navya-agent-trigger)` override in
   `counter-soft-system.css`.
2. **FR-16 — ad-adjacent spacing unverifiable** until a test ad is booked on `listing_detail` /
   `recruitment_home` / `recruitment_search_top` / a brand-page placement via `/admin`.
3. **FR-19 — recommendation-imagery "prefer distinct image" path unverified** — need a seeded
   listing whose company has 2+ listings sharing one image.
4. **`FloatingRfqButton.tsx` orphan status** — confirm with the UI dev whether intentional removal
   or a dropped feature; delete the dead file either way once confirmed.
5. **AC-9 (200% zoom)** — not yet covered by any automated or manual pass.
6. **Seller-profile sidebar CTA / stats-vs-ad overlap** (2026-09-28 punch-list) — blocked on #2.

---

### Pulled `origin/design` again (`9c40584..4d5e40e`) — merged, committed, pushed 2026-10-02

Merged into the working tree/index first (`git merge --no-ff --no-commit`), both servers
restarted on the merged code and smoke-tested (below), held uncommitted for the owner's own check
per their instruction, then on their go-ahead: committed as two commits (`f356dd1` the merge
itself, `f5e4b0c` the seed-script full-coverage change below — no AI attribution line on either,
per standing instruction) and pushed to `origin/feature/design-integration`.

26 new commits, the largest pull yet: 203 files, +7757/-4154, one new dependency (`gsap ^3.15.0`,
installed via `npm install` — `tsc` failed with "Cannot find module 'gsap'" until this ran, note
for next time this branch pulls a new `package.json` dependency). `rm -rf frontend/.next` before
restarting the dev server, per `HANDOFF.md`'s stale-Turbopack-cache warning — this pull touches
`lib/categoryImages.ts`, `lib/routePresentation.ts`, `lib/searchDock.tsx`, `lib/i18n.tsx`.

**One conflict, trivial — `app/brand/[slug]/page.tsx`.** Two import-order variants of the same
two lines (`ApiAdvertisingSlot`/`Pagination`) plus a stray blank line — no functional difference
either side. Took `origin/design`'s ordering per the "design perspective wins on conflicts"
instruction; functionally identical regardless. `WEB-REDESIGN.md` itself auto-merged clean (no
conflict markers) despite `origin/design`'s copy being 34 lines shorter — git kept our longer
history, nothing lost.

**Flag before committing — two changes that alter product behaviour, not just visuals:**

1. **`RecruitmentGate` is now a bare pass-through.** `components/recruitment/RecruitmentGate.tsx`
   (commit `06301ab`, "Make Recruitment live…", authored by `itbharatnavya` — not an unreviewed UI-
   dev slip) now just renders `children` unconditionally. Every Recruitment route
   (`/recruitment/*`, `/job/[id]`, `/post-job`, `/employer/[slug]`) renders live regardless of
   `featureFlags.recruitmentLive`. This directly contradicts CLAUDE.md §1 ("default is off, gated
   via env/admin Site Config") — the flag itself is now dead code, so turning it back off in
   `/admin` would no longer re-gate anything. Looks like a deliberate go-live decision from the
   owner's own account, but flagging explicitly since it changes what ships, not how it looks —
   confirm this is intended before it's pushed live.
2. **Listing cards: prices removed.** `ListingCard.tsx` (commit `4d5e40e`) drops the price display
   entirely; Contact/info moved to the top row instead. A real product/UX decision (buyers can no
   longer price-compare at a glance), not a styling tweak — confirm sign-off.

**Everything else in this pull (verified live, no issues found):**
- **Full Home/Directory/Recruitment rebuild, GSAP-driven.** New `HeroStage.tsx` (Home, animated
  scripted scenes off real `getFeaturedSellers`/`getJobs` data), `LandingHero.tsx` +
  `RecruitmentHero.tsx` (distinct per-product hero layouts), `WhyScene.tsx`/`RouteScene.tsx`
  (animated India-outline sections), `StorefrontScene.tsx`/`RfqScene.tsx`/`TrackerScene.tsx`/
  `HireScene.tsx` (page-specific "attraction" scenes replacing one shared template per
  commit `2741679`), `useStory.ts` (shared GSAP/ScrollTrigger hook). All new components, confirmed
  rendering (200 on `/`, `/directory`, `/recruitment`) with no console errors.
- **Design-token migration (`06301ab`)** — every font-size/border-radius across the app now reads
  off a `--fs-*`/`--r-*` scale (7 sizes, 5 radii + circle); new `DESIGN-SYSTEM.md` (108 lines)
  documents it. `CLAUDE.md` got one new banner line pointing at it ("current visual rules live in
  DESIGN-SYSTEM.md … follow it for any frontend work") — doesn't touch any of the non-negotiable
  rules in §2, just adds a pointer.
- **`FloatingRfqButton` ("Post requirement") is no longer orphaned — resolves pending item #4
  below.** Now mounted in `app/layout.tsx`, rendered as a right-edge bookmark tab docked above the
  Navya AI Agent bubble, icon-only at rest with a hover/focus label slide-out. Confirmed import +
  JSX usage live in `layout.tsx`.
- **Back-to-top repositioning (`4d5e40e`)** — "takes the corner, assistant bubble steps left when
  it shows" (previously it was the reverse). Still **lower-right**, not lower-left — see pending
  item #1 below, still open, just inverted which control moves.
- **BN logo redraw** — header mark now cross-fades every 5s between 4 new colour-layer PNGs
  (`public/brand/bn-{green,navy,orange,white}.png`).
- **Footer simplified to white; Directory/Recruitment link block removed** — footer now links only
  About/AI Guide/Blog/Pricing. Primary nav (`Navbar.tsx`) still carries Directory/Recruitment —
  this only removes the secondary footer links, not the only way to reach those products.
- **Status strip rework** — two rows, no seller names shown, a new "Add your story" bubble that
  opens sign-in for guests; more demo stories seeded (`seed-demo-stories.js` +31 lines).
- **Ad rotation continues from the prior pull** — `ApiAdvertisingSlot` cycles up to 5 ads/4s per
  placement; this pull removes the Home ad slot entirely ("ad removed from Home").
- New backend scripts, data-only, no route/schema changes: `backfill-job-workplace.js`,
  `seed-blogs-demo.js` (132 lines). `seed-demo-ads.js`/`seed-recruitment-demo.js` also touched
  (ad-count bumps, same pattern as the previous pull).

**Verification done this pass:**
- Backend restarted clean (seed-script-only backend changes, so strictly not required, but done
  anyway since a large pull was in flight): `node index.js` → 200 on `/api/categories`.
- Frontend: `rm -rf .next` + fresh `npm run dev --turbo`, clean compile, zero errors.
- `npx tsc --noEmit` clean (after `npm install` pulled in `gsap`).
- 10 routes spot-checked at 200: `/`, `/directory`, `/recruitment`, `/search`, `/listing/1`,
  `/brand/supreme`, `/about`, `/login`, `/register`, `/post-job`.
- 390px overflow + console-error sweep on the same 10 routes: `scrollWidth === clientWidth`
  everywhere (zero horizontal overflow). Two console errors found, both pre-existing/unrelated to
  this pull: a 404 on `/listing/1` (missing demo asset, not investigated) and a Google Identity
  "origin not allowed for this client ID" 403 on `/login`/`/post-job` (local dev's
  `GOOGLE_CLIENT_ID` is configured for a different origin than `localhost:3000` — a local-env
  config gap, not a code regression).

**Not yet done:** no visual/pixel pass on the new GSAP scenes (scroll-triggered animation isn't
something a static Playwright snapshot catches well) — still outstanding after commit; needs a
manual owner pass.

**Owner decision on the two flagged product-level changes:** proceeded with commit/push/deploy
without a reversion — `RecruitmentGate` pass-through and the no-price listing cards both shipped
as-is. Noting here rather than marking them "resolved": no explicit written sign-off was given on
either point individually, just a go-ahead to commit/deploy the branch as a whole. If either turns
out to be unintended, `RecruitmentGate.tsx` and `ListingCard.tsx` are the two files to revert.

### Full-coverage story seeding — 2026-10-02

Owner asked to seed Directory/Recruitment status stories for every seller and employer, not just
the curated fixtures, to test the redesigned status strip (above) properly. The existing
`SELLERS`/`DIRECTORY_SELLERS`/`EMPLOYERS` lists in `seed-demo-stories.js` only covered ~46
accounts; the DB has grown to 61 sellers / 21 employers since those were written.

Added a dynamic pass to `backend/scripts/seed-demo-stories.js` (commit `f5e4b0c`): after the three
curated loops run, it finds every remaining `sellerProfile.companyName` / `employerProfile.
companyName` account not already covered and gives each one active story, cycling through the
16-image `/seed-media/{company,work,people}` pool (no hot-linking, per CLAUDE.md §2). Ran locally:
**97 stories created** (43 curated + 18 additional sellers, 15 curated + 6 additional employers,
zero skipped). Verified via `GET /api/stories?authorType=seller` → 60 groups and
`?authorType=employer` → 21 groups.

**Not run against the testing server's Neon DB yet** — pulling that `PG_URL` to run the script
against it was blocked by this session's own credential-handling guard (pulling a production
secret to a local file). Needs the owner to run it directly once deployed:
```
cd backend && PG_URL=<testing-neon-connection-string> node scripts/seed-demo-stories.js
```
(Connection string: Vercel dashboard → `bharatnavya-api` project → Settings → Environment
Variables → `PG_URL`/`DATABASE_URL`, same value TESTING-SERVER.md's migration section uses.)

### Deployed to the testing Vercel domain — 2026-10-02

- **Backend:** `cd backend && npx vercel --prod --yes` → deployed and aliased to
  **https://bharatnavya-api.vercel.app** (commit `f356dd1`/`f5e4b0c`'s code, via local working
  tree upload — Vercel CLI deploys don't need a prior `git push`, though one was done anyway for
  the repo's own history).
- **Frontend:** first attempt blocked by the session's "Production Deploy" auto-mode guard
  (separate from the `settings.json` Bash allowlist, which already had `vercel:*`); retried on the
  owner's request and went through: `cd frontend && npx vercel --prod --yes` → deployed and
  aliased to **https://bharatnavya.vercel.app** (note: no hyphen — an earlier draft of this doc
  had the wrong domain). Live check: `/` 200, `/directory` 200, backend `/api/categories` 200.

### Task-list summary, updated for `4d5e40e`

**Newly done this pull:** pending item #4 (`FloatingRfqButton` orphan) — now resolved, mounted and
live.

**Still pending (carried forward, unaffected by this pull or the deploy):**
1. **FR-11/AC-7 — back-to-top still lower-right, not lower-left.** This pull changed *which*
   control steps aside (assistant now moves, not back-to-top) but kept back-to-top in the same
   corner the spec says it shouldn't be in. Fix is still: swap `right` for `left` on `.back-to-top`
   in `counter-soft-system.css`.
2. **FR-16 — ad-adjacent spacing still unverifiable**, no ad currently booked anywhere to check
   against.
3. **FR-19 — recommendation-imagery "prefer distinct image" path still unverified.**
4. **AC-9 (200% zoom)** — still not covered by any pass.
5. **Seller-profile sidebar CTA / stats-vs-ad overlap** — still blocked on #2.

**Open handoff items for whoever picks this up next:**
6. ~~Frontend prod deploy~~ — done, both backend and frontend live on the merged code.
7. **Seed the testing server's stories** — run the `seed-demo-stories.js` command above against
   the testing Neon DB; local dev DB already has it, testing server does not yet.
8. **No GSAP-scene visual pass done yet** — scroll-triggered animations need a manual check,
   static route/overflow checks don't exercise them.
9. **`RecruitmentGate` pass-through and no-price listing cards shipped without individual
   sign-off** — flagged twice (previous entry and this one); revisit if either needs reverting.

### Pull of `origin/design` (tip `0f33b42`) — 2026-10-05

Merged 12 new UI-developer commits (`0e74423`..`0f33b42`) into `feature/design-integration`.
**No conflicts**; none of the UI developer's code was changed during the merge.

**What came in**
- `/sell` rebuilt as a step flow for first-time sellers (what you sell, category, details). New
  `frontend/lib/categorySuggest.ts` suggests categories from plain words. Business name is asked
  only when the account has no seller profile (`becomeSeller` on publish).
- `/login` and `/register` show listing-specific copy when `next` starts with `/sell`.
- Ads are small tiles: under the filters on category pages (`railAd` prop of
  `UnifiedListingWorkbench`), under the "Can't find it" card on brand pages.
- Listing cards: Contact/info buttons in the top row, kind label hidden by card width.
- Logo always drawn from layers (never disappears). Many layout fixes (results toolbars, job
  pages, hiring timeline, borders, small text, mobile card actions, admin tables scroll sideways).
- Admin listing review shows "Seller pending" and warns on approve. A listing is public only when
  the listing AND the seller profile are approved.
- New `backend/scripts/reset-admin-password.js`; `.gitignore` ignores
  `backend/.admin-credentials.local`.

**API impact (additive only; restart backend after pulling)**
- `identity.getSellerCompanyNames` now also returns `sellerStatus`.
- `GET /api/admin/listings` and `GET /api/admin/listings/:id` include a new `sellerStatus` field.
  No existing field changed. `/sell` uses only existing calls (`getCategories`, `createListing`,
  `becomeSeller`).

**Checks run**
- Frontend `npx tsc --noEmit`: clean.
- Backend `npm test`: 134 tests, 120 pass, 14 fail. The same 14 fail on the branch before this
  merge (Recruitment data layer, identity register/login, review and privileged-field tests; e.g.
  FK `applications_job_id_fkey`), so they are not caused by this pull. Still need a separate look.
- Not done: browser/overflow pass, production build.

**Carried from the developer's notes (unverified)**
- `/sell` photo upload not exercised; Home hero hover and logo animation not watched live.
- After pulling: stop dev server, `rm -rf frontend/.next`, restart (stale Turbopack cache caused a
  hydration error).
- Earlier pending items (back-to-top corner, FR-16, FR-19, AC-9, seeding testing-server stories,
  GSAP visual pass) are unaffected by this pull.

---

### Pulled `origin/design` again (`08faf6e..f9afdc1`) — merged 2026-10-07

5 new commits from the UI dev, 3 files (+107/-6): `components/Navbar.tsx`, `app/counter-soft-system.css`, `HANDOFF.md`.
Merged with `git merge --no-ff --no-commit`, tested, then committed and pushed on the owner's go-ahead (no AI
attribution line). **No conflicts** — `counter-soft-system.css` auto-merged (their additions are appended at the end
of the file; this branch's ad-carousel CSS sits in a different region). No backend change, no new dependency, no
schema change. `rm -rf frontend/.next` + dev-server restart done before testing (stale Turbopack cache warning).

**What the design branch changed**
- **Header navigation is now Home · Products · About.** "Products" is a menu (`.bn-nav-products` / `.bn-nav-panel`) that
  opens on hover, focus or click and lists Directory and Recruitment (icon, name, one line). Closes on mouse-out,
  Escape, outside click or navigation. Products is the active pill on any Directory or Recruitment page. Phone menu:
  Home, a "PRODUCTS" heading with Directory and Recruitment indented under it, About.
- Opening the account popup closes the hamburger menu and vice versa.
- **Dashboards, workspace forms and admin pages sit on the light-blue canvas** — the full-width white sheet
  (`::before`) that ran into the floating header is hidden.
- **Admin sign-in** is a white card on the canvas (no dark band); workspace labels ("Bharat Navya operations") lose
  their leading dash.
- `HANDOFF.md` gains a "START HERE" block (where the work lives, how to run it, the owner's standing design
  preferences, open threads) and a 6 October change list. The logo-options exploration file it mentions is
  uncommitted on their side and not part of this pull.

**Verified after the merge (all pass)**
- `npx tsc --noEmit` clean; 15 routes return 200 (`/`, `/directory`, `/recruitment`, `/search`, `/listing/…`, `/brand/…`,
  `/about`, `/login`, `/register`, `/post-job`, `/dashboard`, `/admin`, `/sell`, `/blog`, `/categories`).
- Header: nav text, panel contents, hover-open / mouse-out close, Escape close, navigation, active pill on Directory and
  Recruitment, phone menu structure. Dashboard `::before` hidden and admin sign-in background transparent (checked by
  computed style + screenshots).
- Zero horizontal overflow on 15 pages at 390px and at 1440px; no uncaught page errors.
- This branch's own work still intact on the merged code: ad carousel check 78/78 and seller-tools flow check 27/27.

**Flags for the owner (not changed — design-branch behaviour / decisions)**
1. **Hover then click closes the Products menu on a mouse.** Hover opens the panel and the trigger's click handler then
   toggles it shut, so a desktop user who hovers and clicks sees it close (touch and keyboard are fine; the items are
   reachable by hovering and clicking an item). Cosmetic; a one-line fix (`onClick` open-only on hover-capable pointers)
   is available if wanted.
2. **Ads vs the design branch's stated preference.** `HANDOFF.md` says ads are "small tiles … never a big block at the
   top" and the designer removed the Home ad slot on 2 Oct. This branch (owner request) put a `home_hero` carousel back
   on the homepage as a compact strip under the hero, and added compact strips at the bottom of `/categories`,
   `/brands`, `/collections`, `/collection/<slug>`, `/blog`, `/blog/<slug>`, `/recruitment/blog`. They render nothing
   when no ad is live. Tell the UI dev so the next design pass doesn't strip them again, or say if any should go.
3. `HANDOFF.md` still instructs "commit messages end with a Co-Authored-By line" — not followed on this branch
   (standing owner instruction: no AI attribution).
4. Pending from earlier passes, unchanged by this pull: GSAP visual pass, back-to-top corner, `/categories` hydration
   warning noted by the UI dev (not reproduced as a page error in the sweep above).

---

### Pulled `origin/design` again (`f9afdc1..1e8cb88`) — merged 2026-10-08

3 new commits from the UI dev (`04ac867`, `1ec77fe`, `1e8cb88`), 11 files (+386/-50). Merged with
`git merge --no-ff --no-commit`, checked, then committed and pushed (no AI attribution line).
**No conflicts.** One backend file changed (additive), no new dependency, no schema change.
Restart the backend after pulling (the featured-sellers payload changed). Redeploy the backend too
before the testing server's Directory landing can show the new cards properly.

**What the design branch changed**
- **Directory landing: company cards replace the products section.** New
  `components/directory/CompanyShowcase.tsx` (`.cc-*` CSS), used in `DirectorySections.tsx` in place of
  `ProductShowcase` (now unused, still on disk). Section is "The companies behind the listings", button
  "Explore companies" to `/search`. Data is `useFeaturedSellers()` (8 sellers). Card: cover photo with logo
  or initials overlapping, name and verified tick, category and city, two-line about, three stats (rating
  with reviews, reply rate, years since founding), chips (GST registered, Trust seal, team size), listing
  count and "View company". Grid 4/3/2/1 columns.
- **Backend (additive):** `GET /api/sellers/featured` (`computeFeaturedSellerCards` in
  `modules/identity/routes/users.routes.js`) now also returns `logo, coverImage, trustSealVerified,
  gstNumber, yearEstablished, employeeCount, category` (first legacy category) and `about` (220 chars).
  This closes backend gap **B1** (logo on featured sellers) in the list above, except the 8-row cap which
  is unchanged.
- **Directory hero** (`discovery/LandingHero.tsx`, `app/directory/page.tsx`): slideshow has no pause button
  and no longer stops on hover or focus (only reduced motion or a hidden tab hold it). On 1024px and up the
  photo fills the hero with a navy gradient behind the copy. First hero pill is "All categories", a native
  `<select>` (`.bn-chip-menu`) with every top-level category and sub-categories in `<optgroup>`s,
  navigating to `/search?category=`.
- **Header** (`Navbar.tsx`): "Advertise" outlined button left of Join / Sign in (hidden under 900px, a link
  in the phone menu). It goes to `/dashboard?tab=advertise`, via sign-in for guests. Products menu is now a
  horizontal row of tiles, plus a muted non-link "Growth OS - Coming soon" tile (`UPCOMING`).
- **Home** (`home/HomeSections.tsx`): stats card takes 2/3 and a `home_hero` ad tile
  (`ApiAdvertisingSlot imageOnly`) 1/3 (`.hs-proof-row`, `.hs-proof-ad`); stats go full width when no ad is
  live; ad stacks below under 900px.
- **Recruitment hero search** (`SectionSearchDock.tsx`): workplace select removed from the bar (it stays in
  the `/recruitment/jobs` filters) and the hero no longer sends `workplace`. Location label reads
  "Anywhere". Compact desktop bar; phones stack role, location, full-width "Search jobs".
- **Platform-wide CSS** (`counter-soft-system.css`, +150 lines appended): desktop root font size scales with
  the window (`@media (min-width: 900px) { html { font-size: clamp(13px, min(1.111vw, 1.975vh), 22px) } }`,
  16px at 1440x810; phones/tablets stay 16px); search-bar focus is a navy ring drawn as an `::after`
  overlay (no outline on the input); footer is full width, transparent at the top fading to white.
- **Guest sign-in popup** (`auth/GuestAccountNudge.tsx`): fixed the bug where it reopened on the next
  scroll after being closed; survives blocked storage.
- `HANDOFF.md` gains a 7 October block. Untracked on their side, not in this pull: `logo-options.html`,
  `header-3d-options.html`, `logo-3d-options.html`.

**Our changes made while merging**
- `app/page.tsx`: removed this branch's own `home_hero` strip under the hero (the 7 Oct entry's flag 2).
  The designer now places a `home_hero` tile inside the stats row, so two slots of one placement would
  show the same campaigns twice. Other pages' ad strips from the carousel work are unchanged.
- `backend/test/golden/sellers-featured.json` regenerated for the new fields (additive); `sellers-featured`
  golden passes.

**Checks run**
- `npx tsc --noEmit`: clean.
- Backend `npm run test:goldens`: `sellers-featured` passes. Jobs, job-detail, employer-detail, jobs-mine
  and admin-users goldens still fail; same Recruitment/identity failures recorded in the 2026-10-05
  entry (e.g. `googleId: null` extra field), not caused by this pull.
- Not done: browser, overflow and zoom pass on the new cards, hero gradient and font scaling.

**Flags for the owner**
1. **Ad duplication resolved in favour of the designer's tile** on Home; tell the UI dev the other
   carousel strips still exist (see 7 Oct flag 2) so they are not stripped.
2. **Company cards depend on the 8-row featured cap**; the `alignedDirectorySlugs` allowlist question
   (Pass 3) is separate and unchanged.
3. **Desktop font scaling affects every rem-sized page**; designer asks for a check on a Windows laptop.
4. Pending from earlier passes, unchanged: GSAP visual pass, back-to-top corner, `/categories`
   hydration warning.

### Pulled `origin/design` again (`1e8cb88..ab0666a`) — merged 2026-10-08

1 new commit from the UI dev (`ab0666a`, "Cap desktop font scaling at 16px, tidy recruitment search and
Products menu"), 3 files (+21/-13): `app/counter-soft-system.css`, `components/Navbar.tsx`, `HANDOFF.md`.
Merged with `git merge --no-ff --no-commit`, **no conflicts**, owner checked it locally, then committed,
pushed and deployed to the testing server. No backend change, no schema change, no new dependency.

**What the design branch changed**
- **Font size regression fixed (owner-reported: text was too big).** The previous pull's desktop rule scaled
  the root size up to 22px (about 18px on a 1920x1080 Windows screen). It is now
  `clamp(13px, min(1.111vw, 1.975vh), 16px)`: never above the original 16px, it only shrinks on short or
  zoomed laptops. 16px at 1920x930 and 1440x810.
- **Recruitment docked header search:** the grid column left over from the removed workplace select is gone,
  in both the base rule and the 1024px+ rule; the bar ends at the arrow.
- **Products menu:** Growth OS tile has no visible "Coming soon" tag (tooltip only, desktop and phone menu);
  phone-menu Growth OS aligned with the other sub-links (`.bn-mobile-nav-soon` padding).
- `HANDOFF.md`: START HERE block updated to 8 Oct, and a note on how the dev pulls
  `feature/design-integration` into `design` (fast-forward only).

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment` return 200 on the local dev server.
- Owner checked the changes locally (font size back to normal).

**Flags for the owner**
1. The 7 Oct entry's desktop font-scaling flag (check on a Windows laptop) is now about the *down-only*
   scaling; still worth one look on a small or zoomed laptop.
2. Pending from earlier passes, unchanged: GSAP visual pass, back-to-top corner, `/categories` hydration
   warning.

### Pulled `origin/design` again (`ab0666a..bb7e84c`) — merged 2026-10-08 (later)

1 new commit from the UI dev (`bb7e84c`, "Header logo blend, corner button diamond, navy scrollbars"), 3 files
(+76/-8): `components/Navbar.tsx`, `app/counter-soft-system.css`, `HANDOFF.md`. Merged with
`git merge --no-ff --no-commit`, **no conflicts**, owner checked it locally, then committed, pushed and deployed
to the testing server. No backend change, no schema change, no new dependency.

**What the design branch changed**
- **Header logo blend (option 2B).** `Navbar.tsx` renders a `bn-header-surface` span and an `atTop` state
  (`window.scrollY <= 8`, class `is-at-top`, not while the search is docked). The header no longer paints its
  own bar: `.bn-header-surface::before` is the white bar masked transparent where the logo sits, `::after` is
  the solid bar. At the top of the page the solid layer is hidden and the logo is scaled 1.8x (1.45x on phones)
  with its own shadow; on scroll it returns to the solid bar and the normal logo.
- **Corner buttons in a diamond.** "Post requirement" (`.rfq-tab`) stays the navy tab on the right edge, the
  assistant (`.navya-agent-dock`) is on the left, `.back-to-top` (2.25rem) at the bottom corner, with equal
  visible gaps (about 14px). The old rule that moved the assistant sideways when back-to-top appeared is
  removed, so nothing shifts.
- **Advertise** button gets a megaphone icon (inline SVG).
- **Scrollbars:** navy thumb everywhere, 8px inside boxes with the track inset from the ends; Firefox gets
  `scrollbar-color` navy through `@supports`. Chrome ignores the webkit rules on boxes that set
  `scrollbar-width`, so those are reset for the filter panels and dropdowns.
- "All categories" hero pill widened to 8.4rem so the label fits on phones.
- `HANDOFF.md`: 8 October (later) block; also lists the untracked `logo-blend-options.html` board.

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment`, `/search`, `/dashboard` return 200 locally.
- Owner checked the changes locally.
- Not done: 390px check that the three corner buttons do not overlap; header fade on every route.

**Flags for the owner**
1. Back-to-top is still in the bottom-right corner (FR-11/AC-7 expects lower-left); the diamond keeps it there.
2. The header bar is now drawn by a separate element, so any page that sets its own header background or
   shadow must target `.bn-header-surface`, not `.bn-header`.
3. Pending from earlier passes, unchanged: GSAP visual pass, `/categories` hydration warning.

### Pulled `origin/design` again (`bb7e84c..747a912`) — merged 2026-10-08 (evening)

1 new commit from the UI dev (`747a912`, "Header spans the full bar on wide screens, 50/50 home split, text
Advertise"), 1 file (+8/-2): `app/counter-soft-system.css`. CSS only. Merged with `git merge --no-ff --no-commit`,
**no conflicts**, owner checked it locally, then committed, pushed and deployed (frontend only) to the testing
server. No backend change, no schema change, no new dependency.

**What the design branch changed**
- **Home stats row is 50/50.** `.hs-proof-row` columns go from `2fr 1fr` to `1fr 1fr`: the stats card and the
  `home_hero` ad tile are now equal width. Still full width when no ad is live; stacks under 900px.
- **Header content spans the whole bar.** `.bn-header.is-counter-public .bn-header-inner { max-width: none }`.
  It was capped at 90rem and centred, which pulled the logo away from the bar's left end on wide monitors.
- **Advertise** is a plain navy text link with the megaphone, no outline box; hover shows the
  `--counter-indigo-soft` tint.

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment` return 200 locally.
- Owner checked the changes locally.
- Not done: 1920px visual check of the logo and centred nav, ad tile balance at 50/50.

**Flags for the owner**
1. The 50/50 split doubles the ad tile's width; ad creatives sized for a narrow tile may now crop differently
   (`ApiAdvertisingSlot imageOnly`).
2. Pending from earlier passes, unchanged: back-to-top still bottom-right, GSAP visual pass, `/categories`
   hydration warning.

### Pulled `origin/design` again (`747a912..dd63595`) — merged 2026-10-08 (night)

1 new commit from the UI dev (`dd63595`, "Home redesign, plain-language copy, section panels, no-pause motion"),
22 frontend files (+488/-320) plus `HANDOFF.md` and `counter-soft-system.css` (+223). Merged with
`git merge --no-ff --no-commit`, **no conflicts**, owner checked it locally, then committed, pushed and deployed
(frontend only) to the testing server. No backend change, no schema change, no new dependency.

**What the design branch changed**
- **Plain-language copy (owner rule: short, simple, no slogans).** Home "Suppliers, services and jobs in one
  place.", Recruitment "Find work. Hire people.", "Jobs by field", footer reduced to one line plus copyright,
  stats labels "Categories / Listings / Open jobs", About copy shortened. Public copy now says "jobs" where
  rewritten; the jobs page search and filters still say "roles". Not yet done: Pricing, Sell, RFQ, Post a
  job, sign-in/register, dashboards, detail pages.
- **Home:** the scroll-pinned "Three ways" tour is replaced by `components/home/ProductHub.tsx` (`.hub-*`): a
  navy panel with an SVG hub that cycles Directory / Recruitment / Ask Navya, no pin, no pause. `RouteScene`
  ("Say what you need") removed from Home (file kept, unused). "Why Bharat Navya" cards are navy. Closing
  section shortened. Our Pass 1 live counts (`useHomeData`) are kept.
- **Hero cards (`HeroStage`):** Directory scene = one requirement, three quotes, best one picked and accepted;
  Recruitment scene = application status track (Applied, Viewed, Shortlisted, Interview) ending on an
  interview card. Ask Navya unchanged.
- **Section panels:** any `.hs-sec` / `.ps-sec` whose `.le-shell` holds a `header.le-section-head` is a white
  rounded panel with a one-row head; the blurb paragraphs in those heads were deleted from the TSX.
- **No pause anywhere (owner rule).** `components/ads/useAdRotation.ts`, `AdControls.tsx` and
  `evidence/ApiAdvertisingSlot.tsx` (our ad carousel files) lose the pause button and the hover / keyboard
  focus hold; the carousel only holds when the tab is hidden or the ad is scrolled out of view. The Directory
  hero slideshow and the home ticker likewise. `CLAUDE.md`'s ad slider bullet updated to match.
- **Directory:** "Get found by buyers" (`StorefrontScene`) autoplays in view and loops instead of pinning.
  **Recruitment:** compact hero path cards, the role finder is one connected board.
- Footer fade is stronger. `HANDOFF.md`: 8 October (evening) block.

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment`, `/search`, `/about`, `/recruitment/jobs`
  return 200 locally.
- Owner checked the changes locally.
- Not done: 390px pass on the new hub panel and hero cards; the 78-check ad carousel script was not re-run and
  may still assert the old hold / pause behaviour.

**Flags for the owner**
1. Removing the pause control drops the accessible way to stop auto-moving content (WCAG 2.2.2). Recorded
   as the owner's call, not reversed here.
2. The Directory hero card brings quote / "Accept" wording back into the home hero, while this doc records
   quotation language as deliberately absent from the primary journey. Looks intentional; confirm.
3. Pending from earlier passes, unchanged: back-to-top still bottom-right, GSAP visual pass, `/categories`
   hydration warning.

### Pulled `origin/design` again (`dd63595..6b24f5b`) — merged 2026-10-09

1 new commit from the UI dev (`6b24f5b`, "Category mega menu, Top companies board, one-piece role finder,
looping hire scene, footer lockup"), 14 files (+493/-153), **backend touched (additive)**. Merged with
`git merge --no-ff --no-commit`, **no conflicts**, owner checked it locally, then committed, pushed and deployed
(backend and frontend) to the testing server. No schema change, no migration, no new dependency.

**What the design branch changed**
- **Backend (additive):** `GET /api/sellers/featured` also returns `categorySlug` and `offers` (up to 3 active
  listing titles), and `category` is now the seller's main top-level category (the root category most of their
  active listings sit under, falling back to the legacy category). Comes from the new
  `directory.sellerCardExtras(ids)` (one query in `listingStats.repository.js`, exported through the directory
  port; `users.routes.js` calls it). Redeploy the backend for the Directory board to show real categories.
- **"All categories" mega menu:** `components/discovery/CategoryMegaMenu.tsx` replaces the native `<select>`
  pill. Desktop: left rail of top categories with photos, sub-categories on the right, search across all
  levels. Phones: same attached dropdown, categories as a row of photos. No dim layer, no scroll lock. Data is
  `categoryMenu` in `app/directory/page.tsx`. **Departs from the native-`<select>` rule (CLAUDE.md section 2)
  at the owner's request.**
- **Directory "Top companies":** `CompanyShowcase.tsx` (`.tc-*`) replaces the company cards (`.cc-*` CSS
  removed). Category tabs with counts over a ranked two-column board: photo with rank, name and tick,
  category and city, one proof line (rating, years, reply rate, GST), two offer chips. Whole card is the
  link; phones show the top four. Still fed by `useFeaturedSellers()` (8 sellers), so some tabs hold only
  one or two companies.
- **Recruitment:** the role finder is one box (white choices, blend, navy result), one left-to-right wipe
  reveal, arrow removed. `HireScene` loops while in view; "See pricing" button removed.
- **Footer:** logo lockup (name and tagline stacked beside the logo), content starts below the fade.
  Section heads on phones: title left, button right. Home closing CTAs side by side on phones.
- **Hero titles restored** to the pre-copy-pass versions at the owner's request (Home "The B2B platform built
  for what's next.", Directory "Turn business search into business action.", Recruitment "Find the right
  people. Build the right team."). This reverses the hero titles listed in the previous entry; the designer asks
  that hero titles are not rewritten in later copy passes without asking.
- On hold: homepage hero background, waiting for the owner's pick from `public/hero-bg-abstract.html`
  (untracked, not committed).

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment`, `/search`, `/about` return 200 locally.
- Backend restarted; `npm test` architecture suite 6/6. `sellers-featured` golden regenerated (only that file,
  by removing it and re-running `test:goldens`, since `goldens:update` would also bake in the unrelated
  Recruitment/identity drift); it passes. Other goldens unchanged and still failing as before.
- Owner checked the changes locally.
- Not done: 390px pass on the mega menu and Top companies board.

**Flags for the owner**
1. The mega menu is not a native `<select>`; accepted per the owner's request.
2. Top companies draws only from the 8 featured sellers (`/api/sellers/featured` is still capped at 8, backend
   gap B1 in the list above).
3. Pending from earlier passes, unchanged: back-to-top still bottom-right, GSAP visual pass, `/categories`
   hydration warning, ad carousel script not re-run against the no-pause behaviour.

### Pulled `origin/design` again (`6b24f5b..67dbd1a`) — merged 2026-10-09 (later)

1 new commit from the UI dev (`67dbd1a`, "Top companies: drop rank numbers from the cards"), 2 files (+6/-8):
`components/directory/CompanyShowcase.tsx`, `app/counter-soft-system.css`. Merged with
`git merge --no-ff --no-commit`, **no conflicts**, owner checked it locally, then committed, pushed and deployed
(frontend only). No backend, schema or dependency change.

- The rank badge on the Directory "Top companies" cards is removed (`.tc-rank` CSS and the `rank` prop). The
  list is an unnumbered `<ul>` labelled "Top companies" instead of an `<ol>` "ranked by rating"; the photo box
  now fills for both photo and avatar. Order, tabs and card content are unchanged (the file's header comment
  still says "ranked by rating").
- `npx tsc --noEmit` clean; `/directory` 200 locally.

### Pulled `origin/design` again (`67dbd1a..979347f`) — merged 2026-10-09 (company page, About, Pricing removed)

2 new commits from the UI dev (`a1c734c` "Reviews and stories on company page, About section pages, API trust
tags, ofbusiness-style nav dropdowns, footer app badges" and `979347f` "Remove the public Pricing page and every
link to it"), 36 files (+1022/-408). Merged with `git merge --no-ff --no-commit`, **no conflicts**, owner checked
it locally, then committed, pushed and deployed (frontend only). **No backend change, no schema change, no new
dependency.** `next.config.mjs` changed, so restart the local dev server after pulling.

**What the design branch changed**
- **Company page `/seller/[slug]`** (new order: header with trust tags, stats, Stories, Work evidence, Reviews,
  then about / facts / offerings). This closes the "Reviews and Products sections missing" item from the
  2026-09-28 punch-list for Reviews.
  - Reviews: new `components/seller/CompanyReviews.tsx` (`.cr-*`) on the existing `getReviews` / `postReview`
    (`GET/POST /api/reviews`): summary, write / edit form (stars + optional text; one review per person per
    company; cannot review your own), filter / sort list. Guests get `ContactAuthModal purpose="review"` and
    return to the form. The old inline block read `profile.reviews`, which `GET /api/sellers/:slug` does not
    return, so it was always empty; `ReviewsPanel.tsx` is now unused. The rating tile links to `#reviews`.
  - Stories: `SellerStoriesSection` back on the page, behind admin flags `stories` / `storyHighlights`; own
    `.sst-card` solid navy ring. Employer page: Recruitment reviews moved up after "About working here".
- **Trust tags (from the API payload):** `components/TrustBadges.tsx` is the one source (`RatingPill`,
  `VerifiedTag`, `ListingFlag`, `TrustBadges` with earned `badges` from `backend/lib/badges.js` and a facts
  line). Used in search rows, listing hero and seller box, listing cards, company header, `SellerCard`.
  Listing cards have one Contact button (the duplicate "i" details icon is removed). Solid colours, no gradients.
- **About section:** navbar About is a dropdown. Pages `/about`, `/about/team`, `/careers`, `/blog`, `/contact`
  share `components/about/AboutShell.tsx`; owner facts (contact details, leadership, open roles) live in
  `components/about/company.tsx`, null values are hidden. `/careers` and `/contact` added to `ROOT_ROUTES` in
  `lib/routePresentation.ts`. "More about us" blocks removed.
- **Nav and footer:** ofbusiness-style dropdown rows (`NavRow`, `.bn-nav-row`); Advertise hidden on `/login` and
  `/register`. Footer app badges (Google Play / App Store, not linked yet: set `href` in `APPS` in `Footer.tsx`),
  links in two columns.
- **Pricing page removed (owner request).** `app/pricing/` deleted; `next.config.mjs` redirects `/pricing` to `/`
  (307, so it can return). All links removed or repointed: footer, Contact FAQ, `/features`, home `SellCta`,
  seller dashboard Subscription tab buttons; "Choose plan" on `/offer` goes to `/dashboard?tab=subscription`;
  Directory "Promote your company" and the ad-slot fallback go to `/dashboard?tab=advertise`. Plans still exist
  (admin Plans tab, seller Subscription tab, `/offer`). Do not re-add Pricing links without asking.
- Fixes: sidebar ads 4:3, blog page bottom ad removed, un-classed `<select>` padding restored, navy CTA text white.
- Hero background still on hold (owner choosing from the designer's untracked option boards).

**Checks run**
- `npx tsc --noEmit`: clean. Dev server restarted (config change). `/`, `/directory`, `/recruitment`, `/search`,
  `/about`, `/about/team`, `/careers`, `/contact`, `/blog`, `/features`, `/offer`, `/seller/<slug>` return 200;
  `/pricing` returns 307 to `/`. `GET /api/reviews?sellerId=` returns real reviews.
- Owner checked the changes locally.
- Not done: 390px pass on the company page, About pages and nav dropdowns; posting a review end to end.

**Flags for the owner**
1. Sellers no longer have an in-dashboard link to plan prices (the Subscription tab buttons were removed);
   plans are reachable from `/offer`. Owner call, recorded here.
2. `/pricing` is still listed in `ROOT_ROUTES` (harmless; the redirect runs first).
3. Footer app badges have no links yet.
4. Pending from earlier passes, unchanged: back-to-top bottom-right, GSAP visual pass, `/categories` hydration
   warning, ad carousel script not re-run against the no-pause behaviour.

### Pulled `origin/design` again (`979347f..3531304`) — merged 2026-10-09 (contact form, backend + migration 0019)

2 new commits from the UI dev (`cf61d26` "Contact page form with admin inbox, compact search rows when a listing
is open" and `3531304` "Search rows: seller names wrap; contact form button stays on one line"), 13 files
(+335/-1). Merged with `git merge --no-ff --no-commit`, **no conflicts**, committed, pushed and deployed (backend
and frontend) on the owner's standing go-ahead for this pull. **Backend + schema change: migration
`0019_add_contact_messages.sql`.**

**What the design branch changed**
- **Contact form** on `/contact` (`components/about/ContactForm.tsx`, `.cf-*`, plus a "What happens next" panel).
  Needs name + message (10+ characters) + email or phone; signed-in users are prefilled.
- **Backend:** migration `0019_add_contact_messages.sql` (table `contact_messages`, also in `schema.sql`), flat
  mapping `contact-messages.json`, file-DB seed `DB/contact-messages.json`. New
  `modules/platform/routes/contact.routes.js`: `POST /api/contact` (public, optionalAuth, validated) and
  `GET` / `PATCH /api/admin/contact-messages[/:id]` (admin, mounted in the `admin-sub` phase). Admin UI: Global >
  Contact messages (`components/admin/ContactMessagesTab.tsx`): filter New / Handled / All, mark handled or reopen.
- **Search rows:** container query on `.directory-listing-ledger`; below 36rem of list width (a listing open
  beside it) smaller photo and no spec chips; seller names wrap.

**Fixed while merging (our change to the designer's file)**
- `contact.routes.js` called `messages.update(id, ...)`, but the shared repo only exposes `updateById`
  (`modules/_shared/repository.js`). The admin PATCH ("mark handled") would have thrown a TypeError. Changed to
  `messages.updateById(...)`; verified against the dev DB (status closed then reopened). Tell the UI dev.

**Checks run**
- Migration 0019 applied to the local dev DB; `POST /api/contact` returns `{success:true,data:{id:"cmsg_..."}}`;
  admin list without a token returns 401. Backend restarted; architecture tests 6/6.
- `npx tsc --noEmit`: clean. `/contact`, `/admin`, `/directory`, `/search` return 200 locally.
- Not done: admin tab exercised through the UI with a signed-in admin; 390px pass on the contact page.

**Testing server: migration 0019 applied 2026-10-12** to the Neon DB (`npm run migrate-schema`; status before:
only 0019 pending). Live check: `POST /api/contact` on `bharatnavya-api.vercel.app` saved a message (200) and
`GET /api/admin/contact-messages` without a token returns 401. The test row was deleted afterwards. The session's
credential guard had blocked pulling `PG_URL` from Vercel, so the owner supplied the connection string directly.

**Flags for the owner**
1. The public contact endpoint's rate limit (5 per IP per 10 minutes) is an in-memory `Map`, which on Vercel resets
   per instance / cold start, so it only throttles loosely. CLAUDE.md section 9 says not to keep request state in
   process memory; fine as a soft limit, a table-backed counter would be the proper fix.
2. Contact messages hold names, emails and phone numbers (PII): admin-only read, but treat the table as sensitive.
3. Pending from earlier passes, unchanged: back-to-top bottom-right, GSAP visual pass, `/categories` hydration
   warning, ad carousel script not re-run against the no-pause behaviour.

### Pulled `origin/design` again (`3531304..bbbaa07`) — merged 2026-10-12 (Trade Grid hero, trust tags v3, image viewer)

3 new commits from the UI dev (`56fbed4` "Trade Grid home hero, one page width on all screens, per-colour trust tags
with badge filter, image viewer", `5e842b1` "Company email in footer and contact, remove About switcher, balanced
tag chips, compact spec pill with city", `bbbaa07` "Role finder: per-option counts, disabled empty options,
top-matches preview and hint line"), 22 files (+707/-76). Merged with `git merge --no-ff --no-commit`, **no
conflicts**, owner checked it locally, then committed, pushed and deployed (backend and frontend). **One additive
backend change, no schema change, no migration, no new dependency.**

**What the design branch changed**
- **Home hero = Trade Grid** (owner's pick from `frontend/docs/hero-living-scenes.html`): canvas engine in
  `components/home/tradeGrid.ts` (`@ts-nocheck`), mounted by `TradeGridBg.tsx` inside `.bn-home-hero`. Pauses off
  screen / hidden tab, one still frame under reduced motion, no pause control. Hero height scales with the
  visible height on desktop. Home closing CTA is just "Create your account". The `hero-bg-*.html` boards in
  `public/` stay uncommitted.
- **One page width everywhere:** `--page-max: 120rem` (1920px); all shells, heads and the footer share one text edge.
- **Trust tags v3:** per-tag solid colours (`.tb-chip.is-*`: Verified green, Trust seal blue, GST teal, Top rated
  amber, Fast reply violet, Trusted orange), `TagRow` for rows and cards, equal side padding. Listing cards:
  compact spec pill with the city (`CityTag`), rating on its own line.
- **Badge filter in search:** "Company badges" section in `Filters.tsx` (`TAG_LABELS`, `filters.tags`), applied
  client-side to the loaded page like rating and brand.
- **Image viewer:** `components/ImageViewer.tsx` (zoom buttons / wheel / pinch / double-click, drag pan, arrows /
  swipe / thumbs) on the listing gallery, the search preview photo and company work photos.
- **Contact / About:** company email `info@bharatnavya.com` set in `COMPANY` (footer + Contact); Contact gets "Ask
  Navya" and "Post a requirement" quick links; the About page switcher row is removed (navigation via navbar
  About menu, phone menu and footer).
- **Recruitment role finder:** fetches all open jobs once (`getJobs({limit:200})`) and counts client-side; each
  option shows how many jobs it leaves, options that would leave 0 are disabled, top-3 preview and a hint line.
  If open jobs pass about 200, switch to a counts endpoint.
- **Backend (additive, restart needed):** `identity.getSellerBrowseCards` adds `trustSealVerified`,
  `gstRegistered` and `badges` (derived through `lib/badges.js`) to the seller on each search / browse result.

**Checks run**
- `npx tsc --noEmit`: clean. `/`, `/directory`, `/recruitment`, `/recruitment/jobs`, `/search`, `/about`,
  `/contact`, `/seller/<slug>`, `/listing/1` return 200 locally. Backend restarted; architecture tests 6/6.
- Goldens `listings-browse`, `listings-page2`, `brand-detail` regenerated (only by removing those three files and
  re-running `test:goldens`); the diff is purely the three new seller fields. The admin-users and jobs goldens
  still fail as in earlier entries (unrelated Recruitment / identity drift), not touched.
- Owner checked the changes locally.
- Not done: 390px pass on the Trade Grid hero, badge filter and image viewer.

**Flags for the owner**
1. `npm run validate:design` (the UI dev's own lint) fails: "missing shared search contract" in `globals.css`,
   `bharat-navya-home.css`, `directory-design.css`, `RoleSearchBar.tsx`, `living-evidence.css`. None of those
   files is in this merge, so it predates it; tell the UI dev.
2. The role finder pulls up to 200 jobs on every visit; fine for the demo data, needs a counts endpoint at scale.
3. `tradeGrid.ts` is `@ts-nocheck`, so type errors in it are not caught by `tsc`.
4. Pending from earlier passes, unchanged: back-to-top bottom-right, GSAP visual pass, `/categories` hydration
   warning, ad carousel script not re-run against the no-pause behaviour.

### Fix: "Search within results" in the listing filter panel — 2026-10-12 (own change, not a design pull)

Owner report: typing a product word (for example "angle") in the filter box on `/search` showed "No matches" under
Category and Brand and changed nothing in the results.

- **Cause:** the box only narrowed the Category / Brand / sub-category option lists (`term` in `Filters.tsx`), and
  those lists are built from the 12 loaded rows (brands) or the current result set (categories), so a product word
  matched none of their labels. It never searched the listings. The pre-redesign `Filters` behaved the same way.
- **Fix:** `Filters` takes an optional `quickSearch={{ value, onChange }}`. When given, the text is owned by the
  parent, the box reads "Search within results", has a clear button, and the option lists are no longer cut by it.
  `UnifiedListingWorkbench` debounces it (300 ms) and sends `q = <search box words> + <typed words>` to
  `GET /api/listings`, so the rows, total, and the Category / Brand / City lists all follow. The API needs every word
  to match and only widens to "any word" when nothing does, so the rows are checked again in the browser (title,
  description, keywords, brand, category, seller, city): a term with no real match shows 0 listings instead of
  unrelated rows, and the stale server Category / City counts are hidden in that case. "Clear all" empties the box
  and a typed term counts in the Filters badge on phones.
- **Pages:** `/search` and every category page (`/[category]`, `/[category]/[city]`) use the same workbench, so one
  change covers them. Brand page and `/brands` have no text filter; `/categories` has its own working filter;
  `DiscoveryResults` / `GlobalSearchResults` are not imported by any page (unchanged, still use the old behaviour).
- **API:** no backend change. `GET /api/listings?q=` already behaves as above.
- Files: `components/Filters.tsx`, `components/directory/UnifiedListingWorkbench.tsx`, and three `.flt-search-clear`
  rules in `app/counter-soft-system.css` (the designer's file; may be overwritten by a later design pull, tell the UI
  dev).
- **Checks:** headless Chrome on `/search`, `/metals-steel-alloys`, `/search?q=steel` with "angle", "angle zzzz",
  "zzzz" and cleared (718 / 26 / 26 listings restored), plus 390px with the panel open: 0px overflow. `tsc` clean.
- **Not done:** the typed term is not kept in the URL, so a refresh or shared link loses it.

---

## Reference material

- `frontend-backup/` — pre-redesign `frontend/` snapshot (local, gitignored).
- `Design/` — Vite prototype: visual direction, `src/design-system/` tokens + primitives,
  `docs/DESIGN_SYSTEM.md` governance, screen compositions, the 13 approved page patterns.
- `frontend/` git history — every pre-redesign implementation.
