/**
 * BitElevate Path Finder: recommends one of the six BitElevate labs from a
 * short quiz. Cynbit's "Generate My Custom Path" button gives no explanation of
 * how a path is chosen; this makes the match transparent (each answer adds
 * visible points to each lab).
 */

export interface Lab {
  id: string;
  name: string;
  project: string;
  stack: string[];
  pitch: string;
  roles: string[];
}

export const LABS: Lab[] = [
  {
    id: "fullstack",
    name: "Full Stack SaaS Lab",
    project: "SprintPulse",
    stack: ["Next.js 15", "React 19", "FastAPI", "PostgreSQL", "Tailwind CSS", "Docker"],
    pitch: "Build features end to end — UI, API and database — on a real SaaS codebase.",
    roles: ["Full-stack developer", "Software engineer"],
  },
  {
    id: "backend",
    name: "Python Backend Lab",
    project: "PulseServe API",
    stack: ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery"],
    pitch: "Design APIs, auth, caching and queues — the parts users never see but always feel.",
    roles: ["Backend developer", "API engineer"],
  },
  {
    id: "ai",
    name: "AI & Vector Intelligence Lab",
    project: "SupportPulse AI",
    stack: ["Python", "LLM APIs", "Vector databases", "RAG pipelines"],
    pitch: "Ship LLM features: retrieval, prompt pipelines and evaluation on a support product.",
    roles: ["AI engineer", "ML engineer"],
  },
  {
    id: "frontend",
    name: "Frontend Ops Dashboard Lab",
    project: "Ops Dashboard",
    stack: ["Next.js 15", "React", "TypeScript", "Charts & data viz"],
    pitch: "Build fast, accessible dashboards and interfaces that people use all day.",
    roles: ["Frontend developer", "UI engineer"],
  },
  {
    id: "qa",
    name: "QA & Automation Lab",
    project: "ApexCart E2E",
    stack: ["Playwright", "Pytest", "CI pipelines", "Test strategy"],
    pitch: "Break things on purpose: end-to-end tests and automation for an e-commerce app.",
    roles: ["QA / SDET", "Automation engineer"],
  },
  {
    id: "design",
    name: "UI/UX & Design Systems Lab",
    project: "ApexDesign",
    stack: ["Figma", "Design tokens", "Component libraries", "Accessibility"],
    pitch: "Research, design and document a design system developers can actually use.",
    roles: ["UI/UX designer", "Product designer"],
  },
];

export interface Option {
  id: string;
  label: string;
  /** points per lab id */
  points: Partial<Record<string, number>>;
}

export interface Question {
  id: string;
  title: string;
  multi?: boolean;
  options: Option[];
}

export const QUESTIONS: Question[] = [
  {
    id: "enjoy",
    title: "What do you enjoy most?",
    multi: true,
    options: [
      { id: "ui", label: "Making screens look and feel great", points: { frontend: 3, design: 2, fullstack: 1 } },
      { id: "logic", label: "Writing logic, APIs and databases", points: { backend: 3, fullstack: 2 } },
      { id: "ai", label: "Playing with AI / LLMs", points: { ai: 4 } },
      { id: "break", label: "Finding bugs and edge cases", points: { qa: 4 } },
      { id: "visual", label: "Sketching layouts and user flows", points: { design: 4 } },
      { id: "whole", label: "Building a whole product myself", points: { fullstack: 3 } },
    ],
  },
  {
    id: "skills",
    title: "Which of these have you used at least a little?",
    multi: true,
    options: [
      { id: "html", label: "HTML / CSS / JavaScript", points: { frontend: 2, fullstack: 1, design: 1 } },
      { id: "react", label: "React or Next.js", points: { frontend: 2, fullstack: 2 } },
      { id: "python", label: "Python", points: { backend: 2, ai: 2, qa: 1 } },
      { id: "sql", label: "SQL / databases", points: { backend: 2, fullstack: 1 } },
      { id: "ml", label: "ML libraries or LLM APIs", points: { ai: 3 } },
      { id: "figma", label: "Figma", points: { design: 3 } },
      { id: "testing", label: "Writing tests", points: { qa: 3, backend: 1 } },
      { id: "none", label: "None yet — I'm starting out", points: { fullstack: 1, frontend: 1 } },
    ],
  },
  {
    id: "goal",
    title: "What role do you want next?",
    options: [
      { id: "fs", label: "Full-stack / software engineer", points: { fullstack: 4 } },
      { id: "be", label: "Backend engineer", points: { backend: 4 } },
      { id: "fe", label: "Frontend engineer", points: { frontend: 4 } },
      { id: "aiml", label: "AI / ML engineer", points: { ai: 4 } },
      { id: "qa", label: "QA / SDET", points: { qa: 4 } },
      { id: "ux", label: "Product / UX designer", points: { design: 4 } },
    ],
  },
];

export interface LabMatch {
  lab: Lab;
  percent: number;
  reasons: string[];
}

export function matchLabs(answers: Record<string, string[]>): LabMatch[] {
  const totals: Record<string, number> = Object.fromEntries(LABS.map((l) => [l.id, 0]));
  const reasons: Record<string, string[]> = Object.fromEntries(LABS.map((l) => [l.id, []]));

  for (const q of QUESTIONS) {
    for (const optId of answers[q.id] ?? []) {
      const opt = q.options.find((o) => o.id === optId);
      if (!opt) continue;
      for (const [labId, pts] of Object.entries(opt.points)) {
        totals[labId] += pts ?? 0;
        if ((pts ?? 0) >= 2) reasons[labId].push(opt.label);
      }
    }
  }

  // Relative fit: the leader lands around 80–95%, never a misleading "100% match".
  const max = Math.max(1, ...Object.values(totals));
  return LABS.map((lab) => ({
    lab,
    percent: Math.round((totals[lab.id] / (max + 1.5)) * 100),
    reasons: reasons[lab.id].slice(0, 3),
  }))
    .sort((a, b) => b.percent - a.percent || LABS.indexOf(a.lab) - LABS.indexOf(b.lab));
}
