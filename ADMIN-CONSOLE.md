# ADMIN-CONSOLE.md — the product-scoped Admin Control Center

Companion doc to CLAUDE.md, in the same spirit as RECRUITMENT.md/DIRECTORY.md: architecture decision +
phase checklist for the `/admin` restructure, kept current as phases land.

---

## 1. Why this changed

`/admin` (`frontend/app/admin/page.tsx`) was a single flat left-nav of 16 tabs covering Directory and
suite-wide concerns together, with no way to add a Recruitment (or future Credit Card / Mutual) admin
surface without the list growing indefinitely and mixing unrelated products' controls in one flat list.

**Decision: keep the single, app-wide `/admin` entry point** (unchanged — `Navbar.tsx` treats Admin as
app-wide by design, same as Dashboard), but give it a **two-level internal nav**: a section switcher
(**Global · Directory · Recruitment · Credit Card · Mutual**) and, within the active section, that
section's tabs. This mirrors the precedent Recruitment's own dashboard already set
(`RecruitmentDashboardShell.tsx` as a separate shell from `DashboardShell.tsx`, specifically to avoid one
shared tree accumulating cross-product conditionals) — applied to admin's internal nav instead of a second
entry point.

Rejected alternative: entry point depends on which product you're browsing (profile icon inside
`/recruitment` → Recruitment admin). Rejected because (a) it reverses `Navbar.tsx`'s documented "Admin is
app-wide" decision, and (b) an admin needs to configure a product (approve the first employers, seed
taxonomy) *before* it's public — making admin access depend on browsing that product risks hitting
`RecruitmentGate`'s "Coming soon" wall just to reach the tools meant to take it live.

## 2. Section map

| Section | Tabs | Notes |
|---|---|---|
| **Global** | Overview, Users, Payments, Entitlements, Features, Site Config | No single-product data dependency. |
| **Directory** | Users, Categories, Collections, Plans, Boosts, Verification, Reports, Listing AI Check, Sellers (legacy, unlinked from visible sub-nav — same as before), Ads, Content (Blogs & Stories) | Ads/Content moved here as Directory-scoped instances once Phase 5 lands (see §4). |
| **Recruitment** | Users, Employers, Jobs, Taxonomy (Skills/Job Roles/Job Functions), Ads, Content (Blogs) | Built incrementally, Phases 2-5. |
| **Credit Card / Mutual** | — | Empty "not built yet" placeholder; those products don't exist beyond a coming-soon page. |

**Users is one component, three scopes** (Phase 7). `components/admin/UsersTab.tsx` takes a `scope` prop — `global` (every account + hats + account-status), `directory` (buyers + sellers), `recruitment` (employers + candidates). All three list off one endpoint, `GET /api/admin/users?scope=…`, and every row links to the shared full-detail page `/admin/users/[id]` (see §5). The legacy **Employers** tab stays for now (superset lives in Recruitment › Users); **Sellers** stays unlinked as before.

## 3. Two confirmed bugs found and fixed along the way

- **`moderation.js`'s content-moderation queue showed "Unknown" as the author for any Recruitment
  employer's blog.** `sellerLookup()` only ever checked `u.sellerProfile`, never `u.employerProfile` —
  `blogs.js`'s own `attachAuthors()` already handled both correctly, so only the *admin* view was broken.
  Fixed by extending the lookup to fall back to `employerProfile`, same shape as `blogs.js`.
- **`stories.js`'s public-feed author enrichment had the same gap** — an employer-authored story (recruiters
  do get a Stories tab in their dashboard per RECRUITMENT.md, reusing `StoriesTab.tsx` unmodified) silently
  lost its author link/verified badge on the public feed. Same fix shape applied.

## 4. Phase checklist

- [x] **Phase 1** (2026-08-25) — Shell restructure (two-level nav), all 16 existing tabs moved unchanged
      (Ads/Moderation into Directory as-is for now). Verified via headless browser across all 19
      section/tab combinations: correct active-state highlighting, zero console errors, zero horizontal
      overflow at 390px, and the unlinked `sellers` legacy tab still reachable via `#directory:sellers`.
- [x] **Phase 2** (2026-08-25) — Recruitment: Employers tab (`EmployersTab.tsx`), `GET /api/admin/employers`
      (all, optional `?status=`) added alongside the existing `/pending`. Verified end-to-end with network
      logging: list/filter, approve, and suspend all call the right endpoints and persist correctly.
- [x] **Phase 3** (2026-08-25) — Recruitment: Jobs tab (`JobsAdminTab.tsx`), new `GET /api/admin/jobs`,
      reuses existing `PUT /api/jobs/:id` for pause/activate/close. No review-queue state machine
      (deliberately deferred per RECRUITMENT.md). Verified: pause persists and correctly drops the job from
      public browse; no console errors; no 390px overflow.
- [x] **Phase 4** (2026-08-25) — Recruitment: Taxonomy CRUD (Skills / Job Roles / Job Functions) — three
      new admin routes (each with a GET / returning inactive rows too, needed to reactivate a soft-deleted
      one) + one tab (`RecruitmentTaxonomyTab.tsx`) with an inner switcher. Verified: create, list,
      deactivate (shows Inactive pill), and delete all confirmed server-side; new skill appears in the
      public `GET /api/skills` read.
- [x] **Phase 5** (2026-08-25) — Split Ads and content Moderation by product: fixed the two author-lookup
      bugs (§3, confirmed via a test employer blog — went from "Unknown" to the real company name); added
      `product` prop to `AdsTab.tsx`/`ModerationTab.tsx`; mounted Directory (unchanged, verified byte-for-
      byte same form fields) + new Recruitment instances. **One deviation from the original plan, discovered
      mid-build:** no job picker for Recruitment ads. `ad_bookings.listing_id` has a DB foreign key straight
      to Directory's `listings` table (`schema.sql`) — a job id can't be stored there without a schema
      migration, which is out of scope for this restructure. Recruitment ads get an employer picker
      (`sellerId` — that FK is generic to `users`, so this works) and no listing/category pickers; the
      existing free-text "Click-through URL" field covers linking a specific job manually. Ad slot inventory
      stays unsplit — a slot is just a name+size+placementType, not tied to either product in the data
      model. Verified: booking form shows exactly the right fields per product (recruitment placements +
      employer picker + no category/listing for Recruitment; unchanged for Directory).
- [x] **Phase 6** (2026-08-25) — Full functionality sweep across all 23 section/tab combinations (every
      Global/Directory tab + all 5 new Recruitment tabs + the two empty placeholder sections). `tsc --noEmit`
      clean throughout. Caught and fixed one real regression along the way: `routes/moderation.js`'s
      `GET /verifications` (seller GST/PAN queue) still called the old `sellerLookup()` name after the
      Phase 5 rename to `authorLookup()` — a 500 on the Verification tab, now fixed. Final sweep: zero
      overflow at 390px, zero console errors, zero server errors, across every tab.

Out of scope, checked and deliberately not touched: the employer profile page (`/employer/[slug]`) not
showing the employer's blogs — that's an existing, explicitly-commented deferral ("dashboard-adjacent,
deferred"), not something this restructure needed to fix.

- [x] **Phase 7** (2026-08-27) — Users: one directory, three scopes + a full detail page + account-level
      suspend.
  - **`GET /api/admin/users`** gained `scope=global|directory|recruitment`. `type` now filters by hat
    (`buyer|seller|employer|candidate|admin`), not just user-vs-seller. Each row carries `hats[]`,
    `accountStatus`, and trimmed `employerProfile`/`candidateProfile` slices. `summary` counts per hat +
    `suspended`. `status` filters `sellerProfile.status`, or `employerProfile.status` in recruitment scope.
    Back-compat: old `type=user|seller` still works; `accountType` still on every row.
  - **`GET /api/admin/users/:id`** (new) — one account, all four profile blocks + cross-product activity
    counts (listings, RFQs sent, jobs posted, applications sent/received, reviews written/received).
  - **`POST /api/admin/users/:id/suspend` · `/reactivate`** (new) — sets `users.status`
    (`0012_add_user_status.sql`). A suspended account is blocked at `middleware/authGuard.js` (403
    `account_suspended` on every authenticated request), at login and OTP verify, and degrades to guest
    under `optionalAuth` so public pages still render. **Admin accounts and your own account can't be
    suspended.**
  - **Frontend:** `UsersTab.tsx` takes `scope`; mounted three times (Global/Directory/Recruitment ›
    Users). Rows link to **`/admin/users/[id]`** — a full page (not a modal) with a Back button to the
    originating list, sections per hat (Account & roles / Directory seller / Recruitment employer /
    Recruitment candidate), the activity strip, per-hat approve/reject/suspend + plan & monetization
    (ported from the old Users-tab modal), and the account Suspend/Reactivate control.
  - Verified end-to-end via admin token: all three scopes list + filter (candidates now visible),
    detail shape, suspend → target's `/api/auth/me` 403s + login blocked while public `/api/jobs` stays
    200, reactivate restores, suspending an admin 400s. `tsc --noEmit` clean; `/admin` +
    `/admin/users/:id` both 200.
