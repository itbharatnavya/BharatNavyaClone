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
    "Hi! I'm the Bharat Navya assistant. Tell me what kind of company, service, or role you need and I'll point you to Directory or Recruitment.",
};

// Client-side quick starters (fill + send). API suggestions come back as links.
const QUICK_PROMPTS = [
  "Find a GST consultant",
  "Technology companies near me",
  "Show remote operations roles",
  "How do I list my company?",
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

  // Feature-gated (default on). Placed after hooks so hook order stays stable.
  if (featureFlags.ai === false) return null;

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
      setError("Couldn't reach the assistant. Please try again.");
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

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open Bharat Navya assistant"
          aria-expanded={open}
          aria-controls="bharat-navya-assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[120] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: "#172033" }}
        >
          <AssistantIcon size={23} />
        </button>
      )}

      {/* Chat panel — full-width sheet on mobile, floating panel on desktop */}
      {open && (
        <div
          id="bharat-navya-assistant"
          role="dialog"
          aria-modal="false"
          aria-label="Bharat Navya assistant"
          className="fixed z-[120] flex flex-col overflow-hidden border border-border bg-surface shadow-pop
                     inset-x-3 bottom-3 max-h-[78vh] rounded-2xl
                     sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px] sm:max-w-[calc(100vw-2.5rem)] sm:h-[560px] sm:max-h-[calc(100vh-2.5rem)]"
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-surface px-4 py-3 text-ink">
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
              <AssistantIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">Assistant</div>
              <div className="text-[11px] leading-tight text-muted">
                {remaining !== null ? `AI · ${remaining} left this hour` : "Here to help you navigate"}
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close assistant"
              onClick={closeAssistant}
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-muted hover:bg-bg-subtle hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 flex flex-col gap-3"
            style={{ background: "var(--bg-subtle)" }}
          >
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="flex flex-col gap-2 max-w-[88%] min-w-0">
                  <div
                    className={
                      m.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-sm text-white whitespace-pre-wrap break-words"
                        : "rounded-2xl rounded-bl-sm border border-border bg-surface px-3.5 py-2.5 text-sm text-ink whitespace-pre-wrap break-words"
                    }
                  >
                    {m.content}
                  </div>

                  {m.results && m.results.length > 0 && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-1.5">
                      {m.results.map((r, j) => (
                        <Link
                          key={`${i}-r-${j}`}
                          href={r.href || "#"}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 flex-col justify-center gap-0.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-subtle"
                        >
                          <span className="truncate text-sm font-medium text-ink">{r.title}</span>
                          {r.subtitle && <span className="truncate text-xs text-muted">{r.subtitle}</span>}
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.suggestions.map((s, j) => (
                        <Link
                          key={`${i}-${j}`}
                          href={s.href || "#"}
                          onClick={() => setOpen(false)}
                          className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-brand/30 bg-brand-tint px-3 py-1.5 text-xs font-medium text-brand-hover transition-colors hover:bg-brand hover:text-white"
                        >
                          <span className="truncate">{s.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick starters (only before the first exchange) */}
            {showQuickPrompts && !loading && (
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="inline-flex min-h-11 max-w-full items-center rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink"
                  >
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm text-faint">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border bg-surface px-3 py-2.5 flex-shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              aria-label="Message the assistant"
              className="input flex-1 min-w-0"
              style={{ borderRadius: 999 }}
              disabled={loading}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              <SendIcon />
            </button>
          </form>

          {error && (
            <div className="px-4 pb-2 text-[11px] text-error flex-shrink-0" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}
