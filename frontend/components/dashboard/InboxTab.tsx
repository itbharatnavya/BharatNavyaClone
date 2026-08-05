"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { User, Conversation, Message } from "@/lib/types";
import { getConversations, getMessages } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import {
  PanelHeader,
  EmptyState,
  Loading,
  Icon,
  formatClock,
  timeAgo,
  newClientId,
  useTr,
} from "./shared";

type ChatMsg = Message & { pending?: boolean };

interface Props {
  user: User;
  initialConversationId?: string | null;
}

function otherName(c: Conversation, meId: string): string {
  const other = c.participantsInfo?.find((p) => p.id !== meId);
  return other?.name || c.listingTitle || "Conversation";
}
function otherAvatar(c: Conversation, meId: string): string | null | undefined {
  return c.participantsInfo?.find((p) => p.id !== meId)?.avatarUrl;
}

// Normalise whatever the server emits on the "message" channel.
function normalizeIncoming(payload: unknown): { conversationId?: string; msg: ChatMsg } {
  const p = (payload || {}) as Record<string, unknown>;
  const inner = (p.message as Record<string, unknown>) || p;
  const conversationId =
    (p.conversationId as string) ||
    (p.convId as string) ||
    (inner.conversationId as string) ||
    undefined;
  return {
    conversationId,
    msg: {
      seq: Number(inner.seq ?? 0),
      clientMsgId: inner.clientMsgId as string | undefined,
      from: String(inner.from ?? inner.senderId ?? ""),
      ts: (inner.ts as string) || (inner.createdAt as string) || new Date().toISOString(),
      body: String(inner.body ?? inner.text ?? ""),
    },
  };
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function InboxTab({ user, initialConversationId }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const narrow = useIsNarrow();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(activeId);
  const lastSeqRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  activeIdRef.current = activeId;

  // ---- load conversation list ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getConversations();
        if (!alive) return;
        setConversations(list);
        // if ?c= was not supplied, auto-open the most recent on wide screens
        if (!initialConversationId && list.length && !narrow) {
          setActiveId((cur) => cur || list[0].id);
        }
      } catch (e) {
        addToast((e as Error).message || "Failed to load conversations", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- shared socket: attach listeners once ----
  useEffect(() => {
    let socket: Socket;
    try {
      socket = getSocket();
    } catch {
      return;
    }
    socketRef.current = socket;

    const onMessage = (payload: unknown) => {
      const { conversationId, msg } = normalizeIncoming(payload);
      const active = activeIdRef.current;

      if (conversationId && conversationId === active) {
        if (msg.seq > lastSeqRef.current) lastSeqRef.current = msg.seq;
        setMessages((prev) => {
          if (msg.clientMsgId && prev.some((m) => m.clientMsgId === msg.clientMsgId)) {
            return prev.map((m) =>
              m.clientMsgId === msg.clientMsgId ? { ...msg, pending: false } : m
            );
          }
          if (msg.seq > 0 && prev.some((m) => m.seq === msg.seq)) return prev;
          return [...prev, msg];
        });
      }

      // update the list preview / unread badge for whichever conversation it belongs to
      setConversations((prev) =>
        prev.map((c) => {
          if (conversationId && c.id !== conversationId) return c;
          if (!conversationId && c.id !== active) return c;
          const isActive = c.id === active;
          const mine = msg.from === user.id;
          return {
            ...c,
            preview: msg.body || c.preview,
            lastMsgAt: msg.ts,
            lastMsgSeq: msg.seq || c.lastMsgSeq,
            unread: isActive || mine ? 0 : (c.unread || 0) + 1,
          };
        })
      );
    };

    // on reconnect: re-join the open conversation and pull anything missed via afterSeq
    const onConnect = () => {
      const active = activeIdRef.current;
      if (!active) return;
      socket.emit("joinConversation", { conversationId: active });
      getMessages(active, lastSeqRef.current || undefined)
        .then((missed) => {
          if (!missed?.length) return;
          setMessages((prev) => {
            const seqs = new Set(prev.map((m) => m.seq));
            const add = missed.filter((m) => !seqs.has(m.seq));
            add.forEach((m) => {
              if (m.seq > lastSeqRef.current) lastSeqRef.current = m.seq;
            });
            return add.length ? [...prev, ...add] : prev;
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
  }, [user.id]);

  // ---- open a conversation: join + load history ----
  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      activeIdRef.current = id;
      setMessages([]);
      lastSeqRef.current = 0;
      setLoadingThread(true);
      // clear unread locally
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));

      const socket = socketRef.current;
      if (socket) socket.emit("joinConversation", { conversationId: id });

      try {
        const history = await getMessages(id);
        setMessages(history);
        lastSeqRef.current = history.reduce((mx, m) => Math.max(mx, m.seq || 0), 0);
      } catch (e) {
        addToast((e as Error).message || "Failed to load messages", "error");
      } finally {
        setLoadingThread(false);
      }
    },
    [addToast]
  );

  // join/load whenever activeId is set (covers ?c= deep-link + list clicks)
  useEffect(() => {
    if (activeId) void openConversation(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // auto-scroll to newest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    const body = text.trim();
    if (!body || !activeId) return;
    const socket = socketRef.current;
    if (!socket) {
      addToast(tr("dashboard.inbox.offline", "Chat is offline, please retry"), "error");
      return;
    }
    const clientMsgId = newClientId();
    const optimistic: ChatMsg = {
      seq: -Date.now(),
      clientMsgId,
      from: user.id,
      ts: new Date().toISOString(),
      body,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, preview: body, lastMsgAt: optimistic.ts } : c))
    );
    socket.emit("sendMessage", { conversationId: activeId, body, clientMsgId });
  }

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  // ------- render pieces -------
  const listPane = (
    <div
      style={{
        width: narrow ? "100%" : 300,
        flexShrink: 0,
        borderRight: narrow ? "none" : "1px solid var(--border)",
        overflowY: "auto",
        maxHeight: narrow ? "none" : "calc(100vh - 220px)",
      }}
    >
      {conversations.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            icon={<Icon name="inbox" size={22} />}
            title={tr("dashboard.inbox.empty", "No conversations yet")}
            subtitle={tr("dashboard.inbox.emptyHint", "Buyer chats from your listings will appear here.")}
          />
        </div>
      ) : (
        conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: active ? "var(--brand-tint)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Avatar name={otherName(c, user.id)} src={otherAvatar(c, user.id)} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {otherName(c, user.id)}
                  </span>
                  {c.lastMsgAt && (
                    <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>
                      {timeAgo(c.lastMsgAt)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                  <span
                    className="line-clamp-1"
                    style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}
                  >
                    {c.preview || c.listingTitle || "…"}
                  </span>
                  {!!c.unread && (
                    <span
                      style={{
                        background: "var(--action)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 5px",
                      }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const threadPane = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 420 }}>
      {!activeConv ? (
        <div style={{ display: "grid", placeItems: "center", flex: 1, color: "var(--faint)", padding: 40 }}>
          <div style={{ textAlign: "center" }}>
            <Icon name="inbox" size={30} />
            <div style={{ marginTop: 8, fontSize: 14 }}>
              {tr("dashboard.inbox.pick", "Select a conversation to start chatting")}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* thread header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {narrow && (
              <button
                onClick={() => setActiveId(null)}
                aria-label="Back"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <Icon name="chevron" size={20} style={{ transform: "rotate(180deg)" }} />
              </button>
            )}
            <Avatar name={otherName(activeConv, user.id)} src={otherAvatar(activeConv, user.id)} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                {otherName(activeConv, user.id)}
              </div>
              {activeConv.listingTitle && (
                <div className="line-clamp-1" style={{ fontSize: 12, color: "var(--faint)" }}>
                  {activeConv.listingTitle}
                </div>
              )}
            </div>
          </div>

          {/* messages */}
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
              maxHeight: narrow ? "56vh" : "calc(100vh - 340px)",
            }}
          >
            {loadingThread ? (
              <Loading label={tr("dashboard.inbox.loadingThread", "Loading messages…")} />
            ) : messages.length === 0 ? (
              <div style={{ margin: "auto", color: "var(--faint)", fontSize: 13 }}>
                {tr("dashboard.inbox.sayHi", "No messages yet — say hello 👋")}
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = m.from === user.id;
                return (
                  <div
                    key={m.clientMsgId || m.seq || i}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "76%",
                      background: mine ? "var(--brand)" : "#fff",
                      color: mine ? "#fff" : "var(--ink)",
                      border: mine ? "none" : "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "8px 12px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      opacity: m.pending ? 0.7 : 1,
                      wordBreak: "break-word",
                    }}
                  >
                    {/* plain-text render — never dangerouslySetInnerHTML (DESIGN §6) */}
                    <div>{m.body}</div>
                    <div
                      style={{
                        fontSize: 10,
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

          {/* composer */}
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
            <input
              className="input"
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
            >
              {tr("dashboard.inbox.send", "Send")}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.inbox.title", "Inbox")}
        subtitle={tr("dashboard.inbox.subtitle", "Chat securely with buyers and sellers.")}
      />
      {loading ? (
        <Loading />
      ) : (
        <div
          className="card card-flat"
          style={{
            display: "flex",
            overflow: "hidden",
            padding: 0,
            minHeight: 480,
          }}
        >
          {narrow ? (activeId ? threadPane : listPane) : (
            <>
              {listPane}
              {threadPane}
            </>
          )}
        </div>
      )}
    </div>
  );
}
