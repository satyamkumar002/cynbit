import { activeProvider, generate, parseJsonLoose } from "./ai";
import { formatINR } from "./estimate";
import { BUDGET_BANDS, SCALE_MULTIPLIER, getService } from "./pricing.config";
import type { BlueprintInput, Brief, Estimate } from "./types";

const STACKS: Record<string, string[]> = {
  "ai-automation": ["Python + FastAPI", "OpenAI / Gemini / Claude APIs", "LangChain", "PostgreSQL + pgvector", "AWS Lambda"],
  "web-app": ["Next.js + React", "TypeScript", "Node.js or FastAPI", "PostgreSQL", "AWS / Vercel"],
  "mobile-app": ["React Native", "TypeScript", "Node.js API", "PostgreSQL", "Firebase Cloud Messaging"],
  cloud: ["AWS or Azure", "Terraform", "Docker + Kubernetes", "GitHub Actions", "Grafana / CloudWatch"],
  "seo-marketing": ["Google Search Console", "GA4", "Google & Meta Ads", "HubSpot / Zoho CRM", "Next.js landing pages"],
  "product-demo": ["Cynbit SaaS suite", "SSO / role-based access", "CSV / API data import"],
};

type Input = Omit<BlueprintInput, "website">;

function featureLabels(input: Input): string[] {
  const svc = getService(input.service)!;
  return svc.features.filter((f) => input.features.includes(f.id)).map((f) => f.label);
}

/** Deterministic brief used when no AI provider is configured or the call fails. */
export function fallbackBrief(input: Input, estimate: Estimate): Brief {
  const svc = getService(input.service)!;
  const features = featureLabels(input);
  const who = input.contact.company || input.contact.name;
  const goal = input.goal.trim().replace(/\s+/g, " ");
  const shortGoal = goal.length > 220 ? `${goal.slice(0, 217)}…` : goal;

  const risks: string[] = [];
  if (input.timeline === "rush") risks.push("Tight timeline — scope must be frozen early to hit the date.");
  if (input.integrations >= 3) risks.push(`${input.integrations} third-party integrations: API access and sandbox accounts are needed up front.`);
  if (input.scale === "enterprise") risks.push("Enterprise requirements (SSO, audit logs, SLAs) need security review time.");
  const band = BUDGET_BANDS[input.budget as keyof typeof BUDGET_BANDS];
  if (input.budget !== "unsure" && band.max < estimate.costLow)
    risks.push("Stated budget is below the indicative range — consider an MVP-first phase.");
  if (input.design === "full") risks.push("Full design from scratch: design sign-off is on the critical path.");
  if (risks.length === 0) risks.push("No major risks flagged from the brief; confirm data access and stakeholders on the call.");

  return {
    title: `${svc.label} for ${who}`,
    summary: `${who} needs help with ${svc.label}. In their words: “${shortGoal}” The indicative plan is a ${SCALE_MULTIPLIER[input.scale as keyof typeof SCALE_MULTIPLIER].label.toLowerCase()} delivered in about ${estimate.weeksLow}–${estimate.weeksHigh} weeks for ${formatINR(estimate.costLow)}–${formatINR(estimate.costHigh)}.`,
    objectives: [
      "Ship a working first version that solves the core problem described above.",
      features.length ? `Deliver: ${features.slice(0, 3).join(", ")}${features.length > 3 ? " and more" : ""}.` : "Agree the must-have feature list during discovery.",
      "Set up measurable success metrics before development starts.",
    ],
    scope: features.length ? features : [`Core ${svc.label.toLowerCase()} build`],
    risks,
    questionsForCall: [
      "Who are the end users, and how many do you expect in the first 6 months?",
      "Which existing tools or systems does this need to connect to?",
      "What does success look like 3 months after launch?",
      "Who signs off on design and scope on your side?",
    ],
    suggestedStack: STACKS[input.service] ?? [],
    source: "fallback",
    provider: "rules",
  };
}

const SYSTEM = `You are a senior solutions architect at Cynbit Technologies, an AI automation and software development company in Jaipur, India.
You turn a prospect's rough project request into a crisp project brief that Cynbit's sales team can use on a discovery call.
Rules:
- Only use facts from the request. Do not invent company details, budgets or numbers.
- Keep the provided estimate exactly as given; never change prices or timelines.
- Be concrete and practical. Plain English, no buzzwords.
- Output JSON with keys: title (string, max 70 chars), summary (2-3 sentences), objectives (3-4 strings), scope (3-7 strings), risks (2-4 strings), questionsForCall (3-5 strings), suggestedStack (3-6 strings).`;

export async function generateBrief(input: Input, estimate: Estimate): Promise<Brief> {
  const fallback = fallbackBrief(input, estimate);
  if (activeProvider() === "none") return fallback;

  const svc = getService(input.service)!;
  const prompt = `Project request:
- Service: ${svc.label}
- Selected features: ${featureLabels(input).join("; ") || "none selected"}
- Goal in the prospect's words: """${input.goal}"""
- Scale: ${input.scale}; Timeline: ${input.timeline}; Design: ${input.design}; Integrations: ${input.integrations}
- Budget band: ${BUDGET_BANDS[input.budget as keyof typeof BUDGET_BANDS].label}
- Company: ${input.contact.company || "not given"}; Contact role: ${input.contact.role}
Indicative estimate (fixed, do not change): ${formatINR(estimate.costLow)}–${formatINR(estimate.costHigh)}, ${estimate.weeksLow}–${estimate.weeksHigh} weeks, team of ${estimate.teamSize}.
Write the brief as JSON.`;

  const raw = await generate({ system: SYSTEM, messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1200 });
  const parsed = parseJsonLoose<Partial<Brief>>(raw);
  if (!parsed || typeof parsed.summary !== "string") return fallback;

  const arr = (v: unknown, fb: string[]) =>
    Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? (v as string[]).slice(0, 8) : fb;

  return {
    title: typeof parsed.title === "string" && parsed.title ? parsed.title.slice(0, 90) : fallback.title,
    summary: parsed.summary.slice(0, 800),
    objectives: arr(parsed.objectives, fallback.objectives),
    scope: arr(parsed.scope, fallback.scope),
    risks: arr(parsed.risks, fallback.risks),
    questionsForCall: arr(parsed.questionsForCall, fallback.questionsForCall),
    suggestedStack: arr(parsed.suggestedStack, fallback.suggestedStack),
    source: "ai",
    provider: activeProvider(),
  };
}
