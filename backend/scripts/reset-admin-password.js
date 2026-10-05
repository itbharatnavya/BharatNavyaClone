/**
 * reset-admin-password.js: gives the local admin account (usr_admin) a fresh strong password.
 *
 * The password is NOT printed. It is written to backend/.admin-credentials.local (git-ignored)
 * together with the login email, so it can never end up in the repository or a log.
 * Set ADMIN_PASSWORD to choose your own instead of a random one.
 *
 * Run:  node scripts/reset-admin-password.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
try { require("dotenv").config(); } catch (e) { /* optional */ }
const store = require("../lib/pg-store");
const auth = require("../lib/auth");

(async () => {
  const user = await store.getById("users.json", "usr_admin");
  if (!user) throw new Error("usr_admin not found: run the user migration first.");
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");
  await store.update("users.json", "usr_admin", { passwordHash: await auth.hashPassword(password) });
  const file = path.join(__dirname, "..", ".admin-credentials.local");
  fs.writeFileSync(file, `email: ${user.email}\npassword: ${password}\n`, { mode: 0o600 });
  console.log(`Admin password reset for ${user.email}. Credentials saved to backend/.admin-credentials.local`);
  process.exit(0);
})().catch((e) => { console.error("reset-admin-password failed:", e.message); process.exit(1); });
