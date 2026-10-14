/**
 * sellerLock.js — use after authGuard on seller-only WRITE routes (listings, bulk,
 * boosts, ads). A seller whose profile is suspended or rejected gets a 403 with
 * code `seller_suspended` / `seller_rejected`; everyone else (buyers, pending or
 * approved sellers, admins) passes straight through.
 */

const { sellerLockOf, sellerLockBody } = require("../lib/accountStatus");

function sellerLock(req, res, next) {
  const lock = sellerLockOf(req.user);
  if (lock) return res.status(403).json(sellerLockBody(lock));
  next();
}

module.exports = { sellerLock };
