# BharatConnect Ecosystem Experiment — Building Guide

Status: implementation specification for the integrated **Explore** layer. It extends the current prototype without replacing or restyling its focused Phase 1 directory, shortlist, requests, or provider workspace.

## 1. Integration contract

The ecosystem is a distinct product layer inside the existing BharatConnect shell. Its fixtures, state, and visual rules remain bounded so the approved Phase 1 journey stays dependable.

| Concern | Required boundary |
| --- | --- |
| Route | Add `Explore` to the founder navigation. `/ecosystem-lab` is a direct-entry alias; `Discover` remains the focused Phase 1 directory |
| Shell | Reuse the global shell. `EcosystemExperience` owns only the contextual Explore / My business / Inbox sub-navigation |
| Styles | Import `docs/ecosystem-experiment/tokens.css` only from the experiment entry point; scope styles with `.ecosystem-lab` |
| State | Prefix all browser storage with `bharatconnect:ecosystem-lab:` |
| Fixtures | Keep in an experiment-only fixture module; do not change `src/data.ts` |
| Navigation | Extend the shared founder configuration with one `Explore` destination; retain every existing Phase 1 destination and active-match rule |
| Assets | Reference the three concept images only from experiment documentation or an experiment-only gallery |

## 2. Foundation and data contracts

### Shared business context

Every module consumes the same `BusinessContext`. This is the main protection against a disconnected super-app.

```ts
type VerificationLevel = 'unclaimed' | 'claimed' | 'identity' | 'evidence';
type OpportunityKind = 'service' | 'talent' | 'finance' | 'product' | 'update';

interface BusinessContext {
  id: string;
  name: string;
  initials: string;
  city: string;
  industries: string[];
  verification: VerificationLevel;
  gstStatus: 'verified' | 'provided' | 'not-provided';
  profileHealth: { complete: number; missing: string[] };
}

interface Evidence {
  id: string;
  label: string;
  kind: 'identity' | 'credential' | 'work' | 'availability' | 'partner' | 'product-data';
  freshness: string;
}

interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  subtitle: string;
  location?: string;
  image?: string;
  trust: VerificationLevel | 'partner-referral';
  evidence: Evidence[];
  facts: Array<{ label: string; value: string }>;
  gap?: string;
  primaryAction: { label: string; route: string };
}

interface EcosystemQuery {
  originalRequest: string;
  activeBusinessId?: string;
  inferredNeeds: OpportunityKind[];
  appliedFilters: Record<string, string[] | boolean>;
}
```

Finance results must include `partnerName`, `eligibilityState`, and `termsDisclosure`; product results must include `minimumOrderQuantity`, `taxNote`, and `leadTime`; talent results must include `availability` and `compensationRange`. Never fake a lending decision, stock state, candidate consent, or customer transaction.

### Suggested implementation modules

```text
src/ecosystem-lab/
  EcosystemExperience.tsx          // integrated view state and three conceptual screens
  ecosystem-fixtures.ts            // Aroha Foods and five opportunity types
  ecosystem-types.ts               // contracts above
  ecosystem.css                    // scoped layout rules
  screens/
    MarketplaceHome.tsx
    BusinessHub.tsx
    OpportunityNetwork.tsx
  components/
    EcosystemShell.tsx
    BusinessContextStrip.tsx
    UniversalSearch.tsx
    OpportunityRow.tsx
    OpportunityTypeLabel.tsx
    EvidenceBadge.tsx
    DisclosurePanel.tsx
    FilterRail.tsx
```

Do not create an app-wide `isEcosystem` boolean. `App` routes the three Explore views into a bounded `EcosystemExperience` tree, which passes a `BusinessContext` to its descendants.

## 3. Screen specifications

### A. Marketplace home

Purpose: answer “what can BharatConnect help my business do next?” without exposing a huge feature catalogue.

**Desktop composition**

1. 72px global header.
2. 120px top breathing room.
3. Small contextual label: `All-in-one business marketplace`.
4. Display question: `What does your business need next?`.
5. 900px maximum-width natural-language composer, 132px tall including controls. Input copy should describe a real need; its submit action is `Search`.
6. Five route prompts in a single restrained horizontal row: Find a specialist, Hire a team member, Explore finance options, Source products, Share a business update.
7. One large “real scenario” surface. Its left third describes the business need; middle shows three matching businesses; right names why they fit. This is the visual proof that the marketplace is evidence-led rather than feature-led.
8. Bottom trust band: verified identity, evidence available, secure/private.

**Interaction**

- Enter/submit sends the request to Opportunity Network with an `EcosystemQuery`.
- Selecting a route prompt pre-fills the composer then moves to Opportunity Network; it must not open a separate product.
- `View all matches` opens the same result surface with the relevant type filter applied.

### B. Business hub

Purpose: make the business profile feel like a source of useful next actions, not a profile-settings page.

**Desktop composition**

1. Header, then a full-width business context strip: Aroha Foods, verification, Ahmedabad, GST, profile health, View business profile.
2. Main grid: 8 columns left, 4 columns right.
3. Left-primary: one `Top lead for you` panel with buyer need, quantity, budget, timing, requirement chips, and Message buyer / Send quote.
4. Right stack: `Build your team`, then `Finance readiness`.
5. Lower-left: `Your catalogue pulse` with one product and meaningful operational state.
6. Lower-middle: `Finance centre` with GST/invoice hygiene, not a bank dashboard.
7. Lower-right: `Grow your business` checklist—add work sample, publish update, complete evidence review.
8. Single quiet footer statement: one verified identity connects opportunities.

**Interaction**

- Lead actions open a prototype detail/reply state.
- Hiring opens a role detail with candidates; do not build a separate recruiting shell.
- Finance opens a disclosure-first referral detail; eligibility is only a pre-check.
- Checklist items lead to profile evidence/update forms using the same BusinessContext.

### C. Opportunity Network

Purpose: make one complex need browseable across modules without flattening meaning.

**Desktop composition**

1. Header.
2. Sticky compact query strip with the original user request, Edit, Save search, Refine.
3. Three-column results workbench:
   - left: 220px filter rail;
   - centre: fluid result feed;
   - right: 280px `What we found`, `What needs confirmation`, and methodology panels.
4. The centre starts with a one-line summary: `Showing results across Services, Talent, Finance, Products and Updates`, then Sort.
5. Render at least one result of each type in this order: service, talent, finance, product, update. The type label is always visible before the business/person name.

**Filter rules**

- Filters are grouped by opportunity type, then type-specific subfilters.
- Applying a filter changes only the result feed and count, never the original request.
- The left rail can collapse to a Filters popover at ≤1024px.
- Finance filter labels must include `Partner referral`, `Working capital`, `Term loan`, and `Invoice discounting`; do not say `approved loans`.

**Mixed-feed rules**

- Service: show evidence, response, and price guidance.
- Talent: show verified candidate, role experience, availability, expected CTC.
- Finance: use amber disclosure and `View details`, not `Apply now`, unless a real regulated flow exists.
- Product: show unit price, MOQ, GST note, lead time.
- Update: show publisher, publish date, narrative outcome, and `Read story`.
- Right rail gives transparent totals by type and lists the missing information that would improve the search.

## 4. Responsive behavior

| Route | 1440px | 1024px | 768px | 375px |
| --- | --- | --- | --- | --- |
| Marketplace | Composer + prompt row + 3-part scenario band | Narrower scenario band | Prompt row wraps; scenario stacks | Horizontal prompts; trust band below fold |
| Business hub | 8/4 main grid | Main lead plus supporting column | Main lead then two-up panels | One panel per decision; checklist last |
| Opportunity network | Filter rail / feed / context | Feed + preview/context; filters popover | Filter button + feed; context below | Bottom-sheet filters, stacked opportunity surfaces |

Mobile prioritises one decision per screen: read the request, filter, inspect result, then act. It must not simply shrink desktop tables.

## 5. Implementation sequence

1. Add the Explore navigation destination, direct-entry alias, scoped token import, type contracts, and fixtures. Confirm the existing Discover, Shortlist, Requests, and provider flows still behave as before.
2. Build Marketplace Home first; validate the search-to-network handoff and the two-level navigation.
3. Build reusable opportunity primitives: type label, evidence badge, row, fact list, disclosure panel, and filter group.
4. Build Opportunity Network from those primitives; add filter and sort states using fixtures only.
5. Build Business Hub by composing the same profile context, evidence, and opportunity primitives.
6. Add mobile layouts after desktop structure is approved; do not independently redesign content models for mobile.
7. Add keyboard/focus management, reduced motion, empty/loading/error prototype states, then screenshot review.

## 6. Verification checklist

### Product integrity

- Current Phase 1 home, results, compare, profile, inquiry, provider flow, and persisted state remain intact. The only shell change is the additive `Explore` destination.
- Every ecosystem action either navigates to an intentional prototype state or is omitted.
- A user can explain why a service, talent, finance referral, product, or update appears.
- A user never mistakes a finance referral for a lending decision or a product listing for a completed transaction.

### Visual fidelity

- Header, canvas, type hierarchy, cobalt actions, verification mint, and disclosure amber match the three concept references.
- One large task owns each screen; supporting modules are secondary.
- No generic KPI card grid, gradient, glass surface, chat avatar, or India-themed decoration appears.
- Desktop screenshots at 1440px visibly match the intended structure; mobile screenshots at 375px have no horizontal overflow.

### Accessibility and quality

- Full keyboard path through global nav, global search, filters, save controls, rows, and dialogs.
- Dialog/sheet focus is trapped and restores to its trigger on close.
- All primary controls meet 44px touch target size.
- Contrast, focus ring, reduced motion, zoom at 200%, long labels, and screen-reader landmarks pass WCAG 2.2 AA checks.
- Unit tests cover query handoff, filter application/reset, type-specific disclosures, context persistence, and route isolation.
