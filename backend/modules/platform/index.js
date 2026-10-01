/**
 * platform — public port for the cross-cutting site/admin domain
 * (BACKEND-AUDIT.md Phase 8): the `settings` singleton (public site config +
 * ranking scalars), the seller `verification-requests` queue, and (via its
 * routes) the admin console + notifications + the local upload primitive.
 *
 * Other modules and routes import from here, never from
 * `modules/platform/repository/*` directly.
 */

module.exports = {
  settingsRepo: require("./repository/settings.repository"),
  verificationRepo: require("./repository/verification.repository"),
};
