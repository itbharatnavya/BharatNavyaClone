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

## Reference material

- `frontend-backup/` — pre-redesign `frontend/` snapshot (local, gitignored).
- `Design/` — Vite prototype: visual direction, `src/design-system/` tokens + primitives,
  `docs/DESIGN_SYSTEM.md` governance, screen compositions, the 13 approved page patterns.
- `frontend/` git history — every pre-redesign implementation.
