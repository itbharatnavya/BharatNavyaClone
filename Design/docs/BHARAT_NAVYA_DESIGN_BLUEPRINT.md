# Bharat Navya product-design blueprint

Updated: **30 August 2026**  
Status: **living handoff and recovery document**

Current sequencing note: Companies and Jobs homepage revisions are intentionally on hold until the product designer provides review feedback. Low-decision design-system, state coverage, accessibility, documentation, and non-homepage journey work may continue without altering those approved surfaces.

This document records what must be preserved, extended, designed later, or excluded. It is the page-and-state source of truth when product-design work pauses or changes hands. `HANDOFF.md` and `src/App.tsx` control the currently approved live prototype routes; this blueprint keeps later product coverage visible without pretending deferred services are implemented. `docs/DEVELOPER_CAPABILITY_MATRIX.md` is the corresponding action-to-backend contract and records existing capabilities, required adjustments, missing services, later work, and exclusions.

## Status vocabulary

- **Preserve**: approved and functioning; systematize without redesigning.
- **Extend**: approved route exists; missing sections or states need design.
- **New**: approved design need without a current route or complete surface.
- **Later wave**: document now; design only after core journeys and explicit approval.
- **Excluded**: does not align with the current product direction.

## Product structure

Bharat Navya has three public destinations:

1. Parent Home
2. Companies
3. Jobs / Recruitment

Applicants remain inside Jobs and their personal workspace. Recruiters work from an authorized company workspace. Company discovery and careers presentations connect to one accountable company identity but may use different page compositions.

## Page and state matrix

### Parent and shared account

| Surface | Route | Status | Required design coverage | Prototype dependency |
| --- | --- | --- | --- | --- |
| Parent home | `/` | Preserve | Centred search, compact product gateways, proof story, city activity, sponsored disclosure, closing CTA | Existing fixture state |
| Updates | `/updates` | Preserve | Public previews, follow gate, story playback gate, expiry/highlights, sponsored state | Updates fixtures |
| Saved | `/saved` | Extend | Companies, jobs, updates; empty and signed-out states | Local saved state |
| Join/sign in | Dialog | Extend | Email/password, role context, terms, validation, success, failure, recovery entry | Prototype-local auth only |
| Password recovery | — | New | Request, sent, expired-link, reset, success | Missing production auth capability |
| Notifications centre | — | Later wave | Read/unread, grouped activity, deep links, empty/error states | Missing notification service |
| Shared messaging | — | Later wave | Conversation list, thread, delivery/error/block/report states | Real messaging deferred |

### Companies

| Surface | Route | Status | Required design coverage | Prototype dependency |
| --- | --- | --- | --- | --- |
| Companies home | `/companies` | Extend | Task-first Guided Showcase: need-led hero/docked search, trust vocabulary, recognizable service families, local need records, request-to-inquiry proof journey, verified companies, current work/updates, sponsored disclosure and owner CTA | Company fixtures and shared product-home system |
| Search workbench | `/companies/browse` | Preserve | Query context, optional filters, results, selected detail, empty/error states, back-state retention | Company fixtures and local filters |
| Compare | `/companies/compare` | Preserve | Evidence comparison, missing data, shortlist limits, responsive record layout | Local shortlist |
| Company profile | `/companies/profile/:companyId` | Extend | Identity, services, capabilities, work/product media, evidence, reviews, updates, availability, open jobs, inquiry | Canonical company fixture |
| Structured inquiry | `/companies/inquiry/:companyId` | Preserve | Need summary, details, privacy, review, submit and error states | Prototype inquiry state |
| Request tracker | `/requests` | Extend | Sent/viewed/replied, conversation continuation, empty and failure states | Prototype inquiry state |
| Careers presentation | Company-linked section initially | New | Open roles, workplace proof, hiring process, recruiters, recruitment reviews/updates | Reuse canonical company identity; route needs approval |
| Blog/career guide index and article | — | Later wave | Editorial index, article, company/recruiter authorship, report state | Content service deferred |

### Applicant and Jobs

| Surface | Route | Status | Required design coverage | Prototype dependency |
| --- | --- | --- | --- | --- |
| Jobs home | `/jobs` | Extend | Task-first Guided Showcase: role/location/workplace hero and docked search, job trust contract, role families, career shortcuts, transparent fresh roles, application-closure journey, verified hiring companies, recruiter updates, sponsored disclosure and applicant-first CTA | Recruitment fixtures and shared product-home system |
| Job workbench | `/jobs/browse` | Preserve | Filters, organic/promoted ordering, selected preview, saved state, empty/error states | Jobs fixtures and local filters |
| Job detail | `/jobs/:jobId` | Extend | Salary, freshness, recruiter, requirements, evidence/gaps, process, report, apply flow | Jobs/recruiter fixtures |
| Apply flow | Job detail section/dialog | Extend | Auth gate, profile-completeness gate, focused questions, cover note, review, submitting, success, duplicate, closed and error | Local application state; API later |
| Applicant tracker | `/jobs/applications` | Extend | Overview, explicit stages, application detail/timeline, interview context, withdrawal, terminal closure | Applications fixtures |
| Applicant profile | `/me/profile` | Extend | Résumé, experience, education, skills, preferences, privacy/discoverability, validation | Local profile state; uploads deferred |
| Saved jobs/recommendations | `/saved` and tracker | Extend | Empty, recommendation explanation, save/remove | Local saved state |
| Applicant interviews/messages | — | Later wave | Schedule, reminders, reschedule, thread, closure communication | Messaging/calendar services deferred |

### Company workspace

| Surface | Route | Status | Required design coverage | Prototype dependency |
| --- | --- | --- | --- | --- |
| Company home | `/workspace` | Preserve | Urgent work, profile health, leads, recruitment, reviews, updates and promotion shortcuts | Company fixtures |
| Profile editor | `/workspace/profile` | Extend | Identity, services, evidence, completeness, preview, validation | Local draft state |
| Media | `/workspace/media` | Extend | Library, categories, ordering, add/edit/remove, missing/processing/error | Upload service deferred |
| Leads | `/workspace/leads` | Extend | List, lead detail, status, response history and qualified-context display | Inquiry fixtures |
| Reviews | `/workspace/reviews` | Extend | Summary, reply, request, report, moderation status | Reviews fixtures; moderation deferred |
| Updates/highlights | `/workspace/updates` | Extend | Compose, media/link/job attachment, preview, publish, expiry, archive, highlights | Local prototype behavior |
| Team/permissions | `/workspace/team` | Extend | Members, invitations, roles, access, pending/revoked states | Real authorization deferred |
| Promotions | `/workspace/promotions` | Extend | Eligibility, campaign list, placement policy, create/review/active/pause/reject/report | Campaign fixtures; billing deferred |
| Company blogs | — | Later wave | List, editor, preview, publish, archive/remove | Content service deferred |
| Subscription/billing | — | Later wave | Plans, limits, upgrade/downgrade, payment history and failures | Billing deferred |
| Company inbox/chat | — | Later wave | Conversations, thread, lead context, attachments, report/block | Messaging deferred |

### Recruitment workspace

| Surface | Route | Status | Required design coverage | Prototype dependency |
| --- | --- | --- | --- | --- |
| Recruitment entry | `/workspace/recruitment` | Preserve | Jobs, candidates, recruiter profiles, interview/template pathways | Recruitment fixtures |
| Recruiter dashboard | `/workspace/recruitment/dashboard` | Extend | Priorities, jobs, applicant experience, analytics and empty/error states | Jobs/application fixtures |
| Jobs management | Dashboard now; route later | New | Draft/live/paused/closed/expired/archive, search, actions and performance | Status fixtures; route approval needed |
| Job editor | `/workspace/recruitment/job` | Extend | Basics, salary, requirements, questions, recruiter, closing date, preview, draft/publish outcomes | Local form state |
| Candidate pipeline | `/workspace/recruitment/pipeline` | Preserve | Job scope, filters, stages, candidate detail, notes, explicit stage change | Candidate fixtures |
| Candidate/application detail | Pipeline drawer initially | Extend | Résumé, answers, evidence/gaps, history, private notes, contact permissions | Candidate/application fixtures |
| Recruiter profiles | Recruitment entry initially | New | Authorized recruiters, ownership, response behavior, access | Team/permission service deferred |
| Interviews/templates | Recruitment entry initially | Later wave | Scheduling, templates, reminders, outcomes and closure | Messaging/calendar deferred |
| Hiring analytics | Dashboard section initially | Later wave | Response, time-to-action, closure, stale roles, accessible charts | Analytics service deferred |

### Admin and operations

Admin is fully documented but remains a later design wave because the current repository is a frontend prototype and the approved route map has no admin surface.

| Area | Status | Required design coverage | Dependency |
| --- | --- | --- | --- |
| Global overview | Later wave | Operational health, urgent queues, system state | Real backend/admin authorization |
| Users/account detail | Later wave | Search, filters, roles, memberships, suspension/reactivation, audit history | Auth and audit services |
| Plans/features/entitlements | Later wave | Plans, feature catalogue, entitlement matrix, change confirmation | Billing/entitlement services |
| Site configuration | Later wave | Branding, copy, feature flags, contact/footer, safe preview/publish | Configuration service |
| Company claims/verification | Later wave | Evidence queue, decision, rejection reason, expiry and appeal | Verification service |
| Company taxonomy | Later wave | Service/category CRUD, hierarchy, usage and safe deletion | Canonical taxonomy |
| Reviews/reports/content | Later wave | Queues, evidence, context, retain/remove/appeal | Moderation service |
| Inquiry operations | Later wave | Failed delivery, abuse/escalation and audit context | Production inquiry service |
| Recruitment users/employers | Later wave | Approval, suspension and company association | Auth/recruitment services |
| Job moderation | Later wave | Search, filters, evidence, pause/close/remove and audit | Jobs service |
| Skills/job taxonomy | Later wave | Skill, role and function management | Recruitment taxonomy |
| Advertising/promotions | Later wave | Eligibility, creative, schedule, status, disclosure and billing | Ads and billing services |

Every admin list requires loading, empty, error, search, filters, pagination, detail inspection, confirmation, success/failure, permission and audit states.

## End-to-end journeys

### Company discovery

Need/search → useful results → optional refinement → shortlist/compare → company profile → structured inquiry → request tracker → company response.

Success means the user can explain why a company fits, what is unverified, and what happens after contact.

### Job application

Jobs home/search → results → job detail → save or apply → auth/profile gate → focused application → submitted record → stage/interview/terminal closure.

Success means salary, freshness, recruiter ownership, process, evidence, gaps, and outcome remain explicit.

### Recruiter hiring

Company workspace → recruitment overview → create/maintain job → review applicants → inspect evidence → record notes → change stage → interview → terminal decision and applicant notification.

Success means every public role and candidate decision has accountable ownership and closure.

### Promotion

Eligible organic company/job/update → placement selection → audience/budget → review → scheduled/active → visibly sponsored distribution → report/pause/completion.

Promotion never changes verification, review, evidence, or organic fit.

### Moderation

Report or queued item → operational filters → context/evidence → confirmed action → audit record → notification/appeal where applicable.

## Product and technical contracts

- One canonical company identity supports discovery and recruitment contexts.
- Company identity facts are shared; service proof and careers content may be context-specific.
- Reviews record context so company-service and recruitment feedback do not become misleading.
- Job states: Draft → Review → Live → Paused → Closed/Expired → Archived.
- Application states: Draft → Submitted → Viewed → Shortlisted → Interview → Offer → Hired, Rejected, Withdrawn, or Closed.
- Terminal application decisions notify the applicant when production notification services exist.
- Recruiter actions require authorized company membership.
- Guests browse; save, follow, apply, review, contact, publish, and workspace actions require registration.
- Prototype fixtures and local state are demonstration tools, not production API contracts.
- Developer annotations use `docs/DEVELOPER_CAPABILITY_MATRIX.md`; developer-build UI and marketplace data remain non-authoritative.

## Visual evidence and advertising coverage

- **Preserve:** the approved centred heroes on `/`, `/companies`, and `/jobs`; media begins below the primary search.
- **Extend:** Companies home/browse/profile, Jobs home/browse/detail, Updates, Saved, applicant/recruiter records, workspaces, and compact admin identification with governed logos, portraits, workplace/work media, and intentional fallbacks.
- **New:** `EntityLogo`, `PersonAvatar`, `MediaFrame`, `MediaStrip`, `MediaRecord`, and a separate third-party `Advertisement` contract.
- **Placement:** main landing has no external advertising; Companies and Jobs home each have one late slot; Companies browse has native after three organic and an external rail or inline unit after eight organic; Jobs browse has native after four and an external rail or inline unit after ten; Updates has native only after five.
- **Protected:** profiles, details, compare, inquiry, application, messages, reviews, Saved, auth, personal/company dashboards, workspaces, recruiter pipelines, billing, and admin decisions remain third-party-ad-free.
- **Targeting:** public section, category or role family, and broad location only. Never applicant history, private profile content, messages, or application behavior.
- **Caps:** no two paid units within four organic records and no more than two paid units on a long public browse page.

## Explicit exclusions

- Steel and industrial-product seed catalogues
- Product-detail commerce pages
- IndiaMART/Moglix-style mandatory category trees
- RFQs, quotations, purchase orders, carts, checkout, and transactions
- Brands and product collections as marketplace modules
- Consultations marketplace
- Loans, credit-card, and mutual-fund modules
- Public candidate search or proactive talent marketplace
- Separate public Recruitment homepage beyond `/jobs`
- Developer-build styling or seeded marketplace content as a design reference

## Verification and handoff checklist

- Select an approved page pattern and shared components.
- Map every action to existing prototype behavior, missing production capability, or deferred service.
- Cover loading, empty, error, restricted, success, validation, and long-content states.
- Verify 375, 768, 1024, and 1440px plus 200% zoom.
- Verify keyboard operation, focus, contrast, reduced motion, dialogs/drawers, responsive tables, and browser Back.
- Verify every SPA route updates the document title, announces the destination once, and moves focus to the main landmark without forcing scroll.
- Verify multi-step forms identify the current step, associate all field guidance, and expose progress values independently of visual styling.
- Keep the parent homepage gateway cards compact and content-sized.
- Keep mobile navigation to one row: Home, Companies, Jobs, Updates, Saved.
- Run `npm run verify` after material implementation changes.
- Update this matrix and `docs/DESIGN_SYSTEM.md` whenever feedback changes scope or system behavior.
