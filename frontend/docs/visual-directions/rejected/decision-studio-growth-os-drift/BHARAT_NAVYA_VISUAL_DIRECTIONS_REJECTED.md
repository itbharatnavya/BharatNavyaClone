# Bharat Navya visual direction exploration

Status: concept exploration, not production UI  
Branch: `design`  
Baseline: the current implemented homepage remains the control and is not one of the four options.

## Purpose and boundaries

This study explores four materially different ways Bharat Navya could express the same public product: Home, Companies, and Jobs. Each direction includes AI-assisted discovery, useful editorial content, public business activity, and clearly separated sponsorship. The concepts must make the product easier to understand or use; visual novelty alone is not a feature.

This phase does not change application code, APIs, routes, authentication, schemas, or backend behavior. It does not add catalogue, RFQ, lending, commerce, consultation, or candidate-marketplace journeys. `Design/` remains frozen.

The intended audience is an Indian founder, operator, service buyer, job seeker, or hiring team that needs credible context before acting. India should appear through realistic company names, cities, work, and employment context—not flags, monuments, folk motifs, maps used as decoration, or tricolour styling. The supplied Bharat Navya mark remains a small identity anchor; its colors must not be expanded into page decoration.

## Shared product contract

### AI

- Accept a need in natural language and translate it into visible, editable criteria.
- Show which profile, job, review, or article facts support a suggestion.
- Label low confidence, missing information, illustrative states, and stale signals.
- Let the user refine criteria without restarting.
- Draft inquiries or applications only after the user asks; require review and approval before sending.
- Never invent verification, silently alter organic ranking, auto-apply, auto-contact, or present illustrative data as live.

### Editorial and activity

- Guides answer a decision question and connect to relevant companies or jobs.
- Every article exposes author, date, topic, reading time, and related records.
- AI summaries remain labelled summaries and link back to the source article.
- Public activity may include company updates, verified reviews, completed work, new roles, and application-closing dates.
- Private inquiries, applications, messages, and behavioural surveillance never appear publicly.

### Sponsorship

- Use only the labels `Sponsored` or `Advertisement`.
- Keep sponsorship visually separate from verification, evidence, match explanations, and organic position.
- No ads inside inquiry/application steps, private communication, or trust panels.
- No pop-ups, prestitials, autoplay sound, sticky takeovers, deceptive controls, or ad-heavy screens.
- A sponsor may provide relevant educational or operational content, but payment never creates a trust badge.

### Accessibility and responsive quality

- Maintain legible contrast, visible focus treatment, 44px mobile targets, sensible reading order, and no horizontal overflow.
- Motion is optional enhancement and must respect reduced-motion preferences.
- Mobile is recomposed, not a scaled desktop screenshot.
- Status cannot rely on color alone; use text, icon, or structure as a second signal.

## Direction 01 — Decision Studio

### Thesis

Turn an ambiguous business need into a decision-ready brief. The hero is not a chatbot; it is a visible transformation from the user's words to editable requirements and evidence rules.

### Visual system

| Role | Value |
| --- | --- |
| Midnight Ink | `#151927` |
| Signal Blue | `#3B63F3` |
| Volt | `#C7E85A` |
| Mist | `#F2F5FA` |
| White | `#FFFFFF` |
| Display | Space Grotesk, 600–700 |
| Body | DM Sans, 400–600 |
| Utility/data | IBM Plex Mono, 500 |

Signal Blue carries actions and selection. Volt is restricted to active criteria, useful deltas, and one small status accent; it never becomes a large background. Midnight Ink anchors the decision canvas without turning the entire product into a dark theme.

### Signature layout

```text
DESKTOP HOME
┌──────────────────────────────────────────────────────────────┐
│ logo      Home  Companies  Jobs             Join / Sign in │
├────────────────────────┬─────────────────────────────────────┤
│ Make the next decision │ DECISION BRIEF                     │
│ with better context.   │ Need · location · budget · proof   │
│ [natural language box] │ editable criteria + confidence     │
│ [Build my brief]       │ sources used + missing information │
├────────────────────────┴─────────────────────────────────────┤
│ Company proof     Current jobs     Practical guides         │
├───────────────────────────────────┬──────────────────────────┤
│ Public activity                   │ Sponsored · clearly set │
└───────────────────────────────────┴──────────────────────────┘
```

The desktop product screen uses a three-part working surface: editable criteria, organic results, and a comparison drawer. Match explanations cite visible evidence such as verified identity, capability, recent work, location, and response information. No invented numerical fit score is shown.

On mobile, the brief becomes a sequence of stacked cards: request, interpreted criteria, evidence requirements, and suggested next step. The primary action remains visible without a sticky takeover.

### Direction-specific feature expression

- **AI:** `Build my brief` parses the request into removable criteria and an evidence checklist. `Why shown` opens a plain-language evidence explanation.
- **Blogs:** `Decision notes` answer questions such as how to evaluate a packaging partner or what to check before applying to a startup role.
- **Activity:** compact, time-stamped records show new work evidence, verified reviews, and closing roles.
- **Ads:** one bordered sponsor capsule appears after organic proof, never inside results or comparison.

### Risks and controls

- Risk: the canvas looks like a complex enterprise dashboard. Control: one dominant task, progressive disclosure, and no decorative analytics.
- Risk: Volt plus dark ink resembles generic AI tooling. Control: Volt stays below 5% of the visible surface; the signature is editable evidence structure, not neon styling.
- Risk: AI appears authoritative. Control: show uncertainty, sources used, and missing evidence beside the criteria.

## Direction 02 — Editorial Exchange

### Thesis

Make Bharat Navya feel like a living business publication whose stories lead directly to credible companies, current roles, and useful action.

### Visual system

| Role | Value |
| --- | --- |
| Ice | `#EAF4F6` |
| Petrol | `#174E5B` |
| Marigold | `#F4B942` |
| Berry | `#A83F62` |
| Ink | `#18242A` |
| Display | Archivo Variable, 600–800 |
| Editorial | Source Serif 4, 500–700 |
| UI | Public Sans, 400–700 |

### Signature

An asymmetric `Today in business` rail combines a lead company story, one useful guide, current roles, and verified activity. The composition is editorial but not a newspaper pastiche: generous image fields, strong blocks, and restrained dividers replace dense broadsheet columns.

- **AI:** `Brief me` produces a labelled summary with linked sources and related records.
- **Blogs:** first-class authored guides with decisions and next actions.
- **Activity:** photo-led company updates and recent verified client context.
- **Ads:** a full-width `Sponsored studio` card between editorial modules, visibly different from an article and excluded from recommendations.
- **Product screen:** a company dossier with capabilities, selected work, reviews, updates, related guides, current roles, and structured inquiry.
- **Mobile:** cover-story hierarchy becomes a swipe-free vertical reading sequence with persistent topic labels.

Primary risk: becoming a content site rather than a decision product. Control: every story ends with explicit related records and a useful action.

## Direction 03 — Opportunity Pulse

### Thesis

Organise Bharat Navya around time: what is new, what is closing, what changed, and what needs a response.

### Visual system

| Role | Value |
| --- | --- |
| Night Blue | `#172A46` |
| Cobalt | `#4169E1` |
| Coral | `#FF745E` |
| Aqua | `#8EE3D1` |
| Cloud | `#F5F7FA` |
| Display | Sora, 600–700 |
| Body | Noto Sans, 400–700 |
| Utility/data | IBM Plex Mono, 500 |

### Signature

A single controlled pulse line structures fresh company evidence, new jobs, deadlines, and guides. It moves only when new information enters; reduced motion turns it into a static timeline.

- **AI:** a transparent `Today's brief` groups new opportunities by saved intent and explains why each item changed.
- **Blogs:** time-sensitive explainers appear beside relevant deadlines or market changes.
- **Activity:** freshness and closure states are primary information, not decorative badges.
- **Ads:** sponsor spotlights sit outside the organic pulse and never inherit its urgency indicators.
- **Product screen:** Jobs discovery and application tracking with salary/workplace context, fit factors, posted/closing dates, and terminal outcomes.
- **Mobile:** a chronological card stream with explicit filters and no infinite-scroll pressure.

Primary risk: urgency becoming anxiety. Control: no countdown gimmicks, red-alert styling, or engagement streaks.

## Direction 04 — Business Atlas

### Thesis

Show how companies, services, roles, locations, and knowledge connect, then let AI chart an understandable route through those relationships.

### Visual system

| Role | Value |
| --- | --- |
| Cool Stone | `#EEF0EC` |
| Forest | `#1F5B4A` |
| Cobalt | `#2E5CCB` |
| Ember | `#E5683C` |
| Graphite | `#1F252A` |
| Display | Bricolage Grotesque, 600–700 |
| Body | Atkinson Hyperlegible, 400–700 |
| Utility/data | Roboto Mono, 500 |

### Signature

A relationship canvas connects an entered need to service families, credible companies, current roles, and relevant guides. It is a structured topology, not a decorative geographical map.

- **AI:** `Route this need` produces an editable path with confidence and missing-evidence markers.
- **Blogs:** contextual field notes appear at the relationship where they help.
- **Activity:** newly active nodes reveal recent public changes without exposing private behaviour.
- **Ads:** sponsored waypoints live in a separate lane and never connect into the organic evidence graph.
- **Product screen:** a connected company hub with Services and Careers paths, evidence, roles, updates, and knowledge.
- **Mobile:** relationships become breadcrumbed cards rather than a compressed node map.

Primary risk: spatial novelty obscuring navigation. Control: every relationship has a list equivalent and a clear back path.

## Image production matrix

Each item is a separate `ui-mockup` generation. The written specification is authoritative when generated text is imperfect.

| ID | Direction | Canvas | Subject |
| --- | --- | --- | --- |
| D01-A | Decision Studio | desktop landscape | Homepage and editable AI decision brief |
| D01-B | Decision Studio | desktop landscape | Companies results, evidence explanations, comparison drawer |
| D01-C | Decision Studio | mobile portrait | Homepage brief-builder stack |
| D02-A | Editorial Exchange | desktop landscape | Editorial homepage |
| D02-B | Editorial Exchange | desktop landscape | Company dossier |
| D02-C | Editorial Exchange | mobile portrait | Editorial homepage |
| D03-A | Opportunity Pulse | desktop landscape | Time-led homepage |
| D03-B | Opportunity Pulse | desktop landscape | Jobs discovery and application states |
| D03-C | Opportunity Pulse | mobile portrait | Opportunity stream homepage |
| D04-A | Business Atlas | desktop landscape | Relationship-led homepage |
| D04-B | Business Atlas | desktop landscape | Connected company hub |
| D04-C | Business Atlas | mobile portrait | Breadcrumbed atlas homepage |

## Prompt sheets

### Shared constraints for all twelve images

```text
Use case: ui-mockup
Style/medium: shippable high-fidelity product UI, not concept art and not a device mockup
Brand: use the supplied Bharat Navya mark only as a small header identity; do not reinterpret or enlarge it
Product scope: Home, Companies, Jobs only
Content: credible Indian company, city, service, and role examples
Constraints: practical responsive layout; legible hierarchy; realistic controls; clearly labelled Sponsored content; AI uncertainty and evidence visible; no fabricated live-data claims; no watermark
Avoid: flags, monuments, cultural motifs, tricolour decoration, glassmorphism, generic AI chatbot bubbles, excessive gradients, crypto/dashboard styling, ecommerce products, RFQ, lending, finance, consultation, autoplay, pop-ups, sticky ads, tiny text, decorative charts
```

### D01-A — Decision Studio desktop homepage

```text
Primary request: Bharat Navya desktop homepage where a natural-language business need visibly becomes an editable decision brief
Composition: 1536×1024 landscape webpage; compact header; asymmetric two-column hero; headline and natural-language request on the left; dark decision canvas on the right; lower preview row for company proof, jobs, decision guides, public activity, and one bordered Sponsored capsule
Text (verbatim): "Bharat Navya", "Home", "Companies", "Jobs", "Make the next decision with better context.", "Build my brief", "Decision brief", "Need", "Location", "Budget", "Evidence", "Why shown", "Sponsored"
Color palette: Midnight Ink #151927, Signal Blue #3B63F3, Volt #C7E85A used sparingly, Mist #F2F5FA, white
Typography: Space Grotesk display, DM Sans body, IBM Plex Mono utility labels
Signature: visible arrow-free transformation from request to editable criteria and source signals; not a chat interface
```

### D01-B — Decision Studio Companies screen

```text
Primary request: Bharat Navya desktop Companies discovery screen for comparing credible service providers using an AI-built brief
Composition: 1536×1024 landscape webpage; compact header; slim editable-criteria rail; central organic company results with real evidence rows; right comparison drawer with two selected companies; a clearly separate Sponsored capsule below organic results
Text (verbatim): "Companies", "Your brief", "Food-safe packaging", "Ahmedabad", "Edit criteria", "Evidence used", "Why shown", "Compare", "Verified identity", "Recent work", "Missing information", "Sponsored"
Color palette and typography: exactly match D01-A
Signature: each result explains its match using visible profile facts; no numerical AI score and no paid ranking
```

### D01-C — Decision Studio mobile homepage

```text
Primary request: mobile Bharat Navya homepage that turns a natural-language need into a sequence of editable decision cards
Composition: 1024×1536 portrait mobile webpage; compact header; concise headline; request field; stacked Need, Location, Budget, and Evidence cards; one primary Build my brief action; small proof/jobs/guides previews; one clearly labelled Sponsored card near the end; no bottom takeover
Text (verbatim): "Bharat Navya", "Make the next decision with better context.", "Build my brief", "Need", "Location", "Budget", "Evidence", "Companies", "Jobs", "Guides", "Sponsored"
Color palette and typography: exactly match D01-A; maintain large touch targets and readable mobile type
Signature: progressive card sequence with confidence and source cues, not chat bubbles
```

### D02 prompt set

Use the shared constraints and Direction 02 tokens. D02-A shows the `Today in business` editorial homepage; D02-B shows a company dossier; D02-C recomposes the homepage as a vertical mobile reading sequence. Required labels: `Bharat Navya`, `Companies`, `Jobs`, `Today in business`, `Brief me`, `From the company`, `Related guide`, `Current roles`, `Sponsored studio`. Keep Source Serif 4 restricted to stories and proof quotes.

### D03 prompt set

Use the shared constraints and Direction 03 tokens. D03-A shows the structured opportunity pulse homepage; D03-B shows Jobs discovery plus application states; D03-C shows a chronological mobile stream. Required labels: `Bharat Navya`, `Companies`, `Jobs`, `Today's brief`, `New`, `Closing soon`, `Applied`, `Reviewed`, `Decision`, `Sponsored`. Do not use countdown timers or gamified urgency.

### D04 prompt set

Use the shared constraints and Direction 04 tokens. D04-A shows the relationship canvas homepage; D04-B shows a connected company hub with Services and Careers; D04-C turns the atlas into breadcrumbed mobile cards. Required labels: `Bharat Navya`, `Route this need`, `Companies`, `Services`, `Careers`, `Evidence`, `Field note`, `Sponsored`. Every visible relationship must have a plain list or breadcrumb equivalent.

## Generation workflow and review log

Generate one direction at a time in the order D01 → D02 → D03 → D04. Each image receives its own built-in generation call. Inspect subject, hierarchy, text, brand treatment, feature coverage, and forbidden elements. Preserve selected outputs inside this directory using versioned filenames. Stop after each three-image direction for feedback before proceeding.

### Direction 01 review

- Status: awaiting generation.
- Selected files: pending.
- Review notes: pending.

### Directions 02–04

- Status: planned; generation intentionally blocked by the feedback gate.

