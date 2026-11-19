import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

import { activeProvider, generate } from "../src/lib/ai";
import { generateBrief } from "../src/lib/brief";
import { answer } from "../src/lib/assistant";
import { estimateProject } from "../src/lib/estimate";
import type { BlueprintInput } from "../src/lib/types";

const realFetch = globalThis.fetch;
const KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "AI_MODEL"];

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of KEYS) delete process.env[k];
});

function stubFetch(handler: (url: string, body: any, headers: Record<string, string>) => unknown, status = 200) {
  const calls: { url: string; body: any }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, body });
    const payload = handler(url, body, init.headers as Record<string, string>);
    return new Response(JSON.stringify(payload), { status });
  }) as typeof fetch;
  return calls;
}

const input: Omit<BlueprintInput, "website"> = {
  service: "ai-automation",
  features: ["rag-kb"],
  goal: "An assistant that answers questions from our policy documents for 200 staff.",
  scale: "standard",
  timeline: "normal",
  design: "refresh",
  integrations: 1,
  budget: "3-8l",
  contact: { name: "A", email: "a@b.in", company: "B", role: "manager", phone: "" },
};

const BRIEF_JSON = JSON.stringify({
  title: "Policy assistant for B",
  summary: "B wants an internal assistant.",
  objectives: ["o1", "o2", "o3"],
  scope: ["s1", "s2", "s3"],
  risks: ["r1", "r2"],
  questionsForCall: ["q1", "q2", "q3"],
  suggestedStack: ["Python", "pgvector", "FastAPI"],
});

test("no key → provider none → fallback, no network", async () => {
  assert.equal(activeProvider(), "none");
  const calls = stubFetch(() => ({}));
  const brief = await generateBrief(input, estimateProject(input));
  assert.equal(brief.source, "fallback");
  assert.equal(calls.length, 0);
});

test("Gemini request shape and brief parsing", async () => {
  process.env.GEMINI_API_KEY = "g-key";
  const calls = stubFetch((url, body, headers) => {
    assert.match(url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent$/);
    assert.equal(headers["x-goog-api-key"], "g-key");
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    return { candidates: [{ content: { parts: [{ text: "```json\n" + BRIEF_JSON + "\n```" }] } }] };
  });
  const brief = await generateBrief(input, estimateProject(input));
  assert.equal(calls.length, 1);
  assert.equal(brief.source, "ai");
  assert.equal(brief.provider, "gemini");
  assert.equal(brief.title, "Policy assistant for B");
});

test("OpenAI request shape", async () => {
  process.env.OPENAI_API_KEY = "o-key";
  process.env.AI_MODEL = "custom-model";
  stubFetch((url, body, headers) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(headers.authorization, "Bearer o-key");
    assert.equal(body.model, "custom-model");
    assert.equal(body.messages[0].role, "system");
    return { choices: [{ message: { content: BRIEF_JSON } }] };
  });
  const brief = await generateBrief(input, estimateProject(input));
  assert.equal(brief.provider, "openai");
});

test("Anthropic request shape and explicit provider choice", async () => {
  process.env.GEMINI_API_KEY = "g";
  process.env.ANTHROPIC_API_KEY = "a-key";
  process.env.AI_PROVIDER = "anthropic";
  stubFetch((url, body, headers) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(headers["x-api-key"], "a-key");
    assert.equal(headers["anthropic-version"], "2023-06-01");
    assert.ok(typeof body.system === "string");
    return { content: [{ type: "text", text: BRIEF_JSON }] };
  });
  const brief = await generateBrief(input, estimateProject(input));
  assert.equal(brief.provider, "anthropic");
});

test("provider error → fallback brief", async () => {
  process.env.GEMINI_API_KEY = "g";
  stubFetch(() => ({ error: "quota" }), 429);
  const brief = await generateBrief(input, estimateProject(input));
  assert.equal(brief.source, "fallback");
});

test("malformed JSON → fallback brief", async () => {
  process.env.OPENAI_API_KEY = "o";
  stubFetch(() => ({ choices: [{ message: { content: "I can't do JSON today" } }] }));
  assert.equal((await generateBrief(input, estimateProject(input))).source, "fallback");
});

test("assistant sends retrieved context and reads the ANSWERED flag", async () => {
  process.env.GEMINI_API_KEY = "g";
  stubFetch((_u, body) => {
    const last = body.contents.at(-1).parts[0].text as string;
    assert.match(last, /BitElevate fees/);
    return { candidates: [{ content: { parts: [{ text: "It's a one-time ₹1,499 fee.\nANSWERED: yes" }] } }] };
  });
  const r = await answer("What is the internship fee?", []);
  assert.equal(r.source, "ai");
  assert.equal(r.answered, true);
  assert.equal(r.answer, "It's a one-time ₹1,499 fee.");
  assert.ok(r.sources.some((s) => s.title === "BitElevate fees"));

  stubFetch(() => ({ candidates: [{ content: { parts: [{ text: "I don't know that.\nANSWERED: no" }] } }] }));
  const r2 = await answer("Do you sign NDAs?", []);
  assert.equal(r2.answered, false);
  assert.equal(r2.sources.length, 0);
  assert.equal(r2.action, "contact");
});

test("generate returns null on network failure", async () => {
  process.env.ANTHROPIC_API_KEY = "a";
  globalThis.fetch = (async () => {
    throw new Error("ECONNRESET");
  }) as typeof fetch;
  assert.equal(await generate({ system: "s", messages: [{ role: "user", content: "hi" }] }), null);
});
