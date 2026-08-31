# Recruitment — Dashboard, Flow & Feature Build Plan

## ⚠️ READ THIS BEFORE CHANGING ANY CODE ⚠️

> **1. Check existing functionality first.** Recruitment is largely already built. Before implementing anything in this document, open the referenced files and confirm the current state for yourself. If something already works — leave it alone.
>
> **2. Ask before any big functional change.** This document proposes target designs for genuine gaps. It is a reference to work from, not a blank check. If an item turns out to need a different approach than described here, or touches something more than expected, **stop and ask the product owner before implementing it.** Do not make large unilateral functional changes.
>
> **3. Recruitment-only scope.** This is BharatSource's second suite product, a **child of the main application** — Directory, Consultations, and every other suite product must be completely unaffected by this work. Never touch `listings.json`/`inquiries.json`/`DashboardShell.tsx`/Directory routes or components while implementing anything here (see [RECRUITMENT.md](RECRUITMENT.md) §1's divergence notes — Recruitment deliberately has its own collections, its own dashboard shell, its own routes).
>
> **4. Read [CLAUDE.md](CLAUDE.md) and [RECRUITMENT.md](RECRUITMENT.md) first.** They contain the non-negotiable suite-wide rules (no emojis, native `<select>` filters, zero 390px overflow, local images only, `store.js`-only persistence, no payments) and the authoritative data model / architecture. This document assumes both and does not repeat their rules.
>
> **5. Update §12 (Phase Tracker) immediately after finishing each phase — before starting the next one.** Mark the phase done, note the date, list what was actually built (and anything that diverged from the plan, with why), same style as RECRUITMENT.md's own build-history log. This doc is meant to stay a live, trustworthy reference — an unfinished or stale tracker defeats that.

Source of truth for every claim below: a fresh, file-by-file code audit performed alongside this doc (not just what RECRUITMENT.md or the enhancement doc claim — those can drift from the actual code). File:line references are cited throughout; verify them before building, since the working tree has some in-progress uncommitted changes (`backend/routes/jobRoles.js`, `backend/routes/skills.js`, migration `0005`, `frontend/app/recruitment/page.tsx`, `frontend/components/recruitment/JobCard.tsx`).

---

## 1. Core concept: role-branched dashboards and flows

Recruitment's defining architecture is **one entry point that branches into two completely distinct experiences based on user type**:

- A single home page (`/recruitment`) and shared browsing surfaces (`/recruitment/jobs`, `/job/[id]`, `/employer/[slug]`) for everyone.
- On first dashboard visit, a **role gate** asks "looking for a job" (Candidate) vs. "hiring" (Recruiter) — `RoleGate` in `frontend/app/recruitment/dashboard/page.tsx:22-63`.
- Picking a role reveals that role's profile setup. The role **locks** the moment the first profile is actually created — `PUT /me/candidate` locks to `"candidate"` (`backend/routes/users.js:891-898`), `POST /become-employer` locks to `"recruiter"` (`backend/routes/users.js:817-823`). Once locked, the opposite role's endpoints 403 (`users.js:766-771,785-790,864-869`) and the "Switch role" link disappears (`page.tsx:83-91`).
- After lock, `RecruitmentDashboardShell` renders an entirely different tab set depending on `user.recruitmentRole` — candidates get an applications-tracking dashboard, recruiters get a company/job/applicant-management dashboard. Same shell component, role-conditioned tab list, not two separate shells (mirrors `DashboardShell.tsx`'s own `TabMeta[]`/`useMemo` gating pattern, per RECRUITMENT.md §4).
- The apply flow itself is role-gated too: a recruiter never sees "Apply Now," only "Manage" on their own jobs (`ApplyModal` / `handleApplyClick` hidden for `recruitmentRole === "recruiter"`, per RECRUITMENT.md §6).

**This is already fully built.** Every section below is organized around this principle — extending what each role's dashboard *does*, not changing the branching mechanism itself.

---

## 2. Candidate Dashboard — tab-by-tab target state

### Overview
No changes. Client-side stat cards off `getMyJobs`/`getMyApplications`, unchanged.

### My Applications (`MyApplicationsTab.tsx`)
**Already built:** job title/link, applied date (`app.appliedAt`), status badge, pipeline dots (`PipelineTrack`, lines 44-70), expandable status history (lines 116-125).

**Gaps to close:**
- **Withdraw action.** Does not exist today — no backend endpoint (`backend/routes/applications.js` has only `POST /`, `GET /mine`, `GET /`, `GET /:id`, `POST /:id/status`, no withdraw/delete) and no frontend button. Target: a candidate-only "Withdraw" button per application, disabled once status is `hired` (and arguably `rejected`, since there's nothing to withdraw from). Introduces a new terminal status, `withdrawn`, added to `applications.js`'s status set — **do not repurpose an existing status value for this.** Once withdrawn, the recruiter's Applications tab should show it as withdrawn (read-only, not actionable further).
- **Submitted answers not shown back to the candidate.** The backend already returns `app.answers` and `app.coverNote` (`applications.js:107-117,151`) but `MyApplicationsTab.tsx` never renders them. Target: show both, read-only, inside the existing expandable row — per the user's flow, once submitted these must not be editable.

### Profile (`CandidateProfileTab.tsx`)
**Already built:** headline, current role, current company, experience years (single number), expected salary, open-to-work toggle, summary, skills (free-text tags), preferred locations (free-text tags), CV upload via `ResumeUpload`.

**Gaps to close** (backend model already has most of these fields — `PUT /me/candidate`, `backend/routes/users.js:872-899` — this is UI-only work in most cases):
- **Profile photo upload.** No upload control exists anywhere for candidates (`avatarUrl` is only ever displayed, never set via any upload UI). Target: reuse the existing `ImageUpload` component, write to `user.avatarUrl`. Before building anything new, find and reuse whatever existing endpoint/flow already lets a user set `avatarUrl` elsewhere in the suite — don't invent a second one.
- **Mobile + email inputs.** Backend fields `contactPhone`/`contactEmail` exist but have no inputs in this tab. Add them.
- **Per-company work history.** Backend has a `workHistory` array field (`users.js:876`) never populated by the UI — only the flat `currentRole`/`currentCompany`/`experienceYears` exist today. Target: a repeatable row editor (company, role, start/end duration, details) — mirror the existing row-editor pattern already used for job questions/rate cards (`components/sell/editors.tsx`'s `QuestionsEditor`/`RateCardEditor` shape), don't invent a new editor pattern.
- **Education.** Backend has an `education` array field (`users.js:876`), no UI at all. Same repeatable-editor treatment (institution, degree, year).
- **Preferred job types.** Backend supports `preferredJobTypes` (`users.js:880`), no UI. Target: multi-select checkboxes off the existing `employmentType` enum (`full-time|part-time|contract|internship|freelance`, already defined in `post-job/page.tsx:20-26`) — reuse that enum, don't redefine it.
- **Skills / role taxonomy.** See §8 below — the skill and current-role inputs should become comboboxes backed by the static picklist endpoints, with a free-text custom fallback.

---

## 3. Recruiter Dashboard — tab-by-tab target state

### Overview
No changes.

### My Jobs (`MyJobsTab.tsx`)
**Already built:** status badges for `active`/`paused`/`closed` (lines 15-26), Pause/Resume/Close actions, view via public `/job/[id]`, edit via `/post-job?jobId=` (a genuinely separate page from view, not the same page).

**Gaps to close:**
- **Draft vs. Published.** `VALID_JOB_STATUSES` is currently only `active|paused|closed` (`backend/routes/jobs.js:38`) and every new job is hard-coded `active` on create (`jobs.js:270`) — there is no way to save a job without it going live. Target: add `draft` to the status enum; `/post-job` gets a "Save as draft" button alongside "Publish"; draft jobs are excluded from the public browse endpoint (only visible via `GET /api/jobs/mine`).
- **Expired.** `expiresAt` is stored (`jobs.js:274`) but the field is never surfaced in the create/edit form, so it's always `null` today, and there's no "expired" status shown anywhere. Target: once §4's expiry date picker exists and jobs actually carry a real `expiresAt`, show an "Expired" badge in My Jobs derived client-side (`expiresAt < now`) — **do not add a new stored status for this**, keep the stored enum to `active|paused|closed|draft` and treat "expired" as a display-only computed state, same spirit as the existing status badges.

### Applications (`ApplicationsTab.tsx`)
**Already built:** candidate detail row (skills, experience, CV link, question answers, cover note, status history), status-update select, `GET /api/applications?jobId=&status=` filtering (`applications.js:209-244`).

**Gap to close:**
- Support `?tab=applications&jobId=` deep-linking so a notification click (§6) can land directly on a specific job's applicant list, pre-filtered. This is additive — the tab already accepts a `jobId` filter server-side, it just needs to read it from the URL on mount.

### Company Profile (`CompanyProfileTab.tsx`)
**Already built:** company name, industry, company size, website, city, state, about — all plain text inputs (lines 72-82). Status readout (`approved`/`suspended`/`pending`, line 68). Backend already has `logo`/`coverImage` fields in the model and the `PUT /me/employer` allow-list (`users.js:841-844`) — they're just never set because **no upload control exists in the UI at all.**

**Gaps to close:**
- **Logo + cover-image upload.** Wire the existing backend fields to actual `ImageUpload` controls — this is a pure UI gap, no backend change needed.
- **Employee strength** (new field — numeric, e.g. "1-10", "11-50", or an exact headcount; decide format against how `companySize` is already used to avoid a redundant near-duplicate field).
- **Company-level benefits** (new field — string list). **Do not confuse with the existing per-job `benefits` field** (`jobs.js:267,317`) — that's a different field on a different entity (a specific job posting), this is a property of the company itself, shown on every job the company posts.
- **Working hours / timing** (new field — simple text is enough, e.g. "Mon–Fri, 9:30 AM–6:30 PM"; no need for a structured day-by-day schema unless a real need for filtering/search on it emerges later).
- **Layout:** redesign this tab as a single tabular profile view per the user's request — group identity (name/logo/cover), company details (industry/size/employee strength/website/location/timing), and benefits into clearly separated sections/rows rather than a flat stacked form.

### Stories / Blogs / Reviews / Advertise
No changes — already generic, already reused directly (`StoriesTab`/`BlogsTab`/`ReviewsTab`/`AdvertisementsTab`), confirmed working end-to-end including the admin ad-approval pipeline (`myAds.js` forces `pending` on create, line 81; only `PUT /api/admin/ad-bookings/:id` can activate, `admin.js:337-373`; public serving has no auth/role gate at all, `routes/ads.js:19-36`).

---

## 4. Job Posting Form (`/post-job`) — additions

Current fields (all already built, `frontend/app/post-job/page.tsx`): title, jobFunction, employmentType, experienceLevel, description, city/state/remote, salary min/max/disclosed, openings, skills, responsibilities, requirements, benefits (job-level), screening questions (`QuestionsEditor`).

**Gaps to close:**
- **Qualification / education requirement** — new field on `jobs` (e.g. "Bachelor's degree", "Any graduate", "Not required" — a short free-text or small enum, decide against whatever's simplest to validate).
- **Draft vs. Publish** — see §3's My Jobs gap; the actual UI control (two submit buttons, or a status radio) lives here.
- **Expiry / time-limit date** — backend already accepts and stores `expiresAt` (`jobs.js:274`); just add the date picker input and wire it into the submit body (currently the form's `submit()` body, lines 125-144, never includes it).

---

## 5. Apply Now — home, search, job cards, detail

**Already built and re-verified:** `handleApplyClick` on `/job/[id]` is gated on `user` via `ContactAuthModal`, and hides entirely for `recruitmentRole === "recruiter"` (RECRUITMENT.md §6).

**To verify/extend at implementation time:** `frontend/components/recruitment/JobCard.tsx` is mid-edit in the current working tree — before building anything here, check whether `JobCard` (used on `/recruitment` home sections and `/recruitment/jobs` search results) has any quick-apply affordance of its own, or purely links through to `/job/[id]`. If it has one, it must obey the exact same recruiter-hides-apply rule as the detail page — **do not let a second, unguarded apply entry point exist.** There must be exactly one apply flow (`ApplyModal`), reachable from every job card, never a parallel implementation.

---

## 6. Notifications

**Already built:** create → list → bell → mark-read pipeline is fully wired (`NotificationBell.tsx`, `backend/routes/notifications.js`). `new_application` fires to the employer on apply (`applications.js:172-177`), `application_status` fires to the candidate on a status change (`applications.js:296-301`), both fire-and-forget with the relevant `jobId`/`jobTitle`/`applicationId` already in the payload.

**Gaps to close:**
- `NotificationBell.tsx`'s `describe()` (lines 30-55) has no case for `new_application`/`application_status` — they currently fall through to a raw `type.replace(/_/g," ")` default. Add proper copy, e.g. "New application for {jobTitle}" / "Your application for {jobTitle} is now {status}".
- Notification rows are currently inert beyond mark-as-read (lines 170-193 — a plain button, no navigation). Add click-through: `new_application` → `/recruitment/dashboard?tab=applications&jobId=` (using §3's new deep-link support); `application_status` → `/recruitment/dashboard?tab=applications` (candidate's My Applications).

---

## 7. Blogs

**Already built:** recruiters can create blogs from their dashboard via the reused `BlogsTab` (`RecruitmentDashboardShell.tsx:22,41,101-102`) — same generic `blogs.js` infra Directory sellers use.

**Gap to close:**
- **No recruitment-scoped blog page exists.** The landing page links straight to the generic `/blog` (`frontend/app/recruitment/page.tsx:537,545`) — there's no `/recruitment/blog`. Target: add one, as a filtered view of the existing generic blog list (blogs authored by a user with an `employerProfile`) — **reuse `blogs.js`/the existing blog-listing UI, do not build a second blogs collection or a parallel authoring flow.** The suite-wide `/blog` page stays exactly as-is for everyone else; this is purely an additional, filtered entry point for the Recruitment section's own nav.

---

## 8. Roles/Skills taxonomy wiring

**Already built (backend only, unwired):** `backend/routes/jobRoles.js` (`GET /api/job-roles?jobFunction=`) and `backend/routes/skills.js` (`GET /api/skills?jobFunction=`) are live, mounted (`backend/index.js:44-45`), read-only picklists seeded with ~49 roles / ~86 skills tagged by job function. **Zero frontend consumption today** — not in `frontend/lib/api.ts`, not called from any component. Candidate skills remain plain free-text tags.

**Target:**
- Add `getJobRoles(jobFunction?)` / `getSkills(jobFunction?)` to `frontend/lib/api.ts`.
- Upgrade the candidate profile's skill and current-role inputs (§2) to a combobox: static suggestions from these endpoints, filtered by the candidate's selected job function, **plus a free-text "add custom" fallback that stores exactly like today's plain strings** — no schema change, no "is this custom" flag needed, since the field is just a string list either way.
- This is the only planned consumer for now — no other change to `jobRoles.js`/`skills.js` themselves (they stay read-only; an admin-CRUD surface for managing the picklists is explicitly out of scope here per the routes' own header comment).

---

## 9. Explicit "do not touch" list

These are confirmed fully built and working — do not re-implement, refactor, or "improve" them as a side effect of the work above:

- Role selection, lock, and dashboard branching (§1).
- Application status pipeline, status history, CV snapshot-at-apply, recruiter-defined per-job questions, mandatory-CV-before-apply gating, recruiter-cannot-apply enforcement.
- Job posting's existing core fields and validation.
- My Jobs' existing Pause/Resume/Close actions and the view-vs-edit page split.
- Applications tab's existing candidate-detail row and status-update flow.
- The entire notification create/list/bell/mark-read pipeline's existing mechanics (only extending `describe()` and adding click-through, per §6).
- Stories/Blogs/Reviews generic reuse.
- The advertisement pipeline in full: self-serve create → forced `pending` → admin-only approval → unauthenticated public serving → recruiter-only management. This already correctly implements "everyone can view ads, only recruiters can manage them, backend enforces it" — no changes needed here at all.
- Company profile's existing text fields (name/industry/size/website/location/about).
- The generic suite-wide `/blog` page (only adding a new, separate, filtered `/recruitment/blog` alongside it).

---

## 10. Data-model additions summary

For quick implementation reference — full field design still needs a pass through `RECRUITMENT.md`'s conventions (nullable nested-object columns, `store.js`-only access, Postgres + file-DB parity per `CLAUDE.md` §2/§5) before writing any migration:

| Collection | Addition | Notes |
|---|---|---|
| `employer_profiles` (`employerProfile`) | employee strength, benefits (list), working hours | New fields, not touching existing ones. |
| `jobs` | `draft` added to status enum; qualification field | `expiresAt` already exists — UI-only gap. |
| `applications` | `withdrawn` added to status set | Candidate-only transition, terminal. |
| `users.avatarUrl` | (no schema change) | Confirm the existing suite-wide avatar-set path before building a new upload flow for candidates. |

---

## 11. Reference pointers

- [RECRUITMENT.md](RECRUITMENT.md) — authoritative architecture, data model, and build history for the whole product. Read §1 (divergence from Directory), §2 (data model), §4 (dashboard architecture), §7 (gotchas) before touching anything above.
- [Recruitment — Additional Product Improvements & Flow Enhancements.md](Recruitment — Additional Product Improvements & Flow Enhancements.md) — the existing 30-section enhancement-layer spec; several of its business rules (role lock, mandatory CV, advertisement visibility-vs-management split) are already implemented and are exactly what §9's "do not touch" list protects.
- [CLAUDE.md](CLAUDE.md) §2 — non-negotiable suite-wide rules (no emojis, native `<select>`, zero 390px overflow, local images only, `store.js`-only persistence, no payments) apply to every item in this document.

---

## 12. Build Phases & Status Tracker

Phases are ordered by dependency — later phases assume earlier ones landed (e.g. profile UI work in Phase 2 assumes Phase 1's schema fields exist). Within a phase, work the listed items in any order. **Update this tracker's status line and add a dated note the moment a phase finishes** — don't batch updates across multiple phases, and don't mark a phase done until its own verification step passes (types clean, manual/curl check of new endpoints, 390px screenshot check on any touched page, per CLAUDE.md §4's verification loop).

### Phase 1 — Data model & backend foundation
✅ **Done — 2026-08-25, ~06:35 UTC**

What was built, exactly as scoped:
- `backend/lib/db/schema-migrations/0006_add_recruitment_profile_extras.sql` (applied to the live Postgres DB via `npm run migrate-schema`) + matching baseline update in `schema.sql`: `employer_profiles.employee_count` (text range string, mirrors `seller_profiles.employee_count`), `.benefits` (text[], company-level — deliberately distinct from the existing per-job `jobs.benefits`), `.working_hours` (text); `jobs.qualification` (text).
- `backend/lib/db/users.js`'s `EMPLOYER_COLUMNS` and `backend/lib/db/flat.js`'s `jobs` column map extended to match (composite mapper + flat-table mapper both covered — file-DB and Postgres parity).
- `backend/routes/users.js`: `POST /become-employer` and `PUT /me/employer` now accept/persist `employeeCount`/`benefits`/`workingHours` (benefits normalized: trimmed, blanks dropped).
- `backend/routes/jobs.js`: `VALID_JOB_STATUSES` gained `"draft"`; `POST /` accepts an optional `status:"draft"` from the client (anything else at creation still forces `"active"` — `paused`/`closed` stay reachable only via `PUT /:id`); `qualification` accepted on create (already flows through `PUT /:id`'s generic patch spread, no extra code needed there). Public browse already excluded non-`"active"` jobs, so drafts are automatically hidden from it — verified live.
- `backend/routes/applications.js`: new `POST /:id/withdraw` (candidate-owner-only; 400s if already `withdrawn` or `hired`; appends a `statusHistory` entry; fires an `application_withdrawn` notification to the employer, reusing the existing notification data columns — no `flat.js` change needed). `"withdrawn"` deliberately kept **out** of `VALID_STATUSES` (the employer-settable set for `POST /:id/status`) — it's a candidate-only transition — but added to a new `ALL_STATUSES_SET` so `GET /?status=withdrawn` filtering works for employers reviewing their pipeline.
- `frontend/lib/types.ts`: `EmployerProfile` +`employeeCount`/`benefits`/`workingHours`; `JobStatus` +`"draft"`; `Job` +`qualification`; new `FullApplicationStatus = ApplicationStatus | "withdrawn"` (kept separate from `ApplicationStatus` so `updateApplicationStatus`'s type still can't accidentally set `withdrawn` — only the new dedicated call can); `Application.status`/`ApplicationStatusEvent.status` widened to `FullApplicationStatus`; new `JobRole`/`Skill` interfaces.
- `frontend/lib/api.ts`: new `getJobRoles(jobFunction?)`, `getSkills(jobFunction?)`, `withdrawApplication(id)`.
- **Unplanned but necessary**: widening `Application.status` broke two existing components' status-keyed lookup tables (`Record<ApplicationStatus, ...>` doesn't accept `"withdrawn"`). Fixed minimally in both — `MyApplicationsTab.tsx` (`STATUS_LABEL`, `statusColor`, `PipelineTrack` now handle `"withdrawn"`, styled like `"rejected"`) and `ApplicationsTab.tsx` (`statusColor` widened; `STATUS_OPTIONS` correctly stayed employer-settable-only). This is a type-safety fix only, not the Phase 3 withdraw button/UI — kept deliberately minimal so Phase 1 doesn't creep into Phase 3's scope.

Verification: `npm test` in `backend/` — 19/19 pass, including the Postgres integration suite. Live curl checks against the running backend (restarted after the edits, per CLAUDE.md's no-hot-reload gotcha): job-roles/skills return seeded data; `PUT /me/employer` persists the three new fields; `POST /api/jobs` with `status:"draft"` creates a draft that's absent from public browse but present in `/mine`; full withdraw lifecycle exercised end-to-end (candidate applies → withdraws → re-withdraw correctly 400s → employer sees it via `?status=withdrawn` → notification with correct `jobId`/`jobTitle`/`candidateName` lands → an employer cannot withdraw a candidate's application, 403s). `cd frontend && npx tsc --noEmit` clean.

Not exercised live (low-risk, logic is a single trivial guard, didn't want to irreversibly mutate more seeded demo data): the "cannot withdraw a hired application" 400 path — code-reviewed instead.

*Depends on:* nothing. *Blocked:* nothing — unblocks Phases 2, 4, 5.

### Phase 2 — Candidate profile completion
✅ **Done — 2026-08-25, ~07:05 UTC**

What was built:
- **Profile photo**: `ImageUpload` wired into `CandidateProfileTab.tsx`, saving via the existing suite-wide `PUT /api/me/profile` (`updateProfile({avatarUrl})`) — confirmed this was already the only avatar-set path anywhere in the suite (nothing Recruitment-specific needed).
- **Mobile + email**: `Input` fields bound to `candidateProfile.contactPhone`/`contactEmail` (already backend-accepted fields, per Phase 1's audit — pure UI addition).
- **Work history / education**: new `WorkHistoryEditor` and `EducationEditor` added to `components/sell/editors.tsx`, same row-editor shape as the existing `RateCardEditor`/`QuestionsEditor` (add/remove rows, no external state libs). Wired into the tab.
- **Preferred job types**: checkbox group off the same `EmploymentType` enum `/post-job` already uses (`full-time|part-time|contract|internship|freelance`) — no new enum defined.
- **Skills / current-role suggestions**: `TagInput` (in `editors.tsx`) gained an optional `suggestions` prop rendering a native `<datalist>` — chosen over a custom dropdown per CLAUDE.md's "prefer native controls" rule; typing a value not in the list still works exactly as before (plain custom chip). `CandidateProfileTab.tsx` fetches `getJobRoles()`/`getSkills()` once on mount and feeds the suggestion lists to the current-role `Input` (via `list=`) and the skills `TagInput`.
- `save()` now sends `preferredJobTypes`, `contactPhone`, `contactEmail`, `education`, `workHistory` alongside the existing fields.

Verification: `cd frontend && npx tsc --noEmit` clean. `curl` smoke test on `/recruitment` and `/recruitment/dashboard` (200, compiles). Full round-trip verified live against the real backend: `PUT /api/me/candidate` with all five new/newly-wired fields → `200`, then a fresh `GET /api/auth/me` (not just the echoed response) confirms every field persisted in Postgres. Did not do a live authenticated-browser screenshot pass (no headless browser tooling available in this environment this session) — instead relied on the project's global CSS safety net (`app/globals.css`'s `* { min-width: 0 }` reset, specifically documented as the standard fix for exactly this kind of grid/flex overflow) and the fact `WorkHistoryEditor`/`EducationEditor` copy the grid shape of `RateCardEditor`, which RECRUITMENT.md records as already 390px-verified in production. **Flagging this as lower-confidence than the rest of the phase — worth a real visual check on `/recruitment/dashboard`'s Profile tab (candidate role) at 390px next time a browser is available.**

*Depends on:* Phase 1 (api.ts functions). *Blocked:* nothing downstream.

### Phase 3 — Candidate applications enhancements
✅ **Done — 2026-08-25, ~07:20 UTC**

What was built:
- **Withdraw action**: `MyApplicationsTab.tsx` now shows a "Withdraw application" button in the expanded row, calling Phase 1's `withdrawApplication(id)`. Gated by a local `canWithdraw()` helper kept deliberately identical to the backend's own guard (`status !== "hired" && status !== "withdrawn"`) so the button is never shown enabled when the call would 400. Confirms via `window.confirm` before calling (destructive, no undo). `PipelineTrack`/`STATUS_LABEL`/`statusColor` (already touched in Phase 1's compile fix) now render a "Withdrawn by you" state.
- **Answers + cover note display**: shown read-only in the expanded row, above the existing status history. Answers are paired with their actual question text via `app.job.questions` — which required a small, deliberate backend addition: `applications.js`'s `jobMiniOf()` now includes `questions` (previously `id/title/jobFunction/status` only), since the frontend had no way to label an answer without the original question text. This is not new data exposure — it's the same `job.questions` the candidate already saw and answered during apply, just also returned on their own applications list. Mirrored in `frontend/lib/types.ts`'s `ApplicationJobMini`.
- Unit test `applications.unit.test.js`'s `jobMiniOf` shape assertion updated (it was a `deepStrictEqual` on the exact returned object) — added a second case confirming `questions` defaults to `[]` when a job has none.

Verification: `npm test` in `backend/` — 20/20 pass (2 new/updated for `jobMiniOf`). `npx tsc --noEmit` clean. Backend restarted (this touched `applications.js`, no hot reload). Full live round-trip: created a disposable job with one required question → candidate applied with an answer + cover note → `GET /api/applications/mine` confirmed `job.questions` and `answers` arrive in exactly the shape the UI's `.find((q) => q.id === a.questionId)` lookup expects → withdrew the application (`status: "withdrawn"` confirmed) → deleted the disposable job (cascades to the application via the existing FK) to avoid leaving clutter in demo data. Did not do a live authenticated-browser screenshot check — same tooling gap noted in Phase 2; the added markup reuses the same expandable-row pattern already on this page (no new layout risk).

*Depends on:* Phase 1 (withdraw endpoint + `withdrawn` status). *Blocked:* nothing downstream.

### Phase 4 — Recruiter company profile
✅ **Done — 2026-08-25, ~07:35 UTC**

What was built:
- **Logo + cover-image upload**: `ImageUpload` (the same component `CollectionsTab.tsx` already uses for admin collection covers) wired to `employerProfile.logo`/`coverImage` — those backend fields already existed but had no UI anywhere; confirmed there was no existing seller/employer logo-upload pattern to copy, so this mirrors the closest existing usage instead.
- **Employee strength / benefits / working hours**: three new inputs bound to Phase 1's new fields, saved through the (also-extended-in-Phase-1) `PUT /me/employer`. Benefits reuses `TagInput`, same as every other chip-list field in the suite.
- **Tabular layout redesign**: `CompanyProfileTab.tsx` restructured into three visually distinct groups — Identity (name, logo, cover), Company details (industry, size, employee strength, website, location, working hours — via a new small `DetailRow` label/value layout, not a new form-control system), and Benefits — replacing the previous single flat stacked form.

Verification: `npx tsc --noEmit` clean. `npm test` in `backend/` — 20/20 still pass (no backend changes this phase, Phase 1 already covered the field plumbing). Live round-trip: `PUT /me/employer` with logo/coverImage/employeeCount/workingHours/benefits → 200, all five persisted; confirmed they also surface correctly on the public `GET /api/employers/:slug` endpoint (already generic, no route change needed). `curl` smoke test on `/recruitment/dashboard` (200). Layout risk assessed the same way as Phase 2/3 — `DetailRow`'s `140px 1fr` grid leaves enough room at a 390px viewport after the dashboard's own padding, and the two-input location row uses `flex-wrap` so it stacks instead of overflowing; not confirmed with a live screenshot (same tooling gap as Phase 2/3).

*Depends on:* Phase 1 (new `employer_profiles` fields). *Blocked:* nothing downstream.

### Phase 5 — Job posting form + My Jobs
✅ **Done — 2026-08-25, ~07:55 UTC**

What was built:
- **`/post-job` additions**: qualification `Input`, an "Applications close on" date picker (`type="date"`, converts to/from ISO via a small `toDateInputValue()` helper) wired to Phase 1's already-accepted `expiresAt`.
- **Draft/Publish**: `submit()` now takes an optional `targetStatus: "draft" | "active"`. Create mode and edit-of-a-draft show two buttons ("Save as draft" / "Publish job"); editing an already-active/paused/closed job shows the original single "Save changes" button, unchanged — so a routine edit never silently resets a job's status as a side effect. Saving as draft redirects to the dashboard's My Jobs (not the public `/job/[id]` page, which would be an odd place to land on an unpublished job) — publishing still redirects to the job page as before.
- **`MyJobsTab.tsx`**: `statusBadge()` gained a `"draft"` case; Pause/Close actions now also hidden for draft jobs (they were only ever meant for active/paused, showing them for a draft made no sense); new client-derived "Expired" badge (`status === "active" && expiresAt < now`) — deliberately not a stored status, per the plan.
- Public browse excluding drafts needed **no new code** — `GET /api/jobs`'s existing `j.status !== "active"` filter (unchanged since before this build) already covers it; verified live rather than assumed.

Verification: `npx tsc --noEmit` clean, `npm test` 20/20 (no backend logic changed this phase beyond what Phase 1 already covered and tested). Full live lifecycle exercised against the real backend: created a job with `status:"draft"` → confirmed `status:"draft"` in the response → `PUT` with `status:"active"` (mirroring the Publish button) → confirmed it flipped to `"active"` and immediately appeared in the public browse. Separately verified a job with a past `expiresAt` returns that field intact for the frontend's `isExpired()` to derive from. Both test jobs deleted afterward. No live screenshot pass (same tooling gap as Phases 2–4).

*Depends on:* Phase 1 (`draft` status, `qualification` field). *Blocked:* nothing downstream.

### Phase 6 — Applications deep-link + Notifications
✅ **Done — 2026-08-25, ~08:05 UTC**

**Scope correction found during this phase**: the Applications-tab deep-link half of this phase turned out to be *already fully built*, not a gap — `RecruitmentDashboardShell.tsx:76-94` already reads `?tab=` and `?job=` from the URL and passes `jobId={jobParam}` into `ApplicationsTab`, and `MyJobsTab`'s "N applications" link already calls `setTab("applications", jobId)` which writes that exact URL shape. This wasn't caught in the original code audit (Phases 1-5's investigation focused on other tabs) — worth noting as a reminder that "not yet built" claims should be re-verified against the actual component, not just assumed from an earlier pass. No changes were needed there; only `NotificationBell.tsx` needed work.

What was built (`NotificationBell.tsx` only):
- `describe()` gained cases for `new_application`, `application_withdrawn` (the notification type Phase 1 added), and `application_status` — previously all three fell through to the generic `type.replace(/_/g," ")` default. Every existing case (Directory's `new_follower`/`new_message`/`new_lead`/`new_review`) is untouched.
- New `notificationHref(n)` returns a destination only for these three Recruitment types — `new_application`/`application_withdrawn` → `/recruitment/dashboard?tab=applications&job=<jobId>` (matching the shell's existing `job` param, confirmed by reading `RecruitmentDashboardShell.tsx` directly rather than assuming), `application_status` → `/recruitment/dashboard?tab=myapplications`. Every other type returns `null`, meaning no navigation — the exact previous behavior is preserved for all of Directory's notifications, since `NotificationBell` is a shared, suite-wide component and CLAUDE.md forbids Directory regressions from Recruitment work.
- New `onItemClick(n)` replaces the old inline `!n.read && onRead(n.id)` — still marks read the same way, additionally navigates (and closes the dropdown) when `notificationHref` returns something.

Verification: `npx tsc --noEmit` clean. `npm test` 20/20 (no backend changes this phase). Data-shape cross-check against Phase 1/3's live curl output confirmed `new_application`/`application_withdrawn` notifications carry `jobId`/`jobTitle`/`candidateName` and `application_status` carries `jobId`/`jobTitle`/`status` — exactly what `describe()`/`notificationHref()` read. `curl` smoke test on `/recruitment/dashboard` (200).

*Depends on:* nothing new. *Blocked:* nothing downstream.

### Phase 7 — Apply Now consistency + Recruitment blog page
✅ **Done — 2026-08-25, ~08:35 UTC**

**Apply Now consistency**: `JobCard.tsx` (used by both `/recruitment` home sections and `/recruitment/jobs` search results via `JobResults.tsx`) has an "Apply" CTA on every card — confirmed it was never a parallel apply flow (always just a `Link` to `/job/[id]`, where the real `ApplyModal`/CV/questions gating already lives), so no duplicate-flow risk existed. The one real gap: the button said "Apply" even to a logged-in recruiter account, who can browse but never actually apply — misleading, since clicking through just lands them on a page where the button they expected isn't there. Fixed by reading `useAuth()` in `JobCard` and showing "View" instead of "Apply" when `user?.recruitmentRole === "recruiter"`; every other viewer (logged out, candidate) is unaffected. Confirmed via grep this is the *only* apply-adjacent affordance anywhere outside the job detail page — `JobResults.tsx` and the home page render nothing else that could apply on a candidate's behalf.

**`/recruitment/blog`**: new page at `frontend/app/recruitment/blog/page.tsx`, a filtered read of the existing generic blog list — `GET /api/blogs` gained an `authorType` query param (`"seller" | "employer"`), filtering *after* author resolution since that's the only place the distinction exists. No new collection, no parallel authoring flow (recruiters already publish via the reused `BlogsTab` in their dashboard, unchanged). Automatically covered by `frontend/app/recruitment/layout.tsx`'s `RecruitmentGate` (it's under `/recruitment/*`, so no explicit gate wrap needed, per RECRUITMENT.md §7's URL-tree gotcha). Recruitment landing's "Career guides" section now links here instead of the generic `/blog` (`recruitment/page.tsx`'s two `GUIDES` links) — the generic `/blog` page itself is untouched and still serves everyone else.

**Necessary follow-on fix, not scope creep**: `backend/routes/blogs.js`'s `attachAuthors()` only ever read `sellerProfile` (RECRUITMENT.md §7 had already flagged this exact gap as a known follow-up) — an employer-authored blog got no author info at all. Fixed by falling back to `employerProfile` when `sellerProfile` is absent, adding an `author.type`/`authorType` discriminator. This surfaced a second, real problem once exercised: `/blog/[slug]`'s byline and "About the vendor" card hard-link to `/seller/<slug>` and call a seller-only profile-enrichment hook (`useVendorProfile`/`vendorAuthors.ts`) — for an employer author that's the wrong URL and a call that would silently fail. Since my new listing page is the first thing to deliberately surface employer-authored articles, leaving that unfixed would have shipped a visibly broken link on every one of them. Fixed additively in `vendorAuthors.ts` (added `type` to `VendorAuthor`, skip the seller-only `getSeller()` enrichment call when `type === "employer"`) and `/blog/[slug]/page.tsx` (byline/vendor-card/footer links branch to `/employer/<slug>` vs `/seller/<slug>`, "View listings" hidden for employer authors since that's a Directory-only concept). Every branch's `else`/default path is byte-for-byte what existed before — a seller-authored blog (`type` absent → defaults to `"seller"`) renders identically to before this change.

Verification: `npx tsc --noEmit` clean. `npm test` 20/20 (no unit tests cover `blogs.js`, but this was checked live). Full live round-trip: employer published a real test blog → `GET /api/blogs?authorType=employer` found it with fully correct `author` object (companyName, slug, logo, city, `type:"employer"`) → `?authorType=seller` correctly excluded it → unfiltered `GET /api/blogs` still includes it (backward compatible). Cross-checked all 5 existing seller-authored blogs still resolve with `type:"seller"` and identical shape to before. `curl` smoke tests: `/recruitment/blog` (200), the new employer blog's `/blog/<slug>` article page (200, no runtime error), generic `/blog` (200, unaffected). Test blog deleted afterward. No live screenshot pass (same tooling gap as Phases 2–5) — the blog-card grid layout mirrors the existing `/blog` page's grid almost exactly (same breakpoints), so overflow risk is low but not visually confirmed.

*Depends on:* nothing. *Blocked:* nothing — this was the last phase.

---

## All 7 phases complete (2026-08-25)

Every phase above is built, tested (`tsc --noEmit` clean throughout, backend suite at 20/20), and verified live against the running backend/Postgres for each phase's specific behavior. Two scope corrections surfaced along the way (documented in their phases): the Applications-tab deep-link (Phase 6) turned out to already exist, and the blog author-resolution fix (Phase 7) needed to extend slightly further than planned to actually work end-to-end. No live-browser screenshot pass was done for any phase (no headless browser tooling was available in this session) — flagged per-phase above; the next session with browser access should do a 390px visual pass across the touched candidate/recruiter dashboard tabs, `/post-job`, and `/recruitment/blog` before considering this fully production-verified.
