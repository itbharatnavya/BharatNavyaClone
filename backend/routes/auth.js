/**
 * routes/auth.js — unified JWT auth (DESIGN §4).
 *
 * One identity, no buyer/seller split. OTP-first login (real JWT issued), optional
 * password. Every response uses the {success, data} envelope; every user returned is
 * sanitized (passwordHash stripped).
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");
const auth = require("../lib/auth");
const config = require("../lib/config");
const { validate, schemas } = require("../lib/validate");
const { authGuard } = require("../middleware/authGuard");

/** Strip secrets (passwordHash) before a user ever leaves the API. */
function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

/** Build a fresh unified-identity user document. */
async function buildUser({ name, mobile, email, passwordHash, city, state }) {
  const id = await store.nextId("usr");
  return {
    id,
    name,
    mobile,
    email: email || null,
    passwordHash: passwordHash || null,
    avatarUrl: null,
    city: city || "",
    state: state || "",
    roles: ["user"],
    sellerProfile: null,
    createdAt: new Date().toISOString(),
  };
}

// POST /api/auth/register — create a user (password optional).
router.post("/register", validate(schemas.register), async (req, res, next) => {
  try {
    const { name, mobile, email, password, city, state } = req.body;

    const existing = await store.findOne("users.json", (u) => u.mobile === mobile);
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Mobile already registered" });
    }

    const passwordHash = password ? await auth.hashPassword(password) : null;
    const user = await buildUser({ name, mobile, email, passwordHash, city, state });
    await store.insert("users.json", user);

    return res.json({
      success: true,
      data: { token: auth.signToken(user), user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/send-otp — generate an OTP (returned only in dev).
router.post("/send-otp", validate(schemas.sendOtp), async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const otp = auth.generateOtp(mobile);
    const data = { message: "OTP sent" };
    if (config.isDev) data.otp = otp;
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp — verify OTP, auto-creating the user on first login.
router.post("/verify-otp", validate(schemas.verifyOtp), async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    if (!auth.verifyOtp(mobile, otp)) {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

    let user = await store.findOne("users.json", (u) => u.mobile === mobile);
    if (!user) {
      user = await buildUser({ name: mobile, mobile });
      await store.insert("users.json", user);
    }
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: "This account has been suspended. Contact support.",
        code: "account_suspended",
      });
    }

    return res.json({
      success: true,
      data: { token: auth.signToken(user), user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — email + password.
router.post("/login", validate(schemas.passwordLogin), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await store.findOne("users.json", (u) => u.email === email);
    if (!user || !(await auth.verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: "This account has been suspended. Contact support.",
        code: "account_suspended",
      });
    }

    return res.json({
      success: true,
      data: { token: auth.signToken(user), user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — current user (authGuard attaches the full doc).
router.get("/me", authGuard, async (req, res, next) => {
  try {
    return res.json({ success: true, data: { user: sanitizeUser(req.user) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
