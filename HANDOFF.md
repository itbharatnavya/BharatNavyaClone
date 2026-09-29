# Bharat Navya — canonical handoff

Updated: 29 September 2026

Official branch: `design`

Official application: `frontend/`

Official committed checkpoint: the current tip of `origin/design`; verify it with `git rev-parse origin/design` before continuing.

Current implementation state: Mahir feedback reconciliation and search-integration repair are committed to and pushed on `origin/design`. Public deployment remains a separate verification step.

Git identity: `itbharatnavya <314251907+itbharatnavya@users.noreply.github.com>`

This is the single continuation source of truth for current Bharat Navya product and visual work. Read it after `AGENTS.md`. `HANDOVER.md` is legacy engineering/setup context only; the tracked `Design/` Vite tree is a frozen reference and must not be used as the implementation target.

## 1. Start here in a new session

1. Read `AGENTS.md`, then this file.
2. Confirm `git branch --show-current` is `design`.
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

- `design` and `origin/design` are aligned after the Mahir reconciliation/search-repair push. Verify the exact checkpoint locally instead of relying on a copied SHA in this document.
- The reconciliation and search-recommendation repair are available on GitHub in `origin/design`.
- Do not report the current work as publicly deployed until the deployment SHA and production routes have been verified.
- The account configured in this checkout is `itbharatnavya`, as requested.
- Recent official checkpoints:
  - `2c01e52` — audit and unify frontend visual system
  - `9bbd41d` — complete visual direction across secondary pages
  - `3d404fc` — integrate Feni content across public frontend
  - `72b9fa4` — integrate live search suggestions
  - `aace218` — polish Bharat Navya frontend experience
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

- Public navigation is **Home, Directory, Recruitment**.
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
- A shared lower-left `BackToTop` control is mounted from the root layout. It appears after approximately 600px, is keyboard accessible, avoids lower-right controls, and respects reduced motion.
- The product mark uses the selected BN-arrow asset at the existing public URL; the Chakra and proposed tagline are not displayed.
- The floating helper is consistently named **Navya AI Agent** in visible and accessible copy. It is limited to the public hub routes defined in `ChatAssistant`; dense category, company, listing, employer, and job routes do not receive a conflicting floating assistant.

### Home `/`

- `HomeAgent` is the hero **Ask Navya** discovery/search experience. It is visually and conceptually distinct from a conventional listing search box.
- The compact suite layout has a smaller Navya card and right-side Directory, Recruitment, and Growth OS cards. Growth OS is marked **Coming soon**.
- Ask Navya opens a conversational modal. Its stack must remain above all page media while the page or modal scrolls.
- Home exposes **Ask Navya** as its only AI entry point. The stale `UniversalDockedSearch` and its Home scroll/dock state were removed, so scrolling no longer replaces the navigation or disables the current Ask Navya experience.
- The separate bottom-right **Navya AI Agent** is used only on the allowed supporting hub routes. Do not merge it with Ask Navya.
- Directory is green; Recruitment is saffron. Recruitment must not blend into the blue hero or become a black card.
- The former oversized “Clarity follows the whole decision” section is a smaller, focused journey rather than multiple competing cards.
- A clearly labelled promotional surface and current blog content remain intact.

### Directory home `/directory`

- Feni-approved page content is integrated while preserving live data sections.
- The hero and docked search use local drafts and provide grouped, API-backed category, company, and product/service recommendations with keyboard selection. A partial typed query is not committed to shared state until submit or selection.
- Suggestion choices route to the current filtered `/search`, `/seller/:slug`, or `/listing/:id` destinations rather than legacy category/list routes.
- Company statuses use `getStories("seller")` and remain visible as a truthful empty state when no active status exists.
- The post-hero band is 2:1: statuses on the left, boosted-company placement on the right; it stacks in that order on narrow screens.
- Service families, providers, products, journey, company insights, closing CTA, ads, and API listings remain present.

### Recruitment home `/recruitment`

- Feni-approved page content is integrated and role-family descriptions map to live API categories without renaming API labels/routes.
- The hero and docked search provide grouped job-family, role, and employer recommendations with keyboard selection. Employer matching uses the existing `company=` jobs filter alongside the ordinary `q=` role search.
- Hiring statuses use `getStories("employer")`; blogs/updates are separate.
- The post-hero band mirrors Directory: 2:1 statuses plus boosted-employer/recruiter placement.
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
- Directory and Recruitment status rails use circular story controls and retain truthful compact empty states rather than fabricated activity.
- Login and registration use a full-height desktop context panel without unused strips above or below it; mobile controls retain a minimum readable input size.
- Feni content was integrated into Home, Directory, Recruitment, About, Navya Blog, Pricing, Login, and Register while preserving behavior and localization boundaries.

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

Verify both before judging missing statuses, blogs, jobs, listings, ads, or suggestions.

## 9. Deployment truth

- Frontend project: `https://bharat-navya.vercel.app`.
- Do **not** assume Vercel represents the latest source checkpoint without verifying the deployment SHA.
- Production is not fully functional while `/api/*` is configured to reach `localhost:4000`; Vercel cannot reach a backend running on the local Mac.
- Missing production statuses, blogs, jobs, listings, ads, or other API sections are therefore a backend-hosting/configuration issue, not permission to replace them with static data.
- Hosting remains a separate decision: deploy the backend publicly (for example Railway) or deliberately configure a Vercel-compatible backend, then set `BACKEND_URL` and re-run production smoke tests.
- Do not claim production acceptance until public API routes and authenticated/live-data flows are verified.

## 10. Remaining work / next priorities

1. Review the pushed reconciliation at desktop, phone width, and 200% zoom on the agreed route matrix; log any new visual regressions as a follow-up rather than rewriting this checkpoint.
2. Verify the resulting GitHub/Vercel deployment SHA before calling the work publicly shipped.
3. Decide and implement public backend hosting, then configure `BACKEND_URL` for Vercel.
4. Re-run production API-backed smoke tests for statuses, blogs, jobs, listings, ads, suggestions, login, profiles, and applications.
5. Preserve Ask Navya as the Home experience and Navya AI Agent as the supporting-route helper unless Mahir explicitly changes their product roles.

## 11. Non-negotiable hygiene

- Never use destructive Git commands or discard dirty files to obtain a clean tree.
- Never work from or import the frozen `Design/` Vite prototype.
- Never update old UI and active UI in parallel.
- Never solve a shared-system inconsistency with a private page fork unless a real product reason exists.
- Never call a build-only check proof of responsive correctness.
- Never hide absent API data with fabricated content.
- Never push to anything except `origin/design` without explicit approval.
- Keep commits scoped and name exactly what was verified.
