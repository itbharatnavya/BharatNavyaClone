/**
 * BharatSource API v2 — server entrypoint.
 *
 * The Express app lives in app.js (mountable by supertest without a port). This file
 * wraps it in an HTTP server, attaches Socket.IO chat on the same port, and installs
 * a graceful-shutdown handler (BACKEND-AUDIT.md Phase 1 §1e).
 */

const http = require("http");
const { Server } = require("socket.io");
const config = require("./lib/config");
const store = require("./lib/store");
const logger = require("./lib/logger");
const app = require("./app");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.CORS_ORIGIN, credentials: true } });
require("./realtime/chat").attachChat(io);

server.listen(config.PORT, () =>
  logger.info({ port: config.PORT }, "BharatSource API v2 running (REST + Socket.IO)")
);

// --- Graceful shutdown: stop accepting connections, close sockets, drain the DB pool.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutdown signal received — draining in-flight requests");
  server.close(async () => {
    try {
      io.close();
    } catch (_e) {
      /* ignore */
    }
    try {
      await store.close();
    } catch (_e) {
      /* ignore */
    }
    process.exit(0);
  });
  // Hard cap so a stuck connection can't block the deploy forever.
  setTimeout(() => process.exit(1), 10000).unref();
}
["SIGTERM", "SIGINT"].forEach((sig) => process.on(sig, () => shutdown(sig)));

module.exports = { app, server, io };
