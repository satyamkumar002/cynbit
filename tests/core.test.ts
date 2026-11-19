import { test } from "node:test";
import assert from "node:assert/strict";

import { estimateProject, formatINR, roundMoney } from "../src/lib/estimate";
import { scoreLead } from "../src/lib/scoring";
import { fallbackBrief } from "../src/lib/brief";
import { isConfident, retrieve } from "../src/lib/retrieval";
import { answer } from "../src/lib/assistant";
import { matchLabs } from "../src/lib/pathfinder";
import { generateSlots, isValidSlot, toIcs } from "../src/lib/slots";
import { blueprintInputSchema, type BlueprintInput } from "../src/lib/types";
import { MemoryStore } from "../src/lib/store/memory";
import { createSession, verifySession } from "../src/lib/auth";
import { parseJsonLoose } from "../src/lib/ai";

const base: Omit<BlueprintInput, "website"> = {
  service: "web-app",
  features: ["auth-roles", "payments"],
  goal: "A dealer portal where our dealers can place orders and download invoices.",
  scale: "standard",
  timeline: "normal",
  design: "refresh",
  integrations: 1,
  budget: "3-8l",
  contact: { name: "Test User", email: "test@acme.in", company: "Acme", role: "founder", phone: "" },
};

test("estimate is deterministic and ordered", () => {
  const a = estimateProject(base);
  const b = estimateProject(base);
  assert.deepEqual(a, b);
  assert.ok(a.costLow < a.costHigh);
  assert.ok(a.weeksLow < a.weeksHigh);
  assert.equal(a.phases.length, 6);
});

test("more features and enterprise scale cost more", () => {
  const small = estimateProject({ ...base, features: [] });
  const big = estimateProject({ ...base, features: ["auth-roles", "payments", "admin-panel", "realtime"] });
  const ent = estimateProject({ ...base, scale: "enterprise" });
  assert.ok(big.costLow > small.costLow);
  assert.ok(ent.costLow > estimateProject(base).costLow);
});

test("rush timeline costs more but is not slower", () => {
  const normal = estimateProject(base);
  const rush = estimateProject({ ...base, timeline: "rush" });
  assert.ok(rush.costLow > normal.costLow);
  assert.ok(rush.weeksHigh <= normal.weeksHigh);
});

test("unknown features are ignored, unknown service throws", () => {
  assert.deepEqual(estimateProject({ ...base, features: [...base.features, "nope"] }), estimateProject(base));
  assert.throws(() => estimateProject({ ...base, service: "nope" }));
});

test("money helpers", () => {
  assert.equal(roundMoney(123_456), 125_000);
  assert.equal(roundMoney(1_234_567), 1_230_000);
  assert.equal(formatINR(250_000), "₹2.5L");
  assert.equal(formatINR(1_500_000), "₹15L");
  assert.equal(formatINR(85_000), "₹85k");
});

test("lead score rewards fit, decision-makers and work email", () => {
  const est = estimateProject(base);
  const strong = scoreLead({ ...base, budget: "8-20l", timeline: "rush" }, est);
  const weak = scoreLead(
    { ...base, budget: "lt-1l", timeline: "flexible", contact: { ...base.contact, role: "other", company: "", email: "x@gmail.com" } },
    est,
  );
  assert.ok(strong.score > weak.score);
  assert.equal(strong.tier, "hot");
  assert.equal(weak.tier, "cold");
  assert.ok(strong.score <= 100 && weak.score >= 0);
});

test("fallback brief keeps the estimate and flags budget risk", () => {
  const est = estimateProject(base);
  const brief = fallbackBrief({ ...base, budget: "lt-1l" }, est);
  assert.equal(brief.source, "fallback");
  assert.ok(brief.summary.includes(formatINR(est.costLow)));
  assert.ok(brief.risks.some((r) => r.toLowerCase().includes("budget")));
  assert.deepEqual(brief.scope, ["Login, roles & permissions", "Online payments / subscriptions"]);
});

test("schema rejects honeypot and bad email", () => {
  assert.equal(blueprintInputSchema.safeParse({ ...base, website: "spam" }).success, false);
  assert.equal(blueprintInputSchema.safeParse({ ...base, contact: { ...base.contact, email: "nope" } }).success, false);
  assert.equal(blueprintInputSchema.safeParse(base).success, true);
});

test("retrieval finds the right page", () => {
  assert.equal(retrieve("how much is the internship fee")[0]?.doc.id, "be-fees");
  assert.equal(retrieve("where is your office")[0]?.doc.id, "contact");
  assert.equal(retrieve("what does TenantEase do")[0]?.doc.id, "prod-tenantease");
  assert.equal(retrieve("which tracks are in bitelevate")[0]?.doc.id, "be-labs");
  assert.equal(retrieve("which internship labs are there")[0]?.doc.id, "be-labs");
  assert.equal(retrieve("zzz qqq").length, 0);
});

test("retrieval is not fooled by one generic shared word", () => {
  for (const q of ["Do you sign NDAs before a call?", "Do you work with clients outside India?", "Can you maintain an existing Shopify store?"]) {
    assert.ok(retrieve(q).every((h) => !isConfident(h)), q);
  }
  assert.ok(isConfident(retrieve("Is there a stipend?")[0]));
});

test("fallback assistant answers known questions and admits unknown ones", async () => {
  const known = await answer("What is the BitElevate fee?", []);
  assert.equal(known.answered, true);
  assert.match(known.answer, /₹1,499/);
  assert.equal(known.action, "bitelevate");
  const followUp = await answer("and how long is it?", [{ role: "user", content: "Tell me about BitElevate" }]);
  assert.equal(followUp.answered, true);
  const fresh = await answer("Do you sign NDAs before a call?", [{ role: "user", content: "What is the BitElevate fee?" }]);
  assert.equal(fresh.answered, false, "earlier topic must not leak into a new question");
  const unknown = await answer("Do you sign NDAs before a call?", []);
  assert.equal(unknown.answered, false);
  assert.equal(unknown.action, "contact");
});

test("path finder ranks the obvious lab first and never says 100%", () => {
  const ai = matchLabs({ enjoy: ["ai"], skills: ["python", "ml"], goal: ["aiml"] });
  assert.equal(ai[0].lab.id, "ai");
  assert.ok(ai[0].percent < 100 && ai[0].percent > 50);
  const design = matchLabs({ enjoy: ["visual"], skills: ["figma"], goal: ["ux"] });
  assert.equal(design[0].lab.id, "design");
});

test("slots: IST working hours, no Sundays, booked slots removed", () => {
  const now = new Date("2026-11-19T15:26:00Z"); // Thu 20:56 IST
  const slots = generateSlots(now, new Set());
  assert.ok(slots.length > 50);
  for (const s of slots.slice(0, 40)) {
    const d = new Date(s.iso);
    const istHour = (d.getUTCHours() + 5 + (d.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
    assert.ok(istHour >= 11 && istHour < 18, `hour ${istHour}`);
    const istDay = new Date(d.getTime() + 330 * 60_000).getUTCDay();
    assert.notEqual(istDay, 0);
  }
  assert.ok(new Date(slots[0].iso).getTime() > now.getTime());
  const booked = generateSlots(now, new Set([slots[0].iso]));
  assert.equal(booked[0].iso, slots[1].iso);
  assert.equal(isValidSlot(slots[0].iso, now), true);
  assert.equal(isValidSlot("2026-11-22T03:00:00.000Z", now), false); // Sunday
  assert.match(toIcs({ iso: slots[0].iso, title: "Call", description: "a, b; c", url: "https://x", uid: "1" }), /DESCRIPTION:a\\, b\\; c/);
});

test("memory store prevents double booking", async () => {
  const store = new MemoryStore(false);
  const est = estimateProject(base);
  const mk = (id: string) => ({
    id, createdAt: new Date().toISOString(), input: base, estimate: est, brief: fallbackBrief(base, est),
    score: scoreLead(base, est), status: "new" as const, bookedSlot: null, source: "blueprint" as const,
  });
  await store.createLead(mk("a"));
  await store.createLead(mk("b"));
  const slot = "2026-11-23T06:00:00.000Z";
  assert.equal(await store.bookSlot("a", slot), true);
  assert.equal(await store.bookSlot("b", slot), false);
  assert.equal(await store.bookSlot("a", "2026-11-23T06:30:00.000Z"), false); // already booked once
});

test("admin session cookie verifies and rejects tampering", async () => {
  const { value } = await createSession();
  assert.equal(await verifySession(value), true);
  assert.equal(await verifySession(value.slice(0, -2) + "xx"), false);
  assert.equal(await verifySession("admin.9999999999.abc"), false);
  assert.equal(await verifySession(undefined), false);
});

test("parseJsonLoose handles fenced output", () => {
  assert.deepEqual(parseJsonLoose<{ a: number }>('Sure!\n```json\n{"a": 1}\n```'), { a: 1 });
  assert.equal(parseJsonLoose("no json"), null);
});
