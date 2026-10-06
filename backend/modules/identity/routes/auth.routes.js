/**
 * routes/auth.js — unified JWT auth (DESIGN §4).
 *
 * One identity, no buyer/seller split. OTP-first login (real JWT issued), optional
 * password. Every response uses the {success, data} envelope; every user returned is
 * sanitized (passwordHash stripped).
 */

const express = require("express");
const router = express.Router();

const identity = require("../index");
const auth = require("../../../lib/auth");
const config = require("../../../lib/config");
const { validate, schemas } = require("../../../lib/validate");
const { authGuard } = require("../../../middleware/authGuard");

/** Strip secrets (passwordHash) before a user ever leaves the API. */
function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

/** Build a fresh unified-identity user document (no id — identity.createUser
 *  mints usr_<n> on insert and the caller merges it back onto this exact shape,
 *  so the register/verify-otp response stays byte-identical). */
function buildUser({ name, mobile, email, passwordHash, city, state }) {
  return {
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

    const existing = await identity.getUserByMobile(mobile);
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Mobile already registered" });
    }

    const passwordHash = password ? await auth.hashPassword(password) : null;
    const draft = buildUser({ name, mobile, email, passwordHash, city, state });
    const saved = await identity.createUser(draft);
    const user = { id: saved.id, ...draft };

    return res.json({
      success: true,
      data: { token: auth.signToken(user), user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/send-otp — issue an OTP (echoed back only when isDev or OTP_ECHO).
router.post("/send-otp", validate(schemas.sendOtp), async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const otp = auth.generateOtpCode();
    await identity.issueOtp(mobile, otp, config.OTP_TTL_MS);
    const data = { message: "OTP sent" };
    if (config.isDev || config.OTP_ECHO) data.otp = otp;
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp — verify OTP, auto-creating the user on first login.
router.post("/verify-otp", validate(schemas.verifyOtp), async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    const devMaster = config.isDev && otp === "123456";
    if (!devMaster && !(await identity.consumeOtp(mobile, otp))) {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

    let user = await identity.getUserByMobile(mobile);
    if (!user) {
      const draft = buildUser({ name: mobile, mobile });
      const saved = await identity.createUser(draft);
      user = { id: saved.id, ...draft };
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
    const user = await identity.getUserByEmail(email);
    // Always run one bcrypt compare — against the real hash, or a dummy when the
    // account doesn't exist — so response time can't be used to enumerate emails
    // (BACKEND-AUDIT.md C7).
    const passwordOk = await auth.verifyPassword(
      password,
      (user && user.passwordHash) || auth.DUMMY_HASH
    );
    if (!user || !passwordOk) {
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
