"use client";

// Recruiter's company profile — create-vs-edit form, same pattern as Directory's
// ProfileTab (presence of the profile sub-object decides becomeEmployer() vs
// updateEmployerProfile()). Extracted out of the old flat /recruitment/dashboard page
// into the tabbed shell (RecruitmentDashboardShell.tsx).

import React, { useState } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import ImageUpload from "@/components/ImageUpload";
import { Section, TagInput } from "@/components/sell/editors";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { becomeEmployer, updateEmployerProfile } from "@/lib/api";
import { employerProfileGaps } from "@/lib/recruitmentProfile";

const URL_RE = /^https?:\/\/.+/i;

// Small labelled row for the tabular company-details grouping below — a plain
// label/value line, not a new form control.
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function CompanyProfileTab() {
  const { user, refresh } = useAuth();
  const { addToast } = useToast();
  const ep = user?.employerProfile;

  const [companyName, setCompanyName] = useState(ep?.companyName || "");
  const [about, setAbout] = useState(ep?.about || "");
  const [logo, setLogo] = useState(ep?.logo || "");
  const [coverImage, setCoverImage] = useState(ep?.coverImage || "");
  const [industry, setIndustry] = useState(ep?.industry || "");
  const [companySize, setCompanySize] = useState(ep?.companySize || "");
  const [employeeCount, setEmployeeCount] = useState(ep?.employeeCount || "");
  const [website, setWebsite] = useState(ep?.website || "");
  const [city, setCity] = useState(ep?.location?.city || user?.city || "");
  const [state, setState] = useState(ep?.location?.state || user?.state || "");
  const [workingHours, setWorkingHours] = useState(ep?.workingHours || "");
  const [benefits, setBenefits] = useState<string[]>(ep?.benefits || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remaining gaps on the *saved* profile — drives the "you can't post a job yet" banner.
  const savedGaps = employerProfileGaps(user);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = "Company name is required.";
    if (about.trim().length < 30) e.about = "Write at least 30 characters — candidates read this on every job.";
    if (!industry.trim()) e.industry = "Industry is required.";
    if (!companySize.trim()) e.companySize = "Company size is required (e.g. 11-50).";
    if (!city.trim()) e.city = "City is required.";
    if (!state.trim()) e.state = "State is required.";
    if (website.trim() && !URL_RE.test(website.trim())) e.website = "Start with http:// or https://";
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
      const body = {
        companyName: companyName.trim(),
        about: about.trim() || undefined,
        logo: logo || undefined,
        coverImage: coverImage || undefined,
        industry: industry.trim() || undefined,
        companySize: companySize.trim() || undefined,
        employeeCount: employeeCount.trim() || undefined,
        website: website.trim() || undefined,
        location: { city: city.trim(), state: state.trim() },
        workingHours: workingHours.trim() || undefined,
        benefits,
      };
      if (ep) {
        await updateEmployerProfile(body);
        addToast("Employer profile updated.", "success");
      } else {
        await becomeEmployer(body);
        addToast("Employer profile created. Post your first job whenever you're ready.", "success");
      }
      await refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title={ep ? "Company profile" : "Become a recruiter"}
      desc={ep ? "Your public company details." : "Add your company details so you can post jobs."}
    >
      <div style={{ display: "grid", gap: 20 }}>
        {ep && (
          <p style={{ fontSize: 13, color: "var(--muted)", background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 12px" }}>
            Status: <strong>{ep.status === "approved" ? "Approved — jobs are visible publicly" : ep.status === "suspended" ? "Suspended" : "Pending review"}</strong>
          </p>
        )}

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
            <strong style={{ fontWeight: 700 }}>Finish these before you can post a job:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--muted)" }}>
              {savedGaps.map((g) => (
                <li key={g.key}>{g.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Identity: name, logo, cover */}
        <div style={{ display: "grid", gap: 14 }}>
          <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required error={errors.companyName} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label className="field-label">Logo</label>
              <ImageUpload value={logo || undefined} onChange={setLogo} label="Upload logo" />
            </div>
            <div>
              <label className="field-label">Cover image</label>
              <ImageUpload value={coverImage || undefined} onChange={setCoverImage} label="Upload cover" />
            </div>
          </div>
        </div>

        {/* Company details, tabular */}
        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Company details</span>
          <div className="card card-flat" style={{ padding: 14, display: "grid", gap: 12 }}>
            <DetailRow label="Industry">
              <input className={`input${errors.industry ? " input-error" : ""}`} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Information Technology" />
              {errors.industry && <p className="field-error">{errors.industry}</p>}
            </DetailRow>
            <DetailRow label="Company size">
              <input className={`input${errors.companySize ? " input-error" : ""}`} value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="e.g. 11-50" />
              {errors.companySize && <p className="field-error">{errors.companySize}</p>}
            </DetailRow>
            <DetailRow label="Employee strength">
              <input className="input" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="e.g. 150" />
            </DetailRow>
            <DetailRow label="Website">
              <input className={`input${errors.website ? " input-error" : ""}`} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
              {errors.website && <p className="field-error">{errors.website}</p>}
            </DetailRow>
            <DetailRow label="Location">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className={`input${errors.city ? " input-error" : ""}`} style={{ flex: 1, minWidth: 100 }} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                <input className={`input${errors.state ? " input-error" : ""}`} style={{ flex: 1, minWidth: 100 }} value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
              </div>
              {(errors.city || errors.state) && <p className="field-error">{errors.city || errors.state}</p>}
            </DetailRow>
            <DetailRow label="Working hours">
              <input className="input" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="e.g. Mon–Fri, 9:30 AM–6:30 PM" />
            </DetailRow>
          </div>
        </div>

        {/* Benefits */}
        <TagInput label="Benefits" hint="Press Enter to add each benefit — shown to candidates on every job you post." value={benefits} onChange={setBenefits} placeholder="e.g. Health insurance, Remote-friendly" />

        <div>
          <label className="field-label" htmlFor="rd-about">About the company</label>
          <textarea id="rd-about" className={`textarea${errors.about ? " input-error" : ""}`} rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
          {errors.about ? (
            <p className="field-error">{errors.about}</p>
          ) : (
            <p className="field-hint">{about.trim().length}/30 characters minimum.</p>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {ep && (
            <Button variant="secondary" href="/post-job">Post a job</Button>
          )}
          <Button variant="green" onClick={save} disabled={saving}>
            {saving ? "Saving…" : ep ? "Save changes" : "Create employer profile"}
          </Button>
        </div>
      </div>
    </Section>
  );
}
