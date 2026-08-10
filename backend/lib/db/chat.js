/**
 * chat.js — relational mapping for the two per-conversation dynamic-path stores.
 * (conversations/index.json itself is a plain array collection — see the
 * "conversations/index.json" entry in flat.js.)
 *
 *   messages/<id>.jsonl   -> messages table            (fixed shape, appended to)
 *   read-state/<id>.json  -> conversation_read_state    ({ userId: lastReadSeq } map)
 */

const MSG_PATH = /^messages\/(.+)\.jsonl$/;
const READ_STATE_PATH = /^read-state\/(.+)\.json$/;

function conversationIdFromMsgPath(name) {
  const m = MSG_PATH.exec(name);
  if (!m) throw new Error(`Not a messages path: ${name}`);
  return m[1];
}

function conversationIdFromReadStatePath(name) {
  const m = READ_STATE_PATH.exec(name);
  if (!m) throw new Error(`Not a read-state path: ${name}`);
  return m[1];
}

function isMessagesPath(name) {
  return MSG_PATH.test(name);
}

function isReadStatePath(name) {
  return READ_STATE_PATH.test(name);
}

function createChatSupport(pool) {
  return {
    isMessagesPath,
    isReadStatePath,

    async readMessages(name) {
      const conversationId = conversationIdFromMsgPath(name);
      const res = await pool.query(
        `SELECT seq, client_msg_id, from_user_id, ts, body FROM messages
         WHERE conversation_id = $1 ORDER BY seq ASC`,
        [conversationId]
      );
      return res.rows.map((r) => ({
        seq: r.seq, clientMsgId: r.client_msg_id, from: r.from_user_id,
        ts: typeof r.ts === "string" ? Number(r.ts) : r.ts, body: r.body,
      }));
    },

    async appendMessage(name, msg) {
      const conversationId = conversationIdFromMsgPath(name);
      await pool.query(
        `INSERT INTO messages (conversation_id, seq, client_msg_id, from_user_id, ts, body)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conversationId, msg.seq, msg.clientMsgId ?? null, msg.from, msg.ts, msg.body ?? null]
      );
    },

    // Bulk-replace (migration use): delete then re-insert every message for this conversation.
    async writeMessages(name, items) {
      const conversationId = conversationIdFromMsgPath(name);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM messages WHERE conversation_id = $1`, [conversationId]);
        for (const msg of items) {
          await client.query(
            `INSERT INTO messages (conversation_id, seq, client_msg_id, from_user_id, ts, body)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [conversationId, msg.seq, msg.clientMsgId ?? null, msg.from, msg.ts, msg.body ?? null]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async readReadState(name, fallback = {}) {
      const conversationId = conversationIdFromReadStatePath(name);
      const res = await pool.query(
        `SELECT user_id, last_read_seq FROM conversation_read_state WHERE conversation_id = $1`,
        [conversationId]
      );
      if (!res.rowCount) return fallback;
      const out = {};
      for (const r of res.rows) out[r.user_id] = r.last_read_seq;
      return out;
    },

    // Upsert every {userId: seq} entry, then delete any not present in the new map.
    async writeReadState(name, data) {
      const conversationId = conversationIdFromReadStatePath(name);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const userIds = Object.keys(data || {});
        for (const userId of userIds) {
          await client.query(
            `INSERT INTO conversation_read_state (conversation_id, user_id, last_read_seq)
             VALUES ($1, $2, $3)
             ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_seq = EXCLUDED.last_read_seq`,
            [conversationId, userId, data[userId]]
          );
        }
        if (userIds.length) {
          await client.query(
            `DELETE FROM conversation_read_state WHERE conversation_id = $1 AND user_id != ALL($2)`,
            [conversationId, userIds]
          );
        } else {
          await client.query(`DELETE FROM conversation_read_state WHERE conversation_id = $1`, [conversationId]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createChatSupport, isMessagesPath, isReadStatePath };
