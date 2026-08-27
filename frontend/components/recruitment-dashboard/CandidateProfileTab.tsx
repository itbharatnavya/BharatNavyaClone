"use client";

// Candidate's profile — headline/skills/experience/preferences + CV, everything a
// recruiter needs to evaluate them (enhancement doc §4). No approval gate: this always
// succeeds for the authenticated user and can be saved repeatedly.

import React, { useEffect, useState } from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import ImageUpload from "@/components/ImageUpload";
import { Section, TagInput, WorkHistoryEditor, EducationEditor } from "@/components/sell/editors";
import ResumeUpload from "@/components/recruitment/ResumeUpload";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { updateCandidateProfile, updateProfile, getJobRoles, getSkills } from "@/lib/api";
import { candidateProfileGaps } from "@/lib/recruitmentProfile";
import type { CandidateEducation, CandidateWorkHistory, EmploymentType } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits10 = (v: string) => v.replace(/\D/g, "").slice(-10);

const JOB_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

export default function CandidateProfileTab() {
  const { user, refresh } = useAuth();
  const { addToast } = useToast();
  const cp = user?.candidateProfile;

  const [headline, setHeadline] = useState(cp?.headline || "");
  const [summary, setSummary] = useState(cp?.summary || "");
  const [currentRole, setCurrentRole] = useState(cp?.currentRole || "");
  const [currentCompany, setCurrentCompany] = useState(cp?.currentCompany || "");
  const [experienceYears, setExperienceYears] = useState(cp?.experienceYears != null ? String(cp.experienceYears) : "");
  const [expectedSalary, setExpectedSalary] = useState(cp?.expectedSalary != null ? String(cp.expectedSalary) : "");
  const [isOpenToWork, setIsOpenToWork] = useState(cp?.isOpenToWork ?? true);
  const [skills, setSkills] = useState<string[]>(cp?.skills || []);
  const [preferredLocations, setPreferredLocations] = useState<string[]>(cp?.preferredLocations || []);
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>(cp?.preferredJobTypes || []);
  const [resumeUrl, setResumeUrl] = useState(cp?.resumeUrl || "");
  const [contactPhone, setContactPhone] = useState(cp?.contactPhone || user?.mobile || "");
  const [contactEmail, setContactEmail] = useState(cp?.contactEmail || user?.email || "");
  const [education, setEducation] = useState<CandidateEducation[]>(cp?.education || []);
  const [workHistory, setWorkHistory] = useState<CandidateWorkHistory[]>(cp?.workHistory || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remaining gaps on the *saved* profile — the "why can't I apply yet" banner. Recomputed
  // from `user` (server state), so it clears only after a successful save + refresh.
  const savedGaps = candidateProfileGaps(user);

  // Static role/skill picklists (build plan §8) — suggestions only, shown via native
  // <datalist> on the existing free-text TagInput; typing a custom value still works.
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  useEffect(() => {
    getJobRoles().then((roles) => setRoleSuggestions(roles.map((r) => r.title))).catch(() => {});
    getSkills().then((sk) => setSkillSuggestions(sk.map((s) => s.name))).catch(() => {});
  }, []);

  function togglePreferredJobType(value: string) {
    setPreferredJobTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!headline.trim()) e.headline = "Add a headline — e.g. your target role.";
    if (summary.trim().length < 30) e.summary = "Write at least 30 characters so employers get a real pitch.";
    const yrs = Number(experienceYears);
    if (experienceYears === "" || !Number.isFinite(yrs) || yrs < 0 || yrs > 60)
      e.experienceYears = "Enter a number between 0 and 60.";
    if (expectedSalary !== "" && (!Number.isFinite(Number(expectedSalary)) || Number(expectedSalary) < 0))
      e.expectedSalary = "Enter a valid amount, or leave it blank.";
    if (skills.filter((s) => s.trim()).length < 3) e.skills = "Add at least 3 skills.";
    if (digits10(contactPhone).length !== 10) e.contactPhone = "Enter a 10-digit mobile number.";
    if (!EMAIL_RE.test(contactEmail.trim())) e.contactEmail = "Enter a valid email address.";
    if (!resumeUrl) e.resumeUrl = "Upload your CV — recruiters need it to consider you.";
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      addToast("Fix the highlighted fields before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      await updateCandidateProfile({
        headline: headline.trim() || undefined,
        summary: summary.trim() || undefined,
        currentRole: currentRole.trim() || null,
        currentCompany: currentCompany.trim() || null,
        experienceYears: experienceYears ? Number(experienceYears) : null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        isOpenToWork,
        skills,
        preferredLocations,
        preferredJobTypes,
        resumeUrl: resumeUrl || null,
        contactPhone: contactPhone.trim() || null,
        contactEmail: contactEmail.trim() || null,
        education,
        workHistory,
      });
      addToast(cp ? "Candidate profile updated." : "Candidate profile created.", "success");
      await refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResumeChange(url: string) {
    setResumeUrl(url);
    try {
      await updateCandidateProfile({ resumeUrl: url });
      await refresh();
      addToast("CV uploaded.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not save your CV.", "error");
    }
  }

  // Profile photo reuses the same suite-wide PUT /api/me/profile path every other
  // avatarUrl-setting flow would use — there's no Recruitment-specific avatar field.
  async function handlePhotoChange(url: string) {
    try {
      await updateProfile({ avatarUrl: url });
      await refresh();
      addToast("Profile photo updated.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not save your photo.", "error");
    }
  }

  return (
    <Section
      title={cp ? "Candidate profile" : "Build your candidate profile"}
      desc="Visible to employers once you apply to one of their roles."
    >
      <div style={{ display: "grid", gap: 16 }}>
        {savedGaps.length > 0 && (
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-subtle)",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            <strong style={{ fontWeight: 700 }}>Finish these to start applying to jobs:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--muted)" }}>
              {savedGaps.map((g) => (
                <li key={g.key}>{g.label}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label className="field-label">Profile photo</label>
          <ImageUpload value={user?.avatarUrl || undefined} onChange={handlePhotoChange} label="Upload photo" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Backend Engineer — Node.js" required error={errors.headline} />
          <Input label="Current role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} list="rd-role-suggestions" />
          <Input label="Current company" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
          <Input label="Years of experience" type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} required error={errors.experienceYears} />
          <Input label="Expected salary (₹/yr)" type="number" min={0} value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} error={errors.expectedSalary} />
          <Select
            label="Open to work?"
            value={isOpenToWork ? "yes" : "no"}
            onChange={(e) => setIsOpenToWork(e.target.value === "yes")}
            options={[{ value: "yes", label: "Yes, open to opportunities" }, { value: "no", label: "Not right now" }]}
          />
          <Input label="Mobile" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="10-digit mobile" required error={errors.contactPhone} />
          <Input label="Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required error={errors.contactEmail} />
        </div>
        {roleSuggestions.length ? (
          <datalist id="rd-role-suggestions">
            {roleSuggestions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        ) : null}
        <div>
          <label className="field-label" htmlFor="rd-summary">Summary</label>
          <textarea id="rd-summary" className={`textarea${errors.summary ? " input-error" : ""}`} rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A short pitch employers will see." />
          {errors.summary ? (
            <p className="field-error">{errors.summary}</p>
          ) : (
            <p className="field-hint">{summary.trim().length}/30 characters minimum.</p>
          )}
        </div>
        <div>
          <TagInput label="Skills" hint="Press Enter to add each skill — at least 3." value={skills} onChange={setSkills} placeholder="e.g. Node.js, SQL" suggestions={skillSuggestions} />
          {errors.skills && <p className="field-error">{errors.skills}</p>}
        </div>
        <TagInput label="Preferred locations" hint="Press Enter to add each city." value={preferredLocations} onChange={setPreferredLocations} placeholder="e.g. Bengaluru" />
        <div>
          <label className="field-label">Preferred job types</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {JOB_TYPES.map((t) => (
              <label key={t.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--ink)" }}>
                <input type="checkbox" checked={preferredJobTypes.includes(t.value)} onChange={() => togglePreferredJobType(t.value)} />
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Work history</label>
          <WorkHistoryEditor value={workHistory} onChange={setWorkHistory} />
        </div>
        <div>
          <label className="field-label">Education</label>
          <EducationEditor value={education} onChange={setEducation} />
        </div>
        <div>
          <label className="field-label">CV / resume</label>
          <ResumeUpload value={resumeUrl} onChange={handleResumeChange} />
          {errors.resumeUrl ? (
            <p className="field-error">{errors.resumeUrl}</p>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>Required before you can apply to a job.</p>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="green" onClick={save} disabled={saving}>
            {saving ? "Saving…" : cp ? "Save changes" : "Create candidate profile"}
          </Button>
        </div>
      </div>
    </Section>
  );
}
