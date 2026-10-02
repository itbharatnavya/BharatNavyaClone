"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { assistantChat } from "@/lib/api";
import { useConfig } from "@/lib/config";

interface Suggestion {
  label: string;
  href: string;
}
interface ResultCard {
  title: string;
  subtitle: string;
  href: string;
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  results?: ResultCard[];
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I’m Navya AI Agent. I can help you navigate Bharat Navya and understand where to go next.",
};

// Client-side quick starters (fill + send). API suggestions come back as links.
const QUICK_PROMPTS = [
  "Find a GST consultant",
  "Technology services near me",
  "Show remote operations roles",
  "How do I publish a listing?",
];

function AssistantIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 18.5 3.5 21l4.1-1.2c1.3.8 2.8 1.2 4.4 1.2 5 0 9-3.8 9-8.5S17 4 12 4s-9 3.8-9 8.5c0 2.3.8 4.3 2 6Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
    </svg>
  );
}

export default function ChatAssistant() {
  const { featureFlags } = useConfig();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  // Match the frozen shell: focus the close control, support Escape, and
  // restore focus to the trigger after the drawer closes.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAssistant();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on route change so navigation via a suggestion feels clean.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Feature-gated (default on). Present across the whole platform; only the sign-in
  // screens and the admin console keep it out of the way. Hooks stay above this gate.
  const hiddenRoute = pathname === "/login" || pathname === "/register" || pathname === "/admin" || pathname.startsWith("/admin/");

  if (featureFlags.ai === false || hiddenRoute) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput("");

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setLoading(true);

    // Short rolling history (exclude the static greeting, cap length).
    const history = nextMessages
      .filter((m, i) => !(i === 0 && m === GREETING))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await assistantChat(trimmed, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
          results: Array.isArray(res.results) ? res.results : [],
        },
      ]);
      if (typeof res.remaining === "number") setRemaining(res.remaining);
    } catch {
      setError("Couldn't reach Navya AI Agent. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't get through just now. You can also use search to find what you need.",
          suggestions: [{ label: "Go to search", href: "/search" }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const showQuickPrompts = messages.length === 1;

  function closeAssistant() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openAssistant() {
    setOpen(true);
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <div className="navya-agent-dock fixed bottom-6 right-6 z-[120] flex items-center gap-2">
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open Navya AI Agent"
            aria-expanded={open}
            aria-controls="bharat-navya-assistant"
            onClick={openAssistant}
            className="navya-agent-trigger inline-flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <AssistantIcon size={23} />
          </button>
        </div>
      )}

      {/* Chat panel: a full-width sheet on phones, a floating card on desktop */}
      {open && (
        <div id="bharat-navya-assistant" role="dialog" aria-modal="false" aria-label="Navya AI Agent" className="navya-agent-panel na-panel">
          <header className="na-head">
            <span className="na-avatar"><AssistantIcon size={20} /></span>
            <div className="na-title">
              <strong>Ask Navya</strong>
              <small><i className="na-dot" aria-hidden />{remaining !== null ? `${remaining} answers left this hour` : "Online, here to help"}</small>
            </div>
            <button ref={closeRef} type="button" aria-label="Close Navya AI Agent" onClick={closeAssistant} className="na-close"><CloseIcon /></button>
          </header>

          <div ref={scrollRef} className="na-body">
            <div className="na-intro">
              <strong>Hi, I’m Navya.</strong>
              <p>I can help you find companies, products, services and roles, and point you to the right place on Bharat Navya.</p>
            </div>

            {showQuickPrompts && !loading && (
              <div className="na-prompts" role="group" aria-label="Try asking">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)}>
                    <span>{q}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                ))}
              </div>
            )}

            {messages.slice(1).map((m, i) => (
              <div key={i} className={`na-msg ${m.role === "user" ? "is-user" : "is-bot"}`}>
                <div className="na-bubble">{m.content}</div>

                {m.results && m.results.length > 0 && (
                  <div className="na-results">
                    {m.results.map((r, j) => (
                      <Link key={`${i}-r-${j}`} href={r.href || "#"} onClick={() => setOpen(false)}>
                        <span><strong>{r.title}</strong>{r.subtitle && <small>{r.subtitle}</small>}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </Link>
                    ))}
                  </div>
                )}

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="na-chips">
                    {m.suggestions.map((s, j) => <Link key={`${i}-${j}`} href={s.href || "#"} onClick={() => setOpen(false)}>{s.label}</Link>)}
                  </div>
                )}
              </div>
            ))}

            {loading && <div className="na-msg is-bot"><div className="na-bubble na-typing" aria-label="Navya is typing"><i /><i /><i /></div></div>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="na-composer">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" aria-label="Message Navya AI Agent" disabled={loading} />
            <button type="submit" aria-label="Send" disabled={loading || !input.trim()}><SendIcon /></button>
          </form>
          {error && <div className="na-error" role="alert" aria-live="assertive">{error}</div>}
          <p className="na-foot">Navya can make mistakes. Check important details.</p>
        </div>
      )}
    </>
  );
}
