/**
 * BharatSource API v2 — unified marketplace backend.
 *
 * File-based storage (DB/), JWT auth, one unified User identity, product+service
 * listings, nested categories, monetization+admin, AI concierge, and Socket.IO chat.
 * See DESIGN.md / BUILD-SPEC.md.
 */

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const config = require("./lib/config");

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
// 8mb so base64 image uploads (phone photos) aren't rejected at the default 100kb.
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

// Health check
app.get("/", (req, res) =>
  res.json({ success: true, data: { service: "BharatSource API", status: "ok", version: 2 } })
);

// --- API routes (specific prefixes first; users mounted at /api last) ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/config", require("./routes/config")); // public read of admin site config
app.use("/api/features", require("./routes/features")); // living feature catalog
app.use("/api/admin/entitlements", require("./routes/entitlements")); // admin bulk save (guarded inside; before /api/admin)
app.use("/api/entitlements", require("./routes/entitlements")); // PUBLIC composed tier×feature matrix (gating + "What we offer")
app.use("/api/admin/categories", require("./routes/adminCategories")); // admin taxonomy CRUD (before /api/admin)
app.use("/api/admin/collections", require("./routes/collections")); // admin curated collections CRUD (guarded inside; before /api/admin)
app.use("/api/category-suggestions", require("./routes/categorySuggestions")); // seller "Other" category ideas → admin triage
app.use("/api/categories", require("./routes/categories"));
app.use("/api/brands", require("./routes/brands")); // brand directory + landing (aggregated from listings)
app.use("/api/collections", require("./routes/collections")); // PUBLIC curated collections (Concepts)
app.use("/api/listings", require("./routes/listings"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/inquiries", require("./routes/inquiries"));
app.use("/api/admin/boosts", require("./routes/boosts")); // self-serve boosts admin (guarded inside; before /api/admin)
app.use("/api/boosts", require("./routes/boosts")); // seller self-serve boost requests
app.use("/api/admin/moderation", require("./routes/moderation")); // content moderation + verification queue (guarded inside; before /api/admin)
app.use("/api/admin", require("./routes/admin")); // authGuard + requireRole applied inside
app.use("/api/ai", require("./routes/ai"));
app.use("/api/assistant", require("./routes/assistant"));
app.use("/api/ads", require("./routes/ads"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/blogs", require("./routes/blogs"));
app.use("/api/stories", require("./routes/stories"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/referral", require("./routes/referral"));
app.use("/api/uploads", require("./routes/uploads")); // image upload primitive (base64 → /uploads/<name>)
app.use("/api/my-ads", require("./routes/myAds")); // seller self-serve ad campaigns (pending → admin activates)
app.use("/api/shortlist", require("./routes/shortlist")); // buyer's saved-products shortlist (server-persisted)
app.use("/api/experts", require("./routes/experts")); // Consultations: public directory of experts (service sellers)
app.use("/api/consultations", require("./routes/consultations")); // Consultations: booking flow (guest-friendly)
app.use("/api", require("./routes/users")); // /api/sellers/:slug, /api/become-seller, /api/me/seller, /api/me/profile

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ success: false, error: "Endpoint not found" }));

// Central error handler
app.use(require("./middleware/errorHandler"));

// --- HTTP server + Socket.IO (chat) on the same port ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.CORS_ORIGIN, credentials: true } });
require("./realtime/chat").attachChat(io);

server.listen(config.PORT, () =>
  console.log(`BharatSource API v2 running on port ${config.PORT} (REST + Socket.IO)`)
);
