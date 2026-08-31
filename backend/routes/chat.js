/**
 * routes/chat.js — REST surface for chat (DESIGN.md §6, BUILD-SPEC "chat").
 * Socket.IO handles live delivery (realtime/chat.js); these endpoints back the
 * unified inbox, thread creation, and reconnect/history sync. All require auth.
 *
 *   GET  /chat/conversations
 *        -> my conversations, enriched with the other participant's name + unread
 *   POST /chat/conversations { listingId, toUserId }
 *        -> get-or-create the conversation for (this pair + listing)
 *   GET  /chat/conversations/:id/messages?afterSeq=
 *        -> messages with seq > afterSeq; advances my read-state
 *
 * Storage shapes:
 *   conversations/index.json : array of { id, participants[2], listingId,
 *                                          lastMsgSeq, lastMsgAt, preview, createdAt }
 *   messages/<id>.jsonl      : append-only { seq, clientMsgId, from, ts, body }
 *   read-state/<id>.json     : { <userId>: lastReadSeq }
 */

const express = require("express");
const { authGuard } = require("../middleware/authGuard");
const store = require("../lib/store");

const router = express.Router();

const CONV_INDEX = "conversations/index.json";
const msgFileFor = (id) => `messages/${id}.jsonl`;
const readStateFor = (id) => `read-state/${id}.json`;

function isParticipant(convo, userId) {
  return !!(
    convo &&
    Array.isArray(convo.participants) &&
    convo.participants.includes(userId)
  );
}

function samePair(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/* ------------------------------------------------ GET /conversations ------- */

router.get("/conversations", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const convos = await store.readJson(CONV_INDEX, []);
    const mine = convos.filter((c) => isParticipant(c, me));

    const enriched = await Promise.all(
      mine.map(async (c) => {
        const otherId = (c.participants || []).find((p) => p !== me) || null;
        const other = otherId ? await store.getById("users.json", otherId) : null;
        const rs = await store.readJson(readStateFor(c.id), {});
        const lastRead = rs[me] || 0;
        const unread = Math.max(0, (c.lastMsgSeq || 0) - lastRead);
        return {
          id: c.id,
          listingId: c.listingId || null,
          participants: c.participants || [],
          otherUserId: otherId,
          otherUserName: other ? other.name : null,
          lastMsgSeq: c.lastMsgSeq || 0,
          lastMsgAt: c.lastMsgAt || null,
          preview: c.preview || "",
          unread,
        };
      })
    );

    // Most recently active first.
    enriched.sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0));
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- POST /conversations ------- */

router.post("/conversations", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const { listingId = null, toUserId } = req.body || {};
    if (!toUserId || typeof toUserId !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "toUserId is required" });
    }
    if (toUserId === me) {
      return res
        .status(400)
        .json({ success: false, error: "cannot start a conversation with yourself" });
    }

    const pair = [me, toUserId];

    // Get-or-create atomically under the index-file lock. Use readJson/writeJson
    // (NOT store.insert) so we don't re-enter the same lock key and deadlock.
    const convo = await store.withLock(CONV_INDEX, async () => {
      const convos = await store.readJson(CONV_INDEX, []);
      const existing = convos.find(
        (c) => (c.listingId || null) === (listingId || null) && samePair(c.participants, pair)
      );
      if (existing) return existing;

      const id = await store.nextId("cnv");
      const doc = {
        id,
        participants: pair,
        listingId: listingId || null,
        lastMsgSeq: 0,
        lastMsgAt: null,
        preview: "",
        createdAt: new Date().toISOString(),
      };
      convos.push(doc);
      await store.writeJson(CONV_INDEX, convos);
      return doc;
    });

    res.json({ success: true, data: convo });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- GET /conversations/:id/messages ---------- */

router.get("/conversations/:id/messages", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const id = req.params.id;

    const convo = await store.getById(CONV_INDEX, id);
    if (!convo) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }
    if (!isParticipant(convo, me)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const afterSeq = parseInt(req.query.afterSeq, 10) || 0;
    const all = await store.readJsonl(msgFileFor(id));
    const messages = all.filter((m) => (m.seq || 0) > afterSeq);

    // Advance my read-state to the latest seq I have now seen.
    const latestSeq = all.length ? all[all.length - 1].seq || 0 : 0;
    if (latestSeq > 0) {
      await store.withLock(readStateFor(id), async () => {
        const rs = await store.readJson(readStateFor(id), {});
        if ((rs[me] || 0) < latestSeq) {
          rs[me] = latestSeq;
          await store.writeJson(readStateFor(id), rs);
        }
      });
    }

    res.json({
      success: true,
      data: { conversationId: id, messages, lastMsgSeq: convo.lastMsgSeq || latestSeq },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
