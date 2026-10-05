/**
 * agent.test.js — Ask Navya agent (POST /api/assistant/agent).
 *
 * Forces the no-model path (AI_CLI_ENABLED=false) so it is fast and independent of the host's
 * `claude` login; the model-output parser and link sanitizer are unit-tested directly.
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

process.env.AI_CLI_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");
const { parseModelOutput, sanitizeAnswer, GREETING_RE } = require("../modules/ai/service/agent");
const { retrieveKnowledge } = require("../modules/ai/service/agentKnowledge");

test.after(async () => {
  await pool.end().catch(() => {});
});

test("parseModelOutput: header + markdown body", () => {
  const p = parseModelOutput("MODE: hybrid\nSOURCES: S1, s3\nFOLLOWUPS: How do I sell? | What does it cost?\n---\nYou can **sell** free.");
  assert.equal(p.mode, "hybrid");
  assert.deepEqual(p.ids, ["S1", "S3"]);
  assert.deepEqual(p.followUps, ["How do I sell?", "What does it cost?"]);
  assert.equal(p.answer, "You can **sell** free.");
});

test("parseModelOutput: missing header degrades to plain answer, mode null", () => {
  const p = parseModelOutput("Just an answer.");
  assert.equal(p.mode, null);
  assert.equal(p.answer, "Just an answer.");
});

test("sanitizeAnswer: only retrieved links survive, externals become text", () => {
  const allowed = new Set(["/pricing", "/listing/lst_1"]);
  const out = sanitizeAnswer("See [Pricing](/pricing), [evil](https://evil.example/x), [made up](/secret) and https://x.example [S2] done", allowed);
  assert.match(out, /\[Pricing\]\(\/pricing\)/);
  assert.ok(!out.includes("evil.example"));
  assert.ok(!out.includes("/secret"));
  assert.ok(!out.includes("[S2]"));
  assert.ok(out.includes("evil") && out.includes("made up"));
});

test("knowledge retrieval is recruitment-flag aware", () => {
  const off = retrieveKnowledge("how do I apply for a job", false)[0];
  const on = retrieveKnowledge("how do I apply for a job", true)[0];
  assert.match(off.text, /COMING SOON/);
  assert.match(on.text, /\/recruitment\/jobs/);
});

test("greeting detector", () => {
  assert.ok(GREETING_RE.test("Hello"));
  assert.ok(GREETING_RE.test("hi navya!"));
  assert.ok(!GREETING_RE.test("hello, how do I sell a product"));
});

test("POST /api/assistant/agent: validation + never-blank deterministic answers", async () => {
  const empty = await request(app).post("/api/assistant/agent").send({ message: "  " });
  assert.equal(empty.status, 400);

  const hello = await request(app).post("/api/assistant/agent").send({ message: "Hello" });
  assert.equal(hello.status, 200);
  assert.equal(hello.body.data.usedAI, false);
  assert.match(hello.body.data.reply, /Navya/);
  assert.ok(hello.body.data.followUps.length > 0);

  for (const message of ["how do I sell my product", "what are your plans and pricing", "how many sellers are there", "find steel pipes in Mumbai", "what is the capital of France"]) {
    const r = await request(app).post("/api/assistant/agent").send({ message });
    assert.equal(r.status, 200, message);
    const d = r.body.data;
    assert.ok(typeof d.reply === "string" && d.reply.length > 10, `${message}: reply not blank`);
    assert.ok(["in_app", "hybrid", "general"].includes(d.mode), message);
    assert.ok(Array.isArray(d.results) && Array.isArray(d.suggestions) && Array.isArray(d.followUps), message);
    for (const c of d.results) assert.ok(c.href.startsWith("/"), "internal links only");
    for (const s of d.suggestions) assert.ok(s.href.startsWith("/"), "internal links only");
    assert.ok(!/contactMobile|@[a-z0-9-]+\.[a-z]{2,}/i.test(JSON.stringify(d)), `${message}: no contact PII`);
  }

  const sell = await request(app).post("/api/assistant/agent").send({ message: "how do I sell my product" });
  assert.match(sell.body.data.reply, /business details|listing/i);
  assert.ok(sell.body.data.suggestions.some((s) => s.href === "/sell"));
});
