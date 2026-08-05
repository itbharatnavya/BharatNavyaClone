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
const store = require("../lib/store");

const CONV_INDEX = "conversations/index.json";
const MAX_BODY = 4000;
const PREVIEW_LEN = 140;

function roomFor(conversationId) {
  return `convo:${conversationId}`;
}

function msgFileFor(conversationId) {
  return `messages/${conversationId}.jsonl`;
}

async function loadConversation(conversationId) {
  const convos = await store.readJson(CONV_INDEX, []);
  return convos.find((c) => c && c.id === conversationId) || null;
}

function isParticipant(convo, userId) {
  return !!(
    convo &&
    Array.isArray(convo.participants) &&
    convo.participants.includes(userId)
  );
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
      const user = await store.getById("users.json", payload.sub);
      if (!user) return next(new Error("unauthorized"));
      socket.user = user;
      return next();
    } catch (_err) {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
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
        const outcome = await store.withLock(conversationId, async () => {
          const existing = await store.readJsonl(msgFileFor(conversationId));

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
          await store.appendJsonl(msgFileFor(conversationId), msg);
          await store.update(CONV_INDEX, conversationId, {
            lastMsgSeq: seq,
            lastMsgAt: msg.ts,
            preview: body.slice(0, PREVIEW_LEN),
          });
          return { msg, duplicate: false };
        });

        // Live push (optimization) only for a newly-created message.
        if (!outcome.duplicate) {
          io.to(roomFor(conversationId)).emit("message", outcome.msg);
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
