"use client";

// LanguageToggle — compact EN / हिन्दी switch wired to the i18n LanguageProvider.
// Persists via useT().setLang (which writes localStorage.bs_lang).

import React from "react";
import { useT } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useT();

  const base =
    "px-2 py-1 text-xs font-semibold rounded-md transition-colors leading-none";
  const active = "bg-canvas text-ink shadow-sm";
  const idle = "text-muted hover:text-ink";

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.5"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`${base} ${lang === "en" ? active : idle}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        aria-pressed={lang === "hi"}
        className={`${base} ${lang === "hi" ? active : idle}`}
      >
        हिन्दी
      </button>
    </div>
  );
}
