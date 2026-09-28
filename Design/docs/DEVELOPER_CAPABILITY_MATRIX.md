# Bharat Navya developer capability matrix

Updated: **30 August 2026**  
Status: **implementation-contract evidence; not a visual reference**

This matrix maps the approved product-design coverage to the full-stack developer build at `/Users/parthus/Downloads/BharatNavya-feature-ui-phase`. The build is evidence of functional capability only. Its marketplace UI, catalogue information architecture, industrial seed data, and product-commerce assumptions do not define Bharat Navya.

## Classification

- **Existing** — a usable backend route and compatible domain behavior already exist.
- **Adjust** — related functionality exists, but its model, lifecycle, permission, or contract conflicts with the approved product.
- **Missing** — no supporting backend capability was found in the inspected build.
- **Later** — relevant capability exists or is missing, but design and integration follow the core Companies and Jobs journeys.
- **Excluded** — present in the developer build but outside Bharat Navya's approved scope.

Endpoint evidence is derived from `backend/index.js` and the named files under `backend/routes/`. Frontend-only screens are not treated as proof that a production contract exists.

## Critical architecture decisions

| Contract | Developer-build evidence | Classification | Required implementation direction |
| --- | --- | --- | --- |
| One canonical company identity | Discovery uses `sellerProfile`; recruitment uses a separate `employerProfile` in `routes/users.js` | **Adjust** | One company record must own shared identity facts. Services/proof and careers/hiring content remain context-specific presentations of that record. |
| Personal access plus company memberships | `POST /api/me/recruitment-role` locks the account to `candidate` or `recruiter` after profile creation | **Adjust** | Remove the permanent candidate/recruiter fork. A person retains an applicant profile and may also hold one or more authorized company memberships. |
| Authorized recruiter actions | Current job ownership is `job.employerId === req.user.id`; no company membership/role entity was found | **Adjust** | Jobs, applicants, recruiter profiles, and permissions must be scoped to company membership, not only the creating user. |
| Separate review contexts | `GET/POST /api/reviews` includes recent and recruitment-recent views, but one review service carries the contexts | **Adjust** | Persist an explicit service/company or recruitment context and prevent misleading aggregation between them. |
| Explicit job lifecycle | `routes/jobs.js` accepts `draft`, `active`, `paused`, `closed` | **Adjust** | Add review, expired, and archived behavior or derive expiry safely; preserve history rather than relying on deletion. |
| Explicit application lifecycle | `routes/applications.js` supports applied, viewed, shortlisted, interview, rejected, hired, withdrawn with `statusHistory` | **Adjust** | Align names to Submitted/Offer/Closed where approved, define allowed transitions, and preserve terminal closure communication. |

## Shared account and platform

| Product capability | Current design surface | Backend evidence | Classification | Contract or gap |
| --- | --- | --- | --- | --- |
| Email/password registration and sign-in | Account dialog | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | **Existing** | Integrate email/password only for this phase. OTP routes exist but must not be used. |
| Password recovery/reset | Planned account flow | No recovery/reset route found in `routes/auth.js` | **Missing** | Add request, token validation, reset, expiry, throttling, and success contracts. |
| Shared notifications | Planned centre; local toasts today | `GET /api/notifications`, `PUT /read-all`, `PUT /:id/read` | **Existing** | Add product event taxonomy, deep-link targets, pagination, delivery failures, and preference rules. |
| Saved/followed companies | `/saved`, company profile | `POST/DELETE /api/follow/:userId`, `GET /api/follow/me` | **Adjust** | Re-key follows to canonical company IDs. Current shortlist API is listing/product-specific and is not the shared saved-items contract. |
| Report content/company/job | Existing report actions and planned moderation | `POST /api/reports`; admin report routes | **Adjust** | Confirm supported entity types, evidence, reporter privacy, duplicate handling, appeal, and audit retention. |
| File/image upload | Applicant/company editors | `POST /api/uploads` | **Adjust** | Add file types, size limits, scanning, processing, failure/retry, deletion, ownership, and résumé/document support. |

## Companies and inquiry

| Product capability | Current design surface | Backend evidence | Classification | Contract or gap |
| --- | --- | --- | --- | --- |
| Company search/results/profile | `/companies/browse`, `/companies/profile/:id` | Seller/listing routes in `routes/users.js` and `routes/listings.js` | **Adjust** | Replace product-listing assumptions with company/service capability search and canonical company identity. Do not import catalogue fields. |
| Company claim/create/edit | `/workspace`, `/workspace/profile` | `POST /api/become-seller`, `PUT /api/me/seller`, `POST /api/me/verification` | **Adjust** | Convert seller ownership into company claim/membership; separate member-editable facts from verification-owned fields. |
| Company services and proof | Company profile/editor | Seller profile plus listing CRUD | **Adjust** | Define company services, capabilities, credentials, work evidence, coverage, availability, and freshness without product SKUs. |
| Structured inquiry submit/list | `/companies/inquiry/:id`, `/requests` | `POST/GET /api/inquiries` | **Adjust** | Retarget to one canonical company, retain the structured brief, expose delivery/status/history, and remove RFQ fan-out assumptions. |
| Lead list/detail/respond | `/workspace`, planned `/workspace/leads` | `GET /api/inquiries`; `POST /api/inquiries/leads/:leadId/contact` | **Adjust** | Define company membership access, lead status, response history, internal notes, assignment, and closure. |
| Company media | `/workspace/media` | Generic upload plus seller/listing media fields | **Adjust** | Add company-owned media records, categories, ordering, processing state, captions, alt text, archive, and deletion. |
| Company reviews/replies/requests | `/workspace/reviews` | `GET/POST /api/reviews` | **Adjust** | Add owner responses, review-request provenance, reports, moderation state, and service vs recruitment context. |
| Company updates/highlights | `/updates`, `/workspace/updates` | Story CRUD, active/highlight/view routes in `routes/stories.js` | **Existing** | Align ownership to canonical company; enforce 24-hour expiry, highlights, attachments, disclosure, and moderation. |
| Company careers presentation | Company-linked planned surface | `GET /api/employers/:slug` returns employer plus active jobs | **Adjust** | Merge employer identity into canonical company and add workplace proof, hiring process, recruiters, reviews, and hiring updates. |

## Jobs and applicant experience

| Product capability | Current design surface | Backend evidence | Classification | Contract or gap |
| --- | --- | --- | --- | --- |
| Job browse/filter/detail | `/jobs/browse`, `/jobs/:jobId` | `GET /api/jobs`, `GET /api/jobs/:id` | **Existing** | Preserve pagination and employer approval gating; add promoted-position disclosure and approved freshness/closing rules. |
| Job save/remove | `/saved`, job cards/detail | No job-specific saved-items endpoint found | **Missing** | Add account-scoped saved-job CRUD and recommendation-explanation inputs. |
| Applicant profile | `/me/profile` | `PUT /api/me/candidate` | **Adjust** | Compatible fields exist; add privacy/discoverability policy, richer validation, file processing, visibility rules, and remove role locking. |
| Application profile gate | Job apply flow | `candidateProfileGaps` enforced by `POST /api/applications` | **Existing** | Return stable field keys, accessible user copy, and resume-processing state. |
| Questions, cover note, submit | Job apply flow | Job questions in `routes/jobs.js`; answers/coverNote in `POST /api/applications` | **Existing** | Add draft/review UI contract and idempotency key; retain duplicate/closed/profile-incomplete failures. |
| Application list/detail/timeline | `/jobs/applications` | `GET /api/applications/mine`, `GET /api/applications/:id`, `statusHistory` | **Existing** | Define pagination, missing-job behavior, recruiter/company identity, and terminal closure copy. |
| Applicant withdrawal | Application detail | `POST /api/applications/:id/withdraw` | **Existing** | Add confirmation, allowed-stage policy, outcome notice, and audit presentation. |
| Interview detail/reschedule/communication | Planned applicant detail | Only an `interview` application status was found | **Missing** | Add interview record, participants, time zone, location/link, reminder, reschedule/cancel, outcome, and message contracts. |
| Applicant recruiter messages | Planned messages | Generic REST/Socket.IO chat in `routes/chat.js` and `realtime/chat.js` | **Adjust** | Bind threads to company, job, and application; enforce participants, attachments, block/report, retention, delivery, and closure. |
| Recommendations | Saved/tracker planned section | No job recommendation service found | **Missing** | Start with explainable rules; define inputs, exclusions, freshness, dismissal, and no opaque fit score. |

## Company recruitment workspace

| Product capability | Current design surface | Backend evidence | Classification | Contract or gap |
| --- | --- | --- | --- | --- |
| Company recruitment overview | `/workspace/recruitment`, dashboard | Jobs/applications/employer endpoints | **Adjust** | Aggregate by company membership and expose priorities, limits, stale roles, response health, and failures. |
| Job create/edit/publish/status | `/workspace/recruitment/job` | `POST/PUT/DELETE /api/jobs`, `GET /api/jobs/mine` | **Adjust** | Prefer archive over destructive delete; add preview/review/expiry/archive and company-scoped permissions. |
| Applications by job/filter | Dashboard/pipeline | `GET /api/applications?jobId=&status=` | **Existing** | Add pagination, sort, search, stable filter enums, empty/error states, and company membership scope. |
| Candidate detail, résumé, answers, history | Pipeline detail | `GET /api/applications/:id` returns candidate/job/application context | **Existing** | Add attachment security, evidence provenance, visibility rules, and resilient missing fields. |
| Pipeline status changes | `/workspace/recruitment/pipeline` | `POST /api/applications/:id/status` with note/history | **Adjust** | Validate transition rules, distinguish applicant-visible communication from private notes, and add Offer/Closed if retained. |
| Private candidate notes | Pipeline detail | Status endpoint stores a note in applicant-visible status history | **Missing** | Add company-private notes with author, timestamp, edit/delete policy, audit, and strict non-disclosure. |
| Interview scheduling/templates/reminders | Planned recruitment flow | No interview/template routes found | **Missing** | Add company-owned templates plus interview scheduling and notification contracts. |
| Recruiter profiles and team permissions | `/workspace/team`, recruitment entry | Employer ownership is user-scoped; no membership/invite/role endpoints found | **Missing** | Add company memberships, invitations, recruiter profiles, roles, permissions, revocation, ownership transfer, and audit. |
| Hiring analytics | Dashboard planned section | Job view/application counts and `/api/me/analytics` exist | **Adjust** | Define trustworthy event inputs, date ranges, response/closure metrics, privacy thresholds, and accessible chart/table output. |

## Later-wave content, revenue, and admin

| Product capability | Backend evidence | Classification | Required adjustment or gap |
| --- | --- | --- | --- |
| Company blogs and public articles | CRUD in `routes/blogs.js` | **Later / Adjust** | Re-key authorship to person plus company membership; add draft/preview/publish/archive, moderation, slug history, and careers-guide context. |
| Promotion campaigns | Seller campaign CRUD in `routes/myAds.js`; placement/admin routes in `routes/ads.js` and `routes/admin.js` | **Later / Adjust** | Replace seller/listing targeting with eligible company/job/update units; add review, schedule, pause, rejection, reporting, disclosure, and billing linkage. |
| Plans, feature flags, entitlements | Admin plans, features, entitlements and configuration routes | **Later / Adjust** | Existing controls are admin-oriented. Add customer subscription, limits, upgrades/downgrades, invoices, payment failures, proration, and entitlement enforcement. |
| Billing and payments | Admin payment records in `routes/admin.js` | **Later / Missing** | No customer checkout/subscription lifecycle was found; integrate a payment provider and webhook/idempotency/audit contracts before design handoff is marked implementable. |
| Admin overview/users/accounts | `/api/admin/analytics`, users, account detail, suspend/reactivate | **Later / Existing** | Extend to company memberships, reasoned actions, confirmation, audit, pagination, and permission boundaries. |
| Company verification/moderation | Admin listing verification and moderation routes | **Later / Adjust** | Convert listing/product evidence to canonical company claims, service proof, expiry, appeal, and reviewer audit. |
| Recruitment employer/job moderation | `routes/adminEmployers.js`, `routes/adminJobs.js` | **Later / Existing** | Add evidence view, reason codes, notification, audit history, pagination, and safe pause/close/remove rules. |
| Skills/job taxonomy | Public and admin job-function/role/skill routes | **Later / Existing** | Preserve recruitment taxonomy; define merge/deprecation/usage safeguards and do not mix it with product categories. |
| Recruitment reviews/reports/advertising | Shared review/report/ads services | **Later / Adjust** | Require explicit recruitment context, company/job links, moderation, disclosure, billing, and audit contracts. |
| Limited third-party public ads | General ads/placement routes exist but are marketplace-shaped | **Later / Adjust** | Add contextual-only targeting, approved formats, external-link disclosure, “Why this ad?”, route deny-list enforcement, frequency caps, creative review, reporting, and audit. Never use applicant/profile/message behavior. |

## Explicitly excluded developer modules

Do not design or integrate these modules unless product scope is explicitly changed:

- product catalogue, industrial/steel listings, product detail and SKU-like fields;
- RFQs, quotations, purchase orders, cart, checkout, or transaction workflows;
- brands and product collections;
- consultations/expert marketplace;
- lending, credit-card, mutual-fund, or financial-product modules;
- public candidate directory/search, even though `GET /api/candidates/:id` exists;
- OTP authentication in this phase.

## Handoff rule

Every new or extended design must cite one row in this matrix and be marked **Existing**, **Adjust**, **Missing**, or **Later** in its developer annotation. “Existing” never means the developer UI should be copied. “Adjust” must identify the exact data, permission, lifecycle, or policy difference so implementation does not silently inherit the wrong marketplace model.
