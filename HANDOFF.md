# Bharat Navya — canonical handoff

## START HERE (updated 13 October 2026)

If you are a new Claude/Codex session picking this up, read this block first, then `AGENTS.md`, `DESIGN-SYSTEM.md`, and the dated "what changed" blocks at the end of this file (newest last). Older sections (0 to 11) are history; where they disagree with this block, this block wins.

**Where the work lives**
- Repo: `mahir-bharat/BharatNavya` on GitHub. Work branch: `design`. The owner and dev pull `design` and deploy it (Vercel production `bharatnavya.vercel.app` was confirmed serving `design` builds on 5 Oct). Never push anywhere except `origin/design`; never touch `main`.
- The dev works on `origin/feature/design-integration` and regularly merges `design` into it. When asked to "take pull from design integration", fetch it, check `git rev-list --count origin/feature/design-integration..HEAD` is 0 (then it is a fast-forward), stash local edits, `git merge --ff-only origin/feature/design-integration`, pop the stash. Afterwards: `npm install` in `frontend/` if `package.json` changed, `npm run migrate-schema` in `backend/` for new files in `backend/lib/db/schema-migrations/`, restart both servers with a clean `.next`.
- Working copy: the Codex worktree `/Users/parthus/.codex/worktrees/design-integration-merge/BharatConnect` (local branch `codex/design-integration-merge`), pushed with `git push origin HEAD:design`. The main checkout `/Users/parthus/Documents/ChatGPT/BharatConnect` is stale (many commits behind, with uncommitted changes) and the owner said to leave it untouched.
- "Deploy" from the owner means: commit and push to `origin/design` so the dev can pull. Commit messages end with a `Co-Authored-By` line.
- Push auth: the active `gh` account on this Mac is the personal `Parthuss`, which cannot see the repo ("Repository not found"). The `itbharatnavya` account is also logged in. Push with it for the one command without switching the default, e.g. `T=$(gh auth token --user itbharatnavya); git -c credential.helper= -c credential.helper="!f(){ echo username=itbharatnavya; echo password=$T; }; f" push origin HEAD:design`. Never print the token.
- When a change touches `backend/`, tell the owner the dev must redeploy the backend too (7 Oct: the featured-sellers payload gained fields the company cards need).

**Run it**
- Backend: `cd backend && node index.js` (port 4000, Postgres via `PG_URL` in git-ignored `backend/.env`). Restart after backend edits.
- Frontend: `cd frontend && BACKEND_URL=http://localhost:4000 npm run dev` (port 3000). If you see `Cannot read properties of null (reading 'useContext')` or hydration mismatches, kill port 3000, `rm -rf frontend/.next`, start again.
- Admin login: `admin@bharatsource.in`; password is in git-ignored `backend/.admin-credentials.local` (reset with `node backend/scripts/reset-admin-password.js`). Never print or commit it.
- Checks: `cd frontend && npx tsc --noEmit` must be clean. Verify in the browser at 390px and 1440px (no sideways scroll).

**Owner's standing preferences (follow without being told)**
- One navy for every CTA, active pill and blue surface: `#12307e` (hover `#1b3fa0`). `--counter-indigo` and `--counter-green` both resolve to it now. Amber only for small highlights, never CTAs.
- White cards on the light-blue canvas `#dce9fb`; nothing full-bleed white or black; every page gets the same gap under the floating header and the same section rhythm (`--counter-section-gap`).
- No prices on listing cards; no Product/Service tag on cards. Lens icon in every search field. No emojis. Text never touches a rounded edge (proper padding).
- Ads: small tiles (filter rail bottom third, under floating side cards on detail pages), between listings on phones, never a big block at the top.
- Show work visually: check in the browser pane at phone and desktop width before saying it is done; the owner reviews by screenshots and is quick to spot overlaps, uneven spacing, off-centre icons and colour mismatches.
- Keep this handoff updated and pushed when asked "handoff updated?".

**Open threads right now**
- Header logo redesign (exploration only, not on the platform): `frontend/public/logo-options.html` (uncommitted, view at `http://localhost:3000/logo-options.html`). Owner likes **6B** (logo in the centre of the bar, bar cut around it) and **7B** (logo at the left, bar starts after it with a curved end), both with **no white disc** behind the logo. Geometry lives in the `.cbar.is-notch` rules: logo size `--s`, cut radius `R = 0.649 x s + gap` (0.649 is the measured enclosing-circle ratio of `bharat-navya-logo.png`), bar height `2R - trim`. Owner asked for generous space between logo and bar and centred nav. Next step when they choose: build it into `components/Navbar.tsx`.
- Untracked on purpose in `frontend/public/`: `logo-options.html`, `hero-bg-options.html` (first homepage hero background board, superseded), `hero-bg-abstract.html` (9 Oct: 18 live abstract hero backgrounds in three rounds: 1-7 abstract, 8-12 minimal (owner liked 5 glass and 7 contours), 13-18 business-centric for Mahir; OWNER STILL CHOOSING, build nothing until they pick), `logo-blend-options.html` (the 7 to 8 Oct logo-blend board: six concepts plus 2A to 2D; 2B was built), plus `header-3d-options.html` and `logo-3d-options.html`, which were not made by the Claude session and whose author/purpose is unknown. Do not commit them under `public/` (they would become live pages).
- Growth OS is in the Products menu as a muted non-link tile (`UPCOMING` in `Navbar.tsx`), hover tooltip "Coming soon"; the owner did not want a visible "Coming soon" tag there. When it gets a route, move it into `PRODUCTS`. The homepage hero card still shows its own "Coming soon" label (left as is).
- Advertise (header) links to the seller dashboard's Advertise tab via sign-in; non-sellers land on Profile to become a seller first. A no-account "apply to advertise" form would need a new endpoint plus an admin view; offered, not requested.
- Desktop root font size only scales **down** on small or zoomed laptops (capped at 16px, see 8 October block). Ask Mahir to confirm on his laptop that the ad no longer cuts off; the 13px floor means very short windows still show less.
- Unverified: dashboards after the white-sheet removal (needs a signed-in check), card redesign in list view and phone widths, Recruitment landing spacing, the `/categories` hydration warning.

---

Updated: 6 October 2026 (see START HERE above and the dated blocks at the end)

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


### 2 to 5 October 2026: what changed since the section above

Everything below is pushed to `origin/design` (tip `cbaca5b` at the time of writing). The Home India map (Natural Earth outline) is committed.

**Platform-wide**
- **CTA colour:** primary buttons are now dark blue (`--counter-cta` `#12307e`, hover `--counter-cta-hover`, edge `--counter-cta-edge`, label `--counter-on-cta` white). On blue surfaces they invert to white with a dark-blue label (rule at the end of `counter-soft-system.css`; add `is-on-blue` or the container to that list). Amber (`--counter-highlight`) is kept only for small accents (title highlight, badges, stars). This supersedes the "one amber CTA" wording in `DESIGN-SYSTEM.md`.
- **Floating chrome:** "Post requirement" is a bookmark tab on the right edge (`.rfq-tab`, icon only, label slides out on hover/focus) just above the assistant bubble. Back-to-top takes the corner when it appears and the bubble steps left (`.navya-agent-dock`).
- **Footer:** white card, no Directory/Recruitment block.
- **Header BN mark:** always drawn from colour layers in `public/brand/bn-*.png` (the plain PNG only reserves the space and is invisible); every 5s the swoosh layers wipe in again. Nothing is swapped, so it can never vanish. Off for reduced motion.
- **Home:** the four hero cards start their animation on hover and replay while hovered; the sponsored ad was removed from Home; connected-hub icons are no longer clipped.
- **Listing cards:** no prices on cards (preview pane and listing page still show them); Contact and info buttons sit in the top row (`.lcard-top`); the kind label hides by card width via a container query (`.lcard` is a `lcard` container), so it never sits under the buttons in narrow grids.
- **Ads on category and brand pages:** the big banner is gone. Category pages show a small tile under the filters (`railAd` prop of `UnifiedListingWorkbench`, `.dlw-rail-ad`); brand pages show one in the sidebar under the "Can't find it?" card (`.brand-aside-ad`). Both hide when there is no ad, and phones get a tile after the results.
- **Status strip (Directory/Recruitment):** two rows, no names, first bubble is "Add your story" (guests get the sign-in modal; signed-in users go to the dashboard Stories tab). Demo stories: 28 companies and 15 employers (`node backend/scripts/seed-demo-stories.js`).
- **Results toolbars and job pages:** flat toolbar header, equal-height controls, round list/grid switch; job detail sections are cards; hiring timeline fixed; page-level ads align with the footer.
- **Audit fixes:** ghost shadow boxes behind scene sections and the employer hero removed, list rows keep four borders, minimum 12px small text, wrapping CTA text on phones. Mobile fixes for card actions and for the search page where selecting a listing used to reveal the filter rail.

**Listing flow (`/sell`) rebuilt for first-time sellers**
- Steps: What (one plain field plus Product or Service), Category (suggestions from `lib/categorySuggest.ts`, browse tree on request), Details (photos first, name and description, price, optional extras behind `MoreOptions`, location). Business name is asked only when the account has no seller profile (`becomeSeller` is called on publish). Success screen with next steps. Styles are `.sl-*` at the end of `counter-soft-system.css`; the old `.counter-sell-page` and `.counter-listing-*` rules are no longer used by this page.
- `/login` and `/register` show listing-specific copy when `next` starts with `/sell`.
- **Two approvals:** a listing is public only when the listing is approved AND the seller profile is `approved` (seller approval lives on `/admin/users/:id`). The admin listing review now shows "Seller pending" and warns on approve (`getSellerCompanyNames` returns `sellerStatus`; restart the backend after pulling).

**Admin**
- Local admin account is `usr_admin` (`admin@bharatsource.in`). Run `node backend/scripts/reset-admin-password.js` to set a new random password; it is written to the git-ignored `backend/.admin-credentials.local` and never printed.
- Admin tables scroll sideways on phones with one-line rows (`.admin-table`). All tabs load without errors; add/edit/delete actions on most tabs were not exercised.

**Open or not verified**
- Photo upload in `/sell` was not exercised (file picker); AI photo draft needs `ANTHROPIC_API_KEY`.
- The Home hero cards hover and the logo animation were checked in frames and by simulated events, not watched live.
- Section intro headings on Directory ("Where products meet possibility", "One requirement") sit on the page background; the owner may want them in cards.
- Offer page has a section with only top and bottom borders.
- Recruitment hero art re-centring is untested because the art hides below 1024px.
- Local test data from the walkthrough (seller "Meera Nair", business "Nair Coconut Traders", one coconut water listing) exists in the local Postgres only.
- Dev server: after pulling, stop it, `rm -rf frontend/.next`, restart (stale Turbopack caches caused a hydration error).

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
- Home "From intent to action" section is `RouteScene` (a need types itself, a signal routes it to Directory / Recruitment / Ask Navya, live match counts). It replaced the activity-feed idea.
- Scene sections use the full panel width (`:is(.ps-sec, .hs-sec) > .le-shell { width: auto }`), matching the hero and the feed cards. `.counter-recruitment-page > section.trk` must stay `overflow: visible` or the sticky phone breaks.
- `useStory` now installs one page-wide ResizeObserver that calls `ScrollTrigger.refresh()` when document height changes (product grids load late). GSAP skips tween callbacks on refresh, so scenes that write text (typing, counters) do it from the ScrollTrigger's `onUpdate` and `onRefresh`, and staggered start states are set with `gsap.set`.
- Blog indexes (`/blog`, `/recruitment/blog`): compact cards, 4 across on desktop, 3 on tablet, 2 on phones; no lead card. About shows a short featured article plus a scrolling rail of nine more.
- AI assistant panel is `.na-*` (clean card, intro, tappable starters, amber send).
- Home also has `WhyScene` ("What makes Bharat Navya different"): three illustrated cards (connected hub, trust ring and checks, India city network) that animate once in view. Order on Home: proof, pinned showcase, RouteScene, WhyScene, closing.
- Pinned ScrollTriggers set `refreshPriority: 1`. Without it, triggers created before a later pin (child effects run first) ignore the pin spacing and fire far too early.
- RfqScene and HireScene play once on arrival (not scrubbed); only pinned scenes are scroll-driven.

## 5 to 6 October 2026: what changed since the block above
Branch `design`, tip `d0a8225` at the time of writing. All verified with computed-style checks in the Browser pane (not full screenshot passes), see "not verified" at the end.

**Listing card (`components/ListingCard.tsx`) was redesigned.** One hierarchy at every width: title, key facts strip (`.lcard-facts`, up to two from `buildSpecs`, now exported), seller row (`.lcard-by`: avatar, name, verified tick, city and rating), then a full-width Contact button plus info icon. No Product/Service tag anywhere, no prices. `hideSeller` drops the seller row. List layout (`.lcard--row`) puts Contact in a right column and stacks under 640px. The old `.lcard-top/.lcard-meta/.lcard--noseller` and container-query hacks were deleted from `counter-soft-system.css`.

**Directory list view rows** (`UnifiedListingWorkbench.tsx`, `.directory-listing-ledger`): 112px photo, larger title, seller + verified tick, place and rating, up to two fact pills on the right. Compact under 760px.

**Ads**
- Filter rails (Directory search, category pages, Recruitment roles): filters take 2/3 of the rail height, a small ad tile the bottom 1/3 (`.dlw-rail-ad`, `.rec-rail-ad`), desktop only.
- Phones (760px and under): the sponsored ad sits between listings (`infeedAd` prop, after the 4th Directory listing and 3rd role); the bottom-of-page copy is hidden (`.bn-ad-desktop-only`, `.bn-ad-below-rail`). Spacing around it is even (`.dlw-infeed-ad`).
- Detail pages (job, listing, seller): a small ad tile sits under the floating side card and floats with it (`.bn-side-stack` on job, `.bn-side-ad` inside `.cp-aside` / `.ld-aside`); the full-width ad shows only when the layout is one column (`.bn-bottom-ad.is-850/.is-980`). Employer profile has no floating card, so it is unchanged.

**Interaction**
- Expanding a row now scrolls it under the header (`lib/scrollToExpanded.ts`), used in Directory search, Recruitment roles and the two Recruitment dashboard application lists. Uses setTimeout, not rAF (rAF does not fire in a hidden pane).
- Pagination checked on Directory search and Recruitment roles (page 2 loads, URL updates).

**Recruitment**
- Tracker section on phones/tablets (<=1000px): pinned phone mockup whose screen shows the active stage; the stage list is invisible scroll distance (`.trk[data-live]` rules at the end of `counter-soft-system.css`). No-motion users still get the inline list.
- Filters: on <=850px "Refine roles" is a bottom sheet (max 60vh); on desktop it is one scrolling card (inner `.jf-panel` border removed).
- Role search bar (`RoleSearchBar.tsx`): lens icon in the query field, pin icon in the location field, "Anywhere" option, "Role or skill" placeholder; stacks under 640px with the two fields sharing a row and Search below.
- Hero hub briefcase centred.

**Auth pages** (`.counter-auth-page`): the blue panel is an inset rounded card with a gap under the header at all widths. Sign-in method tabs are a segmented pill with no divider.

**Platform-wide**
- Blues unified: `--counter-indigo` is now `#12307e` (hover `#1b3fa0`), and `--counter-green` (Directory surfaces) is also `#12307e`, so heroes, active pills and CTAs share one navy. Update DESIGN-SYSTEM.md table if you edit these again.
- Section rhythm: `.hs-sec` / `.ps-sec` padding is half the section gap; first/last sections have no outer padding (32px between sections).
- Selects and fields never touch their rounded edge (`.flt-block > select` padding); filter scrollbars are slim and inset (`::-webkit-scrollbar` rules for the filter cards).
- Lens icon via `components/SearchLens.tsx` on admin search boxes (`Input leftIcon`). AI sparkle icon redrawn centred in all four places it is used.
- Phone country-code select is smaller (4.5rem). The register "Have a referral code?" button lost its zero padding.
- AI assistant is named "BN Assistant" and shows a hover note beside the bubble (`.navya-agent-tip`).
- Logo no longer disappears when the header docks (`.is-search-docked .bn-wordmark span:not(.bn-mark)`).
- `/categories`: page on the canvas, heading in a white card, sub-categories are clickable chips. Category hero shows the category photo on the right, fading into the navy.

**Not verified / open**
- Hydration error in the console on `/categories` (and a Next dev "1 error" badge); not traced.
- Card redesign not looked at in list view, many-column grids or phone widths via screenshots; admin add/edit/delete, /sell photo upload, Recruitment landing spacing after the rhythm change, and pinned-scene behaviour on Home after the padding change are unchecked.
- If the dev server shows `useContext of null` or hydration mismatches, stop it, `rm -rf frontend/.next`, restart with `BACKEND_URL=http://localhost:4000 npm run dev`.


## 6 October 2026: what changed since the 5 to 6 October block
Branch `design`, tip after this commit. Verified in the Browser pane unless noted.
- **Header navigation is Home · Products · About** (`components/Navbar.tsx`, `.bn-nav-products`, `.bn-nav-panel`). Products opens on hover, focus or click a small card with Directory and Recruitment (icon, name, one line); closes on mouse-out, Escape, outside click or navigation. Products is the active pill on Directory or Recruitment pages. Phone menu: Home, a "Products" heading with Directory and Recruitment indented, About.
- Opening the hamburger closes the account popup and vice versa (not clicked through signed in).
- Dashboards, workspace and admin pages no longer paint a full-width white sheet behind themselves (`::before` hidden); they sit on the canvas. Admin sign-in has no black band any more; workspace labels have no leading dash.
- Logo exploration file described in START HERE.

## 7 October 2026: what changed since the 6 October block
Branch `design`, commits `04ac867` and `1ec77fe`. Verified in the Browser pane with computed-style or layout checks at 1440 and 375 unless noted.

**Directory landing**
- Products section replaced by company cards: `components/directory/CompanyShowcase.tsx` (`.cc-*`), used in `DirectorySections.tsx`. Data is `useFeaturedSellers()` (8 sellers). Card: cover photo (untinted) with the logo or initials overlapping, name + verified tick, category and city, two-line about, three stats (rating with reviews, reply rate, years since founding), chips (GST registered, Trust seal, team size), listing count and "View company". Grid 4/3/2/1 columns. `ProductShowcase.tsx` is now unused but still in the repo.
- Backend: `GET /api/users/sellers/featured` (`backend/modules/identity/routes/users.routes.js`, `computeFeaturedSellerCards`) now also returns `logo, coverImage, trustSealVerified, gstNumber, yearEstablished, employeeCount, category` (first legacy category) and `about` (220 chars). Additive only.
- Hero (`components/discovery/LandingHero.tsx`): the slideshow has no pause button and no longer stops on hover or focus (only reduced motion or a hidden tab hold it). On 1024px and up the photo fills the hero: the gradient (`.bn-landing-media:not(#_)::after`) shows the photo in the outer 10% at the left, solid navy behind the copy to 40%, then fades to the photo by 78%. The owner rejected a lighter, see-through version; keep the navy solid behind the text.
- First hero pill is "All categories": a native `<select>` styled as a white pill (`.bn-chip-menu`, `HeroCategoryMenu`), every top-level category with sub-categories in `<optgroup>`s, navigates to `/search?category=`.

**Header**
- "Advertise" outlined button left of Join / Sign in (`.bn-advertise`, hidden under 900px; in the phone menu as a link).
- Products menu is a horizontal row of tiles, icon beside text (`.bn-nav-panel`, about 800px wide at 1440, descriptions wrap rather than clip). Growth OS added as a muted non-link tile with a "Coming soon" tag (`.bn-nav-panel-soon`); also a muted line in the phone menu. The screenshot of the open panel could not be captured in the pane (its fade transition does not run there), so it was checked by measurement only.

**Home**
- Under the hero: the stats card takes 2/3 and a `home_hero` ad tile (`ApiAdvertisingSlot imageOnly`) 1/3 (`.hs-proof-row`, `.hs-proof-ad`). Stats go full width when there is no ad; ad stacks below under 900px.

**Recruitment hero search** (`RecruitmentSectionSearch` in `components/SectionSearchDock.tsx`)
- Workplace select removed from the bar (it stays in the jobs page filters); the hero search no longer sends `workplace`. Location label reads "Anywhere". Desktop bar is compact (34rem, columns role / 9.25rem location / arrow). Phones: role, location, full-width "Search jobs".

**Platform-wide**
- Desktop sizing: `@media (min-width: 900px) { html { font-size: clamp(13px, min(1.111vw, 1.975vh), 22px) } }` at the end of `counter-soft-system.css`. Everything is rem, so laptops of different sizes and scaling show the same slice of the page (16px at 1440x810). Phones and tablets stay 16px. If something px-sized looks off on a small or very large screen, this is why. **Superseded on 8 Oct: max is now 16px.**
- Search-bar focus: inputs/selects inside search bars draw no outline of their own; the focused field gets a rounded navy ring drawn as an `::after` overlay inset 3px, so field dividers stay straight. Do not put `border-radius` on the field labels themselves (it bent the divider).
- Footer: no separate white box; full width, transparent at the top fading to white by 9rem.
- Guest sign-in popup (`components/auth/GuestAccountNudge.tsx`): fixed a bug where it reopened on the next scroll after being closed. It now rechecks closed/shown before revealing, stops listening after it shows once, and survives blocked storage. Tested by forcing the 2-minute condition.

**Not verified / open**
- Keyboard focus ring and the viewport scaling have not been checked on Windows (Mahir's laptop); ask for a look.
- Only two of the five Directory hero photos were looked at with the new gradient.

## 8 October 2026: what changed since the 7 October block
- **Pulled the dev's `feature/design-integration`** (19 commits, fast-forward to `bcab2d7`), then pushed to `design`. It brings: one rotating ad carousel for every ad slot (`components/ads/useAdRotation.ts`, `AdControls.tsx`, `lib/adPlacements.ts`; `AdSlider.tsx`, `PromoBanner.tsx`, `NativePromotionSlot.tsx` deleted), listing edit mode and seller-tools fixes, OTP codes in Postgres, the Ask Navya agent endpoint (`backend/modules/ai/service/agent*.js`), `scripts/seed-ads-demo.js`, and the `remark-gfm` package. Their notes live in `WEB-REDESIGN.md` and `CHANGES-SELLER-TOOLS.md`. Local DB got migrations 0016 to 0018 via `npm run migrate-schema`.
- **Font size regression fixed.** The 7 Oct viewport rule also scaled *up* (about 18px on a 1920x1080 Windows screen), so the dev saw less per screen than the older live version. Now `clamp(13px, min(1.111vw, 1.975vh), 16px)`: never above the original 16px, only shrinks on short or zoomed laptops. Verified 16px at 1920x930 and 1440x810.
- **Recruitment docked header search**: the column left over from the removed workplace select is gone (`.bn-header-search-desktop .bn-section-search--recruitment.bn-section-search--compact`, both the base and the wide-screen rule); the bar ends at the arrow.
- **Products menu**: no visible "Coming soon" tag on Growth OS (desktop tile and phone menu); tooltip only. Phone-menu Growth OS aligned with the other sub-links (`.bn-mobile-nav-soon` padding 1.75rem).

## 8 October 2026 (later): header logo, corner buttons, scrollbars
- **Header logo blend (option 2B)** is live in the header. `Navbar.tsx` renders `<span class="bn-header-surface">` and an `atTop` state (`window.scrollY <= 8`, class `is-at-top`, not while the search is docked). The header itself no longer paints the bar: `.bn-header-surface::before` is the white bar masked transparent where the logo sits (fades in 7rem to 17rem; 4.6rem to 11rem under 900px), `::after` is the solid bar, and the drop-shadow sits on the surface so it fades with the white. At the top the solid layer is hidden and `.bn-wordmark` is `scale(1.8)` (1.45 on phones) with its own shadow; on scroll it returns to the solid bar and normal logo. The exploration board is `public/logo-blend-options.html` (uncommitted).
- **Corner buttons in a controller-style diamond** (end of `counter-soft-system.css`): "Post requirement" `.rfq-tab` stays the navy tab on the right edge (top), the assistant `.navya-agent-dock` is on the left, `.back-to-top` (2.25rem) at the bottom in the corner. Positions are tuned so the visible edge-to-edge gap from the bubble to each of the other two is equal (about 14px, measured with rounded corners), not the centre distances. The old rule that pushed the bubble sideways when back-to-top appeared is gone.
- **Advertise** button has a megaphone icon.
- **Scrollbars**: navy thumb everywhere (`::-webkit-scrollbar*`), 8px and inset from the ends (`body *::-webkit-scrollbar-track { margin: .85rem }`) inside boxes so thumbs never run into rounded corners. Chrome ignores the webkit rules when a box sets `scrollbar-width`/`scrollbar-color`, so those are reset for the filter panels and dropdowns outside Firefox; Firefox gets `scrollbar-color` navy via `@supports (-moz-appearance: none)`.
- "All categories" hero pill widened to 8.4rem so the label fits on phones.

## 8 October 2026 (evening): home redesign, plain-language copy, section panels
- **Copy rule from the owner:** every visible line should be plain, short and easy to understand; cut subtitles that add nothing; no slogans. Applied to Home, Directory, Recruitment, About and the footer (e.g. "Suppliers, services and jobs in one place.", "Find the right business.", "Find work. Hire people.", "Top companies", "Track every application."). Public copy now says "jobs" rather than "roles" where rewritten; the jobs-page search and filters still say "roles". **Not yet done:** Pricing, Features, Offer, Sell, RFQ, Post a job, sign-in/register, dashboards, detail pages.
- **Section panels:** any `.hs-sec`/`.ps-sec` whose `.le-shell` holds a `header.le-section-head` is a white rounded panel, head is one row (title left, action right). The blurb paragraphs in those heads were deleted from the TSX.
- **Home:** the scroll-pinned "Three ways" tour is replaced by `components/home/ProductHub.tsx` (`.hub-*`): a navy panel with an SVG hub (core, rings, beams, travelling packet, preview card) that cycles Directory / Recruitment / Ask Navya while on screen (no pin, no pause); on phones the list is a row of 3 chips and the card sits under the diagram. `RouteScene` ("Say what you need") is removed from Home (file kept, unused). "Why Bharat Navya" cards are navy with recoloured drawings. Stats card: tinted tiles, plain navy numbers, gold underline, no icons; the ticker no longer pauses on hover.
- **Hero cards (HeroStage):** Directory scene = one requirement, three quotes, best one picked and accepted; Recruitment scene = application status track (Applied, Viewed, Shortlisted, Interview) ending on an interview card. Ask Navya unchanged.
- **No pause anywhere** (owner rule): ad carousel (`components/ads/useAdRotation.ts`, `AdControls.tsx`) has no pause button and no hover/focus hold; only holds when off screen or the tab is hidden. Directory hero slideshow likewise.
- **Directory "Get found by buyers"** (StorefrontScene) autoplays in view and loops instead of scroll-pinning. **Recruitment:** compact hero path cards; the role finder is one connected board (white fades into navy, arrow on the seam); title "Jobs by field".
- **Footer** fade is stronger (dips into a deeper blue, then white).


## 9 October 2026: category mega menu, Top companies board, role finder, loops, footer

- **Directory "All categories" pill** is now `components/discovery/CategoryMegaMenu.tsx` (replaced the native `<select>`; owner asked for an ofbusiness-style menu). Portal-rendered, fixed-position panel that hangs off the pill: the open pill gets a flat bottom (`!important` radius, because a `:is(.counter-directory-page ...) .le-examples button` rule forces pill radius with `!important`) and the panel's top-left corner is square so they read as one tab. Placement is computed from the pill and clamped inside `.bn-landing-hero` (24px margin desktop, 16px tablet, pill-left margin on phones). Desktop: left rail of top categories with photos (hover previews), right side sub-categories in CSS columns, grandchildren listed under their parent, View all. Phones: same attached dropdown, categories as a horizontal photo row; if there's no room below the pill the page scrolls it up under the header first. Search filters across all levels. No dim layer, no scroll lock. Data: `app/directory/page.tsx` `categoryMenu` (sorted by listing count, recursive children, image from `imgFor`). Styles `.bn-mega-*`.
- **Top companies** (`components/directory/CompanyShowcase.tsx`, `.tc-*`): category tabs with counts over a compact two-column ranked board (rank badge on a small photo, name + tick, category and city, rating / years / reply rate / GST on one line, two offer chips). Whole card is the link; no hover dependency (owner rejected a hover-driven spotlight). Fits one screen at 1440x900; phones show the top 4. The old `.cc-*` card CSS was removed.
- **Backend (needs a restart on deploy):** `GET /api/users/sellers/featured` now also returns `category`, `categorySlug` and `offers` (up to 3 active listing titles) per seller, from the new `directory.sellerCardExtras(ids)` (one query in `listingStats.repository.js`; main category = the root category most of their active listings sit under). Additive only.
- **Recruitment role finder** is one box: three grid columns (white choices | blend | navy result); the blend column takes the spare width so the fade sits exactly halfway between the two contents, with a 14rem smootherstep gradient centred in it. Arrow removed. Reveals as one left-to-right clip-path wipe (`fromTo` keeps the rounded edge). Stacks on phones with a short vertical blend.
- **HireScene** ("Post a job. Meet good candidates.") now loops while in view (pauses off screen) and clears itself between rounds; "See pricing" button removed.
- **Section heads on phones:** title left, button right; if it wraps, the button drops below right-aligned (never centred). Home closing CTAs sit side by side on phones.
- **Footer:** content starts below the fade (`padding-top: 9.5rem`, 7.5rem phones); logo lockup with the name and tagline stacked beside it (`.bn-footer-lockup`).
- **Hero titles were restored** to the pre-copy-pass versions at the owner's request: Home "The B2B platform built for what's next.", Directory "Turn business search into business action.", Recruitment "Find the right people. Build the right team." Don't rewrite hero titles in future copy passes without asking.
- **On hold:** homepage hero background, waiting for the owner's pick from `frontend/public/hero-bg-abstract.html` (not committed).

## 9 October 2026 (later): reviews, stories, About section, trust tags, nav dropdowns

- **Company page `/seller/[slug]`** (order now: header with tags, stats, Stories, Work evidence, Reviews, then about/facts/offerings):
  - Reviews: `components/seller/CompanyReviews.tsx` (`.cr-*`). Summary, write/edit form (star picker + optional text; one review per person per company, can't review your own; guests get `ContactAuthModal purpose="review"` and land back on the form), filter/sort list. Uses the existing `GET/POST /api/reviews`. The old `ReviewsPanel.tsx` is now unused. The rating stat tile links to `#reviews`.
  - Stories: `SellerStoriesSection` re-added (dropped in `ea24411`), gated by admin flags `stories` / `storyHighlights`. Its cards use their own `.sst-card` class (solid navy ring), not the avatar-rail `.story-card`.
  - Employer page: Recruitment reviews moved up to sit right after "About working here".
- **Trust tags** (dev's request: show what the API sends). `components/TrustBadges.tsx` is the one source: `RatingPill` (green score + "N ratings"), `VerifiedTag`, `ListingFlag` (Sponsored amber dot / Featured navy dot), and `TrustBadges` (rating + Verified / Trust seal / GST registered + earned `badges` from `backend/lib/badges.js`: Top rated, Fast reply, Trusted; facts line "N yrs in business · N% reply rate"). Used in search rows (`UnifiedListingWorkbench`), listing hero + seller box, listing cards, company header, `SellerCard`. Listing's own rating is preferred over the company's when present. Owner rule: solid colours, no gradient fills.
- **About section**: navbar About is a dropdown (same `NavDropdown` as Products). Pages: `/about` (Our story), `/about/team`, `/careers`, `/blog`, `/contact`, sharing `components/about/AboutShell.tsx` (hero + page switcher). Owner facts live in `components/about/company.tsx` (`COMPANY` contact details, `LEADERSHIP` names/photos, `OPEN_ROLES`); anything left null is hidden, never invented. `/careers` and `/contact` were added to `ROOT_ROUTES` in `lib/routePresentation.ts` (otherwise they're treated as category pages). "More about us" blocks were removed at the owner's request. Contact FAQ is an exclusive accordion.
- **Nav dropdowns**: ofbusiness-style rows (`NavRow` in `Navbar.tsx`, `.bn-nav-row`): hover springs in a left accent bar, light row wash, icon tile fills solid navy and lifts, chevron nudges; rows stagger in on open. Advertise is hidden on `/login` and `/register`. The hamburger shows Join / Sign in only when the header button is hidden.
- **Footer**: app badges (Google Play / App Store, real marks as inline SVG, black, not linked yet; set `href` in `APPS` in `Footer.tsx` when live), text optically centred (`text-box: trim-both cap alphabetic`). Links in two columns.
- **Fixes**: sidebar ads sized 4:3 so the title is never clipped; blog page bottom ad removed; listing cards have one Contact button (duplicate "i" removed); Tailwind's reset zeroed padding on un-classed `<select>`s, re-asserted at type specificity (`select { padding: 0 2.25rem 0 0.9rem }`); navy band CTAs are white.
- No backend changes in this batch.

## 9 October 2026 (late): Pricing page removed

- Owner asked to remove the public Pricing page entirely. `app/pricing/` is deleted; `next.config.mjs` redirects `/pricing` to `/` (temporary redirect, so it can come back).
- Every link to it was removed or repointed: footer, Contact FAQ, `/features` ("See pricing" button), home `SellCta` ("See plans"), seller dashboard Subscription tab buttons. "Choose plan" on `/offer` now goes to `/dashboard?tab=subscription`; Directory's "Promote your company" action and the ad-slot fallback go to `/dashboard?tab=advertise`.
- Plans still exist (admin Plans tab, seller dashboard Subscription tab, `/offer`). Don't re-add Pricing links without asking.

## 9 October 2026 (night): contact form, narrow search rows

- **Contact form** on `/contact` (`components/about/ContactForm.tsx`, `.cf-*`, with a "What happens next" panel). Needs name + message + email or phone; signed-in users are prefilled.
- **Backend (deploy steps: `npm run migrate-schema` in `backend/`, then restart the backend):**
  - migration `0019_add_contact_messages.sql` (table `contact_messages`; also added to `schema.sql`), flat mapping `contact-messages.json`, file-DB seed `DB/contact-messages.json` (`[]`).
  - `modules/platform/routes/contact.routes.js`: `POST /api/contact` (public, optionalAuth, validated, max 5 per IP per 10 min in memory) and `GET` / `PATCH /api/admin/contact-messages[/:id]` (admin, mounted in the "admin-sub" phase).
  - Admin UI: Global > Contact messages (`components/admin/ContactMessagesTab.tsx`): filter New / Handled / All, mark handled or reopen.
- **Search rows** use a container query on `.directory-listing-ledger`: below 36rem of list width (a listing open beside it), smaller photo and no spec chips, so title / seller / tags / rating keep their room.

## 12 October 2026: Trade Grid hero, one page width, tags v3 + badge filter, image viewer

- **Home hero background = Trade Grid** (SUPERSEDED on 12 Oct by Deal Flow, see the 12 Oct (late) block) (owner's pick, option 1 of `frontend/docs/hero-living-scenes.html`). Engine ported as-is into `components/home/tradeGrid.ts` (`@ts-nocheck`, canvas 2D), mounted by `TradeGridBg.tsx` inside `.bn-home-hero`. Pauses off screen / hidden tab, one still frame under reduced motion, no pause control (owner rule). The `hero-bg-*.html` boards in `public/` remain uncommitted.
- **Hero height** scales with the visible height on desktop (`svh` clamps), so every screen shows the full hero plus a peek of the next sections.
- **One page width everywhere**: `--page-max: 120rem` (1920px), `--bn-container` = page max; all shells/heads/footer align to the same text edge. If something looks centred-in-the-middle on a monitor again, it's a container still using its own cap.
- **Trust tags v3**: per-tag colours (Verified green, Trust seal blue, GST teal, Top rated amber, Fast reply violet, Trusted orange) via `.tb-chip.is-*`; `TagRow` for rows/cards. Owner rule: solid fills, no gradients.
- **Badge filter** in search (`TAG_LABELS` in `Filters.tsx`, `filters.tags`), client-side on the loaded page like rating/brand.
- **Backend (restart needed):** `identity.getSellerBrowseCards` now adds `trustSealVerified`, `gstRegistered`, `badges` (derived via `lib/badges.js`) to each search result's seller. Additive.
- **Image viewer** `components/ImageViewer.tsx` (zoom buttons/wheel/pinch/double-click, drag pan, arrows/swipe/thumbs) on listing gallery, search preview photo and company work photos.
- Search sticky panels cap at the viewport height; role finder is solid navy; contact form fields sized by content with a full-height panel; home closing CTA is just "Create your account".

## 12 October 2026 (later): small polish

- Company email `info@bharatnavya.com` set in `COMPANY` (`components/about/company.tsx`); shown in the footer (`.bn-footer-mail`) and on Contact (panel + "Reach us directly").
- About page switcher row removed from all About pages (owner); navigation is via the navbar About menu, phone menu and footer.
- Tag chips have equal side padding; listing cards show a compact spec pill with the city (pin icon, `CityTag`) beside it; rating sits on its own line.
- Frontend only, no backend restart needed for this batch.

## 12 October 2026 (evening): role finder never shows 0

- `components/recruitment/RoleFinder.tsx` fetches all open jobs once (`getJobs({limit:200})`) and counts client-side (same rules as the jobs API, checked against it). Each option shows how many jobs it would leave; options that would leave 0 are disabled, so no combination reaches 0. Middle column shows the top 3 matches (`.rf-preview`), plus a one-line hint. If the job count grows past ~200, switch to a counts endpoint.
- Frontend only.

## 12 October 2026 (late): changes from a second Claude session, plus dev branch status

Two commits were made from another Claude account in this same worktree and pushed to `origin/design`. This session did not write them; this block records them.

- **`dda8164` Home hero background is now Deal Flow, not Trade Grid** (owner's request). Option 4 of `frontend/docs/hero-living-scenes.html`: the whole suite drifts in depth behind the hero, product-coloured cards (Ask Navya question, Directory RFQ / quote / verified supplier, Recruitment post / applicant / interview, Growth OS preview, promoted listing), each handing off to its next step with a pulse. Engine `components/home/dealFlow.ts` (`startDealFlow`, `@ts-nocheck`, canvas 2D, uses the app's next/font variables for card text), mounted by `components/home/DealFlowBg.tsx`. `tradeGrid.ts` and `TradeGridBg.tsx` were deleted. Classes renamed to the generic `.bn-herobg` / `.bn-herobg-veil`. Same behaviour rules as before: pauses off screen / hidden tab, still frame under reduced motion, no pause control.
- **Same commit: search filter rail no longer height-capped.** The 12 Oct "sticky panels fit the screen" rule had also capped `.directory-listing-filter-rail`, which already scrolls its own `.directory-listing-filter-panel`, so two scrollbars showed. The cap now applies only to `.directory-listing-detail` (the open-listing preview).
- **`66ebd86` Search polish:** the phone-only in-feed ad no longer renders as a broken tall card in the desktop grid view (`.dlw-grid > li` outranked its `display:none`); the location select's inset focus "underline" (which curved into half an outline on the pill) was dropped; keyboard focus keeps the global outline.

**Dev branch (`origin/feature/design-integration`) had 3 own commits, now merged into `design` (13 Oct, `e8175e6`, together with the dev's `contact.routes.js` fix `update` -> `updateById`):**
- `33c03ed` "Search within results" in the listing filter panel: `Filters` takes `quickSearch={{ value, onChange }}`; `UnifiedListingWorkbench` debounces it and sends it to `GET /api/listings?q=`, re-checking rows in the browser so a term with no match shows 0. Adds three `.flt-search-clear` rules to `counter-soft-system.css` (keep them on future CSS edits).
- `35bbdc3` Directory grid view no longer shows list rows or the in-feed ad.
- `17dee4f` docs: migration 0019 (contact messages) is applied on the testing server.

**Still open:** owner details for `components/about/company.tsx` (team names/photos, phone, address, hours, careers email, open roles); the badge filter and role-finder counts work on loaded data only (see the 12 Oct blocks); on short screens the bottom of the filter rail can sit a few px below the viewport.

## 13 October 2026: Deal Flow cards spread over the whole hero (Mahir)

- Mahir: the drifting cards only showed at the top of the home hero, the lower part looked empty. In `components/home/dealFlow.ts`, `Deal.ry` now picks a height anywhere from the top to the bottom of the hero (was ~88% in the strip above the product cards), keeping the try that overlaps the fewest nearby cards and has the fewest cards at that height, so cards fill the side gaps and the space below the product cards evenly. Card count 15 -> 20 on desktop, 7 -> 10 on phones. Cards behind the headline still fade to 10%.
- On phones the product cards are almost full width, so lower cards only peek at the edges.
- Frontend only.
