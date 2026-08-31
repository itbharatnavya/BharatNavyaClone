# Bharat Navya product-design migration

Updated: 31 August 2026  
Active branch: `design`

## Source of truth

- `frontend/` is the active Next.js implementation.
- `frontend/app/globals.css`, `frontend/tailwind.config.ts`, shared components, and `frontend-design-guide.md` are the live design-system sources.
- `Design/` is a frozen visual and interaction reference; its routes, local state, and fixtures are not production contracts.

## Product structure

The initial public destinations are Home, Directory, and Recruitment under the Bharat Navya brand. Directory is company/service-first. Recruitment retains the existing jobs, applications, employer, candidate, and dashboard capabilities.

Consultations, Credit Card, and Mutual Fund remain in the repository but are hidden from the public shell. Catalogue, RFQ, quotation, purchase-order, brand, and collection functionality may remain technically available but does not define the primary Directory experience.

## Migration board

| Surface | Existing Next.js route | Decision | Notes |
| --- | --- | --- | --- |
| Parent landing | `/` | Recompose | Approved Bharat Navya landing, connected to live public APIs |
| Global shell | all routes | Recompose | Home, Directory, Recruitment; existing auth and dock providers retained |
| Company discovery | `/directory`, `/search` | Recompose | Company/service-first; catalogue density removed in Directory phase |
| Company profile | `/seller/:slug` | Recompose | Preserve API route; present company identity, proof, services, media, reviews |
| Company inquiry | existing seller/inquiry flows | Adjust | Structured need and privacy contract; RFQ semantics excluded from primary flow |
| Recruitment home | `/recruitment` | Recompose | Jobs design mapped to Recruitment naming and existing APIs |
| Job browse/detail | `/recruitment/jobs`, `/job/:id` | Restyle | Preserve filtering, profile gate, apply lifecycle, and real endpoints |
| Company workspace | `/dashboard` | Adjust | Reframe seller/catalogue language as company profile, leads, proof, media, updates |
| Recruitment workspace | `/recruitment/dashboard` | Restyle | Preserve employer/candidate separation until backend membership model changes |
| Updates | none | Add later | Aggregate public stories, blogs, recruitment updates, and activity |
| Saved | `/shortlist` product-only | Add later | Requires company and job saving contracts before a unified route is exposed |
| Admin | `/admin` | Later | Migrate after customer-facing journeys |
| Consultations / financial modules | existing routes | Hide | Files preserved, absent from public navigation |

## Known backend adjustments

- `sellerProfile` and `employerProfile` are separate. The frontend may coordinate their presentation but must not claim canonical synchronization.
- Recruitment role locking conflicts with the intended personal-plus-company-membership model.
- Saved jobs and a unified Saved collection are missing.
- Directory AI search cannot be presented as a Recruitment search endpoint.
- Missing backend actions may be designed, but the UI must not report success unless persistence actually completes.

## Delivery sequence

1. Shared tokens, typography, shell, universal search, and main landing.
2. Directory homepage, company results, company profile, and inquiry.
3. Recruitment homepage, browse, job detail, apply, and employer presentation.
4. Company and Recruitment workspaces, Updates, Saved, content, and promotions.
5. Admin, moderation, platform-wide dark mode, and final system hardening.

