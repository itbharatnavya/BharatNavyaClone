# Bharat Navya Next.js capability matrix

Updated: 1 September 2026 · Branch: `design`

| Capability | Existing contract | Migration decision | Dependency / constraint |
| --- | --- | --- | --- |
| Public shell and auth | Next.js providers, `/login`, notifications | Preserve function, recompose UI | Public navigation limited to Home, Directory, Recruitment |
| Universal search | Directory `/search`; Recruitment `/recruitment/jobs` | Add typed intent adapter and correction links | No shared backend search; ambiguous intent requires user choice |
| Company discovery | Featured seller and seller-name search APIs | Company-first Directory and results implemented | Service-family/capability metadata is a frontend adapter pending backend fields; irrelevant seeded sellers are excluded |
| Company identity | `sellerProfile` | Company profile implemented with identity, services, media and reviews | Not synchronized with `employerProfile`; product listings are filtered from the public presentation |
| Recruitment | Jobs, employer, candidate and application APIs | Preserve function, restyle and recompose | Role-lock model remains until backend membership work |
| Main public activity | Public recent reviews and seller media | Recompose | Never expose private candidate/application records |
| Native promotion | Existing internal ad booking/placement API | Allow one late unit on landing | Render only an internal target URL; no third-party landing ads |
| Saved | Product shortlist only | Later | Needs compatible company and job saving contracts |
| Updates | Stories, blogs, reviews and employer content exist separately | Add later | Needs aggregation endpoint or explicit client composition contract |
| Company workspace | `/dashboard`, seller tools, inquiries, uploads, ads | Recompose later | Product/RFQ tools stay out of primary public journeys |
| Recruitment workspace | `/recruitment/dashboard` | Restyle later | Preserve real status history and application lifecycle |
| Admin and moderation | Existing admin routes and APIs | Later | Customer-facing journeys migrate first |
| Consultations and finance | Existing code/routes | Hide | Preserve implementation; omit from public navigation |

## Pilot acceptance status

- Shared Bharat Navya tokens and Manrope: implemented.
- Three-destination shell: implemented.
- Universal search with high/low confidence behavior: implemented.
- Main landing using public seller, job, review/activity and ad APIs: implemented.
- Directory and Recruitment correction links: implemented.
- Frozen-reference source audit: completed for landing gateways, proof interaction, activity interaction, assistant styling and Directory scope.
- TypeScript verification: completed after the parity correction.
- Production build, route checks and exact-viewport browser verification: pending final QA for this change set.
