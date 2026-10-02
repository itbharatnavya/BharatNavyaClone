"use client";

// components/recruitment/ApplyModal.tsx — the post-login half of the Apply flow
// (login gating itself stays in job/[id]/page.tsx's existing ContactAuthModal wiring,
// unchanged).
//
// First gate: the candidate profile must be complete (candidateProfileGaps) — an
// incomplete profile can't apply at all, it's sent to the dashboard's Profile tab to
// finish. Once complete, the flow is: recruiter questions (if any) → cover note →
// review → submit. There is no inline CV upload here anymore — the CV, like every
// other required field, is filled on the profile form.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import ApplicationStepper from "@/components/recruitment/ApplicationStepper";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { applyToJob } from "@/lib/api";
import { candidateProfileGaps } from "@/lib/recruitmentProfile";
import type { Job, JobAnswer } from "@/lib/types";

interface Props {
  open: boolean;
  job: Job;
  onClose: () => void;
  onApplied: () => void;
}

type Step = "questions" | "note" | "profile" | "review";

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-sm)", color: done ? "var(--ink)" : "var(--muted)" }}>
      <span style={{ color: done ? "var(--tricolor-green-hover)" : "var(--faint)" }}>{done ? <CheckIcon /> : <DotIcon />}</span>
      {label}
    </div>
  );
}

export default function ApplyModal({ open, job, onClose, onApplied }: Props) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const cp = user?.candidateProfile;
  const questions = useMemo(() => job.questions || [], [job.questions]);

  // Gaps that must be filled on the profile form before this candidate can apply.
  const gaps = useMemo(() => candidateProfileGaps(user), [user]);
  const blocked = gaps.length > 0;

  const resumeUrl = cp?.resumeUrl || "";
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    ...(questions.length ? (["questions"] as Step[]) : []),
    "note",
    "profile",
    "review",
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  function reset() {
    setStepIndex(0);
    setAnswers({});
    setCoverNote("");
  }

  function close() {
    reset();
    onClose();
  }

  function goNext() {
    if (step === "questions") {
      const missing = questions.filter((q) => q.required && !(answers[q.id] || "").trim());
      if (missing.length) {
        addToast(`Answer "${missing[0].text}" before continuing.`, "error");
        return;
      }
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const answerList: JobAnswer[] = questions
        .map((q) => ({ questionId: q.id, text: (answers[q.id] || "").trim() }))
        .filter((a) => a.text);
      await applyToJob({
        jobId: job.id,
        coverNote: coverNote.trim() || undefined,
        resumeUrl: resumeUrl || undefined,
        answers: answerList,
      });
      addToast("Application sent.", "success");
      onApplied();
      close();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to apply.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || user.recruitmentRole === "recruiter") return null;

  const isLast = step === "review";
  const companyName = job.employer?.companyName || "the company";

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Apply to ${job.title}`}
      size="sm"
      footer={
        blocked ? (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant="brand" href="/recruitment/dashboard?tab=profile" onClick={close}>
              Go to profile
            </Button>
          </>
        ) : (
          <>
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={goBack} disabled={submitting}>Back</Button>
            )}
            <Button variant="secondary" onClick={close} disabled={submitting}>Cancel</Button>
            {isLast ? (
              <Button variant="brand" onClick={submit} disabled={submitting}>
                {submitting ? "Sending…" : "Submit application"}
              </Button>
            ) : (
              <Button variant="brand" onClick={goNext}>Continue</Button>
            )}
          </>
        )
      }
    >
      {!blocked && <ApplicationStepper steps={steps.map((item) => item === "questions" ? "Questions" : item === "note" ? "Cover note" : item === "profile" ? "Profile" : "Review")} activeIndex={stepIndex} />}
      {blocked && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            Finish your candidate profile before applying. {companyName} sees these
            details with every application:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gaps.map((g) => (
              <ChecklistRow key={g.key} label={g.label} done={false} />
            ))}
          </div>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>
            You only need to do this once —{" "}
            <Link href="/recruitment/dashboard?tab=profile" style={{ color: "var(--brand)" }}>
              open your profile
            </Link>{" "}
            to fill them in.
          </p>
        </div>
      )}

      {!blocked && step === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: -4 }}>
            {companyName} asks a few questions before reviewing applications.
          </p>
          {questions.map((q) => (
            <div key={q.id}>
              <label className="field-label" htmlFor={`aq-${q.id}`}>
                {q.text}{q.required && <span style={{ color: "#DC2626" }}> *</span>}
              </label>
              <textarea
                id={`aq-${q.id}`}
                className="textarea"
                rows={2}
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                maxLength={2000}
              />
            </div>
          ))}
        </div>
      )}

      {!blocked && step === "note" && (
        <div>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: -4, marginBottom: 14 }}>
            Applying as {user.name}. Your profile details go to {companyName} — add a short note if you'd like.
          </p>
          <label className="field-label" htmlFor="jd-cover-note">Cover note (optional)</label>
          <textarea
            id="jd-cover-note"
            className="textarea"
            rows={5}
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            placeholder="Why you're a good fit for this role…"
            maxLength={4000}
          />
        </div>
      )}

      {!blocked && step === "profile" && (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: -4 }}>
            Confirm the profile and résumé that {companyName} will receive.
          </p>
          <div style={{ padding: 16, border: "1px solid var(--bn-border)", borderRadius: "var(--r-lg)", background: "var(--bn-neutral-100)", display: "grid", gap: 8 }}>
            <strong>{user.name}</strong>
            <span>{cp?.headline || cp?.currentRole || "Candidate profile"}</span>
            <small style={{ color: "var(--muted)" }}>{cp?.skills?.slice(0, 5).join(" · ") || "Skills are stored on your profile"}</small>
            {resumeUrl ? <a href={resumeUrl} target="_blank" rel="noreferrer" style={{ color: "var(--bn-action)", fontWeight: 700 }}>Preview résumé ↗</a> : <span style={{ color: "var(--error)" }}>Résumé not available</span>}
          </div>
        </div>
      )}

      {!blocked && step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: -4 }}>Review before you submit.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--fs-sm)" }}>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Mobile:</strong> {user.mobile}</div>
            <div>
              <strong>CV:</strong>{" "}
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>View resume</a>
              ) : (
                "—"
              )}
            </div>
            {questions.length > 0 && (
              <div>
                <strong>Answers:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                  {questions.map((q) => (
                    <li key={q.id} style={{ marginBottom: 4 }}>
                      {q.text} — {(answers[q.id] || "").trim() || <em>Not answered</em>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {coverNote.trim() && (
              <div>
                <strong>Cover note:</strong>
                <p style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "var(--muted)" }}>{coverNote.trim()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
