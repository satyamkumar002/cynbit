import { fallbackBrief } from "../brief";
import { estimateProject } from "../estimate";
import { scoreLead } from "../scoring";
import type { Application, BlueprintInput, ChatLog, Lead, LeadStatus } from "../types";

/** Fictional demo records so the admin dashboard is not empty in memory mode. */

const daysAgo = (d: number, h = 11) => {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - d);
  t.setUTCHours(h - 5, 30, 0, 0); // h:00 IST
  return t.toISOString();
};

type SeedInput = Omit<BlueprintInput, "website">;

const LEADS: { input: SeedInput; status: LeadStatus; daysAgo: number }[] = [
  {
    daysAgo: 0,
    status: "new",
    input: {
      service: "ai-automation",
      features: ["lead-agent", "rag-kb", "analytics"],
      goal: "We run a chain of 12 diagnostic labs and get 400+ WhatsApp and website enquiries a day. We want an AI agent that answers test and price questions from our catalogue, books home sample collection, and hands over to a human for anything medical. Staff currently spend 5 hours a day on this.",
      scale: "standard",
      timeline: "normal",
      design: "refresh",
      integrations: 2,
      budget: "8-20l",
      contact: { name: "Priya Sharma (demo)", email: "priya@example-labs.in", company: "Example Diagnostics", role: "founder", phone: "" },
    },
  },
  {
    daysAgo: 1,
    status: "contacted",
    input: {
      service: "web-app",
      features: ["auth-roles", "payments", "admin-panel", "reports"],
      goal: "Customer portal for our B2B spare-parts distribution business where dealers can see stock, place orders and download invoices.",
      scale: "standard",
      timeline: "rush",
      design: "full",
      integrations: 1,
      budget: "3-8l",
      contact: { name: "Rahul Mehta (demo)", email: "rahul@example-parts.com", company: "Example Auto Parts", role: "manager", phone: "" },
    },
  },
  {
    daysAgo: 2,
    status: "new",
    input: {
      service: "seo-marketing",
      features: ["tech-seo", "landing"],
      goal: "Our cafe website does not show up on Google for nearby searches. Want more walk-ins.",
      scale: "mvp",
      timeline: "flexible",
      design: "have",
      integrations: 0,
      budget: "lt-1l",
      contact: { name: "Ankit (demo)", email: "ankit.demo@gmail.com", company: "", role: "other", phone: "" },
    },
  },
  {
    daysAgo: 4,
    status: "proposal",
    input: {
      service: "cloud",
      features: ["migration", "cicd", "monitoring", "security"],
      goal: "Move our on-premise ERP and two internal tools to AWS with proper CI/CD, monitoring and zero downtime cut-over. Audit requires access logs for 1 year.",
      scale: "enterprise",
      timeline: "normal",
      design: "have",
      integrations: 3,
      budget: "gt-20l",
      contact: { name: "Neha Iyer (demo)", email: "neha.iyer@example-mfg.co.in", company: "Example Manufacturing", role: "manager", phone: "" },
    },
  },
  {
    daysAgo: 6,
    status: "won",
    input: {
      service: "product-demo",
      features: ["revio", "data-import"],
      goal: "We have 6 restaurant outlets and want to reply to Google reviews faster and see which outlet is slipping.",
      scale: "standard",
      timeline: "rush",
      design: "have",
      integrations: 0,
      budget: "1-3l",
      contact: { name: "Kabir Singh (demo)", email: "kabir@example-foods.in", company: "Example Foods", role: "founder", phone: "" },
    },
  },
];

const APPS: Omit<Application, "history">[] = [
  {
    code: "BE-DEMO42",
    createdAt: daysAgo(0, 10),
    status: "submitted",
    input: { name: "Aditi Verma (demo)", email: "aditi.demo@example.com", phone: "9000000001", college: "Example Institute of Technology", stage: "3rd-4th-year", lab: "Full Stack SaaS Lab", matchScore: 84, goals: "Want to ship real features in a production codebase before placements.", github: "" },
  },
  {
    code: "BE-DEMO77",
    createdAt: daysAgo(1, 15),
    status: "advisor-call",
    input: { name: "Mohit Jain (demo)", email: "mohit.demo@example.com", phone: "9000000002", college: "Example University", stage: "graduate", lab: "AI & Vector Intelligence Lab", matchScore: 88, goals: "Moving from data analysis to building LLM features.", github: "" },
  },
  {
    code: "BE-DEMO19",
    createdAt: daysAgo(3, 12),
    status: "enrolled",
    input: { name: "Sara Khan (demo)", email: "sara.demo@example.com", phone: "9000000003", college: "Example College of Engineering", stage: "1st-2nd-year", lab: "UI/UX & Design Systems Lab", matchScore: 80, goals: "Build a portfolio-grade design system.", github: "" },
  },
];

const CHATS: Omit<ChatLog, "id">[] = [
  { createdAt: daysAgo(0, 12), question: "How much does a WhatsApp AI agent cost?", answered: true, source: "fallback", topSources: ["Pricing for client projects"] },
  { createdAt: daysAgo(0, 11), question: "Do you work with clients outside India?", answered: false, source: "fallback", topSources: [] },
  { createdAt: daysAgo(1, 18), question: "What is the BitElevate fee?", answered: true, source: "fallback", topSources: ["BitElevate fees"] },
  { createdAt: daysAgo(1, 9), question: "Do you sign NDAs before the discovery call?", answered: false, source: "fallback", topSources: [] },
  { createdAt: daysAgo(2, 14), question: "Which labs does BitElevate have?", answered: true, source: "fallback", topSources: ["BitElevate labs (tracks)"] },
  { createdAt: daysAgo(3, 16), question: "Is there a stipend for interns?", answered: true, source: "fallback", topSources: ["BitElevate fees"] },
  { createdAt: daysAgo(4, 10), question: "Can you maintain an existing Shopify store?", answered: false, source: "fallback", topSources: [] },
];

export function seedData(): { leads: Lead[]; applications: Application[]; chats: ChatLog[] } {
  const leads = LEADS.map((s, i) => {
    const estimate = estimateProject(s.input);
    return {
      id: `bp_demo${i + 1}`,
      createdAt: daysAgo(s.daysAgo, 9 + i),
      input: s.input,
      estimate,
      brief: fallbackBrief(s.input, estimate),
      score: scoreLead(s.input, estimate),
      status: s.status,
      bookedSlot: null,
      source: "blueprint" as const,
      demo: true,
    };
  });

  const order = ["submitted", "under-review", "advisor-call", "enrolled"] as const;
  const applications: Application[] = APPS.map((a) => {
    const upto = order.indexOf(a.status as (typeof order)[number]);
    return {
      ...a,
      demo: true,
      history: order.slice(0, upto + 1).map((status, j) => ({ status, at: new Date(Date.parse(a.createdAt) + j * 6 * 3600_000).toISOString() })),
    };
  });

  const chats = CHATS.map((c, i) => ({ ...c, id: `ch_demo${i}` }));
  return { leads, applications, chats };
}
