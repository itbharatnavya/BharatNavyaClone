/**
 * app.js — the Express application (no server binding).
 *
 * Split out of index.js so the test suite can mount it with supertest without opening
 * a port (BACKEND-AUDIT.md Phase 0). index.js requires this, wraps it in an HTTP
 * server, attaches Socket.IO, and calls listen().
 */

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./lib/config");
const { ping } = require("./modules/_shared/pool");
const { helmetMw, globalLimiter, authLimiter, aiLimiter } = require("./lib/security");
const { mountIdentity } = require("./modules/identity/mount");
const { mountDirectory } = require("./modules/directory/mount");
const { mountRecruitment } = require("./modules/recruitment/mount");
const { mountMonetization } = require("./modules/monetization/mount");
const { mountPlatform } = require("./modules/platform/mount");
const { mountAI } = require("./modules/ai/mount");
const { mountChat } = require("./modules/chat/mount");

const app = express();

// Behind Next.js's single-origin /api rewrite — trust the first proxy hop so
// req.ip reflects the real client (rate limiting depends on it).
app.set("trust proxy", 1);

app.use(helmetMw);
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
// 8mb so base64 image uploads (phone photos) aren't rejected at the default 100kb.
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

// Per-request id + access log (before the limiters so a 429 is still logged).
app.use(require("./middleware/requestLog"));

// --- Rate limiters (before the routers so a throttled request never reaches them) ---
app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/assistant", aiLimiter);

// Health check — unchanged legacy shape.
app.get("/", (req, res) =>
  res.json({ success: true, data: { service: "BharatSource API", status: "ok", version: 2 } })
);

// Dependency-aware health probe (BACKEND-AUDIT.md Phase 1 §1e) — 503 when Postgres
// is unreachable, so a load balancer can pull a broken instance out of rotation.
app.get("/health", async (req, res) => {
  try {
    await ping();
    res.json({ success: true, data: { status: "ok", db: "up" } });
  } catch (err) {
    res.status(503).json({ success: false, error: "db_unavailable", code: "db_down" });
  }
});

// --- API routes: each domain module mounts its own routers via modules/<name>/
// mount.js (BACKEND-AUDIT.md Phase 8). The call ORDER here is the contract — it
// reproduces the historical app.use() sequence exactly:
//   1. specific-prefix routers ("early") before recruitment
//   2. every module's "admin-sub" ( /api/admin/* self-guarded routers )
//   3. platform's "admin" ( the blanket /api/admin catch-all ) — after ALL admin-sub
//   4. the rest of the specific-prefix routers ("late")
//   5. identity "users" — the broad app.use("/api", …) — dead last
mountIdentity(app, "early"); // /api/auth
mountPlatform(app, "early"); // /api/config
mountMonetization(app, "early"); // /api/features
mountMonetization(app, "admin-sub"); // /api/admin/entitlements
mountMonetization(app, "public"); // /api/entitlements
mountDirectory(app, "admin-sub"); // /api/admin/{categories,collections,boosts}
mountDirectory(app, "public"); // categories/brands/listings/reviews/inquiries/search/… + /api/boosts
mountRecruitment(app, "admin-sub"); // /api/admin/{job-functions,job-roles,skills,employers,jobs}
mountRecruitment(app, "public"); // /api/{job-functions,job-roles,skills,jobs,applications}
mountPlatform(app, "admin-sub"); // /api/admin/{moderation,listings,inquiries}
mountPlatform(app, "admin"); // /api/admin  (blanket — authGuard+requireRole inside)
mountAI(app, "public"); // /api/ai, /api/assistant
mountMonetization(app, "late"); // /api/ads, /api/reports, /api/my-ads
mountPlatform(app, "late"); // /api/notifications, /api/uploads
mountChat(app, "public"); // /api/chat
mountIdentity(app, "late"); // /api/referral
mountIdentity(app, "users"); // /api  (LAST — the broad catch-all)

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ success: false, error: "Endpoint not found" }));

// Central error handler
app.use(require("./middleware/errorHandler"));

module.exports = app;
