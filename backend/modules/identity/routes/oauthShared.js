/**
 * oauthShared.js — provider-agnostic half of social login.
 *
 * A provider route file's job is ONLY the provider-specific part: verify that
 * provider's token against their SDK, extract a normalized profile, then call
 * finishOauthLogin() here. Account-linking (find by provider id, fall back to
 * linking a verified email onto an existing account, else create), the
 * suspended-account check, and JWT issuance are written once and shared by
 * Google now and Facebook/Apple whenever their routes are added — see
 * modules/identity/index.js's OAUTH_PROVIDERS for the one-line-per-provider
 * config this reads through.
 */

const identity = require("../index");
const auth = require("../../../lib/auth");

/** Strip secrets (passwordHash) before a user ever leaves the API. Same
 *  contract as auth.routes.js's sanitizeUser. */
function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

/**
 * @param {import("express").Response} res
 * @param {{provider:string, providerId:string, email?:string|null,
 *          emailVerified?:boolean, name?:string|null, avatarUrl?:string|null}} profile
 *   `provider` must be a key in identity's OAUTH_PROVIDERS. `emailVerified`
 *   gates the find-by-email account-linking fallback — only ever trust an
 *   email the PROVIDER itself verified, not a bare claim.
 *
 * Writes the {success,data:{token,user}} response (same envelope as
 * auth.routes.js's verify-otp/login) or a suspended-account 403. Returns
 * nothing — the caller's handler should `return` right after calling this.
 */
async function finishOauthLogin(res, profile) {
  const { provider, providerId, email, emailVerified, name, avatarUrl } = profile;

  let user = await identity.getUserByOauthId(provider, providerId);

  if (!user) {
    const byEmail = emailVerified && email ? await identity.getUserByEmail(email) : null;

    if (byEmail) {
      user = await identity.linkOauthId(byEmail.id, provider, providerId);
    } else {
      // No phone number from a social profile — mobile stays "" (same
      // empty-string convention as city/state) rather than a fabricated
      // value; the account can add a real mobile later from /profile.
      const draft = {
        name: name || email || `${provider} user`,
        mobile: "",
        email: email || null,
        passwordHash: null,
        ...identity.oauthDraftFields(provider, providerId),
        avatarUrl: avatarUrl || null,
        city: "",
        state: "",
        roles: ["user"],
        sellerProfile: null,
        createdAt: new Date().toISOString(),
      };
      const saved = await identity.createUser(draft);
      user = { id: saved.id, ...draft };
    }
  }

  if (user.status === "suspended") {
    res.status(403).json({
      success: false,
      error: "This account has been suspended. Contact support.",
      code: "account_suspended",
    });
    return;
  }

  res.json({
    success: true,
    data: { token: auth.signToken(user), user: sanitizeUser(user) },
  });
}

module.exports = { finishOauthLogin, sanitizeUser };
