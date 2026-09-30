/**
 * fcm.js — Firebase Cloud Messaging (web push) adapter.
 *
 * Delivers a notification even when the tab/browser is closed — Socket.IO
 * (realtime/chat.js's userRoomFor push) only reaches an open, connected tab.
 * NEVER throws to the caller and NEVER logs/returns the service account
 * credential itself — a push failure must not break message delivery, and a
 * device token (bearer-credential-adjacent) is never echoed back either.
 *
 * Disabled (safe no-op) whenever FCM_SERVICE_ACCOUNT_PATH is unset or the
 * file can't be loaded — same "absent config = feature off" contract as
 * lib/claudeCli.js / GOOGLE_CLIENT_ID.
 */

const path = require("path");
const fs = require("fs");
const logger = require("./logger");
const config = require("./config");

let _initialized = false;
let _messaging = null; // firebase-admin/messaging's Messaging instance, once initialized

function init() {
  if (_initialized) return _messaging;
  _initialized = true;

  if (!config.FCM_SERVICE_ACCOUNT_PATH) return null;

  try {
    const credPath = path.isAbsolute(config.FCM_SERVICE_ACCOUNT_PATH)
      ? config.FCM_SERVICE_ACCOUNT_PATH
      : path.join(__dirname, "..", config.FCM_SERVICE_ACCOUNT_PATH);

    if (!fs.existsSync(credPath)) {
      logger.warn(
        { credPath },
        "FCM_SERVICE_ACCOUNT_PATH is set but the file doesn't exist — push disabled"
      );
      return null;
    }

    // firebase-admin v11+ is modular (no admin.credential/admin.messaging()
    // namespace) — same shape as the modular client SDK.
    // eslint-disable-next-line global-require
    const { initializeApp, cert } = require("firebase-admin/app");
    // eslint-disable-next-line global-require
    const { getMessaging } = require("firebase-admin/messaging");
    const app = initializeApp({ credential: cert(require(credPath)) });
    _messaging = getMessaging(app);
    logger.info("FCM push enabled");
    return _messaging;
  } catch (err) {
    logger.error({ err: err.message }, "FCM init failed — push disabled");
    return null;
  }
}

function isFcmAvailable() {
  return !!init();
}

/**
 * Best-effort push to every token given (a user may have more than one
 * device/browser registered). `onInvalidTokens(deadTokens)` is called for
 * any token Firebase reports as unregistered/invalid, so the caller can
 * prune its own store — sending never throws, so callers should never
 * `await` this for correctness, only for the prune callback if they need it.
 */
async function sendPush(tokens, { title, body, link } = {}, onInvalidTokens) {
  if (!tokens || !tokens.length) return;
  const messaging = init();
  if (!messaging) return;

  try {
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: link ? { link } : {},
      webpush: link ? { fcmOptions: { link } } : undefined,
    });

    if (res.failureCount > 0 && typeof onInvalidTokens === "function") {
      const dead = [];
      res.responses.forEach((r, i) => {
        const code = !r.success && r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          dead.push(tokens[i]);
        }
      });
      if (dead.length) await onInvalidTokens(dead);
    }
  } catch (err) {
    logger.error({ err: err.message }, "sendPush failed");
  }
}

module.exports = { isFcmAvailable, sendPush };
