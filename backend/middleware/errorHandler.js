// Central Express error handler. Every route uses async/await with try-catch
// and forwards unexpected errors here via next(err).

const logger = require("../lib/logger");

module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // 5xx = a real fault (log the stack); 4xx = expected client error (one terse line).
  const meta = { id: req.id, method: req.method, path: req.originalUrl, status };
  if (status >= 500) logger.error({ ...meta, err }, "unhandled error");
  else logger.warn({ ...meta, msg: err.message }, "handled error");

  const message =
    status === 500 ? "Something went wrong on the server" : err.message;

  const body = { success: false, error: message };
  // Typed kernel errors (modules/_shared/errors.js) may carry a machine-readable
  // code — pass it through, same as the rate-limit / account-suspended responses.
  if (err.code && status !== 500) body.code = err.code;

  res.status(status).json(body);
};
