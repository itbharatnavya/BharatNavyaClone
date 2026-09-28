# BharatConnect Ecosystem Experiment — Design System

Status: exploratory ecosystem layer, integrated under **Explore**. It complements the existing Phase 1 founder-directory experience without replacing or restyling its established Discover journey.

Reference concepts:

- Marketplace home: `/Users/parthus/.codex/generated_images/01a01e77-5e03-7391-9fde-786ebed8885a/exec-5d21a3a0-e74d-44b2-90e4-7cb129031d9d.png`
- Business hub: `/Users/parthus/.codex/generated_images/01a01e77-5e03-7391-9fde-786ebed8885a/exec-5fcebf97-5f39-4b63-a83b-4213d2e7e27e.png`
- Opportunity network: `/Users/parthus/.codex/generated_images/01a01e77-5e03-7391-9fde-786ebed8885a/exec-c28aeaae-5f09-4f79-bf43-916b60b52552.png`

## 1. Product expression

### Design thesis

**One verified business identity. Many relevant opportunities.** BharatConnect is not a collection of mini-products. It is an all-in-one marketplace whose modules are connected by one business context: identity, industry, location, evidence, intent, capability, and relationships.

### Experience rules

1. The global search understands the need first; modules are a consequence of the request.
2. The active business profile is always available as context but never dominates the task.
3. Every result identifies its type: Service, Talent, Finance referral, Product, or Update.
4. Verification, evidence, partner status, pricing certainty, and eligibility must be explicit. Never use a magic match score.
5. The page has one primary job. Supporting opportunities are adjacent, not equal-weight feature cards.
6. India appears through real operational language—cities, GST, ₹, local compliance—not visual motifs.

### What to avoid

- Seven top-level navigation items, each with equal visual weight.
- A universal dashboard of metric tiles.
- A dark, gradient-heavy “AI business OS.”
- Chatbot avatars, vague AI badges, or unexplainable recommendations.
- Finance offers that imply approval; use **Partner referral** and **Eligibility to confirm**.
- Cards for every fragment of information. Use rows, grouped surfaces, and whitespace first.

## 2. Token system

Use [`tokens.css`](./tokens.css) as the source of truth. Do not put raw colour, radius, spacing, or timing values in components. Tokens have three layers:

| Layer | Rule | Example |
| --- | --- | --- |
| Primitive | Raw value; rarely changed | `--bc-blue-600` |
| Semantic | Intent; used by layouts and states | `--color-action` |
| Component | Local override only | `--button-radius` |

### Theme mode

Light is the default. Dark mode retains the same hierarchy: near-black canvas, lifted charcoal surfaces, cobalt action, mint verification, and amber uncertainty. It is a persisted user preference; it must update semantic tokens, overlays, borders, focus states, fields, sheets, and result surfaces together. Never invert individual cards while leaving the surrounding shell light.

### Colour roles

| Role | Token | Usage |
| --- | --- | --- |
| Canvas | `--color-canvas` | Whole-page backdrop |
| Surface | `--color-surface` | Header, panels, cards, sheets |
| Action | `--color-action` | One primary action per region, active nav, focus context |
| Verified | `--color-success` / subtle | Checked identity, credentials, availability evidence |
| Uncertain | `--color-warning` / subtle | Gaps, disclosures, incomplete information |
| Talent | `--color-talent` | Type icon/label only |
| Finance | `--color-finance` | Type icon/label only |
| Product | `--color-product` | Type icon/label only |
| Update | `--color-update` | Type icon/label only |

Module colours must stay in icons, 1–2 word labels, or pale supporting surfaces. Cobalt remains the shared action colour, so a finance result should not turn the whole page purple.

### Typography

Use Manrope Variable. The feel is compact and capable, not oversized or overly editorial.

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Display | 44/48 desktop; 32/38 mobile | 800 | Marketplace question only |
| Page title | 32/38 | 800 | Business hub, opportunity page |
| Section title | 20/28 | 800 | `Top lead for you`, `What we found` |
| Card title | 16/23 | 700 | Result, opportunity, catalogue item |
| Body | 14/21 | 500 | Explanations, summary copy |
| UI label | 12/16 | 700 | Type labels, field labels, badges |
| Metadata | 12/18 | 600 | Location, response time, date, pricing qualifiers |

Use tight tracking only on display/page titles. Use tabular numerals for money, quantities, dates, and status counts. Copy should say exactly what the system knows; labels such as “Potential fit” need a reason next to them.

### Spacing and shape

Use a 4px base. Default gaps: 8px within an atom, 12px inside a control, 16px between related elements, 24px within a panel, 32px between sections, 48px between page bands.

| Element | Radius | Notes |
| --- | --- | --- |
| Icon button, small chip | 10–12px | Never pill-shaped unless it is status text |
| Input, filter, prompt chip | 16px | Compact and approachable |
| Listing/card | 16–20px | Use 16px when part of a repeated list |
| Major profile/hero surface | 24px | Do not use more than one per viewport |
| Badge/status | Full pill | Compact text-plus-icon only |

### Depth

Borders establish most boundaries. Use `--bc-shadow-1` on independent interactive surfaces; use `--bc-shadow-2` only for sticky search bars, floating action trays, and popovers. Never stack a border, heavy shadow, coloured fill, and radius merely to make a region visible.

## 3. Shared shell

### Desktop header

Height: 72px. White surface, bottom border, no shadow. Contents are ordered:

1. BharatConnect mark and wordmark.
2. Context label only when useful: `Business Hub` or `Opportunity Network`.
3. Global search (420–520px), with `⌘K` hint on desktop.
4. Three global destinations: Explore, My business, Inbox.
5. Notification icon and account menu.

Only the current global destination receives the cobalt underline. No secondary sidebar exists on Marketplace or Business Hub.

### Global search

The global search is for recall, not the main task composer. It accepts services, products, businesses, insights, and people. Height 44px; 16px radius; search icon at left; no giant gradient or AI flourish.

### Business context

When a user has a business, its context is rendered as a compact profile strip: logo/initial, business name, verification badge, city, GST/identity evidence, and a small profile-health indicator. It is never a permanent left rail.

### Mobile shell

Header: brand, contextual utility, account. Bottom navigation: Explore, My business, Inbox, Search. Opportunity-type filters open a bottom sheet. Global search becomes a full-screen search state. Keep a single bottom navigation; do not duplicate global header destinations inside a drawer.

## 4. Core components

### Buttons

All tappable controls are at least 44px high/wide; target and visible surface may differ only when the target has a clear accessible name.

| Variant | Use | Visual |
| --- | --- | --- |
| Primary | Commit: Search, Send quote, View offer | Cobalt fill, white text |
| Secondary | Meaningful secondary action | White fill, strong border, ink text |
| Quiet | Inline/local action | Transparent, cobalt/ink text |
| Icon | Save, close, notifications | 44×44, bordered only when it needs a boundary |
| Destructive | Remove/decline | Red text or fill only after confirmation |

Hover: slightly darker fill or stronger border. Active: `scale(.98)`. Focus: `--focus-ring`. Disabled: opacity 55%, retains legibility. Loading: keep label, replace leading icon with spinner, expose `aria-busy`.

### Evidence badge

Pill, 22–24px high, icon plus text. Use only for a declared proof state:

- `Verified identity` — business/person identity checked.
- `Evidence available` — credential, work sample, or record exists.
- `Partner referral` — BharatConnect is introducing a third party; it is not a loan approval.
- `Eligibility to confirm` — data is incomplete or outcome remains external.
- `Unclaimed listing` — business information may be incomplete.

Do not use `Trusted`, `AI verified`, `Best`, or a percentage score without clear evidence.

### Opportunity row

The core result component is a row, not a generic card.

| Zone | Content |
| --- | --- |
| Type + identity | 72px thumbnail/initial, type label, name, trust badge, location, short capability statement |
| Proof | Two to four concrete proof chips or lines |
| Decision facts | Price/CTC/amount, response or availability, certainty note |
| Actions | One explicit action and Save icon |

Desktop height: 150–176px; repeated rows share 1px dividers. On mobile, the row becomes a 16px-radius independent surface with type, identity, first proof, key decision fact, and one action. Never force five columns onto mobile.

### Type treatment

| Type | Label | Primary evidence |
| --- | --- | --- |
| Service | `SERVICE · PACKAGING SUPPLIER` | Credentials, work, response, price guidance |
| Talent | `TALENT · OPERATIONS MANAGER` | Experience, availability, salary expectation, identity |
| Finance | `FINANCE · WORKING CAPITAL` | Partner/referral status, range, requirements, external terms |
| Product | `PRODUCT · SUSTAINABLE PACKAGING` | MOQ, unit price, GST, lead time, supplier identity |
| Update | `UPDATE · CASE STUDY` | Publisher, date, related business/service, outcome disclosure |

### Panels

Use panels for independent decision groups: profile context, active lead, finance readiness, checklist, right-side explanation. Standard padding 24px desktop / 20px mobile; `--panel-radius`; `--color-border`; white surface. A panel must own a clear decision or task.

### Filters and sheets

Desktop Opportunity Network uses a 220px left filter rail inside the page—not a permanent app sidebar. It has grouped filter sections, counts, clear all, and one verified-only toggle. Mobile filters use a modal bottom sheet with Apply and Reset controls. Applied filters appear below the query as removable chips.

### Disclosure panel

Use amber only where a user needs to resolve uncertainty. Anatomy: alert icon, sentence naming the unknown, 2–4 specific missing inputs, and `Update details`. It is not an error state and must not block browsing.

## 5. Motion, responsiveness, and accessibility

### Motion

- Controls: 160ms colour/border/shadow transition.
- Sheets, drawers, route-local panels: 200ms ease-out, interruptible.
- Save/select feedback: 160ms opacity/scale only.
- Do not animate on first paint or make large cards float.
- Respect `prefers-reduced-motion`; movement becomes an immediate state change.

### Breakpoints

| Viewport | Marketplace | Business hub | Opportunity network |
| --- | --- | --- | --- |
| 1440+ | 12-column, central composer, wide scenario band | Main lead plus two supporting columns | 220px filters / fluid results / 280px context |
| 1024–1439 | Same hierarchy, tightened gutters | Main lead plus one supporting column | Filters collapse into popover; context remains if width allows |
| 768–1023 | Composer first, routes wrap to two rows | Single lead then two-column supporting panels | Results list plus filter button; context moves below results |
| 375–767 | Full-width composer, horizontal route chips | One task/decision per panel | Bottom-sheet filters, stacked result surfaces, explanation after list |

At 200% zoom, every section must reflow without horizontal page overflow. Long business names wrap; money, status, and actions move to a new line rather than truncate meaning.

### Accessibility baseline

- One visible `h1` per route; headings follow a logical sequence.
- Native buttons, links, inputs, checkboxes, radios, selects, and dialogs.
- Visible focus ring with 3:1 contrast, keyboard access to every filter and save action.
- Labels remain visible; placeholders never carry the only label.
- Badge colour is always paired with icon and wording.
- AA minimum contrast: 4.5:1 normal text; 3:1 controls, large text, and focus indicator.
- Results announce count changes through a polite live region; filter dialog restores focus to its trigger.
