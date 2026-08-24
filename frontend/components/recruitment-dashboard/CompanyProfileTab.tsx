"use client";

// Recruiter's company profile — create-vs-edit form, same pattern as Directory's
// ProfileTab (presence of the profile sub-object decides becomeEmployer() vs
// updateEmployerProfile()). Extracted out of the old flat /recruitment/dashboard page
// into the tabbed shell (RecruitmentDashboardShell.tsx).

import React, { useState } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { Section } from "@/components/sell/editors";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { becomeEmployer, updateEmployerProfile } from "@/lib/api";

export default function CompanyProfileTab() {
  const { user, refresh } = useAuth();
  const { addToast } = useToast();
  const ep = user?.employerProfile;

  const [companyName, setCompanyName] = useState(ep?.companyName || "");
  const [about, setAbout] = useState(ep?.about || "");
  const [industry, setIndustry] = useState(ep?.industry || "");
  const [companySize, setCompanySize] = useState(ep?.companySize || "");
  const [website, setWebsite] = useState(ep?.website || "");
  const [city, setCity] = useState(ep?.location?.city || user?.city || "");
  const [state, setState] = useState(ep?.location?.state || user?.state || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!companyName.trim()) {
      addToast("Company name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        companyName: companyName.trim(),
        about: about.trim() || undefined,
        industry: industry.trim() || undefined,
        companySize: companySize.trim() || undefined,
        website: website.trim() || undefined,
        location: { city: city.trim(), state: state.trim() },
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
      <div style={{ display: "grid", gap: 16 }}>
        {ep && (
          <p style={{ fontSize: 13, color: "var(--muted)", background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 12px" }}>
            Status: <strong>{ep.status === "approved" ? "Approved — jobs are visible publicly" : ep.status === "suspended" ? "Suspended" : "Pending review"}</strong>
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Information Technology" />
          <Input label="Company size" value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="e.g. 11-50" />
          <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="rd-about">About the company</label>
          <textarea id="rd-about" className="textarea" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
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
