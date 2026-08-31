# Bharat Navya universal design system

Version: **1.4.0**  
Updated: **31 August 2026**

This is the durable design and implementation contract for Bharat Navya. The code source is `src/design-system/`, and the live reference is `/design-system`. A change is incomplete until its tokens or components, documentation, live example, decision record, and verification are updated together.

## Product character

Bharat Navya is a soft editorial business index: trustworthy, energetic, professional, evidence-led, and calm under dense information. India appears through real operational context—cities, GST state, service areas, salary and rupee pricing—not decorative motifs.

The UI must not become an IndiaMART clone, a generic KPI dashboard, a card wall, or a disconnected collection of feature styles.

## Source-of-truth hierarchy

1. `src/design-system/tokens.css`: primitive, semantic, and component tokens.
2. `src/design-system/components.tsx`: typed reusable React primitives and state contracts.
3. `src/design-system/system.css`: component implementation using governed tokens.
4. `src/design-system/ComponentGallery.tsx`: visible examples of approved foundations, components, states, and page patterns.
5. This document: usage, contribution, accessibility, migration, and change-management rules.

Feature CSS may consume semantic and component tokens. It must not redefine the brand palette, type scale, control geometry, focus treatment, or state meanings.

## Token architecture

### Layer 1: primitives

Raw design values live only in `tokens.css`:

- Colour ramps
- 4px spacing scale and shared dimensions
- Typography family, size, weight, and line-height scales
- Radius and shadow scales
- Motion duration and easing
- Opacity
- Breakpoint references and container widths
- Layering/z-index
- Media ratios

Primitive names describe the value, not its use. Changing one may affect several semantic roles.

### Layer 2: semantic tokens

Semantic tokens describe product meaning:

- Canvas, surface, and soft surface
- Primary and muted text
- Border and strong border
- Action, action hover, and action soft
- Trust, warning, danger, sponsored, and third-party advertisement states
- Focus and overlay
- Page gutters, section rhythm, body type, titles, and labels

Light/dark theme changes override semantic roles rather than individual components.

### Layer 3: component tokens

Component tokens connect meaning to stable UI contracts:

- Button height, background, foreground, padding, and radius
- Field height, background, border, and focus border
- Card surface, border, padding, and radius
- Table row density
- Dialog widths
- Media aspect ratios
- Product-home search height, dock width, sticky offset, transition, drawer spacing, and evidence-row density

Feature-specific components may add component tokens only when a repeatable product need cannot be expressed with an existing token.

## Foundation rules

### Typography

- Manrope Variable is the single product family with system sans fallbacks.
- Use display only for a primary product promise, page title for one screen title, title-sm for contained sections, body for reading, label for controls, and metadata for secondary evidence.
- Do not add arbitrary font sizes to make one screen feel more important.
- Headings use compact tracking; body copy uses the shared body line height; aligned numerical data uses tabular numerals.

### Spacing and layout

- Use the 4px primitive scale.
- Public pages use the shared page gutter and maximum container width.
- Section gaps use the semantic section rhythm.
- Cards represent independent objects. Related information uses rows, sections, whitespace, and dividers.
- At 375px, use one column, drawers, bottom navigation, and record groups rather than compressed tables.
- At 768px, use expanded single-column or compact two-column compositions.
- At 1024px, search workbenches may use results plus selected detail.
- At 1440px, add decision context only when it helps the task.
- At 200% zoom, navigation and dense records must reflow without horizontal page scrolling.

### Colour and state

- Cobalt means action or current state; it is not decoration.
- Trust, warning, danger, and sponsored colours keep distinct meanings.
- Status colour is always paired with text or an icon.
- Native promoted content always includes the visible word “Sponsored”. External inventory always uses “Advertisement”, an external-link indicator, and a “Why this ad?” disclosure. Neither inherits verification styling.
- Dark mode changes semantic tokens, not the information hierarchy.

### Motion

- Use fast motion for control feedback, normal motion for component state changes, and slow motion only for contained transitions.
- Motion communicates state; it does not decorate page load.
- Reduced motion removes movement while preserving clear state changes.
- No autoplay carousels, parallax, scroll-jacking, or ornamental choreography.

### Imagery

- Use wide, card, or square media ratios from the token system.
- Images require meaningful alternative text unless decorative.
- Missing imagery must collapse gracefully; it must not leave a broken frame.
- Use authentic operational context rather than cultural decoration or generic corporate stock collages.
- `EntityLogo`, `PersonAvatar`, `MediaFrame`, `MediaStrip`, and `MediaRecord` are the canonical media primitives. Fixed ratios reserve layout space before lazy-loaded media arrives.
- Preserve deliberate missing-media records so fallback and incomplete-data behavior remain visible.

### Advertising

- `NativePromotion` is an eligible Bharat Navya company, job, or update and is labelled **Sponsored**.
- `ThirdPartyAd` is an external advertiser and is labelled **Advertisement** with external-link semantics and a “Why this ad?” disclosure.
- Third-party targeting is limited to the current public section, category or role family, and broad location. Private profiles, messages, application behavior, and applicant history are prohibited inputs.
- Main landing, profiles, job details, comparison, inquiries, applications, messages, reviews, saved items, authentication, dashboards, company workspaces, recruiter pipelines, billing, and admin decision screens are third-party-ad-free.
- Public homepages have one late monetization slot. Browse pages may have one desktop rail or one responsive inline external unit, while keeping the documented organic-distance and page caps.

## Shared component contract

All applicable controls define default, hover, focus, active, selected, disabled, loading, error, and success states.

### Controls

- `Button`: primary, secondary, quiet, and danger; small, default, and large; optional icons and loading state.
- `IconButton`: accessible name is required; small, default, and large; never use an unlabeled glyph as an action.
- `Field`: visible label, optional leading icon, hint/error association, disabled and invalid states.
- `SelectField` and `TextareaField`: use the same visible-label, hint/error, disabled, and invalid contract as `Field`.
- `CheckboxField`: visible choice label, native keyboard behavior, optional hint/error association, disabled and invalid states.
- `RadioGroup`: visible legend, native grouped keyboard behavior, optional descriptions, disabled options, and associated hint/error text.
- Icon-only actions require an accessible name and a minimum 44px target.
- Forms display field errors beside the affected control and an actionable summary for long forms.

### Meaning and feedback

- `Badge`: neutral, action, trust, warning, danger, and sponsored tones.
- `StatePanel`: empty, loading, error, restricted, and success outcomes.
- `Notice`: info, success, warning, and error outcomes; explains the outcome and optional next useful action.
- `Skeleton`: preserves the final layout and exposes one concise loading announcement instead of announcing every placeholder line.
- `ProgressBar`: native semantic progress with visible label, bounded value, and optional plain-language value text.

### Structure and data

- `PageHeader`: eyebrow, one page title, concise description, and optional actions.
- `Panel`: grouped related content; avoid nesting panels repeatedly.
- `DataList`: semantic table on larger screens and labelled record groups on mobile.
- `Dialog`: small, default, and large; traps focus, closes with Escape/backdrop where safe, locks background scroll, and returns focus to the trigger.
- Drawers must provide an explicit close action and must not hide destructive state changes.

### Domain primitives

Company, job, applicant, inquiry, review, update, promotion, pipeline, and moderation UI must reuse the shared foundations. Domain-specific variants represent stable meaning—such as application stage—not page-specific decoration.

### Product-home discovery

- `SectionHero` carries one focused promise and the primary section search.
- `SectionSearch` uses the `SectionSearchState` union so hero, compact header, and mobile drawer presentations share values and submit behavior.
- `SearchDock` registers with the shared shell only after the hero search leaves view. The inactive hero presentation is inert and hidden from assistive technology.
- Docking is deferred while focus remains inside the hero search. Reduced motion removes positional movement.
- At 1024px and above the compact search occupies the header navigation region. Below 1024px a sticky summary opens the complete search in an accessible drawer.
- `TrustContract` defines what platform trust labels mean without unsupported counts or guarantees.
- `PathwayIndex` pairs stable taxonomy with plain-language outcomes and links directly to filtered results.
- `EvidenceLedger` exposes comparable decision facts in rows rather than card walls.
- `GuidedJourney` is reserved for a genuinely ordered user journey; it is not decorative process scaffolding.

## Approved page-composition patterns

Use the smallest pattern that serves the task.

| Pattern | Required sequence |
| --- | --- |
| Public landing | Focused promise → primary task → evidence → pathways → closing action |
| Product home | Promise → search → trust contract → recognizable pathways → records → guided proof → current activity → sponsored placement → participation |
| Search and results | Query context → optional refinement → results → selected detail → decision context |
| Entity profile | Identity/trust → evidence → contextual sections → primary action |
| Multi-step form | Purpose → progress → one decision group → review → outcome |
| Dashboard overview | Urgent work → current state → recent activity → secondary management |
| List and detail | Search/filter → responsive records → selected record → accountable actions |
| Settings/profile | Context → grouped editable facts → validation → preview/save outcome |
| Feed/editorial | Scope → fresh items → source/context → clear continuation |
| Pipeline | Job scope/filter → stages → candidate detail → explicit status change |
| Admin queue | Operational context → filters → dense records → evidence → confirmed action |
| First-use empty | Why the surface matters → what will appear → one safe first action |
| Restricted | Missing permission/context → reason → allowed recovery path |

A new pattern needs a documented user need, evidence that existing patterns fail, responsive behavior, and approval in the decision log.

## Content and product rules

- Start with the user’s need, not a category tree.
- Explain evidence and gaps in plain language; never invent a fit percentage.
- Show freshness, ownership, verification, response expectations, and unknowns.
- Every normally distributed job includes salary, named recruiter, company association, publishing freshness, and closing context.
- Reviews disclose interaction context and verification state.
- Prototype-only behavior is labelled; fictional verification, billing, messaging, and moderation are never presented as live services.
- Company and recruitment experiences share one accountable company identity while using task-specific presentations.

## Accessibility contract

- Target WCAG 2.2 Level AA.
- Complete keyboard operation and visible focus are required.
- Normal text meets 4.5:1; large text and UI components meet 3:1.
- Every interactive target is at least 44px in the final interface.
- State is never communicated by colour alone.
- Forms use labels, instructions, `aria-invalid`, and associated error text.
- Multi-step navigation marks the current control with `aria-current="step"`; progress indicators expose bounded values and useful value text.
- Dialogs, drawers, tabs, pipelines, tables, and notifications require semantic and keyboard review.
- SPA navigation updates the document title, moves focus to the main landmark, and announces the new view through one polite live region.
- Utility popovers expose their expanded/controlled relationship, dismiss on Escape and outside pointer interaction, and restore focus after keyboard dismissal.
- Verify reduced motion, 200% zoom, content reflow, and long/translated strings.

## Contribution workflow

Before creating UI:

1. Choose an approved page pattern.
2. Search the live gallery and shared component exports.
3. Reuse semantic/component tokens.
4. Define loading, empty, error, restricted, success, and long-content behavior.
5. Implement responsive and keyboard behavior with the component.
6. Update this document, the live gallery, and the decision record when the system changes.
7. Run `npm run verify`.

Do not:

- Introduce raw visual values when a token exists.
- Recreate a shared component locally.
- Add a component variant for a single-page preference.
- silently replace an approved pattern.
- Remove a token or component before deprecation and migration.

Approved exceptions must include a `token-exception:` comment, a reason, owner, affected screen, and review date.

## Versioning

- Patch: implementation correction with no intended visual or behavioral change.
- Minor: additive token, component, variant, state, or pattern.
- Major: foundational visual/behavioral change or breaking component contract.

Deprecated tokens/components remain available for one migration wave and are listed here before removal.

## Design decision record

| ID | Date | Source | Decision | Scope | Migration | Verification | Supersedes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BN-DS-001 | 2026-08-29 | Product design feedback | Establish code + docs as the authoritative modular design system; consolidate before missing-page design. | Global foundations, components, docs, gallery | Progressive legacy CSS ratchet; new governed code is strict | Token validator, tests, build | Flat and locally repeated styling |
| BN-IA-002 | 2026-08-29 | Updated handoff | Keep approved live IA; document broader chat, billing, moderation, and admin surfaces as later design waves instead of silently adding routes. | Product blueprint and routing | No current route migration | Route/test review | Earlier unqualified page-expansion plan |
| BN-HOME-003 | 2026-08-29 | Approved homepage feedback | Preserve centred task-first hero, content-sized Companies/Jobs gateways, circular assistant trigger, and one-row mobile nav. | Parent homepage | None | Existing integration tests plus viewport check | Earlier content-heavy gateway concepts |
| BN-SCOPE-004 | 2026-08-29 | Product design direction | Hold Companies and Jobs homepage changes until explicit review feedback; continue only low-decision system and coverage work. | Companies home, Jobs home, current sequencing | No homepage migration | Route diff review and existing homepage tests | Earlier immediate homepage-refinement sequence |
| BN-DS-005 | 2026-08-29 | System coverage audit | Add governed icon button, select, textarea, checkbox, notice, skeleton, and accessible dialog primitives before missing-page work. | Shared components, tokens, gallery | Reuse progressively; no forced feature-page visual change | Token validator, interaction tests, build | None |
| BN-A11Y-006 | 2026-08-29 | WCAG 2.2 shared-shell audit | Use a solid semantic focus-ring token, explicitly announce loading and SPA route changes, update document titles, and make utility popovers keyboard-dismissible with focus return. | Global focus, loading primitive, route shell, header utilities | Patch existing shared behavior; no page-composition change | Focus contrast 5.91:1 light and 6.86:1 dark; 12 tests; build | Translucent focus-ring treatment |
| BN-DS-007 | 2026-08-29 | Safe-work continuation | Add governed radio-group and semantic-progress primitives; migrate the account role choice; make toast regions persistent; and expose current-step/progress semantics in existing non-homepage journeys. | Shared forms/feedback, authentication, company setup, job editor | Progressive reuse with existing visual classes retained | 13 tests; build; desktop and 375px auth-dialog QA | Local account radio markup and visual-only progress labels |
| BN-A11Y-008 | 2026-08-30 | Non-homepage overlay audit | Centralize modal focus trapping, Escape dismissal, background scroll locking, initial focus, backdrop dismissal where safe, and trigger focus restoration; apply it to governed dialogs, authentication, company filters, company live updates, and public story playback. | Shared modal behavior and active non-homepage overlays | Internal behavior consolidation with existing visual classes retained | 18 tests; TypeScript/Vite build | Duplicated or incomplete per-screen modal effects |
| BN-HOME-009 | 2026-08-30 | Approved Companies/Jobs homepage brief | Use task-first Guided Showcase homepages: familiar taxonomy and records lead discovery; proof stories explain value; section search docks into the shared header; promoted content follows organic proof. | Companies home, Jobs home, shared shell and product-home components | Replace local homepage search/category composition while preserving routes, fixtures, result/detail flows and the parent homepage | Token validation, 20 integration tests and build passed; live responsive browser QA pending installed runtime repair | BN-SCOPE-004 homepage hold |
| BN-MEDIA-010 | 2026-08-31 | Visual-evidence feedback | Treat logos, workplace/work media, portraits and thumbnails as governed evidence with stable ratios, local prototype assets, lazy loading, alt text and deliberate fallbacks. Keep all approved heroes unchanged. | Public discovery, profiles/details, feeds, saved records, applicant/recruiter and workspace identification | Add shared media primitives and expand canonical fixtures; migrate record identity progressively | Gallery and broken-image tests, token validation and build passed; live multi-viewport QA pending browser-runtime repair | Text-only record composition |
| BN-ADS-011 | 2026-08-31 | Advertising policy approval | Separate native Sponsored content from external Advertisement inventory; allow limited contextual home/browse placement while denying ads from sensitive routes and private-data targeting. | Public Companies/Jobs home and browse, Updates native feed, design system and developer contract | Replace blanket third-party exclusion with explicit formats, caps, route deny-list and disclosure | Placement/order tests, protected-route absence checks, and external-link semantics passed; live responsive QA pending | Blanket third-party banner exclusion |
| BN-HOME-012 | 2026-08-31 | Docked-header visual feedback | The section search must occupy the existing header row, never extend the header. Protect brand and utility widths; keep the hamburger in the right utility cluster; centre expanded navigation; collapse it before overlap; and provide outside/Escape dismissal with focus return. | Shared public shell and Companies/Jobs search dock | Consolidate responsive and docked navigation in `Shell`; use query plus labelled filter control while docked; retain the sticky summary only at the true mobile breakpoint (640px and below) | Token validation, 22 interaction tests and build passed | Docked search beside an unconstrained brand/navigation row |

Future feedback is added as a new row. If it changes an earlier rule, retain the earlier row and reference it in “Supersedes.”

## Migration and enforcement

`npm run validate:tokens` enforces zero raw visual declarations in governed design-system and new coverage files. Existing legacy feature CSS is inventoried as migration debt and may only decrease; it must not be copied into new work.

Migration order:

1. Canonical semantic aliases and theme values.
2. Shared controls and feedback states.
3. Repeated page headers, panels, lists, and tables.
4. Companies and Jobs product-home compositions.
5. Remaining workspaces.
6. Archived ecosystem experiment only if it returns to active scope.

The migration preserves the visual baseline. It is not authorization to redesign functioning screens.
