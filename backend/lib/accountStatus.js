/**
 * accountStatus.js — one place for the wording and the rules around a suspended
 * account and a suspended / rejected seller profile.
 *
 * Two independent switches exist:
 *   - account status (users.status = "suspended"): the person cannot log in or call
 *     any authenticated endpoint (authGuard, login routes, the chat socket).
 *   - seller approval (sellerProfile.status): "suspended" / "rejected" hide the seller
 *     from the public (listing + profile pages 404, no new chats or enquiries) and lock
 *     the seller tools, but the person can still log in to see why and ask the admin.
 *     Only an admin can lift "suspended"; a "rejected" seller may resubmit (-> pending).
 */

const ACCOUNT_SUSPENDED_MESSAGE = "Your account is suspended. Please contact the admin.";

const SELLER_LOCK_MESSAGES = {
  suspended: "Your seller account is suspended. Please contact the admin.",
  rejected:
    "Your seller application was rejected. Update your details and resubmit it for review.",
};

const isAdmin = (user) => !!user && (user.roles || []).includes("admin");

/** "suspended" | "rejected" when this user's seller profile is locked, else null.
 *  Admin accounts are never locked. */
function sellerLockOf(user) {
  if (!user || !user.sellerProfile || isAdmin(user)) return null;
  const s = user.sellerProfile.status;
  return s === "suspended" || s === "rejected" ? s : null;
}

/** Public pages of a locked seller are hidden from everyone except the owner and admins. */
function isHiddenFromViewer(sellerUser, viewer) {
  if (!sellerLockOf(sellerUser)) return false;
  if (viewer && (viewer.id === sellerUser.id || isAdmin(viewer))) return false;
  return true;
}

/** Body for the 403 returned to a locked seller using a seller tool. */
function sellerLockBody(lock) {
  return {
    success: false,
    error: SELLER_LOCK_MESSAGES[lock],
    code: lock === "suspended" ? "seller_suspended" : "seller_rejected",
  };
}

/** Body for the 404 returned when a public page belongs to a locked seller. */
const SELLER_UNAVAILABLE_BODY = {
  success: false,
  error: "This seller is currently unavailable.",
  code: "seller_unavailable",
};

module.exports = {
  ACCOUNT_SUSPENDED_MESSAGE,
  SELLER_LOCK_MESSAGES,
  sellerLockOf,
  isHiddenFromViewer,
  sellerLockBody,
  SELLER_UNAVAILABLE_BODY,
};
