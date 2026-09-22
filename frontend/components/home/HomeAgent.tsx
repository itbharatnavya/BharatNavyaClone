"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Modal from "@/components/Modal";
import { assistantChat } from "@/lib/api";

interface AgentLink {
  label: string;
  href: string;
}

interface AgentResult {
  title: string;
  subtitle: string;
  href: string;
}

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: AgentLink[];
  results?: AgentResult[];
}

const STARTERS = [
  "I want to start a food packaging business",
  "Help me hire my first operations manager",
  "What should I verify before choosing a supplier?",
];

const WELCOME: AgentMessage = {
  role: "assistant",
  content: "Tell me what you are trying to do. I’ll help clarify the next steps and point you to useful records on Bharat Navya.",
};

function AgentIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M8.5 3.5h7M12 2v3M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
}

function SendIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="m4 12 16-8-6 16-2.5-6.5L4 12Z"/></svg>;
}

interface HomeAgentProps {
  variant?: "default" | "feature";
}

export default function HomeAgent({ variant = "default" }: HomeAgentProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const modalInputRef = useRef<HTMLTextAreaElement>(null);
  const closeAgent = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, loading, open]);

  async function send(value: string) {
    const prompt = value.trim();
    if (!prompt || loading) {
      if (!prompt) setError("Tell the guide what you are trying to do.");
      return;
    }

    const nextMessages: AgentMessage[] = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setOpen(true);
    setLoading(true);

    const history = nextMessages.slice(-8).map(({ role, content }) => ({ role, content }));

    try {
      const response = await assistantChat(prompt, history);
      setMessages((current) => [...current, {
        role: "assistant",
        content: response.reply,
        suggestions: Array.isArray(response.suggestions) ? response.suggestions : [],
        results: Array.isArray(response.results) ? response.results : [],
      }]);
    } catch {
      setMessages((current) => [...current, {
        role: "assistant",
        content: "I couldn’t reach the guide just now. You can still explore the relevant records below, or try again in a moment.",
        suggestions: [
          { label: "Explore services & products", href: "/directory" },
          { label: "Explore roles", href: "/recruitment" },
        ],
      }]);
    } finally {
      setLoading(false);
      window.requestAnimationFrame(() => modalInputRef.current?.focus());
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  function chooseStarter(starter: string) {
    setDraft(starter);
    void send(starter);
  }

  return <>
    {variant === "feature" ? <article className="bn-home-agent is-feature">
      <div className="bn-home-agent-intro">
        <span className="bn-home-agent-mark"><AgentIcon /></span>
        <span><small>AI guide</small><strong>Navya</strong></span>
      </div>
      <p>Ask about a business idea, a supplier, or your next hire.</p>
      <button className="bn-home-agent-launch" type="button" onClick={() => setOpen(true)}>
        <span>Ask anything</span><SendIcon />
      </button>
    </article> : <div className="bn-home-agent">
        <div className="bn-home-agent-intro">
          <span className="bn-home-agent-mark"><AgentIcon /></span>
          <strong>Ask Bharat Navya</strong>
        </div>
        <form onSubmit={submit} aria-label="Ask the Bharat Navya AI guide">
          <label className="sr-only" htmlFor={inputId}>Tell Bharat Navya what you are trying to do</label>
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setError(""); }}
            placeholder="What are you trying to do?"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          <button type="submit" disabled={loading || !draft.trim()}><span>Ask Navya</span><SendIcon /></button>
        </form>
        {error && <p id={errorId} className="bn-home-agent-error" role="alert">{error}</p>}
        <div className="bn-home-agent-starters" aria-label="Example questions">
          <span>Try asking</span>
          {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => chooseStarter(starter)}>{starter}</button>)}
        </div>
      </div>}

    <Modal
      open={open}
      onClose={closeAgent}
      size="lg"
      className="bn-agent-modal"
      bodyClassName="bn-agent-modal-body"
      title={<div className="bn-agent-modal-title"><span><AgentIcon /></span><div><strong>Bharat Navya guide</strong><small>AI-assisted guidance</small></div></div>}
    >
      <div className="bn-agent-conversation" ref={conversationRef} aria-live="polite" aria-busy={loading}>
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`bn-agent-message is-${message.role}`}>
          <div className="bn-agent-message-copy"><ReactMarkdown>{message.content}</ReactMarkdown></div>
          {message.results && message.results.length > 0 && <div className="bn-agent-results" aria-label="Recommended records">{message.results.map((result) => <Link href={result.href || "#"} key={`${result.href}-${result.title}`} onClick={() => setOpen(false)}><strong>{result.title}</strong>{result.subtitle && <span>{result.subtitle}</span>}<b aria-hidden>→</b></Link>)}</div>}
          {message.suggestions && message.suggestions.length > 0 && <div className="bn-agent-actions">{message.suggestions.map((suggestion) => <Link href={suggestion.href || "#"} key={`${suggestion.href}-${suggestion.label}`} onClick={() => setOpen(false)}>{suggestion.label}<span aria-hidden>→</span></Link>)}</div>}
        </div>)}
        {loading && <div className="bn-agent-message is-assistant is-loading"><div className="bn-agent-message-copy"><span/><span/><span/><em className="sr-only">Bharat Navya is thinking</em></div></div>}
      </div>
      <form className="bn-agent-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor={`${inputId}-modal`}>Continue the conversation</label>
        <textarea
          ref={modalInputRef}
          id={`${inputId}-modal`}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setError(""); }}
          onKeyDown={handleComposerKeyDown}
          placeholder="Ask a follow-up question…"
          rows={1}
          disabled={loading}
        />
        <button type="submit" aria-label="Send message" disabled={loading || !draft.trim()}><SendIcon /></button>
        <small>Enter to send · Shift + Enter for a new line</small>
      </form>
    </Modal>
  </>;
}
