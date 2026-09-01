// Central Express error handler. Every route uses async/await with try-catch
// and forwards unexpected errors here via next(err).

module.exports = function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(
    `[BharatSource] ${req.method} ${req.originalUrl} —`,
    err.stack || err.message
  );

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 ? "Something went wrong on the server" : err.message;

  const body = { success: false, error: message };
  // Typed kernel errors (modules/_shared/errors.js) may carry a machine-readable
  // code — pass it through, same as the rate-limit / account-suspended responses.
  if (err.code && status !== 500) body.code = err.code;

  res.status(status).json(body);
};
