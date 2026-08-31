/**
 * migrate-users.js — Phase 0 seed migration.
 *
 * Builds the unified DB/users.json from the legacy data/buyers.json and seeds a real
 * admin user (hashed password, roles flag) to replace the old hardcoded admin login.
 * Suppliers become users with a sellerProfile in Phase 1; buyers are plain users now.
 *
 * Run:  node scripts/migrate-users.js
 */

const path = require("path");
const crypto = require("crypto");
const store = require("../lib/store");
const auth = require("../lib/auth");

async function main() {
  const buyers = require(path.join(__dirname, "..", "data", "buyers.json"));
  const now = new Date().toISOString();
  const users = [];

  // --- Admin (hashed password, roles flag) ---
  // SECURITY: never hardcode a weak/published admin password. Source it from
  // ADMIN_PASSWORD, else generate a strong random one and print it ONCE so it is
  // never committed anywhere. See SECURITY.md.
  const adminPassword =
    process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`\n  ⚠ Generated admin password (save it now): ${adminPassword}\n`);
  }
  users.push({
    id: "usr_admin",
    name: "BharatSource Admin",
    mobile: "9999999999",
    email: "admin@bharatsource.in",
    passwordHash: await auth.hashPassword(adminPassword),
    avatarUrl: null,
    city: "",
    state: "",
    roles: ["user", "admin"],
    sellerProfile: null,
    createdAt: now,
  });

  // --- Legacy buyers -> unified users (OTP-only, no seller profile yet) ---
  for (const b of buyers) {
    users.push({
      id: b.id.replace(/^buyer_/, "usr_b"),
      name: b.name,
      mobile: b.mobile,
      email: b.email || null,
      passwordHash: null,
      avatarUrl: null,
      city: b.city || "",
      state: "",
      roles: ["user"],
      sellerProfile: null,
      // Preserve the legacy buyer trust signals for later reuse (trust score, GST…).
      legacy: {
        company: b.company || null,
        gstNumber: b.gstNumber || null,
        website: b.website || null,
        verification: b.verification || null,
        annualTurnover: b.annualTurnover || null,
        activeYears: b.activeYears ?? null,
        trustScore: b.trustScore ?? null,
      },
      createdAt: b.createdAt || now,
    });
  }

  await store.writeJson("users.json", users);
  console.log(
    `migrated ${users.length} users -> DB/users.json (1 admin + ${buyers.length} buyers)`
  );
}

main().catch((e) => {
  console.error("migration failed:", e);
  process.exit(1);
});
