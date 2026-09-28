# Bharat Navya platform architecture

> For the current approved route map, use `HANDOFF.md` and `src/App.tsx`. For the
> complete design inventory, missing states, later waves, and exclusions, use
> `docs/BHARAT_NAVYA_DESIGN_BLUEPRINT.md`.

This document is the living product map for the frontend prototype. The current implementation uses fictional fixtures and browser-local state; production services are intentionally deferred.

## Product boundaries

Bharat Navya connects two evidence-led journeys under one account:

1. Company discovery: search, inspect proof, compare, follow, save, review, and inquire.
2. Recruitment: discover transparent roles, apply, track outcomes, and manage candidates from an authorized company workspace.

Transactions, loans, phone OTP, unrestricted advertising networks, and broad social networking are outside the current boundary. Limited governed third-party inventory is permitted only on the public discovery surfaces defined below.

## Route ownership

| Surface | Route | Owner | Goal | Primary action |
|---|---|---|---|---|
| Company discovery | `/` | Visitor | Express a need | Prepare a brief |
| Results | `/directory/results` | Visitor | Evaluate matching companies | Open company |
| Company profile | `/directory/profile` | Visitor | Inspect proof and context | Send inquiry |
| Jobs | `/jobs` | Applicant | Find a relevant, fresh role | View role |
| Job detail | `/jobs/detail` | Applicant | Understand fit and process | Apply |
| Updates | `/updates` | Visitor/follower | See current company activity | Open update |
| Saved | `/saved` | Account holder | Return to saved decisions | Continue evaluation |
| Applicant home | `/me` | Applicant | Track applications and interviews | Open application |
| Applicant profile | `/me/profile` | Applicant | Maintain recruiter-visible evidence | Save profile |
| Business home | `/workspace` | Company member | See health and urgent work | Respond or improve |
| Media | `/workspace/media` | Content manager | Maintain public media | Upload media |
| Reviews | `/workspace/reviews` | Company member | Respond and request reviews | Reply |
| Updates workspace | `/workspace/updates` | Content manager | Publish and retain statuses | Create status |
| Recruitment | `/workspace/recruitment` | Recruiter/admin | Manage roles and candidates | Open hiring dashboard |
| Recruiter dashboard | `/workspace/recruitment/dashboard` | Recruiter | Review hiring priorities | Review applicants |
| Candidate pipeline | `/workspace/recruitment/pipeline` | Recruiter | Advance candidates clearly | Change stage |
| Job editor | `/workspace/recruitment/job` | Recruiter | Publish a transparent role | Submit for review |
| Team | `/workspace/team` | Owner/admin | Control access | Invite member |
| Promotion | `/workspace/promotions` | Owner/admin | Manage eligible native promotion | Create campaign |
| Component gallery | `/design-system` | Product/engineering | Review reusable states | Inspect component |

## Domain source of truth

Shared product interfaces live in `src/platform/platform-types.ts`; fictional prototype records live in `src/platform/platform-fixtures.ts`. Company discovery records extend `BusinessProfile` in `src/types.ts` and `src/data.ts`.

Core relationships:

- An account can own a personal profile and multiple workspace memberships.
- A company owns media, proof, reviews, statuses, jobs, inquiries, and campaigns.
- A recruiter profile is valid only through a company workspace membership.
- A job belongs to one company and one or more named recruiters.
- An application joins a candidate profile to a job and retains its terminal record.
- Promoted placement references eligible organic content; it never becomes trust evidence.

## Lifecycle contracts

- Company: Unclaimed → Claimed → Identity verified → Evidence verified → Restricted.
- Evidence: Draft → Submitted → Pending → Verified or Rejected → Expired.
- Job: Draft → Review → Live → Paused → Closed or Expired → Archived.
- Application: Draft → Submitted → Viewed → Shortlisted → Interview → Offer → Hired, Rejected, Withdrawn, or Closed.
- Status: Draft → Processing → Live → Expired → Highlighted, Archived, or Removed.
- Review: Draft → Submitted → Published → Reported → Under review → Retained, Removed, or Appealed.
- Promotion: Draft → Eligibility check → Review → Scheduled or Active → Paused → Completed or Rejected.

Terminal application decisions must notify the applicant. Statuses expire after 24 hours unless the publisher explicitly saves them to a named highlight.

## Prototype policy rules

### Registration

Guests browse freely. Saving, following, applying, reviewing, contacting, publishing, and workspace management require email/password registration. A passive prompt appears only after 90 seconds and two meaningful page views, is suppressed for seven days after dismissal, and must not stack over another modal.

### Jobs and recruitment

Every distributed job has a salary band, named recruiter, company association, publish/review/closing context, must-have versus preferred criteria, and an explainable match-and-gap view. Recruiters cannot publish independently of an authorized company.

### Reviews

Primary reviews require a recorded platform interaction. Public records show context and verification but not private transaction details. Reporting, moderation, appeal, conflicts, incentives, and removal rules must be operational before production launch.

### Statuses

Only claimed companies and authorized recruiters publish. Live updates support text, media, links, hiring, offers, events, milestones, work samples, and availability. Accessible playback, reporting, blocking, expiry, and highlight retention are required contracts.

### Promotion

Sponsored units are labelled and separate from trust styling. Current prototype placement caps are one company after three organic results, one job after four organic jobs, and one update after five organic updates. Profiles, comparison, inquiries, applications, messages, reviews, pipelines, and account screens remain ad-free.

Third-party units are a separate `ThirdPartyAd` contract labelled **Advertisement**. Companies and Jobs homepages each expose one late partner slot. Company browse permits one desktop rail or an inline unit after eight organic companies; Jobs browse permits one desktop rail or an inline unit after ten organic roles. Main landing and Updates have no third-party display inventory. No long public browse page may show more than two paid units or place paid units within four organic records of each other. Targeting is contextual only: public section, category or role family, and broad location.

## Production replacement boundary

Local fixtures and browser state must eventually be replaced by authentication, permission enforcement, persistence, upload/media processing, moderation queues, notification delivery, messaging, analytics, audit history, privacy controls, abuse prevention, and billing. UI presence does not imply those production services exist.
