# Spec: Mahir Feedback Reconciliation

**Author:** Codex
**Date:** 2026-09-28
**Status:** Approved
**Reviewer:** Parth Akholkar
**Source:** Approved implementation plan and BN - IT WhatsApp review

## Context

Mahir's review identified a small set of confirmed brand and interface issues in the active Bharat Navya frontend: the shell still uses the Chakra-containing logo, the floating navigation helper is generically named, surface borders and alignment need a shared-system pass, long pages lack a back-to-top control, and the search-recommendation work from the integration branch is only partially present. The current Counter direction, Home → Directory → Recruitment information architecture, API-backed stories, labelled advertising, underlying search contracts, and authentication are already correct and must be preserved.

This work is a refinement of the active Next.js application in `frontend/`. It does not adopt unclear requests from approximate audio transcription and does not alter backend or authentication contracts.

## Functional Requirements

- FR-1: The application MUST replace `/bharat-navya-logo.png` with the approved BN-arrow mark without the Ashoka Chakra or tagline.
- FR-2: The shared header and footer MUST retain the text wordmark “Bharat Navya” and existing navigation behavior.
- FR-3: The floating assistant MUST be named “Navya AI Agent” in visible copy and accessible labels while Home's “Ask Navya” name remains unchanged.
- FR-4: The floating assistant MUST retain its existing API, prompts, results, rate-limit, failure, focus, route exclusion, and navigation behavior.
- FR-5: The shared Counter system MUST expose a strong-border token and use shared tokens for ordinary and emphasized surfaces.
- FR-6: Home gateway cards MUST share a consistent grid rhythm, alignment, border treatment, and minimum height while retaining Directory, Recruitment, and Growth OS names and states.
- FR-7: Directory and Recruitment surfaces MUST retain API-backed data, truthful empty states, labelled promotion, and current search semantics.
- FR-8: Authentication pages MUST receive visual alignment and readable-control improvements without changing authentication behavior or validation.
- FR-9: Every application route MUST include one back-to-top control that appears after 600px of vertical scroll and scrolls the document to the top when activated.
- FR-10: Back-to-top MUST use smooth scrolling unless the user prefers reduced motion, in which case it MUST scroll immediately.
- FR-11: Back-to-top MUST sit at the lower left, below the z-index of open dialogs and away from the lower-right assistant and requirement controls.
- FR-12: The implementation MUST NOT modify backend code, public APIs, data models, authentication contracts, stories, advertisements, search contracts, inquiries, or applications.
- FR-13: Login and registration MUST use a full-height desktop context panel without an unused strip above or below it.
- FR-14: Directory and Recruitment statuses MUST use circular status portraits; truthful empty states MUST remain compact and MUST NOT simulate activity.
- FR-15: Each route MUST expose at most one assistant entry point. Home uses Ask Navya, public supporting routes use Navya AI Agent, and the legacy floating requirement widget MUST NOT be globally mounted.
- FR-16: Compact advertisements near detail pages MUST have shared-shell margins and clear separation from adjacent content and the footer.
- FR-17: Category browse pages MUST use the unified Directory results workbench and MUST NOT expose the legacy List/Grid toggle or duplicate filter bars.
- FR-18: The assistant text nudge and legacy floating requirement control MUST NOT overlap category, listing, or company content; high-density detail routes MUST render without floating assistant controls.
- FR-19: Listing recommendation cards MUST prefer distinct real listing media and MUST use an honest no-image treatment instead of repeating unrelated stock imagery.
- FR-20: Company profiles MUST expose distinct Services, Products, Work evidence, and Reviews sections using API-backed data and truthful empty states without internal content scrolling.
- FR-21: Directory search MUST provide API-backed, grouped category, company, and product/service suggestions and route each suggestion to the corresponding current record or filtered search view.
- FR-22: Recruitment search MUST provide API-backed, grouped job-family, role, and employer suggestions and route each suggestion to the corresponding current record or filtered jobs view.
- FR-23: Search input drafts MUST remain local until submitted or selected so partially typed text does not leak across routes or between the hero and docked search instances.
- FR-24: Shared search dropdowns and native filter controls MUST follow the Counter visual system and MUST render above surrounding page sections without clipping.

## Non-Functional Requirements

- NFR-A1: All new interactive controls MUST be keyboard operable with a visible focus indicator and a target of at least 44×44 CSS pixels.
- NFR-A2: Mobile form controls MUST render at a minimum 16px font size at widths of 640px and below.
- NFR-A3: New motion MUST honor `prefers-reduced-motion: reduce` and MUST NOT contain information unavailable without animation.
- NFR-R1: Pages MUST have no document-level horizontal overflow at 1440×900, 390×844, or 200% browser zoom.
- NFR-R2: The implementation MUST preserve successful TypeScript compilation, Next.js build, and design-system validation.
- NFR-V1: New visual values MUST derive from Counter tokens; no gradient or decorative 3D effect may be introduced.

## Acceptance Criteria

### AC-1: Approved brand mark (FR-1, FR-2)
Given any route with the shared shell
When the header or footer renders
Then the displayed logo contains the BN arrow mark without an Ashoka Chakra
And no tagline is rendered
And the “Bharat Navya” text wordmark remains present.

### AC-2: Navya AI Agent naming (FR-3, FR-4)
Given a public route where the floating assistant is enabled
When the user inspects or opens the assistant
Then the trigger and dialog labels identify “Navya AI Agent”
And the panel title is “Navya AI Agent”
And the greeting introduces “Navya AI Agent”
And the existing assistant actions still call the current assistant API.

### AC-3: Ask Navya remains distinct (FR-3)
Given the user opens Home
When the hero renders
Then the hero guide remains named “Ask Navya”
And it is not renamed to “Navya AI Agent.”

### AC-4: Shared visual treatment (FR-5, FR-6, NFR-V1)
Given Home renders at 1440px or 390px width
When the Ask Navya and destination gateway region is visible
Then the three gateways align to the shared grid and spacing system
And emphasized panels use the shared strong-border token
And the Navya AI Agent uses a flat indigo/saffron/green signal rail without a gradient.

### AC-5: Truthful data surfaces (FR-7, FR-12)
Given stories or advertisements are unavailable
When Directory or Recruitment renders
Then the existing truthful empty state or labelled fallback promotion renders
And no fabricated company, story, job, or advertisement is inserted.

### AC-6: Auth behavior preserved (FR-8, FR-12, NFR-A2)
Given the login and registration pages
When viewed on a phone-width viewport
Then their inputs render at 16px or larger
And the existing OTP, email/password, redirect, and validation behavior remains unchanged
And no Google or international-phone control is added.

### AC-7: Back-to-top visibility (FR-9, FR-11, NFR-A1)
Given any route whose document is taller than the viewport
When the user scrolls more than 600px
Then a keyboard-focusable lower-left “Back to top” control becomes visible
And it does not overlap the lower-right floating controls.

### AC-8: Back-to-top action (FR-9, FR-10, NFR-A3)
Given the back-to-top control is visible
When the user activates it by pointer or keyboard
Then the document scroll position returns to zero
And smooth scrolling is used unless reduced motion is enabled.

### AC-9: Responsive integrity (NFR-R1, NFR-R2)
Given the defined route matrix
When rendered at 1440×900, 390×844, and 200% browser zoom
Then document width does not exceed viewport width
And primary text, controls, cards, and floating controls are not clipped
And design validation, TypeScript, and production build pass.

### AC-10: Full-height auth context (FR-13)
Given login or registration renders at desktop width
When the authentication layout is visible
Then the left context panel fills the route below the shared header
And no unused strip remains above or below the panel.

### AC-11: Circular truthful statuses (FR-14, FR-7)
Given Directory or Recruitment has current story data
When the status rail renders
Then each status uses a circular portrait control with a readable label
And when no story data exists, the compact circular 24-hour empty state renders without fabricated activity.

### AC-12: One route assistant (FR-15)
Given any public application route
When its floating controls render
Then Home exposes Ask Navya without a second global assistant
And supporting public routes expose Navya AI Agent at most once
And the legacy floating requirement widget is not globally mounted.

### AC-13: Detail advertisement separation (FR-16)
Given a compact labelled advertisement appears on a detail route
When adjacent content or the footer is visible
Then the advertisement follows the shared content width
And shared vertical spacing separates it from both neighboring regions.

### AC-14: Unified category browsing (FR-17)
Given a category or subcategory route
When its listings load
Then results use the same ledger, preview, sorting, and filter patterns as Directory search
And no List/Grid toggle or repeated filter bar renders.

### AC-15: Non-overlapping helpers (FR-18)
Given a category, listing detail, or company profile route
When the route renders at desktop or mobile width
Then no assistant nudge, requirement floater, or assistant trigger covers listing content or actions.

### AC-16: Honest recommendation imagery (FR-19)
Given multiple recommendation cards share the same lead image
When their section renders
Then each card prefers another real image from that listing
And a labelled no-image treatment is used when no distinct listing media remains.

### AC-17: Complete company evidence (FR-20)
Given a company profile loads
When the user reads the record
Then Services, Products, Work evidence, and Reviews are all present
And unavailable API data produces a truthful empty state rather than a hidden section or fabricated content.

### AC-18: Integrated search recommendations (FR-21, FR-22, FR-23)
Given the user types at least two characters in Directory search or a non-empty term in Recruitment search
When matching API data is available
Then the menu groups the relevant categories or job families, records, and companies
And selecting an item opens the corresponding current route
And typing without submitting does not change the committed search state on another route.

### AC-19: Search control visual consistency (FR-24, NFR-V1)
Given a Directory or Recruitment search field or filter select is visible
When it receives focus or opens suggestions
Then its border, radius, colour, focus state, and menu hierarchy use Counter tokens
And the suggestion menu is not clipped by the hero, results header, or adjacent content.

## Edge Cases and Error Scenarios

- EC-1: A page shorter than the viewport MUST keep back-to-top hidden.
- EC-2: Returning above the 600px threshold MUST hide back-to-top.
- EC-3: A route change MUST recompute back-to-top visibility from the new page's scroll position.
- EC-4: Assistant API failure MUST retain the existing fallback message and search suggestion.
- EC-5: Missing story or ad API data MUST retain the existing truthful empty/fallback state.
- EC-6: Authenticated users redirected away from guest-only auth pages MUST retain current behavior.

## API Contracts

This specification prohibits API changes. The existing `POST /api/assistant/chat`
contract and all story, advertising, authentication, search, inquiry, and
application contracts remain unchanged.

## Data Models

This specification introduces no persisted data or schema changes.

| Field | Type | Constraints |
| --- | --- | --- |
| Back-to-top visibility | Ephemeral client boolean | Derived from scroll position and document height; never persisted |

## Out of Scope

- OS-1: Google OAuth or any new authentication provider.
- OS-2: International/E.164 phone-number support.
- OS-3: Timed login or registration prompts.
- OS-4: Renaming Recruitment, Growth OS, or Ask Navya.
- OS-5: Displaying the proposed tagline.
- OS-6: Static or fabricated company statuses, stories, jobs, ads, or success states.
- OS-7: Advertising architecture or placement-count changes.
- OS-8: Backend hosting, production API configuration, database, or backend modifications.
- OS-9: Committing, pushing, merging, rebasing, or force-pushing before screenshot approval.
