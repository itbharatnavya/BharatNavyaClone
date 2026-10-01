/**
 * update-goldens.js — regenerate every stored golden fixture from the current API
 * responses, then exit. Cross-platform wrapper so `npm run goldens:update` works the
 * same on Windows and POSIX (no inline `VAR=1 cmd`, no cross-env dependency).
 *
 * Use this deliberately, after a change you KNOW alters a response shape, and review
 * the resulting `git diff test/golden/` before committing. Never run it just to make
 * a red golden test go green — that defeats the entire point of the harness
 * (BACKEND-AUDIT.md Phase 0 / "Where this typically goes wrong").
 */

const { spawnSync } = require("child_process");
const path = require("path");

const res = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "--require", "./test/_env.js", "test/golden.test.js"],
  {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: { ...process.env, UPDATE_GOLDENS: "1" },
  }
);

process.exit(res.status || 0);
