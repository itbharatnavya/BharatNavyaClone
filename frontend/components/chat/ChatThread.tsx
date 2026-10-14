"use client";

// ChatThread — the message list + composer for ONE conversation, over the
// shared Socket.IO connection (lib/socket.ts). Owns nothing about which
// conversation is "active" — that's the caller's job (InboxTab's list pane,
// or ChatModal's single-thread view). Extracted out of InboxTab.tsx so the
// listing-page chat modal and the dashboard Inbox tab share one
// implementation instead of drifting apart.

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getMessages } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { normalizeIncomingMessage, type ChatMsg } from "@/lib/chatSocket";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import { Loading, Icon, formatClock, newClientId, useTr } from "@/components/dashboard/shared";

interface Props {
  conversationId: string;
  meId: string;
  onIncomingMessage?: (msg: ChatMsg) => void;
  maxHeight?: string;
}

export default function ChatThread({ conversationId, meId, onIncomingMessage, maxHeight }: Props) {
  const tr = useTr();
  const { addToast } = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [text, setText] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const conversationIdRef = useRef(conversationId);
  const lastSeqRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onIncomingRef = useRef(onIncomingMessage);
  onIncomingRef.current = onIncomingMessage;
  conversationIdRef.current = conversationId;

  // ---- join + load history whenever the conversation changes ----
  useEffect(() => {
    let alive = true;
    setMessages([]);
    lastSeqRef.current = 0;
    setLoadingThread(true);

    let socket: Socket | null = null;
    try {
      socket = getSocket();
    } catch {
      socket = null;
    }
    socketRef.current = socket;
    if (socket) socket.emit("joinConversation", { conversationId });

    (async () => {
      try {
        const page = await getMessages(conversationId);
        if (!alive) return;
        setMessages(page.messages);
        lastSeqRef.current = page.messages.reduce((mx, m) => Math.max(mx, m.seq || 0), 0);
      } catch (e) {
        if (alive) addToast((e as Error).message || "Failed to load messages", "error");
      } finally {
        if (alive) setLoadingThread(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ---- socket listeners: incoming messages + reconnect gap-fill ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onMessage = (payload: unknown) => {
      const { conversationId: incomingId, msg } = normalizeIncomingMessage(payload);
      if (incomingId && incomingId !== conversationIdRef.current) return;
      if (msg.seq > lastSeqRef.current) lastSeqRef.current = msg.seq;
      setMessages((prev) => {
        if (msg.clientMsgId && prev.some((m) => m.clientMsgId === msg.clientMsgId)) {
          return prev.map((m) => (m.clientMsgId === msg.clientMsgId ? { ...msg, pending: false } : m));
        }
        if (msg.seq > 0 && prev.some((m) => m.seq === msg.seq)) return prev;
        return [...prev, msg];
      });
      onIncomingRef.current?.(msg);
    };

    const onConnect = () => {
      const id = conversationIdRef.current;
      socket.emit("joinConversation", { conversationId: id });
      getMessages(id, lastSeqRef.current || undefined)
        .then((page) => {
          const missed = page.messages;
          if (!missed?.length) return;
          setMessages((prev) => {
            // A message sent just before a reconnect is saved server-side but its live
            // echo can be missed — settle those pending bubbles by clientMsgId.
            const byClient = new Map(missed.filter((m) => m.clientMsgId).map((m) => [m.clientMsgId, m]));
            const settled = prev.map((m) =>
              m.pending && m.clientMsgId && byClient.has(m.clientMsgId)
                ? { ...byClient.get(m.clientMsgId)!, pending: false }
                : m
            );
            const seqs = new Set(settled.map((m) => m.seq));
            const add = missed.filter((m) => !seqs.has(m.seq));
            missed.forEach((m) => {
              if (m.seq > lastSeqRef.current) lastSeqRef.current = m.seq;
            });
            return add.length ? [...settled, ...add] : settled;
          });
        })
        .catch(() => undefined);
    };

    socket.on("message", onMessage);
    socket.on("connect", onConnect);
    return () => {
      socket.off("message", onMessage);
      socket.off("connect", onConnect);
      // NB: do not disconnect — getSocket() returns a shared singleton.
    };
  }, [conversationId]);

  // auto-scroll to newest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    const socket = socketRef.current;
    if (!socket) {
      addToast(tr("dashboard.inbox.offline", "Chat is offline, please retry"), "error");
      return;
    }
    const clientMsgId = newClientId();
    const optimistic: ChatMsg = {
      seq: -Date.now(),
      clientMsgId,
      from: meId,
      ts: new Date().toISOString(),
      body,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    // The server acks every send ({ ok, message } or { ok:false, error }). Settle the
    // bubble from the ack so it never depends on the room echo, which a reconnect can miss.
    socket.emit(
      "sendMessage",
      { conversationId, body, clientMsgId },
      (res?: { ok?: boolean; message?: Record<string, unknown>; error?: string }) => {
        if (conversationIdRef.current !== conversationId) return;
        if (res && res.ok && res.message) {
          const { msg } = normalizeIncomingMessage(res.message);
          if (msg.seq > lastSeqRef.current) lastSeqRef.current = msg.seq;
          setMessages((prev) =>
            prev.some((m) => m.seq === msg.seq && !m.pending)
              ? prev
              : prev.map((m) => (m.clientMsgId === clientMsgId ? { ...msg, pending: false } : m))
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.clientMsgId !== clientMsgId));
          addToast((res && res.error) || tr("dashboard.inbox.offline", "Chat is offline, please retry"), "error");
        }
      }
    );
  }, [text, meId, conversationId, addToast, tr]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 320 }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "var(--bg-subtle)",
          maxHeight: maxHeight || "calc(100vh - 340px)",
        }}
      >
        {loadingThread ? (
          <Loading label={tr("dashboard.inbox.loadingThread", "Loading messages…")} />
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--faint)", fontSize: "var(--fs-xs)" }}>
            {tr("dashboard.inbox.sayHi", "No messages yet — say hello")}
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.from === meId;
            return (
              <div
                key={m.clientMsgId || m.seq || i}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "76%",
                  background: mine ? "var(--brand)" : "#fff",
                  color: mine ? "#fff" : "var(--ink)",
                  border: mine ? "none" : "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  padding: "8px 12px",
                  fontSize: "var(--fs-sm)",
                  lineHeight: 1.5,
                  opacity: m.pending ? 0.7 : 1,
                  wordBreak: "break-word",
                }}
              >
                {/* plain-text render — never dangerouslySetInnerHTML */}
                <div>{m.body}</div>
                <div
                  style={{
                    fontSize: "var(--fs-xs)",
                    marginTop: 3,
                    textAlign: "right",
                    color: mine ? "rgba(255,255,255,.75)" : "var(--faint)",
                  }}
                >
                  {m.pending ? tr("dashboard.inbox.sending", "sending…") : formatClock(m.ts)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={tr("dashboard.inbox.placeholder", "Type a message…")}
          aria-label="Message"
        />
        <Button
          variant="primary"
          onClick={send}
          disabled={!text.trim()}
          leftIcon={<Icon name="send" size={16} />}
          style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {tr("dashboard.inbox.send", "Send")}
        </Button>
      </div>
    </div>
  );
}
