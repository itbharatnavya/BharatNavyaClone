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

## Reference material

- `frontend-backup/` — pre-redesign `frontend/` snapshot (local, gitignored).
- `Design/` — Vite prototype: visual direction, `src/design-system/` tokens + primitives,
  `docs/DESIGN_SYSTEM.md` governance, screen compositions, the 13 approved page patterns.
- `frontend/` git history — every pre-redesign implementation.
