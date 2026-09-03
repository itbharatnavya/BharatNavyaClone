/**
 * seed-features.js — the living Feature Catalog (admin-editable) so the SALES team
 * always knows exactly what the platform offers and which plan unlocks it.
 * Admin can edit/add/remove via /api/features. Seeded from the full built scope.
 *
 * Run: node scripts/seed-features.js
 */

const store = require("../lib/pg-store");

// plans: which subscription tiers include it (for seller-facing capabilities).
// audience: who it's for. status: live | beta | planned. phase: original roadmap phase.
const F = (id, name, group, description, opts = {}) => ({
  id,
  name,
  group,
  description,
  audience: opts.audience || "all",
  plans: opts.plans || ["free", "silver", "gold"],
  status: opts.status || "live",
  phase: opts.phase || 1,
});

const features = [
  // Identity & profiles
  F("unified-identity", "Unified Account (Buy & Sell)", "Accounts & Identity", "One account — any user can both buy and sell. No separate buyer/seller logins; the listing decides the role.", { audience: "all" }),
  F("otp-login", "Mobile OTP Login", "Accounts & Identity", "Sign up / log in with mobile + OTP. Real JWT sessions.", { audience: "all" }),
  F("user-profile", "User Profile", "Accounts & Identity", "Name, photo, city, category interests, and contact-visibility settings (public / on-request / hidden).", { audience: "all" }),
  F("verification", "Verified & TrustSEAL Badges", "Accounts & Identity", "Admin-granted verification and trust badges to build buyer confidence.", { audience: "seller", plans: ["silver", "gold"] }),
  F("gamified-badges", "Gamified Badges", "Accounts & Identity", "Auto-earned Top Rated (4.5★+) and Fast Responder (≤2h) badges.", { audience: "seller" }),

  // Listings
  F("post-listing", "Post a Listing", "Marketplace Listings", "List a product or a service with photos, price, description, category, and location.", { audience: "seller" }),
  F("product-service", "Products & Services", "Marketplace Listings", "One catalog handles physical products (price/MOQ/specs) and services (rate-card/credentials/service-area).", { audience: "all" }),
  F("edit-mark-sold", "Edit / Mark as Sold", "Marketplace Listings", "Sellers update, deactivate, or mark their listings Sold.", { audience: "seller" }),
  F("condition", "Item Condition", "Marketplace Listings", "New / Used condition on product listings.", { audience: "all" }),
  F("ai-autofill", "AI Listing Auto-fill", "Marketplace Listings", "Auto-writes title, description, and category from an uploaded photo (Claude vision).", { audience: "seller", plans: ["silver", "gold"], status: "beta", phase: 2 }),

  // Discovery & search
  F("browse-filters", "Browse & Faceted Search", "Discovery & Search", "Search with filters: category, price tiers, city, verified, condition, type.", { audience: "all" }),
  F("ai-concierge", "AI Search Concierge", "Discovery & Search", "Type a natural request (\"CA in Pune for GST filing\") — AI returns matches or routes to the right page.", { audience: "all" }),
  F("voice-search", "Voice Input for AI Search", "Discovery & Search", "Speak your query instead of typing (browser voice).", { audience: "all", status: "beta", phase: 2 }),
  F("near-me", "Near-Me / Distance", "Discovery & Search", "Distance-sorted results from your city + radius filter.", { audience: "all" }),
  F("map-view", "Map View", "Discovery & Search", "Toggle listings/businesses onto an interactive map (OpenStreetMap).", { audience: "all", status: "beta", phase: 2 }),
  F("category-pages", "Category Landing Pages", "Discovery & Search", "Dedicated page per category with nested sub-categories (250+ nodes, 5 levels deep).", { audience: "all" }),
  F("city-pages", "City Pages & Trending", "Discovery & Search", "City-scoped pages showing trending listings/businesses.", { audience: "all" }),

  // Directory
  F("business-profile", "Business Profile Page", "Business Directory", "Name, category, services, hours, photos, map location, reviews, and trust badges.", { audience: "seller" }),
  F("contact-buttons", "Call / WhatsApp / Chat", "Business Directory", "One-tap contact from any profile or listing.", { audience: "all" }),
  F("follow", "Follow Sellers & Businesses", "Business Directory", "Follow to get notified of new listings and stories.", { audience: "buyer", phase: 2 }),

  // Stories
  F("stories", "24-Hour Stories", "Stories", "Post photo/video that disappears after 24h, linked to a listing/profile.", { audience: "seller", phase: 1 }),
  F("story-views", "Story View Counts", "Stories", "Sellers see how many people viewed each story.", { audience: "seller" }),
  F("story-highlights", "Story Highlights", "Stories", "Pin best stories permanently to a profile.", { audience: "seller", phase: 2 }),

  // Communication
  F("chat", "In-App Chat", "Communication", "Secure buyer↔seller messaging; contact number not shared until agreed.", { audience: "all" }),
  F("notifications", "Notification Center", "Communication", "In-app alerts for messages, story views, new followers.", { audience: "all", phase: 2 }),
  F("share", "Share to WhatsApp", "Communication", "One-tap share of listings/stories via WhatsApp + copy-link.", { audience: "all", phase: 2 }),

  // Trust & safety
  F("reviews", "Two-Way Ratings & Reviews", "Trust & Safety", "Buyers and sellers rate each other after an interaction.", { audience: "all" }),
  F("report", "Report Listing", "Trust & Safety", "Flag suspicious/fraudulent listings for admin review.", { audience: "all" }),
  F("moderation", "Moderation Queue", "Trust & Safety", "Admins review reports, resolve or dismiss.", { audience: "admin", phase: 3 }),

  // Content / reach
  F("blogs", "Seller Blogs", "Reach & Content", "Sellers publish SEO articles/guides for organic reach.", { audience: "seller" }),
  F("multilang", "Multi-Language (EN / हिन्दी)", "Reach & Content", "Language toggle for wider tier-2/3 reach.", { audience: "all", status: "beta", phase: 2 }),
  F("referral", "Referral Program", "Reach & Content", "Invite friends for listing-boost credits.", { audience: "all", phase: 3 }),

  // Monetization (the sales offering)
  F("featured", "Featured / Boosted Listings", "Monetization", "Sellers pay to rank higher in category/city/search (labeled Sponsored).", { audience: "seller", plans: ["silver", "gold"], phase: 3 }),
  F("subscriptions", "Business Subscription Plans", "Monetization", "Free / Silver / Gold tiers unlock listings, leads, badges, analytics.", { audience: "seller", phase: 3 }),
  F("leads", "Lead-Gen (Pay per Inquiry)", "Monetization", "Businesses receive/pay for qualified inquiries.", { audience: "seller", plans: ["silver", "gold"], phase: 3 }),
  F("ads", "In-App Ads", "Monetization", "Sponsored banner/slots on home, category, and city pages.", { audience: "seller", plans: ["gold"], phase: 3 }),
  F("analytics", "Seller Analytics", "Monetization", "Performance dashboard for paid sellers.", { audience: "seller", plans: ["silver", "gold"], phase: 3 }),

  // Admin
  F("admin-dashboard", "Admin Dashboard", "Admin & Ops", "Moderate listings/stories/reports, manage sellers, view analytics.", { audience: "admin", phase: 3 }),
  F("admin-monetization", "Monetization Controls", "Admin & Ops", "Set featured/boost, assign plans, ad bookings, mark payments paid.", { audience: "admin", phase: 3 }),
  F("features-catalog", "Features Catalog", "Admin & Ops", "This living list — so the sales team always knows what the platform sells.", { audience: "admin" }),
];

async function main() {
  await store.writeJson("features.json", features);
  const byGroup = features.reduce((a, f) => ((a[f.group] = (a[f.group] || 0) + 1), a), {});
  console.log(`seeded ${features.length} features -> DB/features.json`);
  console.log("groups:", JSON.stringify(byGroup));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
