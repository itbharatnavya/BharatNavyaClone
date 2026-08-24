# RECRUITMENT.md — the Recruitment product

**Recruitment** is BharatSource's second suite product: a two-sided job marketplace where **employers
post roles** and **candidates browse and apply**. Like the Directory, it is a **lead-model** product —
the platform never processes payments, runs interviews, or holds offer letters; it connects the two
sides and gets out of the way.

**Design reference:** the intended feel is a job-board-plus-lightweight-ATS, roughly Hirist (candidate-
facing job search/apply) crossed with Zoho People's employer-side applicant tracking (status pipeline,
candidate detail view) — as UX *inspiration* for what an employer/candidate expect from this category of
product, not as a source of visual design. Still built entirely in BharatSource's own light design
system (CLAUDE.md §2/§6: no emojis, native `<select>` filters, brand blue/action orange tokens).

**Audience of this doc:** a developer (or AI agent) with zero prior context, building Recruitment from
scratch. Read **CLAUDE.md** first (suite-wide architecture + non-negotiable rules — they all apply here
too: no emojis, native `<select>` filters, zero 390px overflow, local images only, `store.js`-only
persistence, no payments). **DIRECTORY.md** is the closest sibling doc and the pattern this build follows
— where Recruitment deliberately diverges from it, that's called out below.

> **Status: not yet built.** As of this doc's creation, `/recruitment` is a "Coming soon" placeholder
> (`components/suite/ComingSoon.tsx`) with no backend routes and no data model. This document is written
> *ahead of* the implementation — it's the spec the build works from, not a record of what exists. See
> §6 for the build sequence and what's actually done at any given point.
>
> **Build vs. launch are decoupled.** The whole product gets built end-to-end behind a single admin
> feature flag (§5) — production keeps showing "Coming soon" throughout the build, regardless of how much
> is finished, until that flag is flipped on deliberately.

---

## 1. Stack recap

Same stack as the rest of the suite — no new infrastructure:

- Frontend: **Next.js 14 App Router + TypeScript** on `:3000`, same single-origin rewrite trick as
  Directory (`frontend/next.config.mjs`). New pages live under `frontend/app/recruitment/`,
  `frontend/app/job/[id]/`, `frontend/app/post-job/`, `frontend/app/employer/[slug]/`.
- Backend: **Express (CommonJS)** on `:4000`, persistence via `backend/lib/store.js` — the same
  Postgres-or-file-DB interface Directory uses (`all/findOne/findMany/getById/insert/update/remove/
  nextId`). New route files: `backend/routes/jobs.js`, `backend/routes/applications.js`, plus additions
  to `backend/routes/users.js`.
- Auth: same JWT/`authGuard`/`optionalAuth` middleware (`backend/middleware/authGuard.js`) — one account
  works across Directory and Recruitment, exactly like it does across all suite products today.

### Divergence from Directory: separate collections, not `listings.json` reuse

Consultations reuses `listings.json` via `type:"service"` because it's a *close* sibling of the Directory
— still seller + listing + buyer-enquiry semantics, same search/ranking engine. Recruitment is not that
close:

- Candidates **apply** with a status pipeline (applied → viewed → shortlisted → interview →
  hired/rejected) — nothing like a Directory "enquiry."
- Jobs need facets (employment type, experience level, salary range, remote) that don't fit
  `listings.js`'s product/service filtering, `lib/ranking.js`'s boost logic, or `productKey` multi-vendor
  grouping — none of which mean anything for a job posting.
- The Directory is already flagged (§4/§5) as needing hardening, not new coupling from an unrelated
  product.

So Recruitment gets **its own collections** — `jobs.json`, `applications.json` — and its own profile
blocks on `users.json` (`employerProfile`, `candidateProfile`), built by mirroring the *shape and
patterns* of `sellerProfile`/`listings.json`/`inquiries.json`, not by reusing the files themselves. Same
`store.js` interface, same route conventions, same dashboard-tab shape — different data.

### Divergence from Directory: its own dashboard

Recruitment does **not** add tabs to Directory's `components/dashboard/DashboardShell.tsx`. It gets a
separate dashboard scoped under `/recruitment` (see §3/§4), structurally mirroring `DashboardShell`'s
tab-registration/gating pattern but as its own component tree. The **admin** panel (`/admin`) will
eventually manage both products' data together — that unification is a deliberate later decision, not
part of this build.

---

## 2. Data model

| Collection / field | Shape / notes |
|---|---|
| `users.json` → `employerProfile` | Mirrors `sellerProfile`'s shape (`backend/routes/users.js`'s `publicSeller`/become-seller pattern). Fields: `companyName`, `slug`, `about`, `logo`, `coverImage`, `industry`, `companySize`, `website`, `location{city,state}`, `contactMobile`, `contactEmail` (gated — see below), `status` (`pending`\|`approved`\|`suspended`), `isVerified`, monetization stubs (`planTier`, `jobPostLimit`, `applicationQuota`) mirroring the seller plan/quota fields, admin-owned. |
| `users.json` → `candidateProfile` | No approval gate — any user can create/edit one freely (mirrors how any buyer can send an RFQ without a special profile). Fields: `headline`, `summary`, `resumeUrl`, `skills[]`, `experienceYears`, `currentRole`, `currentCompany`, `education[]`, `workHistory[]`, `expectedSalary`, `preferredLocations[]`, `preferredJobTypes[]`, `contactPhone`, `contactEmail` (gated), `isOpenToWork`. |
| `users.json` → `recruitmentRole` / `recruitmentRoleLockedAt` | Added in the 2026-08-24 role-lock pass. `recruitmentRole: "candidate"\|"recruiter"\|null` — top-level, sibling to the two profile objects (not nested in either, since it must outlive which profile exists). Locks (`recruitmentRoleLockedAt` set) the moment the first `become-employer`/`PUT me/candidate` call actually creates that profile; the opposite profile-mutating endpoint 403s once locked. See the dated entry below Phase 4 for full rationale. |
| `jobs.json` | One row per job posting. `id`, `employerId`, `title`, `description`, `jobFunction` (flat taxonomy — see below), `employmentType` (`full-time`\|`part-time`\|`contract`\|`internship`\|`freelance`), `experienceLevel` (`entry`\|`mid`\|`senior`\|`lead`\|`executive`), `location{city,state,remote}`, `salaryRange{min,max,currency,isDisclosed}`, `skills[]`, `responsibilities[]`/`requirements[]`/`benefits[]`, `openings`, `status` (`active`\|`paused`\|`closed`\|`pending`), `viewCount`, `applicationCount`, `questions[]` (`{id,text,required}`, added 2026-08-24), `postedAt`, `expiresAt`. |
| `applications.json` | One row per candidate→job application (no fan-out — always exactly one job). `id`, `jobId`, `employerId` (denormalized), `candidateId`, `resumeUrl` (snapshot at apply time), `coverNote`, `status` (`applied`\|`viewed`\|`shortlisted`\|`interview`\|`rejected`\|`hired`), `statusHistory[]`, `answers[]` (`{questionId,text}`, added 2026-08-24), `appliedAt`, `updatedAt`. |
| `job-functions.json` | New, small, admin-editable **flat** list ("Engineering", "Sales", "Design", "Operations"…) — deliberately not a nested tree like `categories.json`. Job taxonomy doesn't need Directory's category-tree depth. |

### Reused as-is (no new collection needed)

Three pieces of the requested feature set — company reviews, company stories, company blogs — turn out to
already be generic enough in the existing codebase to point at an employer without any backend change:

| Existing system | Why it already works for Recruitment |
|---|---|
| `reviews.json` / `backend/routes/reviews.js` | Already generalized: `targetUserId` is the canonical field, `sellerId` is kept only as a back-compat alias (`reviews.js:6,90-173`). **Company reviews = the same `GET/POST /api/reviews?targetUserId=<employerUserId>` endpoints**, no new collection. |
| `stories.json` / `backend/routes/stories.js` | `POST /api/stories` only requires `authGuard` — it does **not** check `sellerProfile` exists (`stories.js:167`). An employer posting a "company story" works today; the seller-badge denormalization (`stories.js:89-91`, reads `u.sellerProfile`) degrades to no badge for an employer author — see §7 for the small follow-up to also check `employerProfile`. |
| `blogs.json` / `backend/routes/blogs.js` | Same shape: `POST /api/blogs` only requires `authGuard` (`blogs.js:107`), not a `sellerProfile`. Company blogs reuse this directly. Same badge caveat as stories. |

**Résumé / photo upload:** `backend/routes/uploads.js` (`POST /api/uploads`) accepts PNG/JPEG/WebP
**and `application/pdf`** (10MB cap for PDFs, 5MB for images) — the PDF branch was added specifically for
résumés, reusing the same primitive rather than a parallel upload route. `components/recruitment/
ResumeUpload.tsx` (added 2026-08-24) is the frontend half — an `ImageUpload.tsx` sibling with the mime
check relaxed to PDF. Candidate profile photos still just reuse the base `user.avatarUrl` field/flow
that already exists outside `candidateProfile` — no duplicate "profile image" field needed there.

**Contact gating** follows the Directory pattern exactly: `GET /api/employers/:slug` and
`GET /api/candidates/:id` use `optionalAuth` and strip `contactMobile`/`contactEmail`/`contactPhone`
server-side unless the request is authenticated (mirrors `publicSeller(user, includeContact)`,
`backend/routes/users.js:118-137`) — never merely hidden client-side.

**Postgres:** file-DB is the dev/build backend for Recruitment initially. If/when it needs a Postgres
mapper (matching `backend/lib/db/listings.js`/`users.js`'s batched-`all()` pattern), that's additive —
`store.js`'s interface doesn't change, so no route code changes either.

---

## 3. Flows (page → endpoint)

### Employer
| Step | Frontend | Backend |
|---|---|---|
| Register / login | `/register`, `/login` | Same suite-wide auth as Directory |
| Become an employer | Recruitment dashboard → Profile (or lazily on first job post) | `POST /api/become-employer`, or lazy minimal-profile creation on `POST /api/jobs` (mirrors `minimalSellerProfile`, `backend/routes/listings.js:162-209`) |
| Post a job | `/post-job` | `POST /api/jobs` |
| Edit / close a job | Recruitment dashboard → My Jobs | `PUT /api/jobs/:id`, `DELETE /api/jobs/:id` |
| My jobs (incl. non-active) | Recruitment dashboard → My Jobs | `GET /api/jobs/mine` (or `/api/me/jobs`, matching Directory's `/api/me/listings` — **not** the public browse, same "pending seller sees 0 listings" trap applies) |
| Review applications, update status | Recruitment dashboard → Applications (Applied / Shortlisted / Interview / Rejected / Hired sub-views) | `GET /api/applications` (filterable by `status`), `POST /api/applications/:id/status` |
| View a candidate's detail | Recruitment dashboard → Applications → candidate row | `GET /api/candidates/:id` (`optionalAuth`, contact gated — same as public seller/employer gating) |
| Company logo / cover upload | Recruitment dashboard → Profile | `POST /api/uploads` (existing, image-only, reused as-is) |
| Company story | Recruitment dashboard → Company Story | `POST /api/stories` (existing route, reused — employer is just another authenticated author) |
| Company blog post | Recruitment dashboard → Company Blogs | `POST /api/blogs` (existing route, reused) |
| See reviews of the company | `/employer/[slug]`, Recruitment dashboard → Reviews | `GET /api/reviews?targetUserId=<employerUserId>` (existing route, reused) |
| Public employer profile | `/employer/[slug]` | `GET /api/employers/:slug` (`optionalAuth`, contact gated) |

### Candidate
| Step | Frontend | Backend |
|---|---|---|
| Browse / search jobs (role, company, city) | `/recruitment/jobs` | `GET /api/jobs` (filters: jobFunction/role keyword `q`, `employerId` or company-name text match, city/state/remote, employmentType, experienceLevel, salary range) |
| Job detail | `/job/[id]` | `GET /api/jobs/:id` (increments `viewCount`) |
| Apply (login-gated) | `/job/[id]` | `POST /api/applications` — `authGuard`; logged-out click opens the same inline login/register modal pattern as Directory's `ContactAuthModal` instead of a public form |
| Upload résumé | Recruitment dashboard → Profile | `POST /api/uploads` extended to accept `application/pdf` (see §2) |
| Upload profile photo | Recruitment dashboard → Profile | `POST /api/uploads` (existing, reused — writes to `user.avatarUrl`, same as the rest of the suite) |
| Edit candidate profile | Recruitment dashboard → Profile | Candidate-profile update route on `backend/routes/users.js` (no approval gate) |
| Review a company (post-application) | `/employer/[slug]` | `POST /api/reviews` (existing route, `targetUserId=<employerUserId>`, reused) |
| My applications (status-tracked) | Recruitment dashboard → My Applications | `GET /api/applications/mine` |

### Admin
Backend-only for this build: dedicated moderation endpoints (approve/suspend an employer, moderate a job
posting), mounted **before** the blanket `/api/admin` guard at their own prefix (`/api/admin/employers`,
`/api/admin/jobs`) — same nested-admin-route pattern Directory uses for boosts/entitlements/categories
(`backend/index.js`). **No `/admin` UI work** — the unified cross-product admin experience is a later,
separate decision.

---

## 4. Dashboard architecture

Recruitment has its **own** dashboard, not tabs on Directory's `DashboardShell.tsx`. **Built** as of the
2026-08-24 role-lock pass (was a flat 3-section page before that — see the dated entry below Phase 4):

- `frontend/app/recruitment/dashboard/page.tsx` owns only the role-selection gate (a two-card
  Candidate/Recruiter chooser, shown once, hidden once `recruitmentRoleLockedAt` is set) and hands off to
  `frontend/components/recruitment-dashboard/RecruitmentDashboardShell.tsx` — a separate component tree,
  structurally mirroring `DashboardShell`'s tab-registration/gating `useMemo` pattern
  (`components/dashboard/DashboardShell.tsx:53-72,285-294`) but standing on its own, gated on
  `user.recruitmentRole` rather than `user.sellerProfile`.
- Recruiter-only tabs: **Overview** (`OverviewTab.tsx`'s `RecruiterOverview` — client-side stat cards off
  `getMyJobs`, no new endpoint), **My Jobs** (`MyJobsTab.tsx`, mirrors `ListingsTab.tsx` against
  `getMyJobs`; Edit routes to `/post-job?jobId=`, Pause/Close are direct `updateJob` status patches),
  **Applications** (`ApplicationsTab.tsx`, mirrors `LeadsTab.tsx` against `getJobApplications`; an
  expandable candidate-detail row — skills, experience, CV link, question answers, cover note, status
  history — and a status-update `Select`), **Profile** (`CompanyProfileTab.tsx`), **Stories**/**Blogs**/
  **Reviews** (`components/dashboard/StoriesTab.tsx`/`BlogsTab.tsx`/`ReviewsTab.tsx` reused **directly**,
  unmodified — confirmed generic on `user.id`, no `sellerProfile` requirement), **Advertise**
  (`AdvertisementsTab.tsx`, create + edit/pause/delete via `PUT`/`DELETE /api/my-ads/:id`).
- Candidate-only tabs: **Overview** (`CandidateOverview`), **My Applications** (`MyApplicationsTab.tsx`,
  status-tracked list + pipeline dots via `GET /api/applications/mine`), **Profile**
  (`CandidateProfileTab.tsx`, includes the CV upload via `ResumeUpload.tsx`).
- **Why separate:** the two products' account types genuinely differ (employer/candidate vs.
  buyer/seller), and keeping them apart avoids a shared shell accumulating cross-product conditionals as
  more suite products (Credit Card, Mutual) eventually need the same treatment.

---

## 5. Production gating: the coming-soon switch

**✅ Built (2026-08-24)** — matches this section's original design almost exactly, with one deliberate
change: the **env var is the primary switch**, not just an optional hard-override. `backend/lib/config.js`'s
`RECRUITMENT_LIVE` (unset by default) is read in `backend/routes/config.js` and, when explicitly
`"true"`/`"false"`, **overrides** whatever's stored in `settings.json`'s `featureFlags.recruitmentLive` —
so a production deploy can flip Recruitment live with one env var + restart, no admin-panel step required,
while the admin panel still works as a secondary control when the env var is left unset. This was a direct
request ("on production move we just need to change environment") rather than a deviation discovered
during implementation.

Recruitment is built fully — backend and frontend both — while staying invisible in production until a
single deliberate flip. This is a **frontend visibility gate**, not a dev-blocking one: backend routes
stay fully functional throughout the build so they can be tested; the switch controls what a production
visitor sees.

- **Mechanism:** reuse the existing admin feature-flag system (`backend/DB/settings.json`'s
  `featureFlags`, served via `GET /api/config`, consumed via `frontend/lib/config.tsx`'s `useConfig()` —
  the same mechanism already gating `stories`/`storyHighlights`/`blogs`/etc.). Add one new flag:
  `recruitmentLive`.
- **Default is `false`** — this is the one flag in the set that inverts the codebase's usual convention.
  `frontend/lib/config.tsx`'s `DEFAULT_FLAGS` (`config.tsx:37-54`) defaults every flag to `true` ("every
  optional feature defaults to ON... admin config only turns things OFF" — deliberate, since those are
  already-shipped features degrading gracefully if the config fetch fails). `recruitmentLive` must default
  to `false` in that same object, and needs a one-line comment there explaining the inversion is
  intentional — an unfinished product must never accidentally go live because a config fetch failed.
- **What checks the flag:**
  - `components/suite/SuiteNavMenu.tsx`'s `MODULES` entry for Recruitment — `status` becomes
    `flags.recruitmentLive ? "live" : "soon"` instead of the hardcoded string (`SuiteNavMenu.tsx:37-43`).
  - Every Recruitment page — `/recruitment`, `/recruitment/jobs`, `/job/[id]`, `/post-job`,
    `/employer/[slug]`, `/recruitment/dashboard` — must render `ComingSoon` when the flag is off, not just
    hide the nav link. Simplest implementation: one shared check (e.g. a small
    `RecruitmentGate`/`useRecruitmentLive()` wrapper reading `useConfig().featureFlags.recruitmentLive`)
    used at the top of each of those pages, or centralized in a single `frontend/app/recruitment/layout.tsx`
    if Next's layout nesting can cover all the routes above (verify at implementation time — `/job/[id]`
    and `/post-job` sit outside `/recruitment/*` in the URL tree, so they need the same guard applied
    directly, not inherited from a `/recruitment` layout).
  - Deep-linking to a specific job/employer page while the flag is off must still show "Coming soon," not
    a 404 and not the real page — same intent as today's placeholder, just reached from more URLs.
- **Going live:** flip `recruitmentLive` to `true` in the admin site-config UI (same place the other
  flags are edited) — no code change, no redeploy. This replaces the earlier draft of this plan, which had
  Phase 4 hard-coding `status:"live"` directly into `SuiteNavMenu.tsx`; the flag supersedes that.
- **Not in scope for this switch:** backend route access. `/api/jobs`, `/api/applications`, etc. are not
  gated by `recruitmentLive` — they need to work throughout the build for testing, and locking them down
  further is unnecessary since nothing links to them from a gated-off UI. If a harder infra-level lock is
  ever wanted independent of the database (e.g. so a fresh prod seed can't come up live by mistake even
  before an admin sets the flag), a `RECRUITMENT_ENABLED=false` backend env var (`backend/lib/config.js`,
  alongside the existing `AI_CLI_ENABLED` pattern at `config.js:58`) could force-override the DB flag —
  not required for the MVP switch, worth adding only if that specific risk becomes a real concern.

---

## 6. Build status / roadmap

Recruitment is built in phases; this section tracks what's actually done vs. planned. Update it as
phases land — don't let it drift the way a stale doc would.

### Phase 0 — `RECRUITMENT.md` (this doc)
✅ Done.

### Phase 1 — Data model + backend core
✅ Done (2026-08-24). `jobs.json`, `applications.json`, `job-functions.json`,
`employerProfile`/`candidateProfile` on `users.json` (file-DB **and** Postgres — this
environment runs live against Postgres, so the composite mapper in `lib/db/users.js` and
the `jobs`/`applications`/`job_functions` tables via `lib/db/flat.js` were built and
tested for real, not deferred). `backend/routes/jobs.js`, `backend/routes/applications.js`,
`users.js` additions (`become-employer`, `/me/employer`, `/me/candidate`,
`/employers/:slug`, `/candidates/:id`); `backend/routes/adminEmployers.js`
(`/api/admin/employers/pending`, `/:userId/approve`, `/:userId/suspend`) mounted before
the blanket `/api/admin` guard. `POST /api/uploads` extended for résumé PDFs. Demo data
via `backend/scripts/seed-recruitment-demo.js` (2 employers, 2 candidates, 5 jobs, 3
applications, 9 job functions — idempotent, safe to re-run). Schema shipped as
`lib/db/schema-migrations/0002_add_recruitment_tables.sql` +
`0003_add_recruitment_notification_columns.sql` (existing DB: `npm run migrate-schema`;
fresh DB: `npm run setup-pg-schema` already includes it) — see §7 for what running these
against a real Postgres instance actually caught.

Tests: `backend/test/jobs.unit.test.js` + `applications.unit.test.js` (pure validation
logic, no DB) and `backend/test/recruitment-store.integration.test.js` (round-trips every
new collection through the real store — the one that caught the bugs in §7). Run with
`npm test` from `backend/`. Not covered yet: HTTP-layer integration tests (the routes
themselves were verified manually via curl during this build, not via an automated
suite — `index.js` doesn't currently export `app` separately from its `listen()` call,
which a proper supertest-style suite would need; DIRECTORY.md flags the same "no
automated tests" gap for the whole app, not something unique to Recruitment).

Admin: employer approve/suspend exists; there is **no dedicated job-moderation queue**
(unlike Directory's AI-verification pending-review list) — jobs default straight to
`status:"active"` and an admin can already `PUT /api/jobs/:id` to pause/close one, which
covers "stop a bad posting" without a full review queue. Add one later if volume
warrants it.

### Phases 2+3 — Frontend: employer + candidate flows
✅ Mostly done (2026-08-24), built together in one pass rather than sequentially (the
user asked for "all possible pages" — landing, browse, detail, post-job, employer
profile — before the dashboard, not a strict employer-then-candidate split). Built:
`lib/types.ts`/`lib/api.ts` Recruitment sections; `components/recruitment/` (`JobCard`,
`JobFilters`, `JobResults`, `RoleSearchBar` — the sentence-style hero search, this
build's signature element per the `frontend-design` pass); real `/recruitment` landing
(replaces `ComingSoon`), `/recruitment/jobs` browse/search, `/job/[id]` detail with
login-gated apply (reuses `ContactAuthModal`), `/post-job`, `/employer/[slug]`. A
**minimal** `/recruitment/dashboard` also landed early — profile management only
(become-employer / edit employer profile, candidate profile builder) — because
`/post-job` and applying both need a profile to exist; it is *not* the full tabbed
shell §4 describes (My Jobs / Applications / Company Story / Blogs / Reviews tabs are
still future work, deferred by explicit request this session).

Visual design deliberately does **not** reskin Directory: `--tricolor-green` (already
documented as Recruitment's module color in `frontend-design-guide.md`, just not
previously used on a real button) is the accent throughout, job cards are a role-first
list (not Directory's image-tile grid), and `Navbar`'s Directory-page detection
(`lib/directoryPaths.ts`) and account-menu gating were extended so these pages get the
suite nav + a "Recruitment profile" menu link instead of Directory's chrome — a real
integration gap caught before it shipped, not a hypothetical one.

**Not yet built**: `GET /api/employers/:slug`'s reviews (RECRUITMENT.md always intended
these via the existing generic `reviews.json` — no UI surfaces them yet), company
story/blogs surfacing on the employer profile page.

#### Home page v2 + nav scroll-dock + self-serve ads (2026-08-24, same day, follow-up pass)
User feedback on the first landing page pass: wanted more of a real destination (took
hirist.tech as a reference point), a rotating "live" hero moment, search suggestions,
Directory's nav-collapses-and-a-search-bar-docks-on-scroll behavior extended to
Recruitment, and a way for employers to run their own sponsored placements. Built:
- **Hero signature moment**: the H1 now cycles through role titles ("Find your next
  role as a **Software Engineer / Sales Executive / …**"), CSS keyframe + React-key
  remount (no animation library), `prefers-reduced-motion` respected.
- **`RoleSearchBar` suggestions**: a dropdown of curated "Popular searches" + the
  fetched job-function catalog, filtered client-side as you type — no per-keystroke
  network call (deliberately, the demo job dataset is too small for live title
  matching to be useful; see the file's header comment).
- **Nav scroll-dock for Recruitment**: mirrors Directory's `HomeHero`/`Navbar`
  pattern exactly. `lib/searchDock.tsx` gained its own `roleQuery`/`roleCity` fields
  (kept separate from Directory's `query`/`city` — one provider is mounted app-wide,
  so sharing fields would leak Directory's typed text into Recruitment's role field on
  navigation between products; `progress` IS shared since only one hero is ever
  mounted at once). `/recruitment`'s hero publishes scroll progress via the same
  `IntersectionObserver` shape as `HomeHero.tsx`; `Navbar.tsx` now branches between
  `DirectorySearchBar` and a compact `RoleSearchBar` based on `inRecruitmentContext`,
  and the suite Products/Blog/About row is hidden on Recruitment pages the same way
  it's hidden on Directory pages.
- **New home sections**: "Companies hiring now" (logo chips deduped from the
  currently-fetched featured roles — no new endpoint), a static "Career guides" 4-card
  section (curated placeholder copy, links to `/blog` — no new content model was
  built; replace with real authored guides whenever there's content for it), and a
  sponsored-ad slot.
- **Self-serve ads for Recruitment**: reused Directory's existing `POST/GET
  /api/my-ads` pipeline (pending → admin review → served by `routes/ads.js`) rather
  than building a parallel one — that endpoint is keyed on `req.user.id`, not on
  `sellerProfile`, so it already worked for employer-only users once the placement
  whitelist (`backend/routes/myAds.js`'s `PLACEMENTS`) grew two new values:
  `recruitment_home`, `recruitment_search_top`. Directory's own self-serve UI
  (`AdvertiseTab.tsx`, `/dashboard?tab=advertise`) stays **unreachable** for a
  Recruitment-only user (it's `sellerOnly` in `DashboardShell.tsx`), so a matching
  minimal creation form (image + headline + link + placement + dates, no "promote a
  listing" option — employers don't have listings) was added directly to
  `/recruitment/dashboard`'s employer section instead, keeping Recruitment's
  dashboard self-contained per §4. `AdSlider` (existing component, unchanged) renders
  both placements on `/recruitment` and `/recruitment/jobs`; admin's Ads tab can also
  book either placement manually.
- **Bugs caught and fixed during this pass's own screenshot verification** (see
  §7 for the pattern of "always screenshot, tsc doesn't catch these"): a mobile
  (390px) flexbox bug where `.rsb-input`'s base `flex: 1` (⇒ `flex-basis: 0%`) beat
  the `@media (max-width: 480px)` block's `width: 100%` override, leaving the input
  and city select shrink-wrapped side-by-side instead of stacked (fixed with
  `flex: 1 1 100%` in the breakpoint); `/recruitment/jobs`'s own inline
  `RoleSearchBar` was rendered uncontrolled even though the page reads `q`/`city`
  from the URL, so navigating there with a query left the visible input empty despite
  results being correctly filtered (fixed by wiring it to the page's existing `q`/
  `filters.city` state). A third apparent bug (an SSR/client styled-jsx class-hash
  hydration mismatch on `/recruitment`) turned out to be a stale `next dev` process
  still bound to the port from an earlier restart attempt that silently failed with
  `EADDRINUSE` — not a code bug; a clean process restart resolved it. Worth
  remembering: on Windows, `lsof -tiTCP:<port> | xargs kill` (the Linux-oriented
  restart one-liner earlier in this doc / CLAUDE.md) can silently no-op, leaving the
  old process listening — verify with `netstat -ano | grep ':<port>'` and
  `taskkill //PID <pid> //F //T` if a "restarted" dev server doesn't reflect new
  changes.
- **Explicitly still true**: login-gating on "Apply now" (`app/job/[id]/page.tsx`'s
  `handleApplyClick`, gated on `useAuth()`'s `user` via `ContactAuthModal`) was
  already built in the original Phases 2+3 pass above and was re-verified working
  during this session, not rebuilt.

### Role lock, apply-flow overhaul, ad management, tabbed dashboard (2026-08-24, later same session)

Built against a standalone enhancement spec the user supplied (repo-root "Recruitment —
Additional Product Improvements & Flow Enhancements.md", 30 sections) — explicitly framed
as an enhancement layer, not a rebuild. Investigated the existing implementation first
(3 parallel research passes over the user/profile model, the apply flow, and the ads/
dashboard/stories infra) before writing any code; most of what the doc asked for already
existed (cover note, `statusHistory`, `resumeUrl` snapshotting, fully public/unauthenticated
ad viewing, generic stories/blogs/reviews routes keyed on plain `user.id`, a PDF-capable
upload endpoint) — the gaps closed this pass:

- **Recruitment role lock** — new `users.recruitmentRole` (`"candidate"|"recruiter"|null`)
  + `recruitmentRoleLockedAt` columns (migration
  `0004_add_recruitment_role_and_questions.sql`, mapped in `lib/db/users.js`'s
  `USER_COLUMNS`). `POST /api/me/recruitment-role` selects while unlocked; the lock itself
  is set the moment the first `become-employer` or `PUT /me/candidate` call actually
  creates a profile (not on selection) — matching the doc's "select → complete profile →
  submit → locked" sequence. Once locked, the opposite endpoint 403s, `POST /api/jobs`
  403s a locked-candidate, `POST /api/applications` 403s a recruiter. **Behavior change**:
  `POST /jobs`'s old lazy `minimalEmployerProfile` auto-stub (posting a job silently
  created a company-name-less employer profile) was removed — it would have bypassed role
  selection entirely, and the doc's own conflict-resolution rule ("Conflicts with existing
  behavior → apply this enhancement requirement") calls for exactly that. Posting a job now
  403s with `code: "employer_profile_required"` if `!employerProfile`.
- **Mandatory CV before applying** — turned out to reduce to *just* the CV: registration
  (`ContactAuthModal.tsx`) already hard-requires name + a 10-digit mobile, so those two are
  never actually missing for a logged-in user. `POST /api/applications` 400s with
  `missing: ["resume"]` (plus defensively `"name"`/`"mobile"`) if
  `!candidateProfile.resumeUrl` and no `resumeUrl` was supplied inline. New
  `components/recruitment/ResumeUpload.tsx` (PDF-accepting sibling of `ImageUpload.tsx`,
  same `/api/uploads` primitive, which already accepted `application/pdf` up to 10MB from
  an earlier pass) is wired into both the candidate profile tab and inline into the apply
  flow itself, so a candidate can upload without leaving the modal.
- **Recruiter-defined per-job questions** — new `jobs.questions` / `applications.answers`
  `jsonb` columns (same precedent as `applications.status_history`: small, append-style,
  never queried on its own). `POST/PUT /api/jobs` validate `{id, text, required}` items
  (≤20, ≤300 chars each, server-assigned ids). `POST /api/applications` 400s
  `missingQuestions` if a required one has no answer. New `QuestionsEditor` in
  `components/sell/editors.tsx` (same row-editor shape as `RateCardEditor`) on `/post-job`.
- **Apply flow overhaul** — extracted out of `job/[id]/page.tsx`'s inline `Modal` into
  `components/recruitment/ApplyModal.tsx`: login gate (unchanged) → CV check (skipped if
  already on file) → recruiter questions (skipped if the job has none) → cover note →
  review → submit. `handleApplyClick`/the apply CTA now also hides entirely for a
  `recruitmentRole === "recruiter"` account (browsing stays allowed, applying doesn't —
  doc's rule #4/#12).
- **`/post-job` now doubles as the edit form** — `?jobId=` prefills every field (owner
  fetch-and-check; a non-owner gets a "you can't edit this job" screen) and submits via
  `updateJob` instead of `createJob`.
- **Ad management: recruiter-only + edit/pause/delete** — `myAds.js`'s `POST /` now 403s a
  non-recruiter for any `recruitment_*` placement (Directory's own placements are
  untouched — any authenticated user can still self-serve those, unchanged). New
  `PUT/DELETE /api/my-ads/:id` (owner-or-admin, mirrors `blogs.js`'s edit/delete shape;
  `PUT` only allows toggling `active`↔`paused`, not `pending`/`booked`, which stay
  admin-owned). **Bug found and fixed along the way**: creating a `recruitment_home` /
  `recruitment_search_top` ad failed with a Postgres FK violation
  (`ad_bookings_ad_slot_id_fkey`) — the earlier session that widened `myAds.js`'s
  `PLACEMENTS` allowlist never added matching rows to `ad_slots`, so self-serve Recruitment
  ad creation had been broken since it was "built," just never exercised past the UI form
  (only ad *viewing* had been screenshot-tested). Fixed by adding the two missing rows to
  `backend/DB/ad-slots.json` and inserting them into the live `ad_slots` table.
- **The Recruitment dashboard is now a real tabbed shell** —
  `components/recruitment-dashboard/RecruitmentDashboardShell.tsx`, structurally mirroring
  `DashboardShell.tsx`'s `TabMeta[]`/`useMemo`-filter/`?tab=` URL-sync pattern but as its
  own component tree (per this doc's own dashboard-architecture rule). Tabs: Overview
  (client-side stat cards off `getMyJobs`/`getMyApplications`, no new endpoint), My Jobs +
  Applications (recruiter-only) / My Applications (candidate-only, unconditional per the
  doc), Profile (Company or Candidate depending on role), Stories/Blogs/Reviews (reused
  **directly** — confirmed during research they're already generic on `user.id`, only
  optionally enriching with `sellerProfile` fields, so an employer user works unmodified),
  Advertise. `/recruitment/dashboard/page.tsx` itself now only owns the role-selection gate
  (a two-card chooser shown once, hidden after the profile locks) and hands off to the
  shell.
- **Verified end-to-end via curl before any frontend work**: role-select → profile-submit
  → lock → opposite-role-endpoint 403; job-post-without-employer-profile 403;
  apply-without-CV 400; apply-as-recruiter 403; apply-with-missing-required-question 400;
  non-recruiter creating a `recruitment_home` ad 403; ad edit/pause/delete lifecycle. Then
  `npx tsc --noEmit` clean after every phase, and a real-browser Playwright QA pass across
  the role-lock flow, apply flow (with and without an existing CV/questions), job
  post-then-edit-with-questions round trip, and 390px layout checks on the touched pages.
- Not built this pass (still open, not part of this spec's core business rules): the
  "Home page enhancement" section (§21 of the enhancement doc) — the existing landing
  page's companies-hiring rail, career guides, and ad slot already cover most of what it
  asked for; a dedicated "recruitment guide"/"platform benefits" content section and a
  reviews rail were judged lower priority than the role-lock/apply-flow/ads work above and
  left for a future pass.

### Phase 4 — Production gating switch
🔲 **Not started — and now the important caveat**: §5's plan assumed `/recruitment`
would keep showing `ComingSoon` until this flag existed. That assumption no longer
holds — `/recruitment` now serves the real landing page directly, unconditionally, per
this session's explicit request to build it out now. `components/suite/SuiteNavMenu.tsx`
still hardcodes `status:"soon"` (untouched), so the nav's "Products" dropdown still
says "Soon" — but anyone who reaches `/recruitment` by URL, a search engine, or a
shared link sees the live, in-progress product today, not a placeholder. If keeping it
fully dark until an explicit go-live decision still matters, treat wiring
`featureFlags.recruitmentLive` (§5) as more urgent than this doc's original phase
ordering implied — it's no longer a pre-launch nicety, it's the only thing currently
standing between "in development" and "publicly reachable."

### Deferred (explicitly out of scope for this build)
- Unified admin panel managing Directory + Recruitment data together.
- A dedicated job-moderation review queue (see Phase 1 note above — basic admin capability exists).
- SQL-level WHERE-pushdown for `GET /api/jobs`/`GET /api/applications` — both fetch via
  `store.findMany` and filter/paginate in JS, matching Directory's own current approach
  (deferred there too, per `POSTGRES-MIGRATION.md`). The schema ships fully indexed so this is
  cheap whenever it happens; `limit` is hard-capped at 50 server-side in the meantime so an
  unbounded `?limit=` can't force a huge in-memory sort/response.
- Monetization enforcement (job-post limits, application quotas) beyond field stubs — mirrors Directory's
  "admin-controlled revenue levers" model but isn't wired to billing yet.
- Notification delivery beyond in-app rows (email/SMS/WhatsApp) — same gap Directory has today
  (`lib/notify.js`), not a new one.

---

## 7. Gotchas the next dev must know

- **Restart the backend after backend edits** — plain `node index.js`, no hot reload (same as Directory).
- **Demo/seed ids must NOT look like `<prefix>_000001`.** `store.nextId(prefix)` (both backends) generates
  ids as `<prefix>_000001`, `<prefix>_000002`, … from a persisted counter that seed scripts calling
  `store.insert` with a pre-set `doc.id` never advance. The first version of
  `seed-recruitment-demo.js` used `job_000001..5` / `app_000001..3` and a real `POST /api/jobs` call
  collided with the seed data on the very first real job post (`23505 duplicate key`). Fixed by using a
  non-numeric namespace (`job_demo1`, `app_demo1`, …) — the same convention Directory's own demo seeds
  already use (`usr_cat_*`, `usr_svc*`), for exactly this reason.
- **A `lib/db/flat.js` column-map entry is not enough on its own** — the actual `CREATE TABLE`/
  `ALTER TABLE` column has to exist too. Adding `data_job_id` etc. to `notifications`' nested-field
  config in `flat.js` without also adding those columns to the `notifications` table
  (`schema-migrations/0003_add_recruitment_notification_columns.sql`) meant every
  `createNotification(...)` call for a new application / status change failed — silently, because the
  call sites are deliberately fire-and-forget (`.catch(() => {})`, matching `notifySellerOfLead`'s
  best-effort shape). No in-app notification would ever have arrived. Caught by
  `test/recruitment-store.integration.test.js` calling `createNotification` directly, not by any route
  test — a reminder that a fire-and-forget path needs its own explicit test, since a failure there never
  surfaces through the request/response cycle that would normally catch it.
- **`CURRENT_ROLE` is a reserved Postgres keyword** — `candidateProfile.currentRole` maps to the column
  `current_position`, not `current_role` (the latter fails `setup-pg-schema`/`migrate-schema` with a
  syntax error). The JS-level field name is still `currentRole` throughout routes/seed/frontend; only the
  SQL column differs.
- **Nested-object boolean columns must be nullable, not `NOT NULL DEFAULT`.** `jobs.location.remote` and
  `jobs.salaryRange.isDisclosed` are flattened via `nestedToRow`/`nestedFromRow` (`lib/db/util.js`), which
  assigns SQL `NULL` for an omitted field rather than substituting a default (unlike `docToRow`'s
  top-level path). A `NOT NULL DEFAULT false` column there rejects the insert the moment a caller omits
  the field. Route code treats `NULL` as falsy/defaulted on read instead. Same nullable convention
  `seller_profiles`' nested `performance` columns already use.
- **`employer_profiles`/`candidate_profiles` deliberately have no `created_at` column** — mirrors
  `seller_profiles`, which also has none; the account's own `users.created_at` already covers it. An
  earlier draft added one as `NOT NULL DEFAULT now()` with no code ever setting it, which would have
  failed every real `become-employer`/candidate-profile-create call — caught the same way as the
  notifications gap above, by the integration test exercising a real insert before any route did.
- **`GET /api/jobs/mine` ≠ the public browse** — mirrors Directory's `/api/me/listings` trap: the public
  endpoint should only surface `status:"active"` jobs from approved employers; the dashboard must hit the
  `/mine` endpoint or a pending/suspended employer sees "0 jobs".
- **Contact fields are gated server-side, not client-side** — `contactMobile`/`contactEmail`/
  `contactPhone` must be stripped in the route handler based on `optionalAuth`'s `req.user`, exactly like
  `publicSeller(user, includeContact)`. Don't just hide them in the UI.
- **Don't reuse `listings.json`/`inquiries.json`** — see §1's divergence note. New collections, same
  `store.js` interface.
- **Don't add tabs to `DashboardShell.tsx`** — Recruitment's dashboard is a separate component tree under
  `/recruitment/dashboard` (§4).
- **Nested admin routers mount BEFORE the blanket `/api/admin` guard** (`backend/index.js`) — same
  pattern as Directory's boosts/entitlements/categories. Any Recruitment admin sub-API follows it.
- **Design rules are enforced** — no emojis (inline SVG only), native `<select>` filters, local images
  only, zero 390px overflow, `en-IN` ₹ formatting for salary display. (CLAUDE.md §2/§6.)
- **`request<T>()` in `frontend/lib/api.ts` drops top-level `meta`** — use a raw fetch if a Recruitment
  endpoint ever needs to return `{data, meta}`.
- **`/api/uploads` is image-only** (`MIME_EXT` in `backend/routes/uploads.js:22-29` — PNG/JPEG/WebP only,
  5 MB cap). Résumé upload needs `application/pdf` added there (and likely its own size cap / upload
  subfolder) — do this as a small, scoped edit to the existing file, not a parallel upload system.
- **A visible Recruitment page ≠ nav visibility.** Flipping `SuiteNavMenu`'s status hides the link but a
  direct URL still reaches the real page unless every Recruitment page/route itself also checks
  `featureFlags.recruitmentLive` (§5) and renders `ComingSoon` when it's off. This is easy to half-do —
  gate the landing page and forget `/job/[id]` or `/post-job` are reachable directly.
- **Reviews/stories/blogs are already generic — don't build new collections for them.** `reviews.js`
  keys off `targetUserId` (§2); `stories.js`/`blogs.js` only require `authGuard`, not a `sellerProfile`.
  All three work for an employer author today. Their denormalization (`stories.js:89-91`,
  `blogs.js:38-50`) currently only reads `u.sellerProfile` for the author badge/name — extend it to also
  check `u.employerProfile` so an employer's story/blog shows a company badge instead of none. That's the
  only change needed in those two files; the create/read/delete logic is untouched.
