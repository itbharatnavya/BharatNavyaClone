"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { User, Conversation } from "@/lib/types";
import { getConversations } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { normalizeIncomingMessage } from "@/lib/chatSocket";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import ChatThread from "@/components/chat/ChatThread";
import {
  PanelHeader,
  EmptyState,
  Loading,
  Icon,
  timeAgo,
  useTr,
} from "./shared";

interface Props {
  user: User;
  initialConversationId?: string | null;
}

function otherName(c: Conversation): string {
  return c.otherUserName || c.listingTitle || "Conversation";
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

  const activeIdRef = useRef<string | null>(activeId);
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

  // ---- list-level socket listener: update preview/unread for ANY conversation,
  // whether or not its thread is currently open (ChatThread owns the open
  // thread's own message state separately). ----
  useEffect(() => {
    let socket: Socket;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onMessage = (payload: unknown) => {
      const { conversationId, msg } = normalizeIncomingMessage(payload);
      const active = activeIdRef.current;
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
      // bump the just-updated conversation to the top, most-recent-first
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx <= 0) return prev;
        const next = [...prev];
        const [row] = next.splice(idx, 1);
        next.unshift(row);
        return next;
      });
    };

    socket.on("message", onMessage);
    return () => {
      socket.off("message", onMessage);
      // NB: do not disconnect — getSocket() returns a shared singleton.
    };
  }, [user.id]);

  function openConversation(id: string) {
    setActiveId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
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
              onClick={() => openConversation(c.id)}
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
              <Avatar name={otherName(c)} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "var(--fs-sm)",
                      fontWeight: 600,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {otherName(c)}
                  </span>
                  {c.lastMsgAt && (
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", whiteSpace: "nowrap" }}>
                      {timeAgo(c.lastMsgAt)}
                    </span>
                  )}
                </div>
                {c.listingTitle && (
                  <span
                    className="line-clamp-1"
                    style={{ fontSize: "var(--fs-xs)", color: "var(--brand)", display: "block", marginTop: 1 }}
                  >
                    {c.listingTitle}
                  </span>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                  <span
                    className="line-clamp-1"
                    style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", flex: 1 }}
                  >
                    {c.preview || "…"}
                  </span>
                  {!!c.unread && (
                    <span
                      style={{
                        background: "var(--action)",
                        color: "#fff",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 700,
                        minWidth: 18,
                        height: 18,
                        borderRadius: "var(--r-pill)",
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
            <div style={{ marginTop: 8, fontSize: "var(--fs-sm)" }}>
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
            <Avatar name={otherName(activeConv)} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>
                {otherName(activeConv)}
              </div>
              {activeConv.listingTitle && (
                <div className="line-clamp-1" style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>
                  {activeConv.listingTitle}
                </div>
              )}
            </div>
          </div>

          <ChatThread
            key={activeConv.id}
            conversationId={activeConv.id}
            meId={user.id}
            maxHeight={narrow ? "56vh" : "calc(100vh - 340px)"}
            onIncomingMessage={(msg) => {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeConv.id
                    ? { ...c, preview: msg.body || c.preview, lastMsgAt: msg.ts, unread: 0 }
                    : c
                )
              );
            }}
          />
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
