/**
 * claudeCli.js — adapter for the locally authenticated Claude Code CLI.
 *
 * This lets the marketplace do TRULY semantic AI (intent parsing, grounded chat)
 * with NO ANTHROPIC_API_KEY: it shells out to the user's logged-in `claude` binary
 * (`claude -p "<prompt>"`), which runs a one-shot completion on their terminal
 * subscription and prints plain text to stdout (~3s latency).
 *
 * Design guarantees:
 *   - isClaudeAvailable(): cached, synchronous check that the binary exists (no exec).
 *   - askClaude(prompt, {timeoutMs}): spawns with an ARGS ARRAY (no shell → no
 *     injection/escaping issues), enforces a manual kill-timer (macOS has no
 *     `timeout`), and returns null on non-zero exit / timeout / empty output.
 *     It NEVER throws.
 *   - askClaudeJSON(prompt, opts): same, but instructs JSON-only, strips code
 *     fences, and JSON.parses — returning the object or null on any failure.
 *   - Concurrency guard: at most 2 `claude` children run at once (a tiny in-process
 *     semaphore) so a burst of requests can't fork-bomb the machine.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/* --------------------------------------------------- binary resolution ----- */

let _binResolved = false;
let _binPath = null;

/** Resolve an executable `claude` on PATH (or a couple of sane fallbacks). Cached. */
function resolveBin() {
  if (_binResolved) return _binPath;
  _binResolved = true;

  const candidates = [];
  // Explicit override wins.
  if (process.env.CLAUDE_CLI_BIN) candidates.push(process.env.CLAUDE_CLI_BIN);
  // Every directory on PATH.
  const dirs = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const d of dirs) candidates.push(path.join(d, "claude"));
  // Common global-install locations (in case the server env has a trimmed PATH).
  if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, ".npm-global", "bin", "claude"));
    candidates.push(path.join(process.env.HOME, ".local", "bin", "claude"));
  }
  candidates.push("/usr/local/bin/claude", "/opt/homebrew/bin/claude");

  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      _binPath = c;
      return _binPath;
    } catch {
      /* keep looking */
    }
  }
  _binPath = null;
  return _binPath;
}

/** Cached: is the `claude` CLI available on this machine? */
function isClaudeAvailable() {
  return !!resolveBin();
}

/* ----------------------------------------------- concurrency semaphore ----- */
// At most MAX_CONCURRENT `claude` processes at once; the rest queue.

const MAX_CONCURRENT = 2;
let _active = 0;
const _waiters = [];

function acquire() {
  if (_active < MAX_CONCURRENT) {
    _active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => _waiters.push(resolve));
}

function release() {
  const next = _waiters.shift();
  if (next) {
    // Hand the slot straight to the next waiter (keep _active unchanged).
    next();
  } else {
    _active = Math.max(0, _active - 1);
  }
}

/* -------------------------------------------------------- askClaude -------- */

/**
 * Run a one-shot `claude -p "<prompt>"` completion. Returns trimmed stdout, or
 * null on any failure (missing binary, empty prompt, spawn error, non-zero exit,
 * timeout, or empty output). Never throws.
 */
async function askClaude(prompt, { timeoutMs = 15000 } = {}) {
  const bin = resolveBin();
  if (!bin) return null;

  const text = String(prompt == null ? "" : prompt);
  if (!text.trim()) return null;

  await acquire();
  try {
    return await new Promise((resolve) => {
      let done = false;
      let child = null;
      let out = "";

      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          if (child && !child.killed) child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        resolve(value);
      };

      const timer = setTimeout(() => finish(null), Math.max(1000, timeoutMs));

      try {
        // ARGS ARRAY (no shell) — the prompt is passed verbatim, unescaped.
        child = spawn(bin, ["-p", text], { stdio: ["ignore", "pipe", "pipe"] });
      } catch {
        finish(null);
        return;
      }

      child.stdout.on("data", (d) => {
        out += d.toString();
      });
      // Drain stderr so the pipe never blocks; we don't surface it.
      child.stderr.on("data", () => {});
      child.on("error", () => finish(null));
      child.on("close", (code) => {
        if (code !== 0) return finish(null);
        const trimmed = out.trim();
        finish(trimmed.length ? trimmed : null);
      });
    });
  } finally {
    release();
  }
}

/* ------------------------------------------------------ askClaudeJSON ------ */

/** Strip a leading/trailing ``` or ```json fence if the model wrapped its JSON. */
function stripFences(s) {
  let t = String(s || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

/**
 * Like askClaude, but coerces the answer into a JSON object. Returns the parsed
 * object, or null on any failure. Never throws.
 */
async function askClaudeJSON(prompt, opts) {
  const wrapped =
    String(prompt == null ? "" : prompt) +
    "\n\nRespond with ONLY minified JSON, no prose, no code fences.";
  const raw = await askClaude(wrapped, opts);
  if (!raw) return null;

  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to a bracket-slice rescue */
  }
  // Rescue: parse the first {...} (or [...]) island if the model added stray prose.
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(cleaned.slice(objStart, objEnd + 1));
    } catch {
      /* ignore */
    }
  }
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

module.exports = { isClaudeAvailable, askClaude, askClaudeJSON };
