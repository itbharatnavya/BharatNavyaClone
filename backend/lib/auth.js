/**
 * auth.js — authentication primitives: password hashing, JWT, and OTP.
 *
 * OTP delivery is mocked (no SMS gateway). In development the generated code is
 * returned to the caller and a fixed master code "123456" is also accepted, matching
 * the legacy behavior so the UI stays testable. Real tokens (JWT) are always issued.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("./config");

/* ------------------------------------------------------------ passwords ---- */

async function hashPassword(plain) {
  return bcrypt.hash(plain, config.BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* --------------------------------------------------------------- JWT ------- */

/** Sign a session token. Convention: `sub` = user id, `roles` = role array. */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, roles: user.roles || ["user"] },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

/** Verify a token; returns the decoded payload or null if invalid/expired. */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- OTP ------- */
// In-memory OTP store (single-process dev server). mobile -> { otp, expiresAt }.

const _otps = new Map();

/** Generate + store a 6-digit OTP for a mobile number. Returns the code. */
function generateOtp(mobile) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  _otps.set(mobile, { otp, expiresAt: Date.now() + config.OTP_TTL_MS });
  return otp;
}

/** Verify (and consume) an OTP. Dev master code "123456" always passes in dev. */
function verifyOtp(mobile, otp) {
  if (config.isDev && otp === "123456") return true;
  const rec = _otps.get(mobile);
  if (!rec) return false;
  if (Date.now() > rec.expiresAt) {
    _otps.delete(mobile);
    return false;
  }
  const ok = rec.otp === otp;
  if (ok) _otps.delete(mobile);
  return ok;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateOtp,
  verifyOtp,
};
