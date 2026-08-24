"use client";

// components/recruitment/ApplyModal.tsx — the post-login half of the Apply flow
// (login gating itself stays in job/[id]/page.tsx's existing ContactAuthModal wiring,
// unchanged). Extracted out of the page because the flow grew from a single textarea
// into a short, conditionally-skipped sequence: CV check → recruiter questions →
// cover note → review → submit (enhancement doc §5/§6/§7).
//
// Each step is skipped when already satisfied — a candidate with a CV on file and a
// job with no custom questions goes straight to cover-note → review, same as before.

import React, { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import ResumeUpload from "@/components/recruitment/ResumeUpload";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { applyToJob, updateCandidateProfile } from "@/lib/api";
import type { Job, JobAnswer } from "@/lib/types";

interface Props {
  open: boolean;
  job: Job;
  onClose: () => void;
  onApplied: () => void;
}

type Step = "cv" | "questions" | "note" | "review";

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
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: done ? "var(--ink)" : "var(--muted)" }}>
      <span style={{ color: done ? "var(--tricolor-green-hover)" : "var(--faint)" }}>{done ? <CheckIcon /> : <DotIcon />}</span>
      {label}
    </div>
  );
}

export default function ApplyModal({ open, job, onClose, onApplied }: Props) {
  const { user, refresh } = useAuth();
  const { addToast } = useToast();

  const cp = user?.candidateProfile;
  const questions = useMemo(() => job.questions || [], [job.questions]);

  const [resumeUrl, setResumeUrl] = useState(cp?.resumeUrl || "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Recomputed each render (not memoized) — resumeUrl can change mid-flow via the
  // inline uploader, which should immediately drop the CV step from the sequence.
  const steps: Step[] = [
    ...(!resumeUrl ? (["cv"] as Step[]) : []),
    ...(questions.length ? (["questions"] as Step[]) : []),
    "note",
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

  async function handleResumeChange(url: string) {
    setResumeUrl(url);
    try {
      await updateCandidateProfile({ resumeUrl: url });
      await refresh();
    } catch {
      // Non-fatal here — resumeUrl is already applied locally for this application;
      // the dashboard's own CandidateSection is the durable place to retry a save.
    }
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
        <>
          {stepIndex > 0 && (
            <Button variant="secondary" onClick={goBack} disabled={submitting}>Back</Button>
          )}
          <Button variant="secondary" onClick={close} disabled={submitting}>Cancel</Button>
          {isLast ? (
            <Button variant="green" onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : "Submit application"}
            </Button>
          ) : (
            <Button variant="green" onClick={goNext} disabled={step === "cv" && !resumeUrl}>
              Continue
            </Button>
          )}
        </>
      }
    >
      {step === "cv" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
            Your application cannot be submitted yet. Complete these before continuing:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ChecklistRow label="Name" done={!!user.name} />
            <ChecklistRow label="Mobile number" done={!!user.mobile} />
            <ChecklistRow label="CV / résumé" done={!!resumeUrl} />
          </div>
          {!resumeUrl && (
            <div>
              <ResumeUpload value={resumeUrl} onChange={handleResumeChange} />
            </div>
          )}
        </div>
      )}

      {step === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: -4 }}>
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

      {step === "note" && (
        <div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: -4, marginBottom: 14 }}>
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

      {step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: -4 }}>Review before you submit.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Mobile:</strong> {user.mobile}</div>
            <div>
              <strong>CV:</strong>{" "}
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>View résumé</a>
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
