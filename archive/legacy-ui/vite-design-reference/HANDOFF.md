# Bharat Navya — Codex Continuation Handoff

Updated: 30 August 2026

## Fresh-chat checkpoint

This file is the restart point for a new Codex task. The current phase is **product-design coverage and design-system consolidation**, not production full-stack implementation.

The latest completed pass established the system and planning foundation:

- Audited the developer's UI-phase application at `/Users/parthus/Downloads/BharatNavya-feature-ui-phase` as **functional evidence only**. Do not copy its IndiaMART/Justdial/Moglix-style visual treatment, product catalogue, steel data, commerce flows, or irrelevant seeded content.
- Converted useful developer functionality into the complete page/state plan in `docs/BHARAT_NAVYA_DESIGN_BLUEPRINT.md`.
- Consolidated the canonical design-system foundation in `src/design-system/` and documented its rules in `docs/DESIGN_SYSTEM.md`.
- Added the live `/design-system` gallery, reusable shared primitives, token validation, governance, versioning, migration guidance, and a decision log.
- Hardened shared accessibility with AA-contrast focus rings, SPA title/route announcements, explicit loading announcements, and keyboard-dismissible utility popovers with focus return.
- Added reusable radio-group and semantic-progress contracts, migrated account role selection, made toast announcements persistent, and added current-step semantics to company setup and the recruiter job editor without changing their composition.
- Centralized modal keyboard/focus behavior and applied it to authentication, governed dialogs, Companies filters/live updates, and public story playback without changing their visual composition.
- Added `docs/DEVELOPER_CAPABILITY_MATRIX.md`, mapping approved actions to existing developer endpoints, required adjustments, missing backend capability, later work, and explicit exclusions.
- Preserved the approved parent homepage and existing Companies/Jobs direction while fixing responsive overflow and minimum touch-target regressions on the product homepages.
- Rebuilt `/companies` and `/jobs` as approved task-first Guided Showcase destinations with shared hero/docked/mobile search, trust contracts, recognizable pathways, evidence ledgers, ordered proof journeys, organic-first promotion placement, and secondary participation CTAs. The parent homepage remains unchanged.
- Verified token validation, all 20 tests, and the production build. The new homepage suite covers direct-to-results pathways, header docking, inert hero state, mobile-drawer focus/scroll lock/Escape/focus return, and existing route regressions. A fresh live-browser viewport pass remains blocked by the installed browser-control runtime mismatch and must be rerun at 375, 768, 1024, and 1440px when that runtime is repaired.

Important: this foundation pass is complete, but the whole legacy prototype is **not yet fully migrated**. Existing feature CSS remains under a measured ratchet, and many blueprint pages are documented designs to produce—not live routes already implemented here. No backend integration, deployment, Figma synchronization, or production data work was completed.

If the next user message is simply “continue,” resume from **Immediate next work** below. Do not restart discovery, redesign the approved parent homepage, or treat the developer build as the visual source of truth.

## Read this first

- **Bharat Navya** is the current product and brand name. The repository folder and some older experiment files still use **BharatConnect**. Do not mass-rename them during unrelated UI work.
- This repository is a **frontend product-design prototype**. It demonstrates information architecture, responsive behavior, interaction patterns, and fictional product states for the client's full-stack developer to integrate. It is not the production application.
- The approved public structure has three destinations: **Bharat Navya Home, Companies, and Jobs**. Applicants operate within Jobs; recruiters operate within the company workspace. There is no separate public Recruitment homepage in this phase.
- Preserve working flows and browser-history behavior. Make surgical UI changes; do not rebuild functioning prototype logic merely to restyle it.
- Contract and logo-selection work are complete/outside the current design priority. The supplied Bharat Navya mark is already used in the shared header.
- The next session should read this file, `docs/BHARAT_NAVYA_DESIGN_BLUEPRINT.md`, `docs/DESIGN_SYSTEM.md`, `PRODUCT.md`, and `docs/PLATFORM_ARCHITECTURE.md` before changing product structure. `DESIGN.md` is retained as historical context. When route descriptions conflict, this handoff plus `src/App.tsx` define the implemented state; the blueprint defines intended product coverage; the architecture document remains useful for domain and policy contracts.
- Future feedback that changes a reusable visual or behavioral rule must update the relevant tokens/components, the live gallery, `docs/DESIGN_SYSTEM.md`, its decision log, and affected blueprint entries in the same change. Do not leave system decisions only in chat or one-off page CSS.

## Current product direction

Bharat Navya connects two evidence-led marketplaces under one account:

1. **Company discovery** — visitors search for startups, SMEs, suppliers, and service providers; inspect proof, freshness, media, reviews, statuses, jobs, and availability; then save, compare, follow, or send a structured inquiry.
2. **Recruitment** — applicants discover transparent startup/SME roles while named, company-authorized recruiters manage jobs, candidates, interviews, and closure states.

The shared differentiator is an accountable business identity. Company information, evidence, reviews, recruiters, jobs, updates, inquiries, and response behavior connect back to that identity.

### Current boundaries

- Frontend-only prototype with fictional fixtures and browser-local state.
- Company listings optimize for discovery and contact, not checkout or commerce.
- No phone/OTP flow. Prototype registration is email/password and appears only at meaningful conversion moments.
- Statuses expire after 24 hours and may be retained as named highlights.
- Native promotion is represented as clearly labelled, relevance-constrained content after sufficient organic content. Paid placement never changes verification, reviews, evidence, or organic fit.
- Loans, transactions, broad social networking, real authentication, persistence, messaging, uploads, moderation services, billing, and production APIs remain deferred.

## Approved information architecture

### Parent platform

| Route | Purpose |
| --- | --- |
| `/` | Bharat Navya parent homepage |
| `/updates` | Public company and recruiter updates |
| `/saved` | Saved companies, jobs, and updates |

### Companies product

| Route | Purpose |
| --- | --- |
| `/companies` | Companies discovery homepage with categories and curated discovery sections |
| `/companies/browse` | Focused company search/listing workbench |
| `/companies/profile/:companyId` | Rich company profile |
| `/companies/compare` | Company comparison |
| `/companies/inquiry/:companyId` | Structured inquiry |

### Recruitment product

| Route | Purpose |
| --- | --- |
| `/jobs` | Recruitment discovery homepage |
| `/jobs/browse` | Focused job-search workbench |
| `/jobs/:jobId` | Job detail |
| `/jobs/applications` | Applicant tracker after authentication |
| `/me/profile` | Applicant profile |

### Company and recruiter workspace

| Route | Purpose |
| --- | --- |
| `/workspace` | Company workspace home |
| `/workspace/profile` | Company profile setup/editor |
| `/workspace/media` | Media library |
| `/workspace/reviews` | Review management |
| `/workspace/updates` | Status/highlight publishing |
| `/workspace/recruitment` | Recruitment workspace entry |
| `/workspace/recruitment/dashboard` | Recruiter dashboard |
| `/workspace/recruitment/pipeline` | Candidate pipeline |
| `/workspace/recruitment/job` | Job editor |
| `/workspace/team` | Team and permissions |
| `/workspace/promotions` | Dedicated native-promotion centre |
| `/design-system` | Live component/state catalogue |

### Compatibility and archived concepts

- Existing `/directory/*` URLs remain aliases for current company routes.
- `/jobs/detail` and `/me` remain legacy aliases.
- `/vision`, `/opportunities`, and `/business-hub` preserve the earlier broad ecosystem experiment. They are reference material, not the active homepage or current Phase 1 commitment.

## Parent homepage — current approved state

The current design is intentionally centred, calm, and task-first:

- Supplied Bharat Navya mark and wordmark in the header.
- Desktop navigation: Home, Companies, Jobs, Updates, Saved; one `Join / Sign in` action.
- Centred title, supporting line, natural-language search, and suggested requests.
- Pale cobalt decorative circle/orbit shapes are clipped by the **viewport edges**, not the 1180px content margin.
- Two compact product gateway cards appear in the first screen: **Companies** and **Jobs**.
- Gateway cards contain only an icon and label. They have no arrow, preview record, description, metric, or marketplace heading.
- Gateway cards hug their content at all breakpoints. Do not reintroduce fixed widths, `flex: 1`, or a two-column grid that stretches them across the row.
- At the currently tested narrow/zoomed 660px CSS viewport, Companies renders about 139px wide and Jobs about 96px wide; icon/label vertical-centre difference is 0px.
- The floating assistant trigger is a small circle, not a labelled rectangle.
- Mobile bottom navigation remains exactly one row: Home, Companies, Jobs, Updates, Saved.

Below the first screen, the homepage currently includes:

- Interactive `Why Bharat Navya` proof story.
- Connected Describe → Evaluate → Act journey.
- `Happening in Ahmedabad` featured-status selector and public previews.
- Full status playback remains gated by Join / Sign in.
- Local events/activity, one clearly labelled sponsored unit, and a closing CTA.

### Explicit homepage anti-regressions

- Do not restore the large dark hero container.
- Do not restore the `Live on Bharat Navya` panel.
- Do not use a split left/right hero; keep the title and search centred.
- Do not add content-heavy Companies/Jobs cards.
- Do not put status rings in compact company-result rows.
- Do not use gradients, glass, generic bento grids, cultural decoration, autoplay carousels, parallax, or scroll-jacking.

## Product homepage behavior

- Header navigation to Companies or Jobs opens that product's homepage, not listings.
- A docked Companies/Jobs search replaces the full navigation inside the existing header row. The protected brand, centred query, labelled filter control, and right-side menu/account cluster must never overlap or shift sides. It must not create a second header strip.
- Expanded desktop navigation is centred independently of the brand width. At intermediate widths it collapses into the right-side menu before overlap can occur.
- At 640px and below, the dock becomes a compact sticky summary beneath the header and opens the full search in the accessible drawer.
- Company categories and company-home searches open `/companies/browse` with the relevant query/filter state.
- Recruitment role families and job-home searches open `/jobs/browse`.
- Parent search routes directly to the appropriate listing product when intent is clear; ambiguous business needs default to Companies.
- Search/filter state should survive profile/detail visits and browser Back.
- Guests may browse profiles, updates, and jobs. Save, follow, apply, review, contact, publish, and workspace actions require registration.

## Key product policies represented in the prototype

- Every normally distributed job shows salary, freshness, named recruiter, company association, and closing context.
- Applicant fit is explained through matched evidence and gaps, never an opaque percentage.
- Applications retain explicit stages and terminal closure records.
- Reviews distinguish verified platform interactions from unverified context and support owner response/report states.
- Status previews are public; opening a full story requires sign-in. Statuses expire after 24 hours unless saved to a highlight.
- Native promotions remain visibly labelled **Sponsored** and separate from organic trust styling. External partner inventory is labelled **Advertisement**, opens externally, and includes “Why this ad?”.
- Third-party ads are limited to one late slot on Companies/Jobs home and one responsive rail-or-inline slot on eligible browse pages. Main landing, Updates, profiles, comparison, inquiries, applications, messages, reviews, saved items, dashboards, workspaces, pipelines, billing, and admin decision screens are ad-free.

## Running and verification

### Install and run

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173/`.

Port 5173 was listening when this handoff was updated, but a new machine/session may need to restart the server. Before starting another process, check the port:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

### Required checks after material UI changes

```bash
npm test -- --run
npm run build
```

Last verified on 30 August 2026:

- Vitest: **20/20 tests passed**.
- TypeScript and Vite production build passed.
- `npm run validate:tokens` passed for governed design-system code and reports a ratcheted legacy CSS migration inventory.
- Latest gateway-card fix was checked in the user's actual localhost tab at a 660px CSS viewport.
- Cards were content-sized, icon/title alignment was exact, and there was no horizontal overflow.
- Desktop content-sized cards were also checked at a 1280px viewport.
- Companies, Jobs, and `/design-system` were checked at 375, 768, 1024, and 1440px with one `<main>`, no console errors, no horizontal overflow, and no visible button below 44px after the shared product-home fix.
- The Companies filter dialog and company live-update viewer now have automated checks for modal naming, initial focus, Tab wrapping where applicable, Escape dismissal, background scroll restoration, and trigger focus return.

For larger changes, also verify 375, 768, 1024, and 1440px, 200% zoom, keyboard focus, dialog focus return, reduced motion, browser Back, mobile-nav row count, and console errors.

## Technical map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | View routing, aliases, protected-view gating, shared prototype state, browser history |
| `src/components/Shell.tsx` | Shared header, desktop/mobile navigation, role/workspace shell |
| `src/components/AssistantShell.tsx` | Floating assistant UI shell; no external AI integration |
| `src/home/HomeExperience.tsx` | Parent Bharat Navya homepage |
| `src/home/home.css` | Parent/product-home styling and responsive homepage behavior |
| `src/founder/FounderExperience.tsx` | Company discovery, results, compare, profiles, inquiries, provider flows |
| `src/platform/PlatformExperience.tsx` | Jobs, updates, saved, applicant/recruiter/company workspace surfaces |
| `src/platform/platform-types.ts` | Shared platform domain interfaces |
| `src/platform/platform-fixtures.ts` | Fictional recruitment/update/workspace data |
| `src/data.ts` | Fictional company-discovery data |
| `src/design-system/tokens.css` | Primitive, semantic, and component tokens |
| `src/design-system/components.tsx` | Typed reusable controls, fields, meaning, feedback, page-header, panel, and responsive data primitives |
| `src/design-system/useModalBehavior.ts` | Shared modal keyboard, focus, scroll-lock, and focus-return behavior |
| `src/design-system/system.css` | Governed component implementation using tokens |
| `src/design-system/ComponentGallery.tsx` | Live component/state catalogue |
| `docs/DESIGN_SYSTEM.md` | Design principles, responsive behavior, accessibility, component contracts |
| `docs/BHARAT_NAVYA_DESIGN_BLUEPRINT.md` | Complete page/state inventory, journeys, later waves, dependencies, and exclusions |
| `docs/DEVELOPER_CAPABILITY_MATRIX.md` | Approved action-to-backend mapping, adjustment requirements, missing capabilities, later work, and exclusions |
| `scripts/validate-design-tokens.mjs` | Token enforcement for governed code plus legacy migration inventory |
| `docs/PLATFORM_ARCHITECTURE.md` | Product map, domain relationships, lifecycle/policy contracts |
| `src/App.test.tsx` | Current integration-style prototype tests |
| `src/ecosystem-lab/` | Archived broad-ecosystem concept; preserve but do not treat as current homepage |

## Current implementation boundary

- One React/Vite/TypeScript frontend; no backend or production services.
- Current fixtures and local state are intentional prototype tools, not API contracts to impose on the client's application.
- The client's current UI-phase build has now been inspected at `/Users/parthus/Downloads/BharatNavya-feature-ui-phase`. That was a read-only product-functionality audit, not integration work. Recheck its current routes, schemas, authentication, APIs, and functioning flows only when implementation mapping begins or the build changes.
- Preserve backend functionality that already works. Map approved UI patterns onto it and provide component contracts/integration notes instead of duplicating backend work here.

### What was retained from the developer build

Use these as evidence that product flows need designs: jobs browse/detail, employer/careers presentation, applicant and recruiter profiles, application gates, job create/edit, applicant pipeline/status management, interviews, blogs, reviews, stories/updates, advertising, and admin/moderation concepts.

Explicitly exclude its product catalogues, steel/products seed data, RFQs, quotations, purchase orders, brands, collections, consultations, lending, credit cards, mutual funds, and general commerce modules. They do not match Bharat Navya's SME/startup/company-listing and recruitment target.

## Design-system status

Canonical sources:

1. `src/design-system/` for tokens, reusable components, governed CSS, and live examples.
2. `docs/DESIGN_SYSTEM.md` for rules, contracts, governance, contribution standards, and decisions.
3. `docs/BHARAT_NAVYA_DESIGN_BLUEPRINT.md` for pages, journeys, states, priorities, exclusions, and developer dependencies.

The system is versioned at **1.4.0**. It includes governed buttons/icon buttons, text/select/textarea/checkbox/radio fields, semantic progress, badges, notices, state panels, loading skeletons, panels, responsive data lists, page headers, accessible dialogs, shared product-home patterns, governed identity/media primitives, and distinct native-promotion versus external-advertisement contracts. Active modal overlays share one keyboard/focus/scroll-lock contract. Shared navigation updates page titles, announces route changes, and restores focus after keyboard dismissal of utility popovers. New work must use the three-layer primitive → semantic → component token model and start from an approved composition pattern. A foundational change must propagate from one source rather than require screen-by-screen edits. Local exceptions require a documented reason and review date.

`npm run validate:tokens` strictly checks governed design-system/coverage code and prevents growth beyond the recorded legacy CSS baseline. Passing validation does not mean every older stylesheet is migrated; it means new debt is blocked while migration can proceed incrementally.

## Immediate next work

1. Treat the parent homepage as approved. Change it only in response to explicit feedback and preserve the compact gateway decision above.
2. Treat the approved Companies and Jobs Guided Showcase hierarchy as implemented. Future feedback should refine these pages through the shared product-home components rather than restore directory stacks or abstract hidden pathway tabs.
3. Continue shared-system migration, missing reusable states, accessibility/keyboard hardening, responsive resilience, documentation, and non-homepage journey completeness.
4. Produce missing core Companies and Jobs journeys in blueprint priority order, beginning with auth/action gates, the company discovery vs careers presentations, the complete application flow, and the corresponding applicant/recruiter workspaces.
5. Use `docs/DEVELOPER_CAPABILITY_MATRIX.md` to map each designed action to an existing developer endpoint, a required adjustment, or a missing backend capability. Do not invent production APIs inside this prototype. The two highest-priority backend corrections are canonical company identity and replacing permanent candidate/recruiter role locking with personal access plus company memberships.
6. Keep tokens, shared components, gallery examples, system documentation, decision log, and blueprint status synchronized whenever a reusable rule is added or changed.
7. Follow with chat/content/subscriptions/promotions, then admin/moderation. These remain later design waves unless the user explicitly reprioritizes them.
8. Re-run token validation, tests/build, and proportionate browser/accessibility checks after every material UI pass.

## Fresh-chat startup checklist

1. Work from `/Users/parthus/Documents/ChatGPT/BharatConnect` and read this handoff before editing.
2. Read the blueprint and design-system documentation named above; inspect `src/App.tsx` for the current route reality.
3. Run `git status --short`. The working tree contains user-owned untracked files; do not reset, delete, or mass-format them.
4. Check `lsof -nP -iTCP:5173 -sTCP:LISTEN` before starting a second dev server.
5. Run `npm run verify` before and after a material implementation pass. If verification differs from the checkpoint above, investigate current workspace state instead of assuming the handoff is newer.
6. Preserve current approved visuals. The task is to identify and design missing pieces, not to replace solid existing work.
7. For Companies or Jobs homepage feedback, edit the shared product-home patterns first when the rule is reusable; keep direct-to-results routing and organic-first trust ordering intact.

## Commercial and repository hygiene

- Contract work has been sent/completed and is outside the current product-design priority.
- `Bharat_Navya_Product_Design_Pilot_Agreement.docx` contains confidential commercial/personal information. Do not publish it, paste it into tickets, or copy its details into general product docs.
- The working tree currently contains untracked project files. Treat all existing files as user-owned work; do not delete, reset, or mass-format unrelated content.
