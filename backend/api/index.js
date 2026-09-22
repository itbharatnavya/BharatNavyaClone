/**
 * api/index.js — Vercel serverless entrypoint.
 *
 * Vercel's Node runtime wraps an exported (req,res) handler; an Express app is
 * exactly that, so the same app.js used by index.js (local) and test/supertest
 * runs unmodified here. No .listen(), no Socket.IO attach — realtime chat is a
 * local/always-on-host feature only (see CLAUDE.md §2 "Contact & chat" — the
 * REST side of modules/chat stays mounted and working, only the socket layer
 * is absent on this deploy).
 */

module.exports = require("../app");
