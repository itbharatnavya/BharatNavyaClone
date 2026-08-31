# BharatConnect Prototype Audit

Date: 20 August 2026  
Scope: current clickable prototype compared with `PRODUCT.md`, `DESIGN.md`, the Intentional Redesign Plan, and the original Business Index concept image.

> **QA status correction — 21 August 2026.** This report is not a release sign-off. A follow-up browser check exposed a primary-button cascade defect on the provider activation banner that this report failed to identify: warning-coloured text was inherited into a cobalt action, making “Continue setup” illegible. The fix now explicitly sets legacy primary-action foregrounds outside the legacy cascade layer, and the rendered provider button was rechecked as white text on cobalt. The earlier claims that all primary contrast pairs and all breakpoints had passed must be treated as superseded until the full regression sweep is redone.

## Follow-up findings (open and verified)

| Finding | Status | Evidence / next action |
| --- | --- | --- |
| Provider “Continue setup” text inherited amber warning ink | Fixed and browser-verified | Rendered foreground is now `rgb(255, 255, 255)` on `rgb(39, 91, 214)`. |
| Founder profile has two “Send inquiry” entry points | Intentional but needs product review | Header action and contextual side-panel action both lead to the same composer. They are geometrically within their containers on the checked desktop state, but the duplicate CTA may feel redundant and should be consolidated if that is what you are flagging. |
| Legacy and current style systems coexist | Open architecture risk | `@layer legacy` and the newer component system can still create cascade surprises. The activation-banner bug came from this boundary. Remove or migrate the remaining legacy provider styles before calling the UI polished. |
| Desktop visual checks | Partially complete | Find, results, profile, inquiry, and provider dashboard were inspected at the live browser’s 1280px desktop viewport. Mobile visual verification has not been repeated in this follow-up. |

## What this audit has *not* established

- It has not established that every button state, breakpoint, or scroll state is correct.
- It has not established WCAG compliance; automated static checks are not a substitute for rendered contrast and assistive-technology testing.
- It has not established that the duplicate profile inquiry actions are the placement problem you observed without the exact screen state.

## Regression QA — 22 August 2026

This is the first rendered-browser regression pass after the status correction above. It is deliberately recorded as a test log, not a design approval.

### Fixed during this pass

1. **Duplicate accessible filter-dismiss controls.** Both the backdrop and close icon announced “Close filters.” The backdrop is now presentation-only, so each filter sheet/dialog exposes one keyboard-reachable close action.
2. **Mobile inquiry confirmation covered the screen.** Conflicting style systems collapsed the confirmation into a tall, narrow overlay. It is now a 60px, full-width bottom message that stays inside the 375px viewport.
3. **Dark-mode primary-action contrast.** Founder and ecosystem primary actions rendered white on light cobalt (`2.44:1`). Their dark-theme foreground is now near-black (`7.50:1`).
4. **Mobile touch-target sizing.** Suggested queries and the compact submit action were 38px high; both are now 44px at the mobile breakpoint.

### Rendered paths checked

| Area | Viewports | Verified behavior |
| --- | --- | --- |
| Founder discovery | 1440, 375 | One main heading; no horizontal overflow; composer and prompt actions work; mobile touch targets are 44px. |
| Results and filters | 1440, 1024, 768, 375 | Direct search reaches results; filters open and close; exactly one accessible dismiss action; shortlist and comparison remain reachable; no horizontal overflow. |
| Profile and inquiry | 1440 | Both profile inquiry actions sit inside their parent containers; composer submits and creates a request confirmation. |
| Requests | 1440 | Newly sent inquiry appears after the confirmation flow. |
| Provider workspace | 1024, 375 | Sidebar expands/collapses from 240px to 72px and persisted after reload; mobile switches to its bottom navigation; no horizontal overflow. |
| Opportunity Network | 375 | A financing query routes to the mixed opportunity surface; mobile filters expose one close action; no horizontal overflow. |
| Theme and runtime | 1024, 375 | Light/dark toggle works; inspected primary-action contrast passes at 7.50:1 after the fixes; browser console had zero errors. |

### Automated checks

- `npm test -- --run`: **5/5 passing**.
- `npm run build`: **passing**.
- Static contrast checker: **5/5 explicit CSS pairs pass AA**.
- Static accessibility scanner still reports 25 source-level findings. It scans individual component files rather than the rendered composition, so it falsely flags the shared shell's `<main>`, skip link, and navigation as absent in child files. Its heading counts likewise aggregate alternative route components; it also does not recognise React's `tabIndex={-1}` on the aria-hidden pointer backdrop. These findings are not a WCAG sign-off; assistive-technology testing remains outstanding.

### Remaining QA boundaries

- Keyboard tab-order and screen-reader behavior still require a manual assistive-technology pass.
- The provider onboarding’s individual form-validation/error states have not been exhaustively exercised in this pass.
- The duplicate profile “Send inquiry” entry points are geometrically correct, but still deserve an intentional product decision: retain both as contextual entry points, or consolidate to one.

## Executive finding

The product concept was present, but the founder flow had drifted from the approved interaction model and visual reference. Discovery sent users through an unnecessary form-like interruption, suggested prompts were visually disconnected from the composer, the next dark section leaked into the first viewport, and results became a stack of oversized horizontal cards instead of an index with persistent comparison context.

The founder journey has now been corrected around the intended model: natural-language request → immediate evidence-led results → optional refinement → shortlist/compare → profile → inquiry. Results now use a responsive Business Index with compact listings, a selected-business evidence view, and decision context at wide desktop sizes.

## Audit score

Scores use a 0–4 scale.

| Dimension | Before | Current | Notes |
| --- | ---: | ---: | --- |
| Visual hierarchy | 2 | 4 | Search is dominant; result information now has a predictable scan order. |
| Product alignment | 2 | 4 | The query now goes directly to results and criteria are optional. |
| Responsive structure | 2 | 4 | One-column at 375/768, two-column at 1024, three-column at 1440. |
| Interaction coherence | 2 | 4 | Filters, selected result, shortlist, compare, inquiry, requests, and sidebar controls have intentional behavior. |
| Accessibility readiness | 2 | 3 | Core landmarks, keyboard controls, focus, contrast, target sizes, and reduced motion are covered; formal screen-reader testing is still required. |

## Findings and resolutions

### P0 — flow and broken-state issues

1. **The natural-language entry did not feel direct.** A user could be asked to review a multi-field brief before seeing any value.
   - Resolved: submitting the composer now opens results immediately.
   - Refinement remains available through Filters → Edit search details.

2. **New pages inherited the previous page's scroll position during a smooth transition.** This could make comparison, profile, or inquiry screens initially appear clipped or broken.
   - Resolved: route changes now reset scroll immediately, then move focus to the main content landmark.

3. **The profile shortlist action appeared blank on the dark profile hero.** The white secondary button inherited white text.
   - Resolved: secondary buttons now define an explicit near-black text color.

4. **The comparison header behaved like a sticky grid cell and could cover or visually clip the first evidence row.**
   - Resolved: business headers are now static within their comparison columns; evidence rows align without overlap.

### P1 — visual and usability issues

1. **Results did not resemble the ideated Business Index.** Full-width cards made the page long, repetitive, and weak for comparison.
   - Resolved: desktop results now use a compact list on the left, selected business details in the centre, and brief/decision context on the right.
   - At 1024px the context column is removed; at 820px and below the experience becomes a compact evidence list.

2. **Suggested queries were too far from the composer.** Their relationship to the input was unclear.
   - Resolved: prompts now sit directly under the composer with a small “Try asking” label. On mobile they become a horizontal, touch-friendly row.

3. **The dark trust section was partially visible in the initial viewport.** It looked accidentally cut off instead of intentionally revealed by scrolling.
   - Resolved: the discovery hero occupies the first viewport; the trust story begins below it.

4. **The shortlist tray obscured result content.**
   - Resolved: it is now an inline result-region action bar and reserves its own space.

5. **Compact result actions were below the 44px touch-target requirement.**
   - Resolved: shortlist and mobile profile actions now meet the 44px minimum.

6. **The business profile produced two level-one headings.**
   - Resolved: the page context is styled text and the business name is the single `h1`.

### P2 — architecture and future hardening

1. The current `App.tsx` still contains legacy founder components and the stylesheet retains a legacy layer. They are tree-shaken or overridden, but they increase maintenance risk and should be removed after visual approval.
2. The provider workspace is functional—create/claim, four-step setup, preview/publish, lead detail/response, persisted draft, and collapsible navigation—but it has not yet inherited the full founder-side visual refinement. This respects the founder-first staging decision; it is the next design phase.
3. Authentication gates, real verification, uploads, messaging, AI extraction, and backend behavior remain intentionally simulated.
4. Fixture filters demonstrate refinement and a clear empty-state component, but the present four-business fixture does not naturally exercise every many/few/no-result combination. Add dedicated scenario fixtures before moderated testing.

## Feature alignment

| Vision capability | Prototype status |
| --- | --- |
| Natural-language discovery | Functional; direct to results |
| Optional guided brief | Functional through filter drawer |
| Evidence-led ranked index | Functional; no opaque scores |
| Shortlist up to three | Functional and persisted |
| Side-by-side comparison | Functional and responsive |
| Full business profile | Functional, with evidence and gaps |
| Structured inquiry | Functional prototype with contact preference and attachment state |
| Requests inbox | Functional lightweight record |
| Create or claim listing | Functional prototype |
| Four-step provider onboarding | Functional and resumable |
| Verification states | Visible in founder and provider surfaces |
| Provider lead response | Functional prototype |
| Recruitment, loans, stories, AI collateral, ads, subscriptions, commerce | Correctly absent from Phase 1 navigation |

## Verification completed

- Browser-reviewed at 375×812, 768×900, 1024×900, and 1440×900.
- No horizontal overflow on reviewed founder and provider screens.
- Discovery trust section starts below the initial viewport.
- Results switch from one to two to three columns at the intended breakpoints.
- Profile actions have visible text and 50px height.
- Provider sidebar expands from 72px to 240px and keeps the correct accessible label.
- Primary foreground/background pairs pass WCAG AA contrast.
- Reduced-motion overrides are present.
- Automated tests and production build pass.

## Recommended next checkpoint

Review the founder discovery, results, comparison, profile, and inquiry screens as one continuous demo. Once that system is approved, remove the legacy founder code and propagate the same typography, material, density, and evidence hierarchy into provider onboarding and leads.
