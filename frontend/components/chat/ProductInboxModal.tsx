"use client";

// ProductInboxModal — a seller viewing their OWN listing sees every buyer
// thread about that one product here (list + thread, like the dashboard
// Inbox tab but scoped to a single listingId) instead of a single-thread
// ChatModal, since "message the seller" makes no sense on your own listing
// but "see who messaged me about this" very much does.

import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Conversation } from "@/lib/types";
import { getConversations } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { normalizeIncomingMessage } from "@/lib/chatSocket";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import ChatThread from "@/components/chat/ChatThread";
import { EmptyState, Loading, Icon, timeAgo } from "@/components/dashboard/shared";

interface Props {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle?: string | null;
  meId: string;
}

export default function ProductInboxModal({ open, onClose, listingId, listingTitle, meId }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  // Load every buyer thread for this listing whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const list = await getConversations(listingId);
        if (!alive) return;
        setConversations(list);
        setActiveId((cur) => cur || (list.length ? list[0].id : null));
      } catch (e) {
        addToast((e as Error).message || "Failed to load messages", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listingId]);

  // Live update: a new message from ANY buyer on this product bumps that
  // row's preview/unread, even for a thread that isn't currently open.
  useEffect(() => {
    if (!open) return;
    let socket: Socket;
    try {
      socket = getSocket();
    } catch {
      return;
    }
    const onMessage = (payload: unknown) => {
      const { conversationId, msg } = normalizeIncomingMessage(payload);
      if (!conversationId) return;
      setConversations((prev) => {
        if (!prev.some((c) => c.id === conversationId)) return prev; // not one of this product's threads
        const active = activeIdRef.current;
        const mine = msg.from === meId;
        const next = prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                preview: msg.body || c.preview,
                lastMsgAt: msg.ts,
                lastMsgSeq: msg.seq || c.lastMsgSeq,
                unread: c.id === active || mine ? 0 : (c.unread || 0) + 1,
              }
            : c
        );
        // most recently active first
        return [...next].sort((a, b) => {
          const at = a.lastMsgAt ? new Date(a.lastMsgAt).getTime() : 0;
          const bt = b.lastMsgAt ? new Date(b.lastMsgAt).getTime() : 0;
          return bt - at;
        });
      });
    };
    socket.on("message", onMessage);
    return () => {
      socket.off("message", onMessage);
    };
  }, [open, meId]);

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={listingTitle ? `Messages — ${listingTitle}` : "Messages"}>
      <div style={{ margin: -22, display: "flex", minHeight: 480, maxHeight: "70vh" }}>
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div style={{ padding: 20 }}>
              <Loading />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState
                icon={<Icon name="inbox" size={22} />}
                title="No messages yet"
                subtitle="Buyer chats about this product will appear here."
              />
            </div>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setConversations((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x))
                    );
                  }}
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
                  <Avatar name={c.otherUserName || "Buyer"} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span
                        className="line-clamp-1"
                        style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}
                      >
                        {c.otherUserName || "Buyer"}
                      </span>
                      {c.lastMsgAt && (
                        <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>
                          {timeAgo(c.lastMsgAt)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                      <span className="line-clamp-1" style={{ fontSize: 12.5, color: "var(--muted)", flex: 1 }}>
                        {c.preview || "…"}
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

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!activeConv ? (
            <div style={{ display: "grid", placeItems: "center", flex: 1, color: "var(--faint)", padding: 40 }}>
              <div style={{ textAlign: "center" }}>
                <Icon name="inbox" size={30} />
                <div style={{ marginTop: 8, fontSize: 14 }}>Select a buyer to view the conversation</div>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Avatar name={activeConv.otherUserName || "Buyer"} size={32} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                  {activeConv.otherUserName || "Buyer"}
                </div>
              </div>
              <ChatThread key={activeConv.id} conversationId={activeConv.id} meId={meId} maxHeight="calc(70vh - 180px)" />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
