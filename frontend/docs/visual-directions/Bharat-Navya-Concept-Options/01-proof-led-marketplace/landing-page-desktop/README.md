# Direction 01 Landing Page — PM and Design Analysis

This folder expands the original Proof-led Marketplace homepage into a realistic desktop scroll sequence. The original concept remains unchanged. These screens show what a user would see in successive 1536×1024 browser viewports.

## Current concept audit

### Product-manager perspective

#### What already works

- The value proposition immediately names both sides of the platform: companies and roles.
- Universal search creates one simple starting point.
- Directory and Recruitment are presented as equal product pillars.
- The featured company demonstrates the intended trust model through work imagery, identity, location, team size, verification, and an active role.
- Guides, activity, and advertising are supporting features rather than new primary modules.

#### Product problems in the original single-screen concept

- The complete product is compressed into the first viewport, so users receive no progressive discovery story.
- Five lower modules compete simultaneously: companies, roles, guides, activity, and sponsorship.
- The featured company receives far more emphasis than Recruitment, which could make the platform appear Directory-first.
- Search chips look preselected but do not clearly explain whether they are examples, active filters, or AI interpretation.
- Important proof and job metadata becomes too small to scan comfortably.
- Sponsorship appears at nearly the same moment and visual weight as organic discovery, increasing trust risk.

#### Revised product sequence

The landing page should answer four questions in order:

1. **What can I do here?** Search, enter Directory, or enter Recruitment.
2. **Why should I trust the companies?** See evidence-rich company records and understand verification.
3. **What opportunities and guidance are available?** Browse current roles and practical decision support.
4. **Is the platform current, and how is paid content handled?** See finite public activity, a clearly separated sponsor, and platform policies.

#### Primary product outcomes

- Search started.
- Directory gateway selected.
- Recruitment gateway selected.
- Organic company profile opened.
- Organic role opened or saved.
- Guide opened from a company or recruitment context.
- Sponsored click measured separately from organic discovery.

### Designer perspective

#### What already works

- Deep Navy, Market Blue, Teal, Warm Gold, Cloud, and white create a credible marketplace palette.
- Plus Jakarta Sans-like display typography gives the page confidence without feeling corporate-heavy.
- Workplace photography is paired with company facts rather than used as decoration.
- The large featured-company treatment is a strong candidate for the direction's signature component.
- Blue and teal provide a useful distinction between general action, Directory, and Recruitment.

#### Design problems in the original single-screen concept

- The lower five-column composition produces cramped copy and weak scanning order.
- Several card formats compete without a consistent section rhythm.
- The hero image, search, gateways, proof strip, roles, guides, activity, and sponsor all demand attention at once.
- The sponsor's strong blue border can be mistaken for an active or selected organic card.
- Preselected chips below search appear interactive but their state is ambiguous.
- The page lacks a meaningful transition from aspiration to evidence to action.

#### Revised design principle

Spend the direction's visual boldness on one element: the **proof window**. A large company work image transitions into a structured proof rail containing identity, capability, location, recent work, reviews, and a relevant role. Other sections use quieter, repeatable cards.

The scroll rhythm alternates between:

- open search-led space;
- evidence-rich company discovery;
- compact opportunity and guidance modules;
- a calm closing section with freshness, sponsorship, and policy links.

## Desktop scroll sequence

### Screen 01 — Landing and route selection

Purpose: explain the platform and let users begin immediately.

- Header with Home, Directory, Recruitment, and Join / Sign in.
- Clear outcome-led headline.
- Universal search with example natural-language query.
- Search interpretation preview shown as editable filters, explicitly labelled as an example.
- Equal Directory and Recruitment gateway cards.
- Compact trust strip introducing verified identity, real work, reviews, and current roles.
- Bottom edge hints that verified-company content continues below.

### Screen 02 — Company proof and Directory discovery

Purpose: demonstrate why Bharat Navya company records are more useful than generic listings.

- Section heading focused on companies with evidence.
- Large proof window for one selected fictional company.
- Structured identity, capabilities, location, selected work, review context, and current-role facts.
- Three additional organic company cards with consistent proof fields.
- Clear View company and Compare actions.
- Small explanation of what verification covers and does not cover.

### Screen 03 — Recruitment and decision support

Purpose: give Recruitment equal depth and connect guidance to real actions.

- Current roles with employer context, location, workplace, salary, posted date, and closing date.
- Clear View role and Save role actions.
- Practical guides paired with the decisions they support.
- One compact illustrative search explanation using visible facts.
- No auto-application or candidate marketplace behaviour.

### Screen 04 — Freshness, sponsorship, and close

Purpose: show that records stay current and close the page without weakening trust.

- Finite public activity: new roles, completed work, verified reviews, and company updates.
- One clearly labelled Sponsored feature on a pale neutral surface, without verification.
- Short platform trust principles.
- Final Directory and Recruitment calls to action.
- Complete footer with product, company, support, accessibility, privacy, and terms links.

## Interaction and motion notes

- Search interpretation expands below the field only after a query is entered; every filter remains editable.
- The proof window may use one restrained scroll reveal: image first, then the factual proof rail. It must work as a static layout with reduced motion.
- `Why this result` opens a small disclosure containing only visible filter matches.
- Company comparison appears only after a user selects at least two records.
- Sponsored content never enters comparison, verification, inquiry, or application states.

## Included screens

- `screen-01-landing-and-route-selection-v1.png`
- `screen-02-company-proof-and-directory-v1.png`
- `screen-03-recruitment-and-guidance-v1.png`
- `screen-04-activity-sponsor-footer-v1.png`

