// lib/recruitmentProfile.ts — client mirror of backend/lib/recruitmentProfile.js.
// "Is this Recruitment profile complete enough to act?" A candidate with gaps can't
// apply; a recruiter with gaps can't post a job. The forms (CandidateProfileTab /
// CompanyProfileTab), the Apply modal, the Post-a-job page and the job detail page
// all read these so the gate is shown before the request, not just after a 4xx.
// Keep in sync with the backend copy.

import type { User } from "./types";

export interface ProfileGap {
  key: string;
  label: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isTenDigits(v: unknown): boolean {
  return /^[0-9]{10}$/.test(String(v ?? "").replace(/\D/g, "").slice(-10));
}

/** Fields that block a candidate from applying to a job. Empty = ready to apply. */
export function candidateProfileGaps(user: User | null | undefined): ProfileGap[] {
  if (!user) return [{ key: "profile", label: "Sign in and create your candidate profile" }];
  const cp = user.candidateProfile;
  if (!cp) return [{ key: "profile", label: "Create your candidate profile" }];

  const gaps: ProfileGap[] = [];
  if (!nonEmpty(user.name)) gaps.push({ key: "name", label: "Your name" });
  if (!nonEmpty(cp.headline)) gaps.push({ key: "headline", label: "Headline" });
  if (!nonEmpty(cp.summary) || cp.summary.trim().length < 30)
    gaps.push({ key: "summary", label: "Summary (at least 30 characters)" });
  if (
    cp.experienceYears == null ||
    !Number.isFinite(Number(cp.experienceYears)) ||
    Number(cp.experienceYears) < 0
  )
    gaps.push({ key: "experienceYears", label: "Years of experience" });
  if (!Array.isArray(cp.skills) || cp.skills.filter(nonEmpty).length < 3)
    gaps.push({ key: "skills", label: "At least 3 skills" });
  if (!isTenDigits(cp.contactPhone || user.mobile))
    gaps.push({ key: "contactPhone", label: "A 10-digit mobile number" });
  if (!EMAIL_RE.test(String(cp.contactEmail || user.email || "")))
    gaps.push({ key: "contactEmail", label: "A valid email address" });
  if (!nonEmpty(cp.resumeUrl)) gaps.push({ key: "resumeUrl", label: "CV / resume" });
  return gaps;
}

/** Fields that block a recruiter from posting a job. Empty = ready to post. */
export function employerProfileGaps(user: User | null | undefined): ProfileGap[] {
  if (!user) return [{ key: "profile", label: "Sign in and create your company profile" }];
  const ep = user.employerProfile;
  if (!ep) return [{ key: "profile", label: "Create your company profile" }];

  const gaps: ProfileGap[] = [];
  if (!nonEmpty(ep.companyName)) gaps.push({ key: "companyName", label: "Company name" });
  if (!nonEmpty(ep.about) || ep.about.trim().length < 30)
    gaps.push({ key: "about", label: "About the company (at least 30 characters)" });
  if (!nonEmpty(ep.industry)) gaps.push({ key: "industry", label: "Industry" });
  if (!nonEmpty(ep.companySize)) gaps.push({ key: "companySize", label: "Company size" });
  if (!nonEmpty(ep.location?.city)) gaps.push({ key: "city", label: "City" });
  if (!nonEmpty(ep.location?.state)) gaps.push({ key: "state", label: "State" });
  if (nonEmpty(ep.website) && !URL_RE.test(ep.website.trim()))
    gaps.push({ key: "website", label: "A valid website URL (https://…)" });
  return gaps;
}

export function isCandidateProfileComplete(user: User | null | undefined): boolean {
  return candidateProfileGaps(user).length === 0;
}
export function isEmployerProfileComplete(user: User | null | undefined): boolean {
  return employerProfileGaps(user).length === 0;
}
