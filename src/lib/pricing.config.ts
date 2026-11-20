/**
 * Indicative pricing model used by the Blueprint estimator.
 *
 * IMPORTANT: Cynbit does not publish prices. Every number below is an
 * assumption made for this prototype, based on typical Indian agency rates
 * for small and mid-sized projects. The whole point of keeping it in one
 * config file is that the Cynbit team can replace these values with their
 * real rate card without touching any logic.
 */

export type ServiceId =
  | "ai-automation"
  | "web-app"
  | "mobile-app"
  | "cloud"
  | "seo-marketing"
  | "product-demo";

export interface FeatureDef {
  id: string;
  label: string;
  /** Effort in person-weeks added on top of the service base */
  effort: number;
}

export interface ServiceDef {
  id: ServiceId;
  label: string;
  tagline: string;
  icon: string;
  /** Base effort (person-weeks) for a minimal version */
  baseEffort: number;
  /** Minimum calendar weeks, even with a larger team */
  minWeeks: number;
  features: FeatureDef[];
  /** Roles staffed on this kind of project */
  team: string[];
}

/** Blended cost of one person-week in INR (assumption) */
export const RATE_PER_PERSON_WEEK = 42_000;

/** +/- spread applied to turn a point estimate into a range */
export const RANGE_SPREAD = { low: 0.85, high: 1.3 };

export const SCALE_MULTIPLIER = {
  mvp: { label: "MVP / proof of concept", factor: 0.75 },
  standard: { label: "Production launch", factor: 1 },
  enterprise: { label: "Enterprise grade (SSO, audit, SLAs)", factor: 1.6 },
} as const;

export const TIMELINE_MULTIPLIER = {
  rush: { label: "ASAP (under 1 month)", factor: 1.25 },
  normal: { label: "1–3 months", factor: 1 },
  flexible: { label: "Flexible / 3+ months", factor: 0.95 },
} as const;

export const DESIGN_MULTIPLIER = {
  have: { label: "We already have designs", factor: 0.9 },
  refresh: { label: "Light refresh of what exists", factor: 1 },
  full: { label: "Full UI/UX design from scratch", factor: 1.2 },
} as const;

/** Effort added per third-party integration (payment, CRM, ERP…) */
export const INTEGRATION_EFFORT = 0.8;

export const BUDGET_BANDS = {
  "lt-1l": { label: "Under ₹1 lakh", max: 100_000 },
  "1-3l": { label: "₹1–3 lakh", max: 300_000 },
  "3-8l": { label: "₹3–8 lakh", max: 800_000 },
  "8-20l": { label: "₹8–20 lakh", max: 2_000_000 },
  "gt-20l": { label: "₹20 lakh+", max: Number.POSITIVE_INFINITY },
  unsure: { label: "Not sure yet", max: Number.NaN },
} as const;

export const SERVICES: ServiceDef[] = [
  {
    id: "ai-automation",
    label: "AI automation & agents",
    tagline: "LLM agents, document processing, voice agents, workflow automation",
    icon: "🤖",
    baseEffort: 4,
    minWeeks: 3,
    team: ["AI engineer", "Backend engineer", "Project lead"],
    features: [
      { id: "lead-agent", label: "Lead qualification / sales agent", effort: 2.5 },
      { id: "doc-processing", label: "Document & data-entry automation", effort: 3 },
      { id: "voice-agent", label: "AI voice agent (calls)", effort: 4 },
      { id: "rag-kb", label: "Chatbot over our own documents (RAG)", effort: 3 },
      { id: "saas-integration", label: "Add AI into our existing software", effort: 2.5 },
      { id: "analytics", label: "Dashboard to monitor the automation", effort: 1.5 },
    ],
  },
  {
    id: "web-app",
    label: "Web app / platform",
    tagline: "SaaS products, portals, dashboards, marketplaces",
    icon: "🖥️",
    baseEffort: 5,
    minWeeks: 4,
    team: ["Full-stack engineer", "Frontend engineer", "UI/UX designer", "Project lead"],
    features: [
      { id: "auth-roles", label: "Login, roles & permissions", effort: 1.5 },
      { id: "payments", label: "Online payments / subscriptions", effort: 2 },
      { id: "admin-panel", label: "Admin panel", effort: 2 },
      { id: "realtime", label: "Real-time features (chat, live updates)", effort: 2.5 },
      { id: "reports", label: "Reports & analytics", effort: 1.5 },
      { id: "multi-tenant", label: "Multi-tenant SaaS", effort: 3 },
    ],
  },
  {
    id: "mobile-app",
    label: "Mobile app",
    tagline: "Android & iOS apps with a backend",
    icon: "📱",
    baseEffort: 6,
    minWeeks: 5,
    team: ["Mobile engineer", "Backend engineer", "UI/UX designer", "Project lead"],
    features: [
      { id: "auth-roles", label: "Login & user profiles", effort: 1.5 },
      { id: "payments", label: "In-app payments", effort: 2 },
      { id: "push", label: "Push notifications", effort: 1 },
      { id: "offline", label: "Offline mode", effort: 2.5 },
      { id: "maps", label: "Maps / location", effort: 1.5 },
      { id: "admin-panel", label: "Web admin panel", effort: 2 },
    ],
  },
  {
    id: "cloud",
    label: "Cloud & DevOps",
    tagline: "AWS / Azure setup, migration, CI/CD, cost and security",
    icon: "☁️",
    baseEffort: 3,
    minWeeks: 2,
    team: ["Cloud engineer", "DevOps engineer"],
    features: [
      { id: "migration", label: "Migrate an existing system to cloud", effort: 3 },
      { id: "cicd", label: "CI/CD pipelines", effort: 1 },
      { id: "k8s", label: "Containers / Kubernetes", effort: 2 },
      { id: "security", label: "Security hardening (zero-trust)", effort: 1.5 },
      { id: "cost", label: "Cloud cost optimisation", effort: 1 },
      { id: "monitoring", label: "Monitoring & alerting", effort: 1 },
    ],
  },
  {
    id: "seo-marketing",
    label: "Digital marketing & SEO",
    tagline: "Technical SEO, Google/Meta ads, funnels, CRM automation",
    icon: "📈",
    baseEffort: 2,
    minWeeks: 4,
    team: ["SEO specialist", "Performance marketer", "Content strategist"],
    features: [
      { id: "tech-seo", label: "Technical SEO audit & fixes", effort: 1.5 },
      { id: "ads", label: "Google & Meta performance ads", effort: 2 },
      { id: "landing", label: "Landing pages & funnel optimisation", effort: 1.5 },
      { id: "crm", label: "CRM & marketing automation", effort: 2 },
      { id: "content", label: "Content strategy", effort: 1.5 },
    ],
  },
  {
    id: "product-demo",
    label: "One of Cynbit's products",
    tagline: "Revio, TenantEase or Cynbit Studio — set up for your business",
    icon: "🧩",
    baseEffort: 1,
    minWeeks: 1,
    team: ["Solutions engineer", "Customer success lead"],
    features: [
      { id: "revio", label: "Revio — AI review & reputation management", effort: 0.5 },
      { id: "tenantease", label: "TenantEase — property & rent management", effort: 0.5 },
      { id: "studio", label: "Cynbit Studio — career & coding platform", effort: 0.5 },
      { id: "custom-branding", label: "Custom branding / white-label", effort: 1 },
      { id: "data-import", label: "Import our existing data", effort: 1 },
    ],
  },
];

/**
 * Cynbit's own six-step delivery process (from cynbit.in), with the share of
 * the timeline each phase usually takes.
 */
export const PROCESS_PHASES = [
  { name: "Discovery & audit", share: 0.1 },
  { name: "Strategy & blueprinting", share: 0.1 },
  { name: "High-fidelity design", share: 0.15 },
  { name: "Technical implementation", share: 0.45 },
  { name: "Quality & integrity check", share: 0.12 },
  { name: "Deployment & evolution", share: 0.08 },
] as const;

export function getService(id: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.id === id);
}
