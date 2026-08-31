// Central Express error handler. Every route uses async/await with try-catch
// and forwards unexpected errors here via next(err).

module.exports = function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(`[BharatSource] ${req.method} ${req.originalUrl} —`, err.message);

  const status = err.status || 500;
  const message =
    status === 500 ? "Something went wrong on the server" : err.message;

  res.status(status).json({ success: false, error: message });
};
