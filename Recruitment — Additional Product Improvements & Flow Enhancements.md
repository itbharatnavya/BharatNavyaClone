# Recruitment — Additional Product Improvements & Flow Enhancements

## Purpose

The Recruitment portal has already been implemented based on the existing `RECRUITMENT.md` specification.

**This document is an enhancement layer on top of the existing implementation.**

Do NOT rebuild the Recruitment portal from scratch.

Do NOT replace existing functionality that is already working.

First inspect the current implementation and understand the existing:

- Pages
- Components
- API routes
- Data models
- Authentication
- Dashboard
- Candidate flow
- Recruiter/employer flow
- Advertisement system
- Existing design system

Then implement the following improvements while preserving the existing architecture and functionality wherever possible.

The goal is to make the current Recruitment portal feel like a complete, production-ready recruitment product rather than changing the fundamental architecture.

---

# 1. Important Existing Functionality

The current Recruitment implementation already contains:

- Recruitment landing page
- Job search
- Job listing
- Job details
- Job application login gating
- Employer/recruiter profile
- Candidate profile
- Job posting
- Recruitment dashboard foundation
- Recruiter self-serve advertisements
- Advertisement placements
- Stories/blogs/reviews infrastructure

The existing implementation already uses the shared Recruitment architecture and existing advertisement pipeline. Do not create duplicate systems when an existing system can be extended.

For example, the current advertisement implementation already uses the existing `/api/my-ads` pipeline and Recruitment-specific placements.

---

# 2. New Recruitment User Model

The Recruitment experience should clearly distinguish between two user roles:

```text
Candidate
Recruiter
```

A user should select their Recruitment role during profile setup.

## Role Selection

If the user has not yet selected a Recruitment role:

- Ask the user whether they are a Candidate or Recruiter.
- Show the appropriate profile setup flow based on their selection.
- Do not show role-specific dashboard functionality until the role is established.

## Role Lock

Once the user:

1. Selects Candidate or Recruiter.
2. Completes the required role-specific details.
3. Submits the profile.

The role must become locked.

The user must not be able to change:

```text
Candidate → Recruiter
Recruiter → Candidate
```

after the role has been submitted.

Do not add a normal "Change Role" option after profile completion.

If the existing implementation uses `candidateProfile` / `employerProfile` to determine the role, preserve that architecture where practical, but ensure the UI and backend enforce the new role-locking behavior.

---

# 3. Candidate Experience Improvements

## Candidate Dashboard

The Candidate dashboard should be focused primarily on applications.

The main dashboard experience should show:

- Jobs the candidate has applied to
- Application status
- Application history
- Relevant application details

Example status flow:

```text
Applied
   ↓
Viewed
   ↓
Shortlisted
   ↓
Interview
   ↓
Hired / Rejected
```

Use the existing application status model where possible instead of introducing another status system.

The current application model already supports:

`applied → viewed → shortlisted → interview → rejected → hired`.

Preserve this existing model.

---

# 4. Candidate Profile Improvements

The candidate profile should provide enough information for a recruiter to evaluate the candidate.

It should support:

- Name
- Profile photo
- Mobile number
- Email
- Skills
- Experience
- Current role
- Current company
- Education
- Work history
- Expected salary
- Preferred locations
- Preferred job types
- CV/resume

Use the existing `candidateProfile` model and extend the UI rather than creating another candidate profile model.

---

# 5. Improved Apply Now Flow

The existing Apply Now flow currently provides authentication gating.

The application flow should now be expanded.

The current login-gated Apply Now behavior should remain, but after authentication the candidate must go through application validation before the application is submitted. The existing implementation already uses `ContactAuthModal` for the login-gated apply behavior.

## New Flow

```text
Apply Now
    ↓
Is user logged in?
    │
    ├── No
    │    ↓
    │ Login / Register
    │    ↓
    │ Continue
    │
    └── Yes
         ↓
      Is user a Candidate?
         │
         ├── No → Do not allow application
         │
         └── Yes
              ↓
        Check Candidate Profile
              ↓
        CV exists?
         ├── No → Ask to upload CV
         └── Yes
              ↓
        Mobile number exists?
         ├── No → Ask to add mobile number
         └── Yes
              ↓
        Load recruiter questions
              ↓
        Candidate answers questions
              ↓
        Cover letter / cover note
              ↓
        Review application
              ↓
        Submit
```

---

# 6. Mandatory Candidate Information Before Applying

A candidate must have the following before an application can be submitted:

### Mandatory

- Name
- Mobile number
- CV/Resume

If any of these are missing, do not submit the application.

Instead, clearly tell the candidate what information is missing and provide a direct action to complete it.

Example:

```text
Your application cannot be submitted yet.

Please complete:
✓ Name
✓ Mobile number
✗ CV / Resume

[Upload CV]
```

After completing the missing information, return the candidate to the application flow rather than forcing them to start again.

---

# 7. Recruiter-Defined Application Questions

Recruiters should be able to add questions while creating a job.

Examples:

- Are you willing to relocate?
- How many years of Node.js experience do you have?
- What is your expected salary?
- Do you have experience with AWS?
- What is your notice period?

When the candidate clicks Apply Now, the system should load the questions belonging to that specific job.

The candidate must answer every question marked as required.

The application should store:

```text
Candidate
Mobile
CV snapshot
Cover note
Recruiter questions
Candidate answers
Application status
Application timestamps
```

Do not create a separate generic questionnaire system if the existing job/application model can be extended.

---

# 8. CV Snapshot at Application Time

When a candidate applies:

The application should retain the CV/resume reference that was used at the time of application.

Do not rely only on the candidate's current profile CV.

If the candidate later replaces their CV, an existing recruiter application should still refer to the CV that was submitted with that application.

The existing application model already contains `resumeUrl` as a snapshot-at-apply field. Preserve this behavior.

---

# 9. Recruiter Experience Improvements

The Recruiter dashboard should become a proper recruitment management area.

The recruiter should have access to:

- Overview
- My Jobs
- Applications
- Candidate details
- Company Profile
- Stories
- Highlights
- Reviews
- Advertisements

Use the existing separate Recruitment dashboard architecture rather than adding Recruitment-specific tabs to the global Directory dashboard. The existing design intentionally keeps the Recruitment dashboard separate.

---

# 10. Recruiter Job Management

Recruiters should be able to:

- Create jobs
- Edit jobs
- Pause jobs
- Close jobs
- View their jobs
- View applications for each job
- Manage recruiter questions
- View application counts

The recruiter should have a clear distinction between:

```text
My Jobs
```

and

```text
All Public Jobs
```

Recruiters can browse jobs posted by other recruiters, but they should not be able to apply.

---

# 11. Recruiter Application Management

For every job, recruiters should be able to see:

- Candidate name
- Candidate profile
- Profile photo
- Skills
- Experience
- CV
- Candidate answers
- Cover letter
- Application date
- Current status
- Status history

Recruiters should be able to update application status.

Example:

```text
Applied
↓
Viewed
↓
Shortlisted
↓
Interview
↓
Hired
```

or:

```text
Applied
↓
Viewed
↓
Rejected
```

Use the existing `statusHistory` functionality instead of creating a second history mechanism.

---

# 12. Recruiter Cannot Apply

A recruiter can browse the complete public job marketplace.

However, a recruiter should never see the Candidate Apply Now flow.

For a recruiter viewing another recruiter's job:

```text
Job Details
    ↓
No "Apply Now"
```

Instead, they should simply be able to view the job.

For their own job:

```text
My Job
    ↓
Manage Job
View Applications
Edit
Pause
Close
```

Do not treat recruiters as candidates just because they can browse jobs.

---

# 13. Recruiter Profile

The recruiter profile should represent the company/recruiter publicly.

It should support:

- Company name
- Company description
- Company cover image
- Company logo/profile image
- Website
- Industry
- Company size
- Location
- Relevant company information

The profile should work as a company presentation page for candidates.

---

# 14. Recruiter Stories / Highlights / Company Content

Recruiters should be able to publish company-related content.

This includes:

- Company stories
- Recruitment stories
- Company updates
- Recruitment announcements
- Company blogs/content

Recruiters should be able to:

- Create stories
- View stories
- Delete stories
- Highlight stories
- Remove highlights

Reuse the existing generic stories/blog/reviews infrastructure rather than introducing duplicate Recruitment collections.

The current implementation already supports these generic systems and was designed so they can work with employers.

---

# 15. Advertisement — Important Clarification

The Advertisement system already exists.

**Do not create a second advertisement system.**

Extend the existing advertisement implementation.

The existing Recruitment implementation already has recruiter self-serve advertisement creation and Recruitment placements.

The new requirement is to clearly separate:

```text
Advertisement Visibility
```

from:

```text
Advertisement Management
```

---

# 16. Advertisement Visibility

Advertisements are public content.

Therefore advertisements should be visible to:

```text
Non-logged-in user
Candidate
Recruiter
```

Everyone should be able to see advertisements on relevant Recruitment pages.

Advertisements can appear on:

- Recruitment home page
- Job search page
- Job listing page
- Job detail page
- Other relevant Recruitment pages
- Navigation/banner placement where appropriate

### Important

Do **not** hide advertisements simply because the logged-in user is a candidate.

A candidate should be able to see advertisements.

A non-logged-in visitor should be able to see advertisements.

A recruiter should also see advertisements.

---

# 17. Advertisement Management

Only an authenticated Recruiter can manage advertisements.

### Recruiter

Can:

- Create advertisement
- Edit advertisement
- Activate/deactivate advertisement
- Delete advertisement
- Manage advertisement content
- Manage advertisement dates
- View advertisement status

### Candidate

Can:

- View advertisements

Cannot:

- Create advertisement
- Edit advertisement
- Delete advertisement
- Manage advertisement

### Non-Logged-In User

Can:

- View advertisements

Cannot:

- Create advertisement
- Edit advertisement
- Delete advertisement
- Manage advertisement

---

# 18. Advertisement Navigation

The advertisement **display** should be public.

The advertisement **management controls** should be recruiter-only.

### Candidate navigation

Do not show:

```text
Create Advertisement
Manage Advertisement
```

### Recruiter navigation

Show:

```text
Advertisements
```

or an equivalent recruiter-specific management entry.

### Non-logged-in navigation

Do not show advertisement management controls.

Advertisements can still be rendered inside the public pages.

---

# 19. Advertisement Permission Architecture

The backend must enforce advertisement permissions.

Do not rely only on frontend UI hiding.

The following APIs/actions must require recruiter authorization:

```text
Create advertisement
Update advertisement
Delete advertisement
Activate/deactivate advertisement
Manage advertisement
```

Public advertisement retrieval/display should remain accessible according to the existing advertisement serving rules.

Conceptually:

```text
                    Advertisement
                         │
             ┌───────────┴───────────┐
             │                       │
       Public Display          Management
             │                       │
      ┌──────┼──────┐                │
      │      │      │                │
   Visitor Candidate Recruiter    Recruiter
```

---

# 20. Advertisement Placement

Continue using the existing Recruitment advertisement placements.

Current Recruitment placements include:

```text
recruitment_home
recruitment_search_top
```

Do not remove these.

Where additional placements are required, extend the existing placement system instead of creating a separate Recruitment advertisement architecture.

The advertisement component should be reusable across:

- Home
- Search
- Listing
- Job details
- Future Recruitment pages

---

# 21. Home Page Enhancement

The existing Recruitment home page should be improved rather than replaced.

Keep the current Recruitment landing-page structure and enhance it with:

- Job search
- Trending jobs
- Recruitment guide
- Recruitment platform benefits
- Join Us CTA
- User reviews
- Public advertisements
- Recruiter/company discovery
- Appropriate recruiter promotion

The current home already contains elements such as companies hiring, career guides, and a sponsored-ad slot. Preserve useful existing sections and improve them rather than duplicating them.

---

# 22. Authentication Behaviour

Authentication should be consistent across the Recruitment experience.

For actions requiring authentication:

```text
User Action
    ↓
Authenticated?
    ├── No → Login/Register
    └── Yes → Continue
```

For Apply Now specifically:

```text
Not Logged In
    ↓
Login/Register
    ↓
Determine Role
    ↓
Candidate → Application
Recruiter → No Application
```

If the user does not yet have a Recruitment role/profile, guide them through the appropriate setup before continuing.

---

# 23. Public vs Protected Experience

## Public

These should generally remain publicly accessible:

- Recruitment home
- Job search
- Job listings
- Job details
- Public advertisements
- Public recruiter/company profiles
- Public recruiter stories/content
- Recruitment guide
- Reviews where appropriate

## Candidate-only

- Candidate dashboard
- Candidate application submission
- Candidate application history
- Candidate profile management
- CV management
- Candidate-specific actions

## Recruiter-only

- Recruiter dashboard
- Job creation
- Job management
- Candidate management
- Application status management
- Recruiter profile management
- Story/highlight management
- Advertisement creation
- Advertisement management

---

# 24. Do Not Duplicate Existing Systems

Before creating a new:

- API
- Collection
- Component
- Dashboard
- Upload system
- Advertisement system
- Review system
- Story system
- Blog system

first check whether the existing Recruitment implementation already provides the functionality.

Prefer:

```text
Extend existing
```

over:

```text
Create parallel implementation
```

The existing specification explicitly identifies reviews, stories, blogs, uploads, and advertisements as reusable infrastructure.

---

# 25. Backward Compatibility

Existing functionality must continue working after these enhancements.

Do not unnecessarily change:

- Existing API contracts
- Existing data structures
- Existing URLs
- Existing components
- Existing design tokens
- Existing advertisement pipeline
- Existing authentication system
- Existing Directory functionality

If a data-model change is necessary, make it backward compatible with existing demo/production data.

---

# 26. UI/UX Expectations

The improved Recruitment portal should feel like a complete modern recruitment destination.

Maintain the existing suite design rules.

Do not turn the UI into a completely different visual system.

Maintain:

- Existing BharatSource design language
- Responsive layout
- Mobile support
- Existing Recruitment visual identity
- Existing component patterns
- Consistent spacing
- Clear CTAs
- Loading states
- Empty states
- Error states
- Form validation

Do not introduce unnecessary visual complexity.

---

# 27. Responsive Requirements

All new and modified functionality must work properly on:

- Desktop
- Tablet
- Mobile

Pay particular attention to the existing requirement for **390px-width devices**.

No horizontal overflow should be introduced.

Check:

- Navigation
- Search
- Filters
- Job cards
- Application form
- Recruiter dashboard
- Candidate dashboard
- Advertisement placements
- Profile pages
- Tables/lists

---

# 28. Implementation Approach

Before changing code:

### Step 1

Inspect the existing Recruitment implementation.

### Step 2

Identify which requested functionality already exists.

### Step 3

Reuse existing:

- Components
- API routes
- Data models
- Hooks
- Authentication
- Advertisement pipeline
- Upload system
- Reviews
- Stories
- Blogs

### Step 4

Only add the missing functionality.

### Step 5

Update existing flows where the new requirements change behaviour.

### Step 6

Verify both Candidate and Recruiter flows.

### Step 7

Verify public/non-authenticated behaviour.

### Step 8

Verify backend authorization independently of frontend visibility.

### Step 9

Test mobile/responsive layouts.

### Step 10

Do not mark an enhancement complete until the complete flow works end-to-end.

---

# 29. Critical Business Rules

These rules must be preserved throughout the implementation:

1. Candidate and Recruiter are separate Recruitment roles.
2. A submitted role cannot subsequently be changed.
3. Candidates can apply for jobs.
4. Recruiters cannot apply for jobs.
5. Candidates must have a CV before applying.
6. Candidates must have a mobile number before applying.
7. Candidate name is required for application.
8. Required recruiter questions must be answered before submitting an application.
9. Application should retain the CV used at application time.
10. Recruiters can create and manage their own jobs.
11. Recruiters can view applications for their jobs.
12. Recruiters can update application status.
13. Recruiters can browse public jobs posted by other recruiters.
14. Everyone can view public advertisements.
15. Only recruiters can create advertisements.
16. Only authorized recruiters can manage advertisements.
17. Candidates must never receive recruiter advertisement-management permissions.
18. Non-logged-in users must never receive recruiter management permissions.
19. Advertisement visibility must not depend on whether the viewer is a candidate or recruiter.
20. Backend authorization must enforce all role restrictions.
21. Existing advertisement infrastructure must be reused.
22. Existing Recruitment functionality must not be unnecessarily rebuilt.
23. Existing APIs/components/data structures should be extended where possible.
24. Public content and management functionality must remain separate.
25. Existing Recruitment design and architecture should be preserved unless a change is explicitly required by these enhancements.

---

# 30. Definition of Done

The enhancement is complete only when the following flows work:

### Visitor

```text
Visit Recruitment
    ↓
Browse jobs
    ↓
See advertisements
    ↓
Open job
    ↓
Click Apply
    ↓
Login/Register
```

### Candidate

```text
Login
    ↓
Candidate profile
    ↓
Complete CV + mobile + required details
    ↓
Search job
    ↓
Open job
    ↓
Apply
    ↓
Answer recruiter questions
    ↓
Submit
    ↓
Track application status
```

### Recruiter

```text
Login
    ↓
Recruiter profile
    ↓
Create job
    ↓
Add candidate questions
    ↓
Receive applications
    ↓
View candidate
    ↓
Review CV + answers
    ↓
Update application status
```

### Recruiter Advertisement

```text
Recruiter
    ↓
Advertisement Management
    ↓
Create Advertisement
    ↓
Submit / Manage
    ↓
Advertisement becomes publicly visible according to existing serving rules
```

### Candidate Advertisement

```text
Candidate
    ↓
Home / Search / Job page
    ↓
See Advertisement
```

The candidate must **not** see:

```text
Create Advertisement
Manage Advertisement
```

### Visitor Advertisement

```text
Non-logged-in user
    ↓
Home / Search / Public page
    ↓
See Advertisement
```

The visitor must not see advertisement management controls.

---

# Final Instruction to the Implementing AI/Developer

**Treat this document as an enhancement/change request to the existing Recruitment implementation, not as a request to rebuild Recruitment.**

First inspect the existing implementation and map each requirement above to what already exists.

For every requirement:

```text
Already exists → Preserve and improve if necessary
Partially exists → Extend existing implementation
Does not exist → Implement using existing architecture
Conflicts with existing behavior → Apply this enhancement requirement
```

Do not create duplicate systems when an existing system can be extended.

The most important new conceptual distinction is:

> **Public Recruitment content is discoverable by everyone, while management capabilities are controlled by user role.**

In particular:

> **Everyone can VIEW advertisements. Only Recruiters can CREATE and MANAGE advertisements.**

This distinction must be reflected consistently in the frontend, backend authorization, navigation, API access, and page-level UI.