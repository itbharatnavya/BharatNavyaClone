// lib/chatSocket.ts — shared Socket.IO "message" payload parsing for every
// chat list surface (InboxTab, ProductInboxModal, …) so they normalize the
// server's payload shape identically instead of drifting.

import type { Message } from "./types";

export type ChatMsg = Message & { pending?: boolean };

export function normalizeIncomingMessage(
  payload: unknown
): { conversationId?: string; msg: ChatMsg } {
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
