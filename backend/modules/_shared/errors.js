/**
 * errors.js — typed errors that the modules throw and middleware/errorHandler.js
 * turns into the standard `{ success:false, error }` envelope (BACKEND-AUDIT.md
 * Phase 2 kernel).
 *
 * A service throws `new NotFound("job")` instead of hand-rolling
 * `res.status(404).json(...)`, so HTTP status lives in one place and services stay
 * free of `req`/`res`. errorHandler already keys off `err.status`; these set it.
 */

class AppError extends Error {
  constructor(message, status = 500, code = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    if (code) this.code = code;
  }
}

class BadRequest extends AppError {
  constructor(message = "Bad request", code) {
    super(message, 400, code);
  }
}

class Unauthorized extends AppError {
  constructor(message = "Authentication required", code) {
    super(message, 401, code);
  }
}

class Forbidden extends AppError {
  constructor(message = "Not allowed", code) {
    super(message, 403, code);
  }
}

class NotFound extends AppError {
  constructor(what = "Resource", code) {
    super(typeof what === "string" && what.includes(" ") ? what : `${what} not found`, 404, code);
  }
}

class Conflict extends AppError {
  constructor(message = "Conflict", code) {
    super(message, 409, code);
  }
}

module.exports = { AppError, BadRequest, Unauthorized, Forbidden, NotFound, Conflict };
