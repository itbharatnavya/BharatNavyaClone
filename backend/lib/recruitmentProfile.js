/**
 * lib/recruitmentProfile.js — one source of truth for "is this Recruitment profile
 * complete enough to act?" A candidate with an incomplete profile cannot apply to a
 * job; a recruiter with an incomplete company profile cannot post one.
 *
 * Consumers:
 *   - routes/applications.js  POST /        (candidateProfileGaps — 400 with `missing`)
 *   - routes/jobs.js          POST /        (employerProfileGaps  — 403 with `missing`)
 *
 * The frontend mirrors these exact rules in frontend/lib/recruitmentProfile.ts so the
 * Apply modal / Post-a-job page / dashboard profile forms can preview the same gaps
 * without a round-trip. Keep the two in sync.
 *
 * Each function returns an array of { key, label } — empty means "good to go".
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isTenDigits(v) {
  return /^[0-9]{10}$/.test(String(v || "").replace(/\D/g, "").slice(-10));
}

/** Fields that block a candidate from applying. */
function candidateProfileGaps(user) {
  if (!user) return [{ key: "profile", label: "Create your candidate profile" }];
  const cp = user.candidateProfile;
  if (!cp) return [{ key: "profile", label: "Create your candidate profile" }];

  const gaps = [];
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

/** Fields that block a recruiter from posting a job. */
function employerProfileGaps(user) {
  if (!user) return [{ key: "profile", label: "Create your company profile" }];
  const ep = user.employerProfile;
  if (!ep) return [{ key: "profile", label: "Create your company profile" }];

  const gaps = [];
  if (!nonEmpty(ep.companyName)) gaps.push({ key: "companyName", label: "Company name" });
  if (!nonEmpty(ep.about) || ep.about.trim().length < 30)
    gaps.push({ key: "about", label: "About the company (at least 30 characters)" });
  if (!nonEmpty(ep.industry)) gaps.push({ key: "industry", label: "Industry" });
  if (!nonEmpty(ep.companySize)) gaps.push({ key: "companySize", label: "Company size" });
  const loc = ep.location || {};
  if (!nonEmpty(loc.city)) gaps.push({ key: "city", label: "City" });
  if (!nonEmpty(loc.state)) gaps.push({ key: "state", label: "State" });
  if (nonEmpty(ep.website) && !URL_RE.test(ep.website.trim()))
    gaps.push({ key: "website", label: "A valid website URL (https://…)" });
  return gaps;
}

module.exports = { candidateProfileGaps, employerProfileGaps };
