# Bharat Navya — canonical handoff

Updated: 1 October 2026 (end of the long design session; see section 0)

Official branch: `design`

Official application: `frontend/`

Official committed checkpoint: the current tip of `origin/design`; verify it with `git rev-parse origin/design` before continuing.

Current implementation state: Mahir feedback reconciliation, the `feature/design-integration` merge, search repair, and the 1 October live UI-polish requests are committed to and pushed on `origin/design`. The latest polish includes the Ask Navya glow, blue selected Recruitment tab, compact Counter-styled international phone picker, side-by-side mobile login methods, centred guest-account reminder, and About in the shared desktop/mobile navigation. Deployment and backend integration remain developer-owned work outside this design handoff.

Continuation note: if the current Codex task appears visually blank, start a fresh task in this repository and read `AGENTS.md` followed by this file. Do not assume the blank task pane means the working tree was lost; confirm with `git status --short` and continue from the scoped local changes documented here.

Git identity: `itbharatnavya <314251907+itbharatnavya@users.noreply.github.com>`

This is the single continuation source of truth for current Bharat Navya product and visual work. Read it after `AGENTS.md`. `HANDOVER.md` is legacy engineering/setup context only; the tracked `Design/` Vite tree is a frozen reference and must not be used as the implementation target.

## 0. Current working state (1 October 2026, end of the long design session)

**Read `DESIGN-SYSTEM.md` first for any UI work** (after `AGENTS.md`). It is the single source of truth for colour, type, radius, spacing, CTAs and components, and it overrides older style notes in section 5 below and in `CLAUDE.md` / `DESIGN.md` (no orange cards, no green except success, white cards on the light-blue page, one amber primary CTA, round white icon-only close buttons).

### Git and where things are

- Worktree: `~/.codex/worktrees/design-integration-merge/BharatConnect`, branch `codex/design-integration-merge`.
- **On `origin/design` (pushed at the owner's request):** `fe23af9` "Redesign heroes, header and catalog pages". That already contains the header and popup work, hero rebuilds, feed band, category marquee, HeroStage, floating header, docked-search flight, ListingCard, Categories page and the earlier handoff.
- **Local only, not pushed yet:** `a2fed6d` (checkpoint), `06301ab` (Recruitment live + radius/type token migration), `099d929` (amber highlight, contrast fixes, contrast audit script), `128c39d` (Home hero stage route colours, amber "The B2B platform" title, this handoff). Push only when the owner says so, and only to `origin/design`.
- `tmp/phone-audit.mjs` is an untracked stray from earlier work; never commit it.

### Runtime

- **Frontend (port 3000):** `cd frontend && BACKEND_URL=http://localhost:4000 npm run dev`. Next 14.2 + Turbopack dev is flaky after hot reloads: you may see `TypeError: Cannot read properties of null (reading 'useContext')` or old output on some routes. It is the dev server, not the code. Fix: stop it, `rm -rf .next`, start again (or run `npx next dev` without Turbopack). No env flag is needed for Recruitment any more.
- **Backend (port 4000):** `node index.js` in `backend/`. On this branch it requires Postgres (`PG_URL` in the git-ignored `backend/.env`); local DB `bharatnavya`. Load order: `npm run setup-pg-schema`, `npm run migrate-all`, `npm run seed-recruitment-demo`, `npm run seed-demo-stories`, `node scripts/seed-demo-ads.js`, then the Directory blogs. `migrate-all` fails for `inquiries`, `blogs`, `leads-ledger`, `quotes` and **deletes rows not in the JSON files**: re-running it wipes the seeds, so re-seed in the same order afterwards. Production cannot reach a local backend (section 9); the developer wires the real database.

### What the latest stretch changed (all in the frontend)

- **Recruitment is live:** `RecruitmentGate` is a pass-through (the old "Coming soon" screen belonged to the earlier suite build).
- **Colour system:** page `--canvas #dce9fb`; white surfaces; blues by purpose (`--counter-indigo` active/selected, `--counter-green #2556c8` Directory surfaces, `--counter-sky`, `--counter-focus`, `--counter-indigo-soft`); **one amber highlight `--counter-highlight #ffbe2e` for every primary CTA** and the Home title accent; green only for success/verified; legacy `--counter-saffron` / `--action` now alias the primary blue. Scoped exception: on the Home hero stage the Directory card is green `#0b7a52` and the Recruitment card is amber.
- **Type and radius scale enforced:** 7 font sizes (`--fs-xs` 12px to `--fs-3xl`), radii `--r-xs/sm/md/lg/pill` plus circle. A migration mapped about 1,400 declarations in CSS and TSX; Tailwind `text-*` and `rounded-*` map to the same steps. All hero titles use `--fs-3xl`.
- **Dropdowns:** `components/DropdownEnhancer.tsx` (mounted in `app/layout.tsx`) replaces every `<select>` popup with a themed list (filter box above 10 options); the select stays the source of truth. `data-native` opts out.
- **Filters:** `components/Filters.tsx` and `components/recruitment/JobFilters.tsx` share `.flt*` styles (applied chips, switches, chip price/rating, show more, bottom sheet on phones). `/search` has a list/grid toggle (`UnifiedListingWorkbench`), the ad sits below the results, and the hero is the Directory blue.
- **Listing preview pane** (`lp-*`): price first, plain facts list, round white close. **Listing page:** Save is an icon beside the badges, smaller title, hashtags removed, one-accent seller card, photo-first on phones with a fixed "Contact seller" button.
- **Company profile** (`/seller/[slug]`, `.cp-*`) rebuilt: stats, work evidence second, facts, offers via `ListingCard hideSeller`, contained ad, sticky inquiry card. About / Pricing / Blog / career guides moved into the inset rounded shell. Offer, Features, About, Home heroes now share the same title size.
- **Floating widgets:** assistant bubble on every page except sign-in and admin; `FloatingRfqButton` ("Post requirement", amber) stacked above it on Directory pages.
- **Directory / Recruitment landings:** products section sits below categories with compact `ListingCard` tiles; the "From what you need…" step sections were removed; Home hero stage cards are distinct (white, green, amber, pale).
- **Legibility:** every sub-12px text size raised; `--faint` darkened to `#54627a`; blue-surface text fixed (Home contrast board, closing bands, pricing plan, pressed tabs). `frontend/scripts/contrast-audit.mjs` lists text below 4.5:1 per page (usage at the top of the file; needs headless Chrome on :9333). Last run: 0 groups on the 20 key pages.

### Gotchas

- **Do not use `bn-stage*` class names** (a legacy rule in `bharat-navya-home.css` styles `.bn-stage span`); the hero stage uses `bn-hstage-*`.
- `lib/routePresentation.ts` `ROOT_ROUTES` must list every folder under `app/` that is not a category; any other first path segment is treated as a category page (floating header, Directory pill).
- CTA contract is a long `:is(...)` list at the end of `counter-soft-system.css` with `!important`. Add new CTA classes to that list instead of restyling buttons locally. Rules with a higher-specificity blanket link colour (for example the Offer hero) need an explicit override.
- When appending or replacing blocks in `counter-soft-system.css`, never replace "from marker to end of file": that once silently dropped later rules. Parse all stylesheets with PostCSS (`postcss.parse`) after bulk edits.
- `living-evidence.css` `.le-hero > .le-shell { z-index: 1 }`: stacking rules need a parent selector and matching media-query specificity.
- The `.counter-directory-page > section` rule gives every top-level section a card treatment; non-card sections opt out explicitly.

### Waiting on the owner

1. **Workspace pages** (dashboards, admin, Sell, Post-job, Profile) were only touched through tokens and have not been reviewed; the owner will provide credentials so they can be restyled and checked.
2. **Sponsored-slot placement** on brand, category and other pages (only `/search` moved below results): owner will say.
3. Directory vs Recruitment are both blue (owner: leave for now). Whether the Home stage route colours (green Directory, amber Recruitment) should also colour the route landing heroes is undecided.
4. The Recruitment hero "Search jobs" button renders as a tall amber block beside the stacked fields; slimmer?
5. Older sections still below the new category block (six service families on Directory, role families on Recruitment); category rows repeat cards because each has only 4; hover text colours are still removed (owner request, temporary, see `git log`).
6. Push the local commits to `origin/design`.

## 1. Start here in a new session

1. Read `AGENTS.md`, then this file.
2. Confirm the official target is `origin/design`. The currently attached managed worktree uses `codex/design-integration-merge`; its verified commits are pushed with `git push origin HEAD:design`. A normal continuation checkout may instead be on local `design`.
3. Run `git status --short` before editing. Preserve unrelated dirty files.
4. Work in `frontend/`. Do not implement current UI work in the archive.
5. Use the project `frontend-design` and `impeccable` skills for visual/UI work; read each selected skill completely before acting.
6. Inspect the rendered browser state at desktop and mobile sizes. A passing build is not visual acceptance.
7. Stage only the files belonging to the current task. Push only to `origin/design` and never merge, rebase, or force-push another branch without explicit approval.

## 2. Official workspace map

| Path | Status | Purpose |
| --- | --- | --- |
| `frontend/` | **Official / active** | Next.js 14 application. All current product-design implementation belongs here. |
| `backend/` | Active contract, normally out of scope | Express API and data contracts. Preserve unless backend work is explicitly requested. |
| `Website content (Feni)/` | Source material | Approved content PDFs. Do not edit or commit them as part of frontend work. |
| `Design/` | **Frozen tracked reference** | Legacy Vite prototype retained at its original Git path for historical comparison. Never run, import, or implement product work here. |
| `archive/legacy-ui/root-vite-artifacts/` | Local-only ignored archive | Old root `dist/` and `node_modules/` artifacts moved out of the working root in this checkout. It is not committed or a source tree. |
| `HANDOVER.md` | Legacy reference | Older setup/backend notes. It does not override this handoff. |

The current product is not the frozen Vite prototype. If a legacy document conflicts with `frontend/`, `AGENTS.md`, or this handoff, the active `frontend/` code and this handoff win.

## 3. Git and working-tree state

- The verified implementation is on `origin/design`. The current managed worktree branch is `codex/design-integration-merge`; verify its `HEAD` against `origin/design` instead of relying on a copied SHA in this document.
- The reconciliation and search-recommendation repair are available on GitHub in `origin/design`.
- Do not report the current work as publicly deployed until the deployment SHA and production routes have been verified.
- The account configured in this checkout is `itbharatnavya`, as requested.
- Recent official checkpoints:
  - `2c01e52` — audit and unify frontend visual system
  - `9bbd41d` — complete visual direction across secondary pages
  - `3d404fc` — integrate Feni content across public frontend
  - `72b9fa4` — integrate live search suggestions
  - `aace218` — polish Bharat Navya frontend experience
  - `c0d34ee` — merge `feature/design-integration` while retaining the approved single-ad brand layout
  - `72b5f2b` — add the breathing glow around the full Ask Navya card
  - `70ab222` — use blue for the selected Recruitment navigation tab
  - `b61a21b` — show only the dial code in the compact phone selector while retaining country names in its dropdown
  - `69873fb` — centre the guest-account reminder in the viewport
  - `355030b` — add About to the shared desktop and mobile navigation
- Pre-existing dirty files outside this handoff task include product/design documents, Feni PDFs, and backend JSON fixtures. They belong to prior/user work. Do not reset, replace, or sweep them into an unrelated commit.
- In particular, do not casually commit `backend/DB/*`, `Website content (Feni)/*`, `DESIGN.md`, `HANDOVER.md`, `MIGRATION-CAPABILITY-MATRIX.md`, `PRODUCT-DESIGN-MIGRATION.md`, or `frontend-design-guide.md` merely because they appear in `git status`.
- The approved frontend requirements and acceptance criteria for the current pass are in `frontend/docs/MAHIR_FEEDBACK_RECONCILIATION_SPEC.md`.
- `HANDOVER.md` is modified only to identify it as legacy and point here; that pointer is included with this handoff update.

### Search-integration finding

- The expected recommendation work was present on `origin/feature/design-integration` but was not in the ancestry of `design`; merge base was `2c01e52`.
- Relevant integration commits included `c77ff8f` (search suggestions and dropdown clipping), `93e6bab` (category suggestions route into the current search filter), and `fc42ae0` (unified search flow and removal of the stale Home dock).
- The repair was ported surgically into the active working tree rather than merging the feature branch over the current dirty frontend.
- Recruitment employer suggestions originally depended on a backend free-text behavior absent on `design`. The frontend now combines the existing supported `q=` and `company=` job queries, so employer recommendations work without any backend or API-contract change.

## 4. Product boundary and data rules

- Public navigation is **Home, Directory, Recruitment, About**.
- Directory is one services-and-products discovery journey. Companies are the providers behind those listings, not a third listing type.
- Preserve existing authentication, search, inquiry, job, application, seller, employer, candidate, story/status, blog, and advertising contracts.
- Use live/API-generated companies, listings, products, jobs, blogs, statuses, ads, and genuine empty states. Do not replace them with convenient static fixtures.
- Statuses use the stories/status endpoint (`seller` for Directory, `employer` for Recruitment), never the blogs API. Blogs remain a separate content source.
- Do not call several interchangeable stories/blog endpoints at once to populate one surface.
- Do not imply checkout, guaranteed enquiries, instant capabilities after signup, or persisted success when the backend does not support it.
- Editorial language uses **“B2B platform,”** not “B2B marketplace.” Prefer “review and shortlist” over unsupported side-by-side comparison claims.

## 5. Binding visual direction

- Current direction: the Bharat Navya **Counter** system, translated into the active product rather than copied from the old prototype.
- Display type: **Anek Latin**. UI/body type: **Work Sans**.
- Core palette: indigo/blue hero, green Directory ownership, saffron action/Recruitment ownership, warm ivory/chalk surfaces, dark ink, cool raised workbench surfaces.
- Flat, intentional colour fields; no generic gradients.
- Ordinary buttons, inputs, cards, modals, panels, and section containers share the current rounded-edge system. Pills and circles are shape exceptions only when they have a semantic reason.
- Use shared tokens and primitives. Do not create page-specific header sizes, radii, gutters, search controls, or button systems to patch one screen.
- The shared public header must look and measure consistently on every route. Fix section spacing in the section, not by forking the header.
- CTA colour must contrast with its container. No blue-on-blue hero actions, hidden white text, or same-colour cards that disappear into the background.
- Keep section gaps consistent between hero, status/ad band, content, ads, and results. Avoid both touching containers and arbitrary one-off margins.
- Subtitles are optional. Do not add explanatory copy where the heading/control is already self-evident.
- Suggested-search chips are centred when they fit and horizontally scroll only when required.
- Mobile is a deliberate reading order, not compressed desktop columns. Selected listing/job detail expands with the clicked card rather than appearing as an unrelated container elsewhere.
- Promotions must be clearly labelled and visible without competing with the primary task. Media may never cover ad copy, CTA, or disclosure.

Primary live style sources:

- `frontend/app/globals.css`
- `frontend/app/counter-direction.css`
- `frontend/app/counter-soft-system.css`
- `frontend/app/counter-workspace.css`
- shared components under `frontend/components/`
- `frontend/docs/COUNTER_VISUAL_DIRECTION.md` when present

## 6. Completed product and UI work

### Shared system and full-surface audit

- The visual direction now covers public, authentication, profile, seller/employer/candidate, listing/product, job, workspace, admin, and create-product surfaces rather than only the landing pages.
- Legacy-looking route families were bridged into the current typography, palette, spacing, radius, control, and surface hierarchy.
- The latest audit checked 80 public/auth route states across desktop and mobile, plus 50 admin states and 64 workspace states, without hard render failures in the audited environment.
- Admin tables, toolbar controls, seller/employer workspaces, pricing admin calls, auth viewport fit, and overflow-prone secondary pages received targeted repairs in the latest checkpoint.
- Dropdowns and search suggestions use the Counter border, radius, ivory surface, focus, typography, and icon treatment rather than browser-default or legacy styling.
- A shared arrow-only `BackToTop` control is mounted from the root layout. It appears on the right after approximately 600px, sits above the lower-right Navya AI Agent to avoid overlap, retains an accessible label and keyboard focus, and respects reduced motion.
- Public footer and login context surfaces use the Counter indigo rather than black backgrounds. Registration keeps its green route ownership.
- The product mark uses the selected BN-arrow asset at the existing public URL; the Chakra and proposed tagline are not displayed.
- The floating helper is consistently named **Navya AI Agent** in visible and accessible copy. It is limited to the public hub routes defined in `ChatAssistant`; dense category, company, listing, employer, and job routes do not receive a conflicting floating assistant.
- The shared header now exposes Home, Directory, Recruitment, and About on desktop and in the mobile menu. About uses a clear selected state; Recruitment uses the approved blue selected state.

### Home `/`

- `HomeAgent` is the hero **Ask Navya** discovery/search experience. It is visually and conceptually distinct from a conventional listing search box.
- The compact suite layout has a smaller Navya card and right-side Directory, Recruitment, and Growth OS cards. Growth OS is marked **Coming soon**.
- Ask Navya opens a conversational modal. Its stack must remain above all page media while the page or modal scrolls.
- Home exposes **Ask Navya** as its only AI entry point. The stale `UniversalDockedSearch` and its Home scroll/dock state were removed, so scrolling no longer replaces the navigation or disables the current Ask Navya experience.
- The separate bottom-right **Navya AI Agent** is used only on the allowed supporting hub routes. Do not merge it with Ask Navya.
- Directory is green; Recruitment is saffron. Recruitment must not blend into the blue hero or become a black card.
- The former oversized “Clarity follows the whole decision” section is a smaller, focused journey rather than multiple competing cards.
- A clearly labelled promotional surface and current blog content remain intact.
- The homepage no longer carries the blog-card preview; that editorial preview now belongs to About so Home stays focused on product discovery and the decision journey.
- The full Ask Navya card has a restrained breathing glow around its outer container. The reduced-motion path remains static.
- The outlined container around the four suite cards and the One / Four / Before ledger strip were removed (owner request, 1 October 2026).

### Directory home `/directory`

- Feni-approved page content is integrated while preserving live data sections.
- The hero and docked search use local drafts and provide grouped, API-backed category, company, and product/service recommendations with keyboard selection. A partial typed query is not committed to shared state until submit or selection.
- Suggestion choices route to the current filtered `/search`, `/seller/:slug`, or `/listing/:id` destinations rather than legacy category/list routes.
- Hero (`components/discovery/LandingHero.tsx`, owner-supplied ofbusiness.com layout reference in Counter styling): no subtitle; headline, a compact search (lens first, arrow-only submit) and four short API-backed category chips sit over a pausable local-photo slideshow underlay (a route-colour scrim keeps the copy legible; holds on hover/focus/hidden tab, static under reduced motion; no caption tag). Three neutral route cards (Search / List your business / Promote) straddle the bottom edge. On tablet and phone the photo moves below the copy, full-bleed, with the cards as a swipe row over its edge.
- The status strip, promotion and **Browse by category** (`CategoryShowcase`) share one grid (`.bn-feed`): short strip top-left (4.75rem bubbles, white card), tall promotion on the right, and the category heading nestled beneath the strip beside the promotion joined to the full-width body as one L-shaped card (rounded tab, straight side, rounded inside corner via a `::before` fillet on the body; on Directory the group list and photo rise `--feed-rise` into the tab while the sub-category list stays lower under the promotion). Stacks on phones. Category body (`CategoryShowcase`): two auto-scrolling image-card rows (top right-to-left, bottom left-to-right; 8 live categories or job functions, sorted by listing count on Directory, ). Each row renders four copies for a seamless loop; it plays by default (owner decision: no pause button), hovering/focusing pauses it, and reduced-motion users get plain scrollable rows. The `All categories` button in the heading is the only browse-all link. Omitted entirely when the API returns no categories. The older six hard-coded service families section still follows it.
- Company statuses use `getStories("seller")`. The rail is bubbles only on a white (ivory) card: no title, subtitle or unseen dot. When there is no active status it is not rendered at all and the boosted placement takes the full row (owner decision, 1 October 2026).
- Service families, providers, products, journey, company insights, closing CTA, ads, and API listings remain present.

### Recruitment home `/recruitment`

- Feni-approved page content is integrated and role-family descriptions map to live API categories without renaming API labels/routes.
- The hero and docked search provide grouped job-family, role, and employer recommendations with keyboard selection. Employer matching uses the existing `company=` jobs filter alongside the ordinary `q=` role search.
- Hero (`components/recruitment/RecruitmentHero.tsx`) is deliberately different from Directory: no subtitle; headline, role search (two rows, one tall submit) and job-function shortcuts on the left, a live "Latest roles" board (real API jobs, hidden when empty) on the right, and two audience paths (Find your next role / Post a job). **Browse jobs by function** shows every active job function as an image card.
- Hiring statuses use `getStories("employer")`; blogs/updates are separate. Same strip/promotion/function-card layout as Directory (the function cards are the L body), strip hidden when empty.
- Fresh roles, hiring companies, application journey, updates, closing profile section, ads, and live job behavior remain present.

### Directory results `/search`

- Services and products are consolidated into one results experience.
- Before selection, the listing ledger takes roughly two-thirds and filters take one-third; detail is not open by default.
- Selecting a listing opens the centre detail pane and compresses the ledger. On small screens detail expands inside the selected card.
- Basic filters are immediately visible; fuller filters remain available without a redundant second “Filters” heading.
- The search hero uses a distinguishable raised surface with a white field.
- The result promotion is separated by the shared gap. The desktop filter rail is shorter with a labelled ad below it.
- Search recommendations expose categories, companies, products/services, and a final free-text search action using live data.
- The `UnifiedListingWorkbench` URL-sync effect now skips no-op replacements and no longer races genuine suggestion navigation. Verified recommendation clicks leave `/search` for the intended seller/listing route.
- The results header explicitly permits the suggestion menu to overflow, preventing the dropdown from being clipped by the rounded header surface.

### Recruitment results `/recruitment/jobs`

- Job hover/selection uses an outline/highlight rather than filling the whole card blue.
- Hero, promotion, and results use the shared gap.
- The desktop filter rail has a labelled recruitment ad below it; mobile retains the filter sheet without forcing the rail ad into the list.
- Mobile role detail expands within the selected role card.

### Detail, account, and operational routes

- Category/city, brand, collection, listing/product, seller/company, employer, job, candidate/profile, Create Product (`/sell`), post-job, pricing, login/register, admin, seller dashboard, and recruitment dashboard routes were included in the secondary-page visual pass.
- Login and registration are designed to fit a normal desktop viewport with balanced top/bottom space and no unnecessary page scroll; re-check at actual viewport sizes after auth changes.
- Seller/company hero media and metrics use intentional spacing rather than touching.
- Category routes use the unified Directory workbench without the legacy List/Grid toggle or duplicated filter bar.
- Listing detail spacing is corrected around the share/report sidebar and labelled advertising. Recommendations prefer distinct real listing imagery, use an honest missing-image treatment when necessary, and include suggested listings without floating-control overlap.
- Company profiles restore separate Services, Products, Work evidence, and Reviews sections with API-backed data and truthful empty states. Internal scroll constraints were removed, ad spacing was increased, and the inquiry card no longer overlaps its CTA.
- Directory and Recruitment status rails use circular story controls and are hidden entirely when no status is active. `backend/scripts/seed-demo-stories.js` now seeds active demo statuses with a far-future expiry (`SEEDED_STATUS_EXPIRES_AT`) so the rails stay populated pre-launch; remove it and re-seed to restore the 24-hour demo lifetime.
- Login and registration use a full-height desktop context panel without unused strips above or below it; mobile controls retain a minimum readable input size.
- Login includes the frontend presentation and integration hook for the developer-owned Google Identity Services flow. Only Google is exposed; Facebook and Apple remain absent. The control appears only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured. Backend endpoint behavior, credentials, persistence, and deployment acceptance remain outside the UI scope.
- Feni content was integrated into Home, Directory, Recruitment, About, Navya Blog, Pricing, Login, and Register while preserving behavior and localization boundaries.
- About now includes an API-backed preview of up to four current blog posts before its closing actions. The cards use a dense responsive grid: four across on wide screens, three at intermediate desktop widths, two on tablet, and one on narrow phones. The full `/blog` route and blog API remain unchanged.
- The country selector in shared phone fields shows only the selected dial code when closed and uses a compact width sized for supported codes. Its opened list is a bounded, scrollable Counter-styled panel with full dial-code plus country-name labels, visible selection/focus states, outside-click dismissal, and keyboard navigation.
- Mobile OTP and Email & password remain equal-width tabs in one row on narrow login layouts instead of stacking and consuming extra vertical space.
- The feed-band promotion is image-only (`imageOnly` on `ApiAdvertisingSlot`/`AdvertisingSlot`): the whole card is the ad photo and one link, with the headline shortened to the part before the dash overlaid on a legibility scrim, the Sponsored label top-left and the dots top-right; no separate text area or button.
- `ApiAdvertisingSlot` now rotates up to 5 ads from its placement every 4 seconds (fade, dots, holds on hover/focus/hidden tab, first ad only under reduced motion) on every page that uses it; the headline reserves three lines so the layout does not jump. `seed-demo-ads.js` adds two untargeted `category_top` ads and `seed-recruitment-demo.js` a fifth `recruitment_home` ad so both landing slots have 5.
- Search suggestions sit above the hero action cards/paths. Note `living-evidence.css` sets `.le-hero > .le-shell { z-index: 1 }`; the new hero stacking rules use a parent selector to outrank it, and their media-query counterparts must keep the same specificity.
- The docked-header location chip opens its "Keep exploring" search popup directly below the header (all widths) instead of as a bottom sheet.
- Hover text-colour changes are removed everywhere for now (owner request, 1 October 2026): 19 `:hover` rules in `counter-direction.css`, `counter-soft-system.css` and `globals.css` lost their `color` declaration (rules that also cover `:focus-visible` or selected/active states keep colour for those, via a companion rule) and every Tailwind `hover:text-*`/`group-hover:text-*` class was stripped. Background, border and shadow hover effects are unchanged. A hover-and-compare check across Home, Directory, Recruitment, Search, Pricing, Login, Sell, Categories, About and Blog found no remaining colour changes. To restore, use `git diff` on those files.
- The delayed guest-account reminder now opens the shared `ContactAuthModal` (the same sign-in/register modal used for contact and apply gates, `purpose="account"`) instead of its own card. Timing and the 7-day dismissal are unchanged.
- When the search docks into the desktop header, the hamburger opens a dropdown anchored under it (previously the menu toggled but stayed `display:none` above 899px).
- `lib/categoryImages.ts` maps categories to photos chosen by content: several `/demo` file names do not match their images (see the comment there).

## 7. Verification evidence and how to re-check

Evidence recorded for the reconciliation:

- `npm run validate:design` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `/`, `/directory`, `/search`, `/recruitment`, and `/recruitment/jobs` returned HTTP 200 after the build.
- Live browser checks confirmed Directory category/company/listing suggestions, keyboard selection into filtered results, Recruitment employer suggestions, workplace dropdown submission into filtered jobs, Counter-themed dropdown/select styling, no horizontal overflow in the checked Directory state, and correct navigation to real seller and employer records.
- Live browser checks confirmed Home keeps Ask Navya after scrolling and no longer mounts the stale universal search dock.
- The frontend development server was restarted after the production build and restored on port 3000.
- Full final screenshot approval is still pending. Do not treat these automated and targeted checks as the owner's visual approval.

Evidence recorded for the Google UI/auth/footer/back-to-top follow-up:

- `npm run validate:design`, `npx tsc --noEmit`, `npm run build`, the Impeccable detector, and `git diff --check` passed for the UI checkpoint.
- Desktop and mobile browser checks confirmed the login context panel fills its intended space without black backgrounds or horizontal overflow; the public footer is indigo.
- Source re-check on 2026-09-30 confirmed the public login context panel is Counter indigo, registration is Counter green, and the public footer is Counter indigo. The auth form card remains light; do not reintroduce black card or section backgrounds in these public/auth surfaces. Dark ink is still intentionally used for text, buttons, media viewers, and internal/admin states where it is not a card or page background.
- The back-to-top control is arrow-only and sits at the bottom-right immediately to the left of the Navya AI Agent; the assistant component and its position are unchanged. It is hidden on initial load, appears only after the visitor passes the bottom edge of the page's first content section, hides again when the visitor manually returns above that boundary, and disappears immediately when clicked while the smooth return completes. It retains the accessible `Back to top` name and is hidden while the assistant panel is open.
- Directory search recommendations rendered from live data in the themed dropdown, and selecting `Coaching & Tutoring` navigated to `/search?category=coaching-tutoring`.
- The final bounded visual pass covered `/`, `/directory`, `/search`, `/recruitment`, `/recruitment/jobs`, `/about`, `/login`, and `/register` at 1440×900, 390×844, and a 720×450 200%-zoom equivalent. No document-level overflow or browser-console errors were found. Ask Navya, mobile navigation, search recommendations, mobile inline detail, the About blog grid, footer, auth layouts, and back-to-top behavior were checked in the rendered app.
- Live Google authentication, backend implementation, credentials, deployment, and production API smoke testing remain developer-owned and are not UI acceptance criteria for this checkpoint.

Evidence recorded for the guest/account, international-phone, and advertising follow-up:

- Guest visitors now receive one non-modal, dismissible account reminder only after two minutes plus meaningful browsing (a second public route or 35% scroll depth). Auth, dashboard, admin, onboarding, and account routes are excluded; dismissal is respected for seven days and the prompt never steals focus.
- Login, registration, and the contact/apply auth modal share one country-aware phone field. Indian numbers preserve the existing 10-digit backend contract. International entries are normalized to E.164-format payloads only when `NEXT_PUBLIC_INTERNATIONAL_PHONE_ENABLED=true`; until the developer completes provider and backend validation support, the UI states that limitation and blocks a misleading OTP attempt.
- Results advertising is consolidated to one clearly disclosed placement per page context. Repeated in-feed/sidebar stacks were removed from shared Directory/brand results, and the duplicate Recruitment results-rail placement was removed. Organic order, verification, filters, and backend ad contracts are unchanged.
- `npm run validate:design`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Browser checks covered desktop and 390px auth layouts, country selection/validation, guest-prompt dismissal and fixed-control spacing, a single `/search` ad placement, no repeated result ads, no horizontal overflow, and no console errors.

Evidence recorded for the final back-to-top correction (`be9dfa9`):

- `npx tsc --noEmit`, `npm run validate:design`, `npm run build`, the Impeccable detector, and `git diff --check` passed.
- Live Directory checks confirmed the control is absent at the top, appears only after the hero/top section has been passed, sits beside the unchanged AI assistant on desktop and 390px mobile, disappears immediately after activation, and disappears when manually scrolling back above the top-section boundary.
- Commit `be9dfa9` is pushed to `origin/design`.

Evidence recorded for the Feni-content and Mahir-feedback source audit (2026-10-01):

- All 12 pages across Feni's four supplied PDFs were rendered and checked against the active `frontend/` implementation. Home, Directory, Recruitment, About, Navya Blog, Pricing, Login, Register, and the shared footer retain the approved content and hierarchy; several shortened Directory, registration, and footer passages were restored to the supplied meaning.
- Mahir's complete available WhatsApp export was reviewed directly: typed feedback, all 14 image attachments, all 17 video attachments, and the existing voice-note review record. The implemented UI reflects the confirmed feedback on borders, alignment, text hierarchy, logo treatment, restrained non-black public surfaces, Directory scanability, Recruitment location/workplace clarity, Navya AI naming, and the Axay-requested back-to-top behavior.
- The raw Blog API failure text was replaced by a calm, branded public error state. About and Pricing closing surfaces now use Counter indigo instead of near-black, and mobile public footers reserve enough bottom space for the unchanged assistant plus back-to-top controls.
- A fresh desktop/mobile browser pass covered `/`, `/directory`, `/recruitment`, `/about`, `/blog`, `/pricing`, `/login`, and `/register` at 1440×900 and 390×844. The document width stayed within the viewport on every audited route; spacing, text wrapping, fixed-control clearance, and footer layout were checked from rendered output.
- The only unresolved design/product choice remains the exact Directory highlights content and counts. Parth said he will confirm that choice separately, so no unsupported metrics or highlights were invented. Google credentials/backend persistence, international OTP/provider support, deployment, and production API acceptance remain developer-owned.

Evidence recorded for the `feature/design-integration` merge (2026-10-01):

- The integration branch was merged into `design` from an isolated worktree so the unrelated dirty backend and documentation files in the original checkout were not overwritten.
- The branch contains substantially more than the chat and pagination notes: product-linked chat UI, Socket.IO/FCM notification support, Google authentication/backend hooks, Vercel backend support, a PostgreSQL modular-backend migration, security/query work, tests, refreshed seed media, and related frontend integrations.
- One content conflict occurred in `frontend/app/brand/[slug]/page.tsx`. It was resolved by retaining the developer's 12-item pagination while preserving the approved single labelled ad placement; the branch's repeated sidebar/in-feed ad stack was not restored.
- `npm run validate:design`, `npx tsc --noEmit`, `npm run build`, JavaScript syntax checks, and `git diff --check` passed after resolution. The backend architecture-only checks passed, but the database-backed suite could not run in this environment because `PG_URL_TEST`/`PG_URL` is not configured; it requires the developer-owned disposable PostgreSQL test database.
- Dependency audit remains follow-up work: the merged lockfiles currently report frontend and backend advisories, including a critical advisory against the current Next.js line and Firebase-related transitive advisories. No automatic major-version upgrade was attempted during the merge.

Evidence recorded for the live UI-polish follow-up (2026-10-01):

- Ask Navya glow, Recruitment selected-state colour, compact phone selector, centred guest reminder, and About navigation were each checked in the rendered local app at desktop and mobile widths.
- The phone selector rendered `+91` in the closed field while its native options retained labels such as `+1 · United States` and `+44 · United Kingdom`.
- About was confirmed in both the desktop header and opened mobile menu, with `/about` receiving the selected state.
- `npm run validate:design`, `npx tsc --noEmit`, `npm run build`, the Impeccable layout detector, and `git diff --check` passed for the completed polish commits.
- The frontend preview was restored at `http://localhost:3000` after the latest build. The backend was not running locally, so expected `/api/*` proxy failures remain outside this frontend-only verification.
- The final auth-control follow-up confirmed side-by-side login tabs and the compact country trigger in the rendered mobile layout. The custom country list was checked visually on login and registration; Arrow Up/Down, Home/End, Enter/Space, Escape, focus return, outside click, accessible names, selected-state announcement, and bounded scrolling are implemented in the shared component used by login, registration, and contact/apply auth.

Run these from `frontend/` after changes:

```bash
npm run validate:design
npx tsc --noEmit
npm run build
```

Then run from the repository root:

```bash
git diff --check
```

Important: stop the Next dev server before `next build`; both use `.next` and can corrupt or hide runtime state. Restart the dev server after a build, then inspect the real pages at approximately 1440×900 and 390×844. Check focus states, keyboard navigation, menus, modals, dropdowns, text wrap, clipping, horizontal overflow, sticky/fixed controls, empty/loading/error states, and long API content.

## 8. Local runtime

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Expected local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Browser calls `/api/*` through the frontend proxy; port 3000 is the site, port 4000 is the API.

On this branch the backend needs Postgres (`PG_URL` in the git-ignored `backend/.env`); without it `node index.js` exits at startup. See section 0 for the local database, the seed order, and the `migrate-all` warning.

Verify both before judging missing statuses, blogs, jobs, listings, ads, or suggestions.

## 9. Deployment truth

- Frontend project: `https://bharat-navya.vercel.app`.
- Do **not** assume Vercel represents the latest source checkpoint without verifying the deployment SHA.
- Production is not fully functional while `/api/*` is configured to reach `localhost:4000`; Vercel cannot reach a backend running on the local Mac.
- Missing production statuses, blogs, jobs, listings, ads, or other API sections are therefore a backend-hosting/configuration issue, not permission to replace them with static data.
- Hosting remains a separate decision: deploy the backend publicly (for example Railway) or deliberately configure a Vercel-compatible backend, then set `BACKEND_URL` and re-run production smoke tests.
- Do not claim production acceptance until public API routes and authenticated/live-data flows are verified.

## 10. Remaining work / next priorities

Open owner questions from the 1 October afternoon session are listed in section 0. No immediate auth UI request remains from this pass. The scoped product choice still pending is the exact Directory highlights content and counts, which Parth is reviewing and will specify separately. Do not invent or redesign that content until the decision is supplied. Preserve Ask Navya as the Home experience and Navya AI Agent as the supporting-route helper unless Mahir explicitly changes their product roles. International OTP provider/backend validation, Google credentials, hosting, deployment, dependency remediation, database-backed test configuration, and production API smoke testing are developer-owned and intentionally excluded from this design continuation.

## 11. Non-negotiable hygiene

- Never use destructive Git commands or discard dirty files to obtain a clean tree.
- Never work from or import the frozen `Design/` Vite prototype.
- Never update old UI and active UI in parallel.
- Never solve a shared-system inconsistency with a private page fork unless a real product reason exists.
- Never call a build-only check proof of responsive correctness.
- Never hide absent API data with fabricated content.
- Never push to anything except `origin/design` without explicit approval.
- Keep commits scoped and name exactly what was verified.


## Landing pages rebuild (Directory, Recruitment, About)
- Directory and Recruitment keep their hero, status strip, ad and category strip; everything below is now three sections each: `components/directory/DirectorySections.tsx`, `components/recruitment/RecruitmentSections.tsx`, shared closing `components/discovery/StoriesCta.tsx`. Styles `.ps-*` at the end of `counter-soft-system.css`.
- Recruitment hero is now a two-sided "apply and track" scene (`RecruitmentHero.tsx`, `.bn-rmatch*`), not a roles list. Old `.bn-rhero-board*` CSS is unused.
- About is `components/about/AboutSections.tsx` (`.ab-*`); old `counter-support-*` About CSS and `components/about/AboutBlogPreview.tsx` are unused.
- Demo articles: `node backend/scripts/seed-blogs-demo.js` (12 posts, covers for the original four). Uses `lib/pg-store`, idempotent.
- Home, Directory, Recruitment and About all use GSAP through `components/home/useStory.ts`; see DESIGN-SYSTEM.md section 10.

## Page-specific scenes (replaces the generic "attraction kit")
Each page tells its own story; there is deliberately no shared feature-card template.
- Directory (below the category strip): `ProductShowcase` (tabs + asymmetric grid), `RfqScene` (one requirement fans out, quotes come back; scrubbed), `StorefrontScene` (pinned: a seller profile builds itself in four steps).
- Recruitment (below the function strip): `TrackerScene` (five application stages + sticky phone), `RoleFinder` (live count of matching roles from `getJobs` totals), `HireScene` (post a role, ranked matches, shortlist; scrubbed).
- Home: proof band, pinned product showcase, `PulseScene` (live feed of newest products, roles, articles), closing.
- Styles: `.rfq-*`, `.sf-*`, `.trk-*`, `.rf-*`, `.hire-*`, `.pulse-*` at the end of `counter-soft-system.css`. Old `.cmp-*`, `.feat-*`, `.art-*`, `.stairs-*`, `.cta-banner` CSS was removed.
- Price and candidate figures in RfqScene and HireScene are sample data and are labelled as such.
- `node backend/scripts/backfill-job-workplace.js` sets a workplace type on demo jobs (the seed only sets `remote`), so the On-site / Hybrid / Remote filters return results. Run it after `seed-recruitment-demo.js`.
- GSAP gotcha: do not tween an element that also has a CSS `transition` on the same property (opacity); tween its container instead (see the comment in `TrackerScene`).
