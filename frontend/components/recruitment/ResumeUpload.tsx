"use client";

// components/recruitment/ResumeUpload.tsx — CV/résumé uploader. A PDF-accepting sibling
// of components/ImageUpload.tsx: same /api/uploads primitive (already accepts
// application/pdf up to 10MB, added specifically for this — see backend/routes/uploads.js),
// same base64-dataUrl-then-POST flow, but a file-name chip instead of an image thumbnail
// since a résumé preview can't render as a thumbnail.

import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/api";

interface Props {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches backend/routes/uploads.js's PDF cap

function FileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function fileNameFromUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] || "resume.pdf";
}

export default function ResumeUpload({ value, onChange, label = "Upload CV / resume" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File | undefined | null) {
    setError(null);
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is too large (max 10 MB).");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const { url } = await uploadImage(dataUrl);
      onChange(url);
    } catch (e) {
      setError((e as Error).message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: "var(--r-xs)",
              border: "1px solid var(--border)",
              background: "var(--bg-subtle)",
              color: "var(--ink)",
              fontSize: "var(--fs-xs)",
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <FileIcon />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{fileNameFromUrl(value)}</span>
          </a>
        ) : (
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--r-sm)",
              border: "1px dashed var(--border)",
              background: "var(--bg-subtle)",
              display: "grid",
              placeItems: "center",
              color: "var(--faint)",
              flexShrink: 0,
            }}
          >
            <FileIcon size={20} />
          </div>
        )}

        <label
          className="btn btn-secondary btn-sm"
          style={{ cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? <span className="ru-spin" aria-hidden /> : <FileIcon size={14} />}
          <span>{busy ? "Uploading…" : value ? "Replace CV" : label}</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {error && <div style={{ fontSize: "var(--fs-xs)", color: "#DC2626", marginTop: 8 }}>{error}</div>}

      <style>{`.ru-spin{width:13px;height:13px;border-radius: var(--r-pill);border:2px solid var(--border);border-top-color:var(--brand);display:inline-block;animation:ruspin .7s linear infinite}@keyframes ruspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
