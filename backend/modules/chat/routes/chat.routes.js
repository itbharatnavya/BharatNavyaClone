/**
 * routes/chat.js — REST surface for chat (DESIGN.md §6, BUILD-SPEC "chat").
 * Socket.IO handles live delivery (realtime/chat.js); these endpoints back the
 * unified inbox, thread creation, and reconnect/history sync. All require auth.
 *
 *   GET  /chat/conversations
 *        -> my conversations, enriched with the other participant's name + unread
 *   GET  /chat/conversations/:id
 *        -> one conversation (participant-checked), same shape as the list rows
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
const { authGuard } = require("../../../middleware/authGuard");
const chat = require("../index");
const identity = require("../../identity");
const directory = require("../../directory");

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

// Batch-hydrate `listingTitle` for a set of conversations — one query for the
// whole page, never a per-row lookup (CLAUDE.md N+1 rule).
async function hydrateListingTitles(convos) {
  const ids = convos.map((c) => c.listingId).filter(Boolean);
  const titles = await directory.listingTitlesByIds(ids);
  return titles;
}

async function enrichConversation(c, me, titles) {
  const otherId = (c.participants || []).find((p) => p !== me) || null;
  const other = otherId ? await identity.getAuthUser(otherId) : null;
  const rs = await chat.chatSupport.readReadState(readStateFor(c.id), {});
  const lastRead = rs[me] || 0;
  const unread = Math.max(0, (c.lastMsgSeq || 0) - lastRead);
  return {
    id: c.id,
    listingId: c.listingId || null,
    listingTitle: c.listingId ? titles.get(c.listingId) || null : null,
    participants: c.participants || [],
    otherUserId: otherId,
    otherUserName: other ? other.name : null,
    lastMsgSeq: c.lastMsgSeq || 0,
    lastMsgAt: c.lastMsgAt || null,
    preview: c.preview || "",
    unread,
  };
}

router.get("/conversations", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const listingId = typeof req.query.listingId === "string" ? req.query.listingId : null;
    const convos = await chat.conversationsRepo.findMany({});
    let mine = convos.filter((c) => isParticipant(c, me));
    // Optional filter: every conversation on one product — e.g. a seller
    // viewing all buyer threads about a listing they own (ProductInboxModal).
    if (listingId) mine = mine.filter((c) => c.listingId === listingId);
    const titles = await hydrateListingTitles(mine);

    const enriched = await Promise.all(mine.map((c) => enrichConversation(c, me, titles)));

    // Most recently active first.
    enriched.sort((a, b) => (b.lastMsgAt || 0) - (a.lastMsgAt || 0));
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------ GET /conversations/:id --- */

router.get("/conversations/:id", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const convo = await chat.conversationsRepo.findById(req.params.id);
    if (!convo) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }
    if (!isParticipant(convo, me)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const titles = await hydrateListingTitles([convo]);
    const enriched = await enrichConversation(convo, me, titles);
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

    // Get-or-create atomically under an in-process lock — the (pair + listing)
    // match is order-independent (`samePair`), not a clean SQL where, so scan the
    // small index then insert the one new row.
    const convo = await chat.withLock(CONV_INDEX, async () => {
      const convos = await chat.conversationsRepo.findMany({});
      const existing = convos.find(
        (c) => (c.listingId || null) === (listingId || null) && samePair(c.participants, pair)
      );
      if (existing) return existing;

      const id = await chat.nextId("cnv");
      return chat.conversationsRepo.insert({
        id,
        participants: pair,
        listingId: listingId || null,
        lastMsgSeq: 0,
        lastMsgAt: null,
        preview: "",
        createdAt: new Date().toISOString(),
      });
    });

    const titles = await hydrateListingTitles([convo]);
    const enriched = await enrichConversation(convo, me, titles);
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------- GET /conversations/:id/messages ---------- */

router.get("/conversations/:id/messages", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const id = req.params.id;

    const convo = await chat.conversationsRepo.findById(id);
    if (!convo) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }
    if (!isParticipant(convo, me)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const afterSeq = parseInt(req.query.afterSeq, 10) || 0;
    const all = await chat.chatSupport.readMessages(msgFileFor(id));
    const messages = all.filter((m) => (m.seq || 0) > afterSeq);

    // Advance my read-state to the latest seq I have now seen.
    const latestSeq = all.length ? all[all.length - 1].seq || 0 : 0;
    if (latestSeq > 0) {
      await chat.withLock(readStateFor(id), async () => {
        const rs = await chat.chatSupport.readReadState(readStateFor(id), {});
        if ((rs[me] || 0) < latestSeq) {
          rs[me] = latestSeq;
          await chat.chatSupport.writeReadState(readStateFor(id), rs);
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
