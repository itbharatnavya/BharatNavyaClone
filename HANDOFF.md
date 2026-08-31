# Bharat Navya design migration handoff

Updated: 31 August 2026  
Branch: `design`  
Remote: `origin` (`mahir-bharat/BharatNavya`)

## Current truth

- Active product-design implementation is the developer's Next.js 14 app in `frontend/`.
- `Design/` is the frozen Vite reference and must not receive new product work.
- Public navigation is Home, Directory, and Recruitment.
- Directory is company/service-first; catalogue, product-commerce and RFQ mechanics do not define its primary experience.
- Recruitment preserves the developer's real job, application, employer and candidate contracts.
- Work and pushes stay on `design`; do not alter other branches or unrelated backend modules without approval.

## Completed pilot

- Added root guardrails and migration/capability documentation.
- Added Manrope and a primitive → semantic → component Bharat Navya token layer while retaining legacy aliases for unmigrated routes.
- Replaced the suite navbar with the Bharat Navya three-destination shell; existing authentication and notifications remain connected.
- Added typed public view models and deterministic universal-search intent classification.
- Rebuilt `/` around the approved centered landing composition.
- Connected the landing to featured sellers, jobs, public review activity and eligible internal promotion APIs.
- Added explicit loading, empty, error, missing-media and illustrative-process disclosure states.
- Added Directory ↔ Recruitment search correction links.
- Updated the assistant's public-facing language to Bharat Navya and removed RFQ/product prompts.

## Verification completed

- `frontend`: `npx tsc --noEmit` passes.
- `frontend`: `npm run build` passes; `/` is 111 kB first-load JS.
- `backend`: 19 tests pass, 1 Postgres-only test is skipped when `PG_URL` is absent.
- Live checks against the Next.js pilot on port 3001 and API on port 4000 confirm the new landing markup, featured companies and public activity.
- No files inside `Design/` were changed.

## Open checkpoint

Visual interaction QA at 375, 768, 1024, 1440 and 200% zoom remains the next approval checkpoint. The browser-control plugin failed locally because its installed client referenced a different unavailable plugin version; this is tooling-related, not a build failure. Inspect the actual Next.js pilot at `http://127.0.0.1:3001/`, not the Vite prototype on ports 5173/5174.

After the landing and shell are visually approved, proceed to Phase 2 in this order: `/directory`, `/search`, `/seller/:slug`, inquiry/contact, then `/dashboard`.
