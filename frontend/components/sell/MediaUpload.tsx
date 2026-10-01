"use client";

// components/sell/MediaUpload.tsx — multi-photo uploader for the /sell create-listing
// flow. Replaces the old paste-a-URL MediaEditor on the seller path. Same upload
// primitive as components/ImageUpload.tsx and components/recruitment/ResumeUpload.tsx
// (base64 data URL -> POST /api/uploads -> "/uploads/<name>"), extended to a gallery:
// pick several photos at once, see thumbnails, remove any, first one is the cover.
// Native <input type="file"> only — no pasted URLs, no custom widgets.

import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/api";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  error?: string;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image — matches components/ImageUpload.tsx

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v13" />
    </svg>
  );
}

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

export default function MediaUpload({
  value,
  onChange,
  max = 10,
  error,
  label = "Add photos",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const full = value.length >= max;

  async function handleFiles(files: FileList | null) {
    setLocalError(null);
    if (!files || files.length === 0) return;

    const picked = Array.from(files);
    const room = max - value.length;
    if (room <= 0) {
      setLocalError(`You can add up to ${max} photos.`);
      return;
    }
    const batch = picked.slice(0, room);
    const skippedForLimit = picked.length - batch.length;

    setBusy(true);
    const added: string[] = [];
    const problems: string[] = [];
    for (const file of batch) {
      if (!file.type.startsWith("image/")) {
        problems.push(`"${file.name}" isn't an image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`"${file.name}" is over 5 MB.`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        const { url } = await uploadImage(dataUrl);
        added.push(url);
      } catch (e) {
        problems.push((e as Error).message || `Couldn't upload "${file.name}".`);
      }
    }
    if (added.length) onChange([...value, ...added]);
    if (skippedForLimit > 0)
      problems.push(`${skippedForLimit} photo(s) skipped — ${max} max.`);
    if (problems.length) setLocalError(problems.join(" "));

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const shown = error || localError;

  return (
    <div style={{ minWidth: 0 }}>
      {value.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--bg-subtle)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {i === 0 && (
                <span
                  className="badge"
                  style={{
                    position: "absolute",
                    left: 6,
                    top: 6,
                    fontSize: 12,
                    background: "var(--brand)",
                    color: "#fff",
                    padding: "2px 6px",
                  }}
                >
                  Cover
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => removeAt(i)}
                style={{
                  position: "absolute",
                  right: 6,
                  top: 6,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className="btn btn-secondary btn-sm"
        style={{
          cursor: busy || full ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          opacity: busy || full ? 0.7 : 1,
        }}
      >
        {busy ? <span className="mu-spin" aria-hidden /> : <UploadIcon size={14} />}
        <span>
          {busy
            ? "Uploading…"
            : full
            ? `Maximum ${max} photos`
            : value.length
            ? "Add more"
            : label}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy || full}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
      </label>

      <p className="field-hint" style={{ marginTop: 8 }}>
        JPG or PNG, up to 5 MB each. The first photo is the cover buyers see.
      </p>

      {shown && <p className="field-error">{shown}</p>}

      <style>{`.mu-spin{width:13px;height:13px;border-radius:999px;border:2px solid var(--border);border-top-color:var(--brand);display:inline-block;animation:muspin .7s linear infinite}@keyframes muspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
