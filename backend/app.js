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
const store = require("./lib/store");
const { helmetMw, globalLimiter, authLimiter, aiLimiter } = require("./lib/security");

const app = express();

// Behind Next.js's single-origin /api rewrite — trust the first proxy hop so
// req.ip reflects the real client (rate limiting depends on it).
app.set("trust proxy", 1);

app.use(helmetMw);
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
// 8mb so base64 image uploads (phone photos) aren't rejected at the default 100kb.
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

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
    await store.ping();
    res.json({ success: true, data: { status: "ok", db: "up" } });
  } catch (err) {
    res.status(503).json({ success: false, error: "db_unavailable", code: "db_down" });
  }
});

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
app.use("/api/admin/job-functions", require("./routes/adminJobFunctions")); // admin taxonomy CRUD (guarded inside; before /api/admin)
app.use("/api/admin/job-roles", require("./routes/adminJobRoles")); // admin taxonomy CRUD (guarded inside; before /api/admin)
app.use("/api/admin/skills", require("./routes/adminSkills")); // admin taxonomy CRUD (guarded inside; before /api/admin)
app.use("/api/job-functions", require("./routes/jobFunctions")); // Recruitment: flat job taxonomy (public read)
app.use("/api/job-roles", require("./routes/jobRoles")); // Recruitment: predefined job-title picklist (public read)
app.use("/api/skills", require("./routes/skills")); // Recruitment: predefined skills picklist (public read)
app.use("/api/jobs", require("./routes/jobs")); // Recruitment: job postings (RECRUITMENT.md)
app.use("/api/applications", require("./routes/applications")); // Recruitment: candidate applications
app.use("/api/admin/employers", require("./routes/adminEmployers")); // Recruitment: employer approval (guarded inside; before /api/admin)
app.use("/api/admin/jobs", require("./routes/adminJobs")); // Recruitment: admin job visibility across all statuses (guarded inside; before /api/admin)
app.use("/api/admin/boosts", require("./routes/boosts")); // self-serve boosts admin (guarded inside; before /api/admin)
app.use("/api/boosts", require("./routes/boosts")); // seller self-serve boost requests
app.use("/api/admin/moderation", require("./routes/moderation")); // content moderation + verification queue (guarded inside; before /api/admin)
app.use("/api/admin/listings", require("./routes/adminListings")); // AI listing verification queue (guarded inside; before /api/admin)
app.use("/api/admin/inquiries", require("./routes/adminInquiries")); // unmatched-RFQ triage queue (guarded inside; before /api/admin)
app.use("/api/admin", require("./routes/admin")); // authGuard + requireRole applied inside
app.use("/api/ai", require("./routes/ai"));
app.use("/api/search", require("./routes/searchTrends")); // trending/popular searches (Directory homepage)
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
app.use("/api", require("./routes/users")); // /api/sellers/:slug, /api/become-seller, /api/me/seller, /api/me/profile, /api/employers/:slug, /api/candidates/:id, /api/become-employer, /api/me/employer, /api/me/candidate

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ success: false, error: "Endpoint not found" }));

// Central error handler
app.use(require("./middleware/errorHandler"));

module.exports = app;
