/**
 * requestLog.js — per-request id + access log (BACKEND-AUDIT.md Phase 1 §1e / C5).
 *
 * Assigns `req.id` (honouring an inbound `X-Request-Id` from a proxy, else a fresh
 * uuid), echoes it back as the `X-Request-Id` response header, and logs one line
 * when the response finishes: method, path, status, duration. errorHandler.js logs
 * the same `req.id` on failures, so a 500 in the logs ties back to its access line.
 *
 * `/health` is skipped — a load balancer hits it constantly and it would drown the log.
 */

const crypto = require("crypto");
const logger = require("../lib/logger");

module.exports = function requestLog(req, res, next) {
  const inbound = req.headers["x-request-id"];
  req.id = typeof inbound === "string" && inbound.length <= 200 ? inbound : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);

  if (req.path === "/health" || req.path === "/") return next();

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = {
      id: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
    };
    if (res.statusCode >= 500) logger.error(line, "request failed");
    else if (res.statusCode >= 400) logger.warn(line, "request rejected");
    else logger.info(line, "request");
  });

  next();
};
