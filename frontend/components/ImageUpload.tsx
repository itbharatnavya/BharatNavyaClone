"use client";

// components/ImageUpload.tsx — reusable, mobile-first image uploader.
//
// A non-technical seller taps "Upload image" and their phone offers Camera or Photo
// Library (accept="image/*"). We read the file as a base64 data URL, POST it to
// /api/uploads, then call onChange(url) with the stored "/uploads/<name>" path. No
// pasted URLs. Shows a spinner while uploading and a thumbnail once done. All icons
// are inline SVG (no emoji).

import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/api";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v13" />
    </svg>
  );
}

export default function ImageUpload({ value, onChange, label = "Upload image" }: Props) {
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
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is too large (max 5 MB).");
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
      // Allow re-selecting the same file to re-trigger onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Uploaded preview"
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              objectFit: "cover",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              border: "1px dashed var(--border)",
              background: "var(--bg-subtle)",
              display: "grid",
              placeItems: "center",
              color: "var(--faint)",
              flexShrink: 0,
            }}
          >
            <UploadIcon size={22} />
          </div>
        )}

        <label
          className="btn btn-secondary"
          style={{
            cursor: busy ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? <span className="iu-spin" aria-hidden /> : <UploadIcon />}
          <span>{busy ? "Uploading…" : value ? "Replace image" : label}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "#DC2626", marginTop: 8 }}>{error}</div>
      )}

      <style>{`.iu-spin{width:15px;height:15px;border-radius:999px;border:2px solid var(--border);border-top-color:var(--brand);display:inline-block;animation:iuspin .7s linear infinite}@keyframes iuspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
