# Bharat Navya visual direction exploration

Status: approved exploration brief; generation proceeds one direction at a time  
Branch: `design`  
Product baseline: the implemented Bharat Navya Home, Directory, and Recruitment platform

## 1. Purpose and fixed product foundation

This study explores four visually and structurally different expressions of the same Bharat Navya platform. The concepts may reorganise sections, strengthen hierarchy, introduce useful supporting features, and change the balance of imagery, editorial content, activity, and smart discovery. They may not replace the platform with a new product metaphor.

The public foundation remains:

- **Home:** universal search, Directory and Recruitment gateways, trust/proof, featured companies, current roles, guides or blogs, public activity, restrained sponsorship, and clear next actions.
- **Directory:** need-led search, category/location discovery, company results, company profiles, capabilities, work evidence, verification, reviews, shortlist/compare, and structured inquiry.
- **Recruitment:** role search and filters, current jobs, employer context, salary/workplace/freshness information, job detail, applications, and visible application progress.

AI, blogs, public activity, and advertising are supporting systems. None of them becomes Bharat Navya's new identity.

This phase changes no application code, routes, APIs, schemas, authentication, or backend behaviour. It excludes catalogue, product commerce, RFQ, lending, finance, consultations, and a public candidate marketplace. `Design/` remains frozen.

## 2. Shared platform rules

### Brand and content

- Use the supplied Bharat Navya mark as a small identity anchor; do not redraw it or spread its tricolour into decorative page styling.
- Express India through credible cities, companies, services, workplaces, and professional photography—not flags, monuments, maps used as decoration, or cultural motifs.
- Use the public labels `Home`, `Directory`, and `Recruitment` consistently.
- The current homepage is the control direction and is not counted among the four alternatives.

### AI

- Enhance universal search by understanding natural-language intent and exposing editable categories, locations, skills, workplace preferences, or other conventional filters.
- Explain why a company, role, or article appears using visible source facts.
- Summarise a public update or guide only when labelled and linked to its source.
- Draft an inquiry or application response only after the user requests it and require review before sending.
- Never create autonomous actions, unverifiable match scores, invented verification, or a separate operating workspace.

### Blogs and public activity

- Guides answer practical Directory or Recruitment questions and link to relevant company or job records.
- Show author, date, topic, reading time, and related records.
- Public activity may include company updates, completed work, verified reviews, hiring announcements, and role-closing dates.
- Never expose private inquiries, applications, messages, or behavioural surveillance.

### Sponsorship

- Use only the labels `Sponsored` or `Advertisement`.
- Keep paid content visually separate from organic results, verification, evidence, and match explanations.
- Do not place ads inside inquiry, application, comparison, private messaging, or trust-verification flows.
- Avoid pop-ups, prestitials, autoplay sound, sticky takeovers, deceptive controls, and excessive density.

### Accessibility and mobile

- Maintain legible contrast, visible focus, meaningful reading order, 44px mobile targets, and no horizontal overflow.
- Do not rely on colour alone for verification, freshness, application stage, or sponsorship.
- Recompose mobile layouts rather than shrinking desktop grids.
- Respect reduced-motion preferences; every motion concept must work as a static state.

## 3. Direction 01 — Proof-led Marketplace

### Product thesis

Make Bharat Navya feel like a premium, trustworthy marketplace for assessing companies and current opportunities. The hero still begins with universal search and clearly exposes both Directory and Recruitment. Proof is expressed through work imagery, verification, client context, and transparent job information—not an enterprise decision tool.

### Visual system

| Role | Value |
| --- | --- |
| Deep Navy | `#15335B` |
| Market Blue | `#2F63D8` |
| Teal | `#16836D` |
| Warm Gold | `#E5A93D` |
| Cloud | `#F3F6FA` |
| White | `#FFFFFF` |
| Display | Plus Jakarta Sans, 650–750 |
| Body | IBM Plex Sans, 400–600 |
| Utility | IBM Plex Mono, 500 |

Blue carries primary action, teal marks Directory, and gold is restricted to small proof or freshness accents. The page remains predominantly light. Cards use crisp 14–18px corners, subtle borders, one shadow depth, and edge-to-edge photography inside defined media frames.

### Signature composition

```text
DESKTOP HOME
┌─────────────────────────────────────────────────────────────┐
│ logo      Home  Directory  Recruitment       Join / Sign in│
├───────────────────────────────┬─────────────────────────────┤
│ Find companies and roles      │ featured verified company │
│ worth your next move.         │ work image + proof facts   │
│ [universal search          →] │ current role preview       │
│ [Directory] [Recruitment]     │                             │
├───────────────────────────────┴─────────────────────────────┤
│ Verified companies with work imagery    Current roles      │
├───────────────────────────────────────┬─────────────────────┤
│ Practical guides + public activity    │ Sponsored partner  │
└───────────────────────────────────────┴─────────────────────┘
```

### Feature expression

- **AI:** natural-language search quietly produces visible category, city, service, role, and workplace filters; users can edit them normally.
- **Blogs:** `Before you choose` guides sit beside real company or job records.
- **Activity:** recent work, verified reviews, company updates, and fresh roles appear as time-stamped public signals.
- **Ads:** one clearly bordered sponsor card appears after organic content and never imitates a company result.
- **Desktop product screen:** Directory results with photo-led company cards, proof rows, filters, shortlist, and a conventional compare tray.
- **Mobile:** search and gateways remain above the fold; proof, roles, guides, activity, and sponsorship become a deliberate single-column sequence.

### Deliberate risk and control

Risk: rich company imagery could push the product toward a lifestyle marketplace. Control: every image is paired with useful service, location, verification, and work context; no decorative stock photography.

## 4. Direction 02 — Living Business Network

### Product thesis

Show Bharat Navya as a living network of companies, work, reputation, and hiring activity without copying a social-media feed. Records remain primary; activity adds recency and human context.

### Visual system

| Role | Value |
| --- | --- |
| Plum Ink | `#302746` |
| Iris | `#6754C7` |
| Coral | `#DE6A55` |
| Aqua | `#65B8AD` |
| Lavender Mist | `#F2EFF8` |
| White | `#FFFFFF` |
| Display | Sora, 600–750 |
| Body | Noto Sans, 400–650 |
| Utility | Space Mono, 500 |

### Signature

The homepage uses a structured `What businesses are doing now` stage: one selected company update with media, adjacent verified review and hiring activity, and clear paths into the underlying company or job record. It is not infinite scroll and has no vanity engagement counts.

- **AI:** labelled summaries connect a public update to related companies, roles, or guides and expose the sources used.
- **Blogs:** company-authored updates and independent guides are visually distinguished.
- **Activity:** selected, moderated, time-stamped updates are the direction's strongest supporting feature.
- **Ads:** a separate sponsor rail uses a different surface and never receives activity affordances.
- **Desktop product screen:** company profile with capabilities, selected work, verified reviews, updates, team context, current roles, and structured inquiry.
- **Mobile:** activity becomes a finite `Latest from companies` carousel followed by stable record cards; no endless feed.

Risk: appearing like LinkedIn. Control: no follower counts, reactions, reposts, vanity metrics, or unbounded feed; every activity item resolves to a business record or useful action.

## 5. Direction 03 — Editorial Exchange

### Product thesis

Combine publication-quality business guidance with Directory and Recruitment discovery. Editorial hierarchy helps visitors understand sectors, companies, and opportunities, but every story connects to an actionable platform record.

### Visual system

| Role | Value |
| --- | --- |
| Petrol | `#174B54` |
| Sky | `#DDEEF1` |
| Ochre | `#D6A23D` |
| Berry | `#974B6D` |
| Ink | `#19252A` |
| White | `#FFFFFF` |
| Display/UI | Archivo, 550–800 |
| Editorial | Source Serif 4, 500–700 |
| Utility | Public Sans, 500–700 |

### Signature

An asymmetric `Across Indian business` editorial stage pairs one lead guide or company story with compact Directory and Recruitment modules. It uses strong image fields and typographic contrast without becoming a dense broadsheet pastiche.

- **AI:** `Quick summary` produces a labelled, sourced synopsis and related Directory/Recruitment links.
- **Blogs:** authored guides are first-class, with explicit decision relevance.
- **Activity:** current roles and company updates appear as concise side notes rather than a feed.
- **Ads:** a full-width `Sponsored feature` is visibly different from independent editorial and carries no organic recommendation styling.
- **Desktop product screen:** Recruitment results with an editorial intro, conventional filters, clear role cards, employer context, freshness, salary, and related career guides.
- **Mobile:** lead story, universal search, two product gateways, roles, companies, and guides form one readable vertical edition.

Risk: becoming a media site. Control: every editorial module exposes related companies, roles, or a useful platform action above its fold.

## 6. Direction 04 — Smart Platform Navigator

### Product thesis

Make the existing universal search more interactive while keeping the platform visibly conventional underneath: Directory results are company records and Recruitment results are jobs. AI improves query interpretation and explanation; it does not become the platform.

### Visual system

| Role | Value |
| --- | --- |
| Graphite | `#202936` |
| Electric Blue | `#3267E3` |
| Sea Green | `#2B9074` |
| Soft Apricot | `#F2B36D` |
| Frost | `#EFF3F8` |
| White | `#FFFFFF` |
| Display | Bricolage Grotesque, 600–750 |
| Body | Atkinson Hyperlegible, 400–700 |
| Utility | Roboto Mono, 500 |

### Signature

The hero search expands into a lightweight intent ribbon that shows whether the visitor is looking for a company or role and exposes familiar editable filters. Result explanations appear inside standard cards. No budgets, operational ledgers, diagnosis panels, or autonomous planning surfaces.

- **AI:** query suggestions, typo tolerance, intent routing, editable filters, `Why this result`, and optional draft assistance.
- **Blogs:** contextual guides appear after results, not before them.
- **Activity:** freshness and source labels supplement company and job records.
- **Ads:** sponsored results sit in a dedicated band and never receive AI explanations or organic position.
- **Desktop product screen:** job or employer detail with clear company identity, role facts, workplace evidence, related roles, and user-reviewed application assistance.
- **Mobile:** the expanded search becomes an accessible filter sheet; Directory and Recruitment remain one-tap destinations.

Risk: repeating the rejected AI workspace. Control: AI occupies only search, explanation, summarisation, and drafting moments; the rest uses ordinary marketplace and recruitment patterns.

## 7. Production matrix

| ID | Direction | Canvas | Subject |
| --- | --- | --- | --- |
| D01-A | Proof-led Marketplace | desktop landscape | Home |
| D01-B | Proof-led Marketplace | desktop landscape | Directory results |
| D01-C | Proof-led Marketplace | mobile portrait | Home |
| D02-A | Living Business Network | desktop landscape | Home |
| D02-B | Living Business Network | desktop landscape | Company profile |
| D02-C | Living Business Network | mobile portrait | Home |
| D03-A | Editorial Exchange | desktop landscape | Home |
| D03-B | Editorial Exchange | desktop landscape | Recruitment results |
| D03-C | Editorial Exchange | mobile portrait | Home |
| D04-A | Smart Platform Navigator | desktop landscape | Home |
| D04-B | Smart Platform Navigator | desktop landscape | Job/employer detail |
| D04-C | Smart Platform Navigator | mobile portrait | Home |

## 8. Image-generation prompt sheets

### Shared constraints

```text
Use case: ui-mockup
Style/medium: shippable high-fidelity product UI, not concept art, not a device mockup
Brand: use the supplied Bharat Navya mark only as a small exact header identity
Navigation: Home, Directory, Recruitment, Join / Sign in
Product: one parent platform connecting a business directory and recruitment
Content: credible fictional Indian companies, cities, services, employers, and roles
AI role: search interpretation, editable filters, sourced explanations, summaries, or user-reviewed drafting only
Constraints: professional hierarchy, realistic controls, accessible contrast, clearly labelled Sponsored content, no fabricated live-data claims, no watermark
Avoid: operating-system metaphors, business diagnosis, decision briefs, ledgers, decision maps, budget planning, flags, monuments, cultural motifs, tricolour decoration beyond the small logo, glassmorphism, chatbot bubbles, crypto dashboards, decorative charts, catalogue products, ecommerce, RFQ, lending, finance, consultations, candidate marketplace, pop-ups, autoplay, sticky ads, tiny text, browser chrome, device frames
```

### D01-A — Proof-led Marketplace desktop Home

```text
Primary request: Bharat Navya desktop homepage presenting a trustworthy platform for discovering credible companies and transparent roles
Composition: 1536×1024 landscape; compact header; two-column hero with headline, universal search, and equal Directory/Recruitment gateway cards on the left; one strong verified-company work image with proof facts and a current-role preview on the right; lower sections preview verified companies, current roles, practical guides, public activity, and one separate Sponsored card
Text (verbatim): "Bharat Navya", "Home", "Directory", "Recruitment", "Join / Sign in", "Find companies and roles worth your next move.", "Search companies, services or jobs", "Verified companies", "Current roles", "Practical guides", "Public activity", "Sponsored"
Palette: Deep Navy #15335B, Market Blue #2F63D8, Teal #16836D, Warm Gold #E5A93D used sparingly, Cloud #F3F6FA, white
Typography: Plus Jakarta Sans-like display, IBM Plex Sans-like body, IBM Plex Mono-like utility labels
Signature: evidence-rich company photography paired with useful profile and role facts; AI is represented only by small editable filter suggestions under search
```

### D01-B — Proof-led Marketplace desktop Directory results

```text
Primary request: Bharat Navya desktop Directory results page for finding credible Indian service companies
Composition: 1536×1024 landscape; same header and visual system as D01-A; category/location filter row; conventional left filter column; three photo-led organic company cards with verified identity, location, capabilities, selected work, rating/review context, response information, shortlist action, and View company; compact compare tray at the bottom; one clearly separate Sponsored card after organic results
Text (verbatim): "Directory", "Find the right company", "Category", "Location", "Verified only", "Why this result", "Shortlist", "Compare", "View company", "Identity verified", "Recent work", "Sponsored"
Signature: rich media never appears without capability and proof context; no AI score and no paid organic position
```

### D01-C — Proof-led Marketplace mobile Home

```text
Primary request: mobile Bharat Navya homepage for discovering companies and roles
Composition: 1024×1536 portrait mobile webpage; compact header; concise headline; large universal search; two equal but content-sized Directory and Recruitment gateways; one featured verified company card with work image; two current-role rows; one practical guide; one public update; one clearly labelled Sponsored card near the end; no sticky takeover
Text (verbatim): "Bharat Navya", "Directory", "Recruitment", "Find companies and roles worth your next move.", "Search companies, services or jobs", "Verified company", "Current roles", "Guide", "Sponsored"
Palette and typography: exactly match D01-A; use large touch targets and readable mobile type
```

### D02-A — Living Business Network desktop Home

```text
Primary request: Bharat Navya desktop Home organised around a finite, moderated stream of company work and hiring activity
Composition: 1536×1024; compact header; concise hero with universal search and equal Directory/Recruitment gateways; a large selected activity stage with authentic work image, company update, verified-review excerpt, and current role; stable company, role, and guide records below; one separate sponsor rail
Text: "Bharat Navya", "Home", "Directory", "Recruitment", "Join / Sign in", "Discover the businesses behind the work.", "Search companies, services or jobs", "What businesses are doing now", "Company update", "Verified review", "Current role", "Related guide", "Sponsored"
Palette/type: Plum Ink #302746, Iris #6754C7, Coral #DE6A55, Aqua #65B8AD, Lavender Mist #F2EFF8, white; Sora-like display, Noto Sans-like body, Space Mono-like utility
Signature: selected finite activity stage that resolves to stable records; no reactions, follower counts, or infinite feed
```

### D02-B — Living Business Network desktop company profile

```text
Primary request: Bharat Navya company profile showing a credible business through capabilities, selected work, reviews, updates, team context, current roles, and structured inquiry
Composition: 1536×1024; header; company identity and verification band; wide work-image gallery; capabilities and proof; verified-review panel; finite company updates; current roles; right inquiry card; one separate Sponsored recommendation outside inquiry and verification
Text: "Company profile", "Identity verified", "Capabilities", "Selected work", "Verified reviews", "Company updates", "Current roles", "Send inquiry", "Related guide", "Sponsored"
Signature: company updates add recency but never replace the factual profile
```

### D02-C — Living Business Network mobile Home

```text
Primary request: mobile Bharat Navya Home with universal search, both product gateways, and a finite latest-company-activity carousel followed by stable records
Composition: 1024×1536 webpage without phone frame; compact header; hero/search; Directory and Recruitment cards; one selected company update with image; one verified review; two roles; one guide; separate Sponsored card
Text: "Bharat Navya", "Directory", "Recruitment", "Discover the businesses behind the work.", "Latest from companies", "Verified review", "Current roles", "Related guide", "Sponsored"
Constraints: no infinite feed, reactions, follower counts, or sticky takeover
```

### D03-A — Editorial Exchange desktop Home

```text
Primary request: publication-quality Bharat Navya Home combining business guidance with actionable Directory and Recruitment discovery
Composition: 1536×1024; compact header; editorial hero with one lead story image and headline; universal search and equal Directory/Recruitment gateways remain above the fold; asymmetric modules for featured companies, current roles, useful guides, and concise public updates; one full-width visibly different Sponsored feature
Text: "Bharat Navya", "Home", "Directory", "Recruitment", "Join / Sign in", "Across Indian business", "Find the company or opportunity behind the story.", "Search companies, services or jobs", "Quick summary", "Featured companies", "Current roles", "Practical guides", "Sponsored feature"
Palette/type: Petrol #174B54, Sky #DDEEF1, Ochre #D6A23D, Berry #974B6D, Ink #19252A, white; Archivo-like UI/display, Source Serif 4-like editorial, Public Sans-like utility
Signature: strong lead-story field linked directly to company and role records; not a dense broadsheet
```

### D03-B — Editorial Exchange desktop Recruitment results

```text
Primary request: Bharat Navya Recruitment results page with a concise editorial introduction, conventional filters, transparent job cards, employer context, and related career guides
Composition: 1536×1024; header with Recruitment selected; editorial title strip; left filters; central job results with role, fictional employer, location, workplace, salary, posted/closing dates, verification, save/view actions; right related-guide rail; one separate Sponsored employer card without organic ranking or verification styling
Text: "Recruitment", "Roles with context", "Search jobs", "Location", "Workplace", "Salary", "Posted", "Closes", "Verified employer", "Save role", "View role", "Related career guide", "Sponsored"
Signature: editorial guidance supports rather than displaces conventional job discovery
```

### D03-C — Editorial Exchange mobile Home

```text
Primary request: mobile Bharat Navya editorial Home as a readable vertical edition that still exposes Directory and Recruitment immediately
Composition: 1024×1536 webpage without phone frame; header; lead story; universal search; two gateway cards; featured company; two current roles; practical guide; concise update; separate Sponsored feature
Text: "Bharat Navya", "Directory", "Recruitment", "Across Indian business", "Search companies, services or jobs", "Featured company", "Current roles", "Practical guide", "Sponsored feature"
```

### D04-A — Smart Platform Navigator desktop Home

```text
Primary request: interactive Bharat Navya Home where universal search expands into a lightweight intent ribbon while Directory and Recruitment remain the obvious products
Composition: 1536×1024; compact header; centered headline and large search; immediately below, familiar editable chips for intent/category/location/workplace and two equal Directory/Recruitment gateway cards; standard company and role results preview; contextual guides and public freshness signals; one separate Sponsored band
Text: "Bharat Navya", "Home", "Directory", "Recruitment", "Join / Sign in", "Start with what you need.", "Search companies, services or jobs", "Edit filters", "Why this result", "Companies", "Roles", "Guides", "Sponsored"
Palette/type: Graphite #202936, Electric Blue #3267E3, Sea Green #2B9074, Soft Apricot #F2B36D, Frost #EFF3F8, white; Bricolage Grotesque-like display, Atkinson Hyperlegible-like body, Roboto Mono-like utility
Signature: lightweight intent ribbon only; no brief, planning surface, diagnosis, score, or autonomous action
```

### D04-B — Smart Platform Navigator desktop job/employer detail

```text
Primary request: conventional Bharat Navya job detail page enhanced by sourced result explanations and user-reviewed application drafting
Composition: 1536×1024; header with Recruitment selected; main role facts and fictional employer identity; salary, workplace, posted/closing dates, responsibilities, requirements, workplace evidence; side card with Apply and Save; small "Why this result" disclosure citing visible facts; optional "Draft with assistance" leading to "Review application"; related roles and guide; separate Sponsored card outside application
Text: "Role details", "Company profile", "Why this result", "Workplace", "Salary", "Posted", "Closes", "Apply", "Save role", "Draft with assistance", "Review application", "Related roles", "Sponsored"
Signature: assistance appears only at explanation and drafting moments; normal job-detail structure remains dominant
```

### D04-C — Smart Platform Navigator mobile Home

```text
Primary request: mobile Bharat Navya Home with accessible smart search and a conventional platform content stack
Composition: 1024×1536 webpage without phone frame; compact header; headline/search; expanded filter sheet showing intent, location, category or workplace; Directory and Recruitment gateway cards; company and role previews; guide; separate Sponsored card
Text: "Bharat Navya", "Directory", "Recruitment", "Start with what you need.", "Search companies, services or jobs", "Edit filters", "Companies", "Roles", "Guide", "Sponsored"
Constraints: filter sheet uses familiar chips and controls; no chatbot, workspace, score, or sticky takeover
```

## 9. Generation workflow and review log

Generate in the order D01 → D02 → D03 → D04. Use one built-in image-generation call per asset. Inspect every output for brand accuracy, navigation labels, readable key text, realistic platform structure, feature coverage, responsive composition, sponsorship clarity, and forbidden product drift. Preserve selected files with versioned filenames and stop after each direction for feedback.

### Direction 01 — Proof-led Marketplace

- Status: complete.
- Selected files:
  - `assets/direction-01/proof-led-marketplace-home-desktop-v1.png`
  - `assets/direction-01/proof-led-marketplace-directory-desktop-v1.png`
  - `assets/direction-01/proof-led-marketplace-home-mobile-v1.png`
- Review notes:
  - Home and mobile both keep Directory and Recruitment equally visible near the top.
  - The platform reads as a company-and-opportunity marketplace; no operating workspace or business-diagnosis pattern appears.
  - AI is limited to familiar search-intent chips and `Why this result` explanations.
  - Company identities are fictional and use original lettermarks; no third-party company names, logos, or URLs remain.
  - Work imagery is paired with capability, location, verification, role, or recent-work context rather than used decoratively.
  - Sponsored content is clearly labelled and physically separated from organic records. Verification marks were removed from sponsored cards to avoid implying that payment creates trust.
  - Desktop assets are 1536×1024 PNG; the mobile asset is 1024×1536 PNG with no device frame.

### Direction 02 — Living Business Network

- Status: complete.
- Selected files:
  - `assets/direction-02/living-business-network-home-desktop-v1.png`
  - `assets/direction-02/living-business-network-company-profile-desktop-v1.png`
  - `assets/direction-02/living-business-network-home-mobile-v1.png`
- Review notes:
  - The homepage uses a finite selected activity stage rather than an infinite social feed; there are no reactions, follower counts, or vanity mechanics.
  - The profile keeps factual capabilities, work, reviews, roles, and inquiry primary while updates add useful recency.
  - Directory and Recruitment remain visible near the top of both homepage canvases.
  - AI is limited to sourced public-update summarisation and related-record suggestions; it does not become a chatbot or workspace.
  - Company identities and marks are fictional. Sponsored content is separate from verification, inquiry, and organic activity.
  - Desktop assets are 1536×1024 PNG; the mobile asset is 1024×1536 PNG without a device frame.

### Direction 03 — Editorial Exchange

- Status: complete.
- Selected files:
  - `assets/direction-03/editorial-exchange-home-desktop-v1.png`
  - `assets/direction-03/editorial-exchange-recruitment-desktop-v1.png`
  - `assets/direction-03/editorial-exchange-home-mobile-v1.png`
- Review notes:
  - Editorial hierarchy and photography create a materially different rhythm while universal search and equal Directory/Recruitment gateways remain prominent.
  - The AI-assisted summary is explicitly labelled illustrative, avoids invented precise market statistics, and tells users to review sources.
  - Recruitment remains a conventional searchable results experience; career guidance supports rather than displaces role discovery.
  - A duplicate sponsored placement in the first Recruitment render was corrected so the selected screen contains one separated, unverified sponsor card.
  - Company identities are fictional; no publication, employer, or sponsor mark is presented as a real third-party brand.
  - Desktop assets are 1536×1024 PNG; the mobile asset is 1024×1536 PNG without a device frame.

### Direction 04 — Smart Platform Navigator

- Status: complete.
- Selected files:
  - `assets/direction-04/smart-platform-navigator-home-desktop-v1.png`
  - `assets/direction-04/smart-platform-navigator-job-detail-desktop-v1.png`
  - `assets/direction-04/smart-platform-navigator-home-mobile-v1.png`
- Review notes:
  - Natural-language intent is rendered as familiar, editable filters under user control rather than as a prompt workspace or generic chat interface.
  - Directory and Recruitment stay equal product pillars; company and role previews use ordinary records and visible metadata.
  - `Why this result` cites visible criteria rather than an opaque score, while application assistance follows a clear draft → review → user-submit sequence.
  - The job detail preserves employer context, workplace evidence, role facts, related roles, and a conventional application card.
  - Company identities are fictional. Sponsored content is visibly separate, unverified, and outside the application path.
  - Desktop assets are 1536×1024 PNG; the mobile asset is 1024×1536 PNG without a device frame.

All four batches are now generated. Future feedback should create versioned `v2` assets or targeted edits; selected `v1` files must not be overwritten.
