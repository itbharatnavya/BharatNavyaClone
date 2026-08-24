"use client";

// Candidate's profile — headline/skills/experience/preferences + CV, everything a
// recruiter needs to evaluate them (enhancement doc §4). No approval gate: this always
// succeeds for the authenticated user and can be saved repeatedly.

import React, { useState } from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { Section, TagInput } from "@/components/sell/editors";
import ResumeUpload from "@/components/recruitment/ResumeUpload";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { updateCandidateProfile } from "@/lib/api";

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
  const [resumeUrl, setResumeUrl] = useState(cp?.resumeUrl || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!headline.trim()) {
      addToast("Add a headline (e.g. your target role) before saving your profile.", "error");
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
        resumeUrl: resumeUrl || null,
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

  return (
    <Section
      title={cp ? "Candidate profile" : "Build your candidate profile"}
      desc="Visible to employers once you apply to one of their roles."
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Backend Engineer — Node.js" required />
          <Input label="Current role" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
          <Input label="Current company" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
          <Input label="Years of experience" type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
          <Input label="Expected salary (₹/yr)" type="number" min={0} value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} />
          <Select
            label="Open to work?"
            value={isOpenToWork ? "yes" : "no"}
            onChange={(e) => setIsOpenToWork(e.target.value === "yes")}
            options={[{ value: "yes", label: "Yes, open to opportunities" }, { value: "no", label: "Not right now" }]}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="rd-summary">Summary</label>
          <textarea id="rd-summary" className="textarea" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A short pitch employers will see." />
        </div>
        <TagInput label="Skills" hint="Press Enter to add each skill." value={skills} onChange={setSkills} placeholder="e.g. Node.js, SQL" />
        <TagInput label="Preferred locations" hint="Press Enter to add each city." value={preferredLocations} onChange={setPreferredLocations} placeholder="e.g. Bengaluru" />
        <div>
          <label className="field-label">CV / résumé</label>
          <ResumeUpload value={resumeUrl} onChange={handleResumeChange} />
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>Required before you can apply to a job.</p>
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
