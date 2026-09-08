# Counter visual direction

This sidecar documents the Counter direction currently layered onto the existing Bharat Navya frontend. It is a presentation layer, not a product rewrite: changes made under this direction must preserve existing behavior and must not alter API, authentication, provider, routing, or data contracts.

## Scope

Counter applies to the public route families selected by `Navbar` and `Footer`:

- Home: `/`
- Editorial: `/blog` and `/blog/*`
- Directory: `/directory*`, `/search*`, and `/seller/*`
- Recruitment: `/recruitment` and public `/recruitment/*`, plus `/job/*` and `/employer/*`

`/recruitment/dashboard` and its descendants are explicitly excluded. Admin (`/admin*`), account/workspace dashboards (`/dashboard*`), and legacy catalogue, commerce, RFQ, or other non-Counter screens are also outside this direction. Do not broaden Counter by styling global legacy surfaces to resemble it.

## Palette

The exact source tokens live in `app/counter-direction.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--counter-ivory` | `#fffdf7` | Primary page and record surface |
| `--counter-chalk` | `#e3ddce` | Quiet selected/navigation surface |
| `--counter-line` | `#d8d0be` | Rules and borders |
| `--counter-indigo` | `#1b3fa0` | Home identity and selected recruitment records |
| `--counter-indigo-soft` | `#dbe4fb` | Soft indigo support surface |
| `--counter-green` | `#0e7a50` | Directory identity |
| `--counter-green-soft` | `#ddf0e7` | Soft directory support surface |
| `--counter-saffron` | `#ee8b1f` | Actions, emphasis, and freshness |
| `--counter-saffron-soft` | `#fcebd6` | Soft saffron support surface |
| `--counter-ink` | `#12141b` | Recruitment identity, header/footer, primary text |
| `--counter-muted` | `#565c69` | Secondary text |
| `--counter-on-ink` | `#c4c8d0` | Secondary content on ink |
| `--counter-on-indigo` | `#d6dff8` | Secondary content on indigo |
| `--counter-on-green` | `#d3ede1` | Secondary content on green |

The layer maps these values onto the existing `--bn-*` semantic variables inside Counter page wrappers. Keep new Counter work on these variables rather than adding near-duplicate colors. Supporting values already used by the layer are indigo hover `#12307e`, warm canvas `#f3eee3`, dark rule `#2c3040`, and saffron hover `#d97813`.

## Type and geometry

- **Anek Latin** is the display face for headings, the wordmark, and primary navigation. Counter headings use tight tracking and strong weight.
- **Work Sans** is the body face for copy, interface controls, labels, and metadata.
- Both fonts are loaded with `next/font/google` and exposed as `--font-anek-latin` and `--font-work-sans` in `app/layout.tsx`. Do not bypass those variables.
- Geometry is square by default: cards, controls, searches, media frames, menus, panels, and route blocks use zero radius and no decorative shadow.
- A pill is permitted only when the content is genuinely a compact status or state marker. Do not use pills for navigation, actions, filters, search examples, skills, categories, or general metadata.

## Route color roles

- Indigo is the platform and Home identity: the main hero, Home-selected states, and shared Bharat Navya record emphasis use `--counter-indigo`.
- Green is Directory-owned: Directory landings, Directory destinations, selected directory records, and inquiry surfaces use `--counter-green`.
- Ink is Recruitment-owned and the neutral dark: Recruitment destinations and ledger framing use `--counter-ink`; it also supports shared headers, footers, primary text, and neutral dark sections. Indigo remains available for selected role/detail emphasis.
- Saffron is the shared action and emphasis signal: search submits, sign-in, apply actions, active Recruitment navigation, fresh/action ledger cells, highlighted thesis text, contrast bands, and closing calls to action.

These roles carry orientation. Do not swap them for decorative variety or apply all four colors evenly to every route.

Generic public links do not default to green on hover. They inherit the foreground colour of their current surface so indigo, green, ink, saffron, and ivory regions retain their intended contrast and route ownership. Component-specific hover treatments may add movement or a surface change, but must not silently recolour the link as Directory UI.

## Home hierarchy

The shipped Home page introduces Bharat Navya and gives immediate access to its two public destinations before explaining the shared decision standard. Preserve this order when extending or reviewing it:

1. **Bharat Navya thesis, universal search, and destination gateways.** The indigo hero names Bharat Navya, states that it turns scattered signals into clearer decisions, and keeps plain-language search as the dominant action. The green `Directory` and ink `Recruitment` gateways sit directly in this hero, followed by a three-cell ledger summarising one connected company identity, four decision signals, and the principle that evidence appears before action.
2. **Interactive record standard.** The `Identity`, `Evidence`, `Context`, and `Next step` controls reveal one standard at a time, pairing documentary prototype media with a title, explanation, and three visible facts. This is the core explanation of what makes a Bharat Navya record useful.
3. **Thin listing comparison.** The saffron comparison band contrasts a name/category/location plus premature contact action with a Bharat Navya record that connects identity, supporting evidence, decision terms, and a visible next step. It should read as a difference in decision quality, not as a promise of more content volume.
4. **Interactive decision journey.** A connected four-stage rail follows the user from intent, through record inspection and comparison, to an existing structured contact or application flow. Selecting a stage updates one large counter-style focus panel and an accumulation map, reinforcing that context carries forward. Steps remain numbered and ordered; they are not independent feature cards.
5. **Optional API-backed guides.** Up to three articles with API-provided cover images may appear as supporting context. This section is supplementary, not required to understand the product, and is omitted completely when the combined seller and employer article feeds produce no eligible guides.

Status rails, public-activity feeds, and other route-specific update surfaces do not belong on Home. They remain scoped to Directory and Recruitment, where their context is clear.

The hierarchy expresses the Product principle “show useful evidence before asking people to act.” It also keeps Directory and Recruitment connected through one company identity without flattening them into one undifferentiated product.

## Home interaction and content states

- The hero universal search keeps the existing search contract. Once the search form itself clears the public header threshold, it transfers to the docked search treatment; supporting example searches do not delay the handoff. While focus remains inside the hero search, docking is deferred. When docked, the original form is marked inert and hidden from assistive technology to avoid duplicate search landmarks while the example buttons remain available.
- Each record-standard control responds to click, pointer hover, and keyboard focus. The selected control exposes `aria-pressed="true"`; the associated record updates in an `aria-live="polite"` region. Selection changes the record, not the page route.
- The record transition is a brief reveal. Journey stages respond to click, pointer hover, and keyboard focus; the selected button exposes `aria-pressed="true"`, controls the labelled live region, and updates the progress rail and accumulation map. None of these effects carries information that is absent from labels or source order.
- The standard’s documentary images are explicitly passed as `source: "prototype"` with the attribution `Prototype evidence media`. Do not relabel them as verified customer work, live company submissions, or API evidence.
- Guide images are explicitly marked as API-sourced article media. Guides render only for returned articles that include a cover image, and the entire optional guides section stays hidden when that filtered set is empty.
- Destination links retain visible route names and supporting descriptions; their icons are decorative and hidden from assistive technology.

## Motion

Counter favors direct state change over decorative movement. The two Home gateways use one restrained feedback sequence on hover and keyboard focus: a short lift, a slight icon/title separation, and a route-owned surface shift. The docked search uses a short upward reveal so the hero-to-header transfer is perceptible. Result rows remain flat. Motion may clarify interaction or loading state, but must not be required to understand content.

Under `prefers-reduced-motion: reduce`, Counter public header and page descendants use automatic scrolling, `0.01ms` transition and animation durations, and a single animation iteration. New motion inside the scoped families must honor the same rule.

## Responsive behavior

- Desktop presents a 4.25rem ink service header, wide search counters, and two equal destination blocks.
- At `899px` and below, the mobile navigation remains square; its active item uses the chalk surface and ink text.
- On Home at `899px` and below, the standard and thin-listing comparison collapse from split layouts to one column. The four standard controls move from a vertical rail to a horizontal four-column row above the active record.
- At `640px` and below, hero spacing and display size reduce, the hero ledger becomes three stacked rows, and the standard controls become a two-by-two grid with secondary signal labels hidden. The active record uses a shorter media region and its three visible facts stack into rows.
- At the same mobile breakpoint, the hero Directory and Recruitment links become stacked full-width rows with smaller icons, the thin-listing comparison becomes a single column, and search geometry stays square. The journey keeps its four-stage rail while the active count, copy, and accumulation map stack into one readable column.
- The underlying Directory and Recruitment styles retain their own responsive grid collapses. Counter overrides their visual treatment without replacing their content hierarchy or interaction logic.
- Preserve readable source order, touch targets, keyboard access, and zero horizontal page overflow at every breakpoint.

## Implementation entry points

- `app/counter-direction.css` — Counter tokens, wrapper overrides, route colors, square geometry, responsive rules, and reduced-motion behavior. It is imported after the existing public page styles so it can act as a scoped finishing layer.
- `app/layout.tsx` — loads Anek Latin and Work Sans, publishes their CSS variables, and imports the Counter layer. Existing providers and global feature components remain unchanged.
- `components/Navbar.tsx` — computes the `is-counter-public` shell class from the pathname and excludes `/recruitment/dashboard*`.
- `components/Footer.tsx` — mirrors the same public route scope for the service-frame footer.
- Page wrappers such as `.le-page`, `.directory-design`, `.recruitment-design`, `.recruitment-core`, and `.counter-public-page` — contain Counter overrides and prevent leakage into excluded routes.

Keep Navbar and Footer route predicates aligned when adding an approved public Counter route.

## Verification

Run from `frontend/`:

```sh
npm run validate:design
npm run build
npm run dev
```

Then verify `/`, `/directory`, `/search`, `/seller/[slug]`, `/recruitment`, `/recruitment/jobs`, `/job/[id]`, `/employer/[slug]`, and `/blog` at desktop and mobile widths. Confirm route color ownership, square controls, docked search behavior, keyboard focus, reduced motion, and no horizontal overflow. Also visit `/dashboard`, `/recruitment/dashboard`, and `/admin` to confirm the Counter shell and page treatment do not leak into excluded areas.
