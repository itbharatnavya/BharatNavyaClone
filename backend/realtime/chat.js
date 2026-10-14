/**
 * realtime/chat.js — secure buyer↔seller chat over Socket.IO (DESIGN.md §6).
 *
 * Security model (all four enforced here):
 *   1. JWT-verified handshake middleware — an unauthenticated socket is rejected
 *      before it ever connects (io.use -> next(new Error('unauthorized'))).
 *   2. Participant check BEFORE socket.join(convo:<id>) on joinConversation, and
 *      RE-checked on every sendMessage — only the two participants can read/write.
 *   3. Input sanitization — body trimmed, capped at 4000 chars, non-strings rejected.
 *   4. Durable JSONL is the source of truth; the live emit is an optimization.
 *
 * Delivery: per-conversation async mutex (store.withLock) serializes seq->append->
 * index-update so seq is monotonic and no update is lost. `clientMsgId` makes send
 * idempotent (a retried message is not duplicated).
 *
 * Wire contract (client -> server), each accepting an optional ack callback:
 *   joinConversation { conversationId }
 *   sendMessage      { conversationId, body, clientMsgId }
 *   typing           { conversationId, isTyping }
 * Server -> room:
 *   message { seq, clientMsgId, from, ts, body }
 *   typing  { conversationId, from, isTyping }   (ephemeral, to others only)
 */

const auth = require("../lib/auth");
const chat = require("../modules/chat");
const identity = require("../modules/identity");
const directory = require("../modules/directory");
const notify = require("../lib/notify");
const fcm = require("../lib/fcm");
const logger = require("../lib/logger");

const CONV_INDEX = "conversations/index.json";
const MAX_BODY = 4000;
const PREVIEW_LEN = 140;

function roomFor(conversationId) {
  return `convo:${conversationId}`;
}

// Every authenticated socket auto-joins its own user room — lets the server
// push a live "notification" event to a user's active tab(s) without them
// having joined the specific conversation the message belongs to.
function userRoomFor(userId) {
  return `user:${userId}`;
}

function msgFileFor(conversationId) {
  return `messages/${conversationId}.jsonl`;
}

async function loadConversation(conversationId) {
  return chat.conversationsRepo.findById(conversationId);
}

function isParticipant(convo, userId) {
  return !!(
    convo &&
    Array.isArray(convo.participants) &&
    convo.participants.includes(userId)
  );
}

// Best-effort "new_message" notification for the OTHER participant — never
// awaited by the send path, wrapped so a failure here can never delay or
// break message delivery (mirrors lib/leads.js's notifySellerOfLead).
async function notifyNewMessage(io, convo, fromUser, msg) {
  try {
    const recipientId = (convo.participants || []).find((p) => p !== fromUser.id);
    if (!recipientId || recipientId === fromUser.id) return; // no self-notify
    let listingTitle = null;
    if (convo.listingId) {
      const titles = await directory.listingTitlesByIds([convo.listingId]);
      listingTitle = titles.get(convo.listingId) || null;
    }
    const link = convo.listingId
      ? `/listing/${convo.listingId}?chat=${convo.id}`
      : `/dashboard?tab=inbox&c=${convo.id}`;
    // notifications.json's repo maps `data` onto a fixed set of typed columns
    // (see schema/tables.js) — no free-form jsonb fallback, so this reuses the
    // same columns notifySellerOfLead already writes (name/message/link/
    // productName) rather than inventing new ones that would need a migration.
    const notification = await notify.createNotification(recipientId, "new_message", {
      name: fromUser.name || "Someone",
      message: msg.body.slice(0, PREVIEW_LEN),
      productName: listingTitle,
      link,
    });
    // Live push to any of the recipient's connected tabs (NotificationBell
    // listens for this) — the DB row above is still the source of truth,
    // this is purely so an active session doesn't wait for the ~30s poll.
    io.to(userRoomFor(recipientId)).emit("notification", notification);

    // FCM push — reaches the recipient even with no tab open (Socket.IO above
    // only reaches an active connection). Never awaited by the caller's
    // critical path; fcm.sendPush is itself a no-op if push isn't configured.
    const tokens = await identity.getFcmTokensForUser(recipientId);
    if (tokens.length) {
      void fcm.sendPush(
        tokens,
        {
          title: listingTitle ? `${fromUser.name || "Someone"} — ${listingTitle}` : fromUser.name || "New message",
          body: msg.body.slice(0, PREVIEW_LEN),
          link,
        },
        (dead) => identity.pruneFcmTokens(dead)
      );
    }
  } catch (err) {
    logger.error({ err }, "notifyNewMessage failed");
  }
}

function reply(ack, socket, ok, payload) {
  if (typeof ack === "function") {
    ack(ok ? { ok: true, ...payload } : { ok: false, ...payload });
  } else if (!ok) {
    socket.emit("error", payload || {});
  }
}

function attachChat(io) {
  // --- 1. Handshake auth: reject unauthenticated sockets before connect. ------
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
      const payload = auth.verifyToken(token);
      if (!payload || !payload.sub) return next(new Error("unauthorized"));
      const user = await identity.getAuthUser(payload.sub);
      if (!user) return next(new Error("unauthorized"));
      // A suspended account cannot hold a socket (authGuard blocks its REST calls too).
      if (user.status === "suspended") return next(new Error("account_suspended"));
      socket.user = user;
      return next();
    } catch (_err) {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoomFor(socket.user.id));

    // --- joinConversation: participant check BEFORE join. --------------------
    socket.on("joinConversation", async (payload, ack) => {
      try {
        const conversationId = payload && payload.conversationId;
        if (!conversationId) {
          return reply(ack, socket, false, { error: "conversationId required" });
        }
        const convo = await loadConversation(conversationId);
        if (!isParticipant(convo, socket.user.id)) {
          return reply(ack, socket, false, { error: "forbidden" });
        }
        socket.join(roomFor(conversationId));
        return reply(ack, socket, true, { conversationId });
      } catch (_err) {
        return reply(ack, socket, false, { error: "join failed" });
      }
    });

    // --- sendMessage: re-verify, sanitize, seq+append+index atomically. ------
    socket.on("sendMessage", async (payload, ack) => {
      try {
        const conversationId = payload && payload.conversationId;
        const clientMsgId = payload && payload.clientMsgId;
        let body = payload && payload.body;

        if (!conversationId) {
          return reply(ack, socket, false, { error: "conversationId required" });
        }
        if (typeof body !== "string") {
          return reply(ack, socket, false, { error: "body must be a string" });
        }
        body = body.trim().slice(0, MAX_BODY);
        if (!body) {
          return reply(ack, socket, false, { error: "body is empty" });
        }

        // RE-verify participant on every send.
        const convo = await loadConversation(conversationId);
        if (!isParticipant(convo, socket.user.id)) {
          return reply(ack, socket, false, { error: "forbidden" });
        }

        // Per-conversation mutex: seq -> append -> index update, atomically.
        const outcome = await chat.withLock(conversationId, async () => {
          const existing = await chat.chatSupport.readMessages(msgFileFor(conversationId));

          if (clientMsgId) {
            const dup = existing.find(
              (m) => m && m.clientMsgId && m.clientMsgId === clientMsgId
            );
            if (dup) return { msg: dup, duplicate: true };
          }

          const seq = existing.length + 1; // monotonic within the conversation
          const msg = {
            seq,
            clientMsgId: clientMsgId || null,
            from: socket.user.id,
            ts: Date.now(),
            body,
          };
          await chat.chatSupport.appendMessage(msgFileFor(conversationId), msg);
          await chat.conversationsRepo.updateById(conversationId, {
            lastMsgSeq: seq,
            lastMsgAt: msg.ts,
            preview: body.slice(0, PREVIEW_LEN),
          });
          return { msg, duplicate: false };
        });

        // Participant is verified above: make sure this socket is in the room so it
        // receives its own echo even if it reconnected since joinConversation.
        socket.join(roomFor(conversationId));

        // Live push (optimization) only for a newly-created message.
        if (!outcome.duplicate) {
          io.to(roomFor(conversationId)).emit("message", outcome.msg);
          void notifyNewMessage(io, convo, socket.user, outcome.msg);
        }
        return reply(ack, socket, true, { message: outcome.msg });
      } catch (_err) {
        return reply(ack, socket, false, { error: "send failed" });
      }
    });

    // --- typing: ephemeral, broadcast to the OTHER participant only. ---------
    socket.on("typing", async (payload) => {
      try {
        const conversationId = payload && payload.conversationId;
        if (!conversationId) return;
        const convo = await loadConversation(conversationId);
        if (!isParticipant(convo, socket.user.id)) return;
        socket.to(roomFor(conversationId)).emit("typing", {
          conversationId,
          from: socket.user.id,
          isTyping: payload.isTyping !== false,
        });
      } catch (_err) {
        /* ephemeral — never surfaced */
      }
    });
  });

  return io;
}

module.exports = { attachChat };
