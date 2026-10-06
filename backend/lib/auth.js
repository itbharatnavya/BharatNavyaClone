/**
 * auth.js — authentication primitives: password hashing, JWT, and OTP.
 *
 * OTP delivery is mocked (no SMS gateway). In development the generated code is
 * returned to the caller and a fixed master code "123456" is also accepted, matching
 * the legacy behavior so the UI stays testable. Real tokens (JWT) are always issued.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("./config");

/* ------------------------------------------------------------ passwords ---- */

// A real bcrypt hash of a value nobody uses. Login compares against this when the
// email doesn't exist so a missing account costs the same wall-clock time as a
// wrong password — closes the user-enumeration timing oracle (BACKEND-AUDIT.md C7).
const DUMMY_HASH = bcrypt.hashSync("bharatsource-nonexistent-account", config.BCRYPT_ROUNDS);

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
// Codes are stored by modules/identity (issueOtp / consumeOtp, table otp_codes) so
// every serverless instance sees the same live code.

/** A fresh 6-digit OTP. crypto.randomInt is a CSPRNG — Math.random() is predictable. */
function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

module.exports = {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateOtpCode,
};
