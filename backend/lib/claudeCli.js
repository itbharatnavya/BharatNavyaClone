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
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

/* --------------------------------------------------- binary resolution ----- */

let _binResolved = false;
let _binPath = null;

const IS_WIN = process.platform === "win32";

/**
 * Candidate spawn targets for a PATH directory `d` that might hold the `claude`
 * launcher. On POSIX, npm installs a shebang script at `d/claude` that the kernel
 * execs directly — no change needed. On Windows, npm installs `claude` (a bash
 * shebang script — NOT directly spawnable; child_process.spawn has no shebang
 * support and fails with ENOENT) plus `claude.cmd`/`claude.ps1` shims. Spawning a
 * `.cmd` needs `shell:true`, which would reopen the exact shell-injection risk
 * this module is designed to avoid (prompts are arbitrary user text). Instead we
 * target the REAL native executable the `.cmd` shim itself calls — npm's global
 * install always places it at `<prefix>/node_modules/@anthropic-ai/claude-code/
 * bin/claude.exe` — so `d` is npm's global prefix here. That keeps every spawn
 * argv-array, no-shell.
 */
function candidatesForDir(d) {
  if (!IS_WIN) return [path.join(d, "claude")];
  return [
    path.join(d, "claude.exe"),
    path.join(d, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
  ];
}

/** Resolve an executable `claude` on PATH (or a couple of sane fallbacks). Cached. */
function resolveBin() {
  if (_binResolved) return _binPath;
  _binResolved = true;

  const candidates = [];
  // Explicit override wins.
  if (process.env.CLAUDE_CLI_BIN) candidates.push(process.env.CLAUDE_CLI_BIN);
  // Every directory on PATH.
  const dirs = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const d of dirs) candidates.push(...candidatesForDir(d));
  // Common global-install locations (in case the server env has a trimmed PATH).
  if (process.env.HOME) {
    candidates.push(...candidatesForDir(path.join(process.env.HOME, ".npm-global", "bin")));
    candidates.push(...candidatesForDir(path.join(process.env.HOME, ".local", "bin")));
  }
  if (IS_WIN && process.env.APPDATA) {
    candidates.push(...candidatesForDir(path.join(process.env.APPDATA, "npm")));
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
async function askClaude(prompt, { timeoutMs = 15000, isolated = false } = {}) {
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
        // `isolated`: end-user-facing prose (Ask Navya agent). Without it the child inherits
        // the HOST's Claude Code user settings — hooks, plugins, output styles — and an
        // operator's personal setup (e.g. a terse "caveman" plugin) leaks into customer
        // answers. Run from a neutral cwd (no project CLAUDE.md) with only `local` settings;
        // NOT --bare, which would drop the subscription (OAuth) login this module relies on.
        const args = isolated
          ? ["-p", text, "--setting-sources", "local", "--disable-slash-commands", "--no-session-persistence"]
          : ["-p", text];
        child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"], ...(isolated ? { cwd: os.tmpdir() } : {}) });
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
