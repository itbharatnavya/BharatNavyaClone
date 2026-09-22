"use client";

// Post a job — a single-form employer flow (simpler than Directory's /sell: no
// product/service branching, just one job shape). Reuses the generic Section/TagInput
// atoms from components/sell/editors.tsx (pure layout/chip-input primitives, no
// Directory coupling) rather than re-inventing them.

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { Section, TagInput, QuestionsEditor } from "@/components/sell/editors";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useToast } from "@/components/Toast";
import { getJobFunctions, createJob, updateJob, getJob } from "@/lib/api";
import { employerProfileGaps } from "@/lib/recruitmentProfile";
import type { EmploymentType, ExperienceLevel, Job, JobFunction, JobQuestion, JobStatus } from "@/lib/types";

// YYYY-MM-DD for an <input type="date">, from a stored ISO timestamp.
function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];
const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

function PostJobInner() {
  const router = useRouter();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const isEdit = !!jobId;

  const { user, loading } = useRequireAuth({
    redirectTo: `/login?next=/post-job${jobId ? `?jobId=${jobId}` : ""}`,
  });

  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  useEffect(() => {
    getJobFunctions().then(setJobFunctions).catch(() => {});
  }, []);

  const [title, setTitle] = useState("");
  const [jobFunction, setJobFunction] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");
  const [remote, setRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryDisclosed, setSalaryDisclosed] = useState(true);
  const [openings, setOpenings] = useState("1");
  const [skills, setSkills] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [questions, setQuestions] = useState<JobQuestion[]>([]);
  const [qualification, setQualification] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingJob, setLoadingJob] = useState(isEdit);
  const [notOwner, setNotOwner] = useState(false);
  // Only set in edit mode, from the loaded job — drives which submit button(s) show
  // (build plan Phase 5's draft/publish distinction).
  const [originalStatus, setOriginalStatus] = useState<JobStatus | null>(null);

  // Edit mode: load the existing job and prefill every field. Ownership is enforced
  // server-side too (PUT /:id is owner-or-admin) — this check just avoids flashing the
  // form before the save attempt would 403.
  useEffect(() => {
    if (!jobId || !user) return;
    let cancelled = false;
    getJob(jobId)
      .then((job) => {
        if (cancelled) return;
        if (job.employerId !== user.id) {
          setNotOwner(true);
          return;
        }
        setTitle(job.title);
        setJobFunction(job.jobFunction || "");
        setEmploymentType((job.employmentType || "") as EmploymentType | "");
        setExperienceLevel((job.experienceLevel || "") as ExperienceLevel | "");
        setDescription(job.description || "");
        setCity(job.location?.city || "");
        setState(job.location?.state || "");
        setRemote(!!job.location?.remote);
        setSalaryMin(job.salaryRange?.min != null ? String(job.salaryRange.min) : "");
        setSalaryMax(job.salaryRange?.max != null ? String(job.salaryRange.max) : "");
        setSalaryDisclosed(job.salaryRange?.isDisclosed ?? true);
        setOpenings(String(job.openings || 1));
        setSkills(job.skills || []);
        setResponsibilities(job.responsibilities || []);
        setRequirements(job.requirements || []);
        setBenefits(job.benefits || []);
        setQuestions(job.questions || []);
        setQualification(job.qualification || "");
        setExpiresAt(toDateInputValue(job.expiresAt));
        setOriginalStatus(job.status);
      })
      .catch(() => setNotOwner(true))
      .finally(() => !cancelled && setLoadingJob(false));
    return () => {
      cancelled = true;
    };
  }, [jobId, user]);

  function validate(): string | null {
    if (!title.trim()) return "Job title is required.";
    if (!remote && !city.trim()) return "Add a city, or mark the role as remote.";
    return null;
  }

  // targetStatus is only passed by the draft/publish buttons (Phase 5) — omitted for
  // a plain "Save changes" on an already-active/paused/closed job, so this never
  // silently resets a job's status as a side effect of an unrelated field edit.
  async function submit(targetStatus?: "draft" | "active") {
    const err = validate();
    if (err) {
      addToast(err, "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: Partial<Job> = {
        title: title.trim(),
        description: description.trim(),
        jobFunction: jobFunction || null,
        employmentType: (employmentType || null) as EmploymentType | null,
        experienceLevel: (experienceLevel || null) as ExperienceLevel | null,
        location: { city: city.trim(), state: state.trim(), remote },
        salaryRange: {
          min: salaryMin ? Number(salaryMin) : null,
          max: salaryMax ? Number(salaryMax) : null,
          currency: "INR",
          isDisclosed: salaryDisclosed,
        },
        skills,
        responsibilities,
        requirements,
        benefits,
        questions: questions.filter((q) => q.text.trim()),
        openings: openings ? Math.max(1, Math.floor(Number(openings))) : 1,
        qualification: qualification.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        status: targetStatus,
      };
      const saved = isEdit ? await updateJob(jobId!, body) : await createJob(body);
      addToast(targetStatus === "draft" ? "Saved as draft." : isEdit ? "Job updated." : "Job posted.", "success");
      router.push(targetStatus === "draft" ? "/recruitment/dashboard?tab=jobs" : `/job/${saved.id}`);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to save job.", "error");
      setSubmitting(false);
    }
  }

  if (loading || !user || loadingJob) return null;

  // Company-profile gate — mirrors the backend's POST /api/jobs 403. Editing an
  // existing job is exempt (the profile already existed when it was posted); only a
  // fresh post is blocked, and the recruiter is sent to the Profile tab to finish.
  const companyGaps = isEdit ? [] : employerProfileGaps(user);
  if (companyGaps.length) {
    return (
      <div className="container-bs section-pad-sm counter-workspace-page counter-recruitment-workspace" style={{ maxWidth: 720 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--tricolor-green-hover)",
          }}
        >
          Recruitment
        </span>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", marginTop: 6 }}>
          {user.employerProfile ? "Complete your employer profile first" : "Create your employer profile first"}
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 6 }}>
          Candidates see this hiring profile on every role you publish. Add these details before posting:
        </p>
        <ul style={{ margin: "16px 0 0", paddingLeft: 20, color: "var(--ink)", fontSize: 14, lineHeight: 1.9 }}>
          {companyGaps.map((g) => (
            <li key={g.key}>{g.label}</li>
          ))}
        </ul>
        <Button variant="green" href="/recruitment/dashboard?tab=profile" style={{ marginTop: 20 }}>
          Go to employer profile
        </Button>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="container-bs counter-workspace-page counter-recruitment-workspace" style={{ paddingTop: 100, paddingBottom: 100, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>You can't edit this job</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>It doesn't belong to your account.</p>
        <Button variant="green" href="/recruitment/dashboard" style={{ marginTop: 16 }}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container-bs section-pad-sm counter-workspace-page counter-recruitment-workspace" style={{ maxWidth: 920 }}>
      <span className="pj-eyebrow">Recruitment</span>
      <h1 className="pj-h1">{isEdit ? "Edit job" : "Post a job"}</h1>
      <p className="pj-sub">Reach candidates directly — no recruiter fees, no bidding.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 28 }}>
        <Section title="Basics">
          <div style={{ display: "grid", gap: 16 }}>
            <Input label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Backend Engineer" required />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <Select
                label="Role type"
                value={jobFunction}
                onChange={(e) => setJobFunction(e.target.value)}
                options={jobFunctions.map((jf) => ({ value: jf.slug, label: jf.name }))}
                placeholder="Select a role type"
              />
              <Select
                label="Employment type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                options={EMPLOYMENT_TYPES}
                placeholder="Select"
              />
              <Select
                label="Experience level"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                options={EXPERIENCE_LEVELS}
                placeholder="Select"
              />
              <Input label="Openings" type="number" min={1} value={openings} onChange={(e) => setOpenings(e.target.value)} />
              <Input label="Qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. Bachelor's degree, Any graduate" />
              <Input label="Applications close on" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="pj-description">Description</label>
              <textarea
                id="pj-description"
                className="textarea"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this person do day to day?"
              />
            </div>
          </div>
        </Section>

        <Section title="Location">
          <div style={{ display: "grid", gap: 14 }}>
            <label className="pj-checkbox">
              <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
              This role can be done remotely
            </label>
            {!remote && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" />
                <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" />
              </div>
            )}
          </div>
        </Section>

        <Section title="Salary" desc="Shown to candidates as a range — leave blank to keep it confidential.">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <Input label="Minimum (₹/yr)" type="number" min={0} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              <Input label="Maximum (₹/yr)" type="number" min={0} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
            </div>
            <label className="pj-checkbox">
              <input type="checkbox" checked={salaryDisclosed} onChange={(e) => setSalaryDisclosed(e.target.checked)} />
              Show this range to candidates
            </label>
          </div>
        </Section>

        <Section title="Skills & requirements">
          <div style={{ display: "grid", gap: 16 }}>
            <TagInput label="Skills" hint="Press Enter to add each skill." value={skills} onChange={setSkills} placeholder="e.g. Node.js, SQL" />
            <TagInput label="Responsibilities" hint="Press Enter to add each line." value={responsibilities} onChange={setResponsibilities} placeholder="e.g. Own the payments API" />
            <TagInput label="Requirements" hint="Press Enter to add each line." value={requirements} onChange={setRequirements} placeholder="e.g. 3+ years experience" />
            <TagInput label="Benefits" hint="Press Enter to add each line." value={benefits} onChange={setBenefits} placeholder="e.g. Health insurance" />
          </div>
        </Section>

        <Section title="Screening questions" desc="Candidates answer these when they apply. Mark the ones you need answered.">
          <QuestionsEditor value={questions} onChange={setQuestions} />
        </Section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {!isEdit || originalStatus === "draft" ? (
            <>
              <Button variant="secondary" size="lg" onClick={() => submit("draft")} disabled={submitting}>
                {submitting ? "Saving…" : "Save as draft"}
              </Button>
              <Button variant="green" size="lg" onClick={() => submit("active")} disabled={submitting}>
                {submitting ? "Saving…" : "Publish job"}
              </Button>
            </>
          ) : (
            <Button variant="green" size="lg" onClick={() => submit()} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        .pj-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--tricolor-green-hover);
        }
        .pj-h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-top: 6px;
        }
        .pj-sub {
          font-size: 14.5px;
          color: var(--muted);
          margin-top: 6px;
        }
        .pj-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--ink);
          cursor: pointer;
        }
        .pj-checkbox input {
          width: 16px;
          height: 16px;
          accent-color: var(--tricolor-green);
        }
      `}</style>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <RecruitmentGate>
      <Suspense fallback={null}>
        <PostJobInner />
      </Suspense>
    </RecruitmentGate>
  );
}
