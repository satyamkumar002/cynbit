import { z } from "zod";
import {
  BUDGET_BANDS,
  DESIGN_MULTIPLIER,
  SCALE_MULTIPLIER,
  SERVICES,
  TIMELINE_MULTIPLIER,
} from "./pricing.config";

const serviceIds = SERVICES.map((s) => s.id) as [string, ...string[]];
const keys = <T extends object>(o: T) => Object.keys(o) as [string, ...string[]];

export const blueprintInputSchema = z.object({
  service: z.enum(serviceIds),
  features: z.array(z.string().max(40)).max(12).default([]),
  goal: z.string().trim().min(10, "Tell us a little more about the goal (10+ characters)").max(1500),
  scale: z.enum(keys(SCALE_MULTIPLIER)),
  timeline: z.enum(keys(TIMELINE_MULTIPLIER)),
  design: z.enum(keys(DESIGN_MULTIPLIER)),
  integrations: z.number().int().min(0).max(10).default(0),
  budget: z.enum(keys(BUDGET_BANDS)),
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    company: z.string().trim().max(120).optional().default(""),
    role: z.enum(["founder", "manager", "engineer", "other"]).default("other"),
    phone: z.string().trim().max(20).optional().default(""),
  }),
  /** Honeypot field: real users never fill it */
  website: z.string().max(0).optional().default(""),
});

export type BlueprintInput = z.infer<typeof blueprintInputSchema>;

export interface Estimate {
  costLow: number;
  costHigh: number;
  weeksLow: number;
  weeksHigh: number;
  effortWeeks: number;
  teamSize: number;
  team: string[];
  phases: { name: string; weeks: number }[];
  assumptions: string[];
}

export interface Brief {
  title: string;
  summary: string;
  objectives: string[];
  scope: string[];
  risks: string[];
  questionsForCall: string[];
  suggestedStack: string[];
  source: "ai" | "fallback";
  provider: string;
}

export type LeadTier = "hot" | "warm" | "cold";
export type LeadStatus = "new" | "contacted" | "proposal" | "won" | "lost";

export interface LeadScore {
  score: number;
  tier: LeadTier;
  reasons: string[];
}

export interface Lead {
  id: string;
  createdAt: string;
  input: Omit<BlueprintInput, "website">;
  estimate: Estimate;
  brief: Brief;
  score: LeadScore;
  status: LeadStatus;
  bookedSlot: string | null;
  source: "blueprint" | "assistant";
  demo?: boolean;
}

export const applicationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(8).max(20),
  college: z.string().trim().min(2).max(160),
  stage: z.enum(["1st-2nd-year", "3rd-4th-year", "graduate", "working"]),
  lab: z.string().min(2).max(60),
  matchScore: z.number().min(0).max(100).optional(),
  goals: z.string().trim().min(10).max(1000),
  github: z.string().trim().max(200).optional().default(""),
  website: z.string().max(0).optional().default(""),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export type ApplicationStatus =
  | "submitted"
  | "under-review"
  | "advisor-call"
  | "enrolled"
  | "waitlisted";

export interface Application {
  code: string;
  createdAt: string;
  input: Omit<ApplicationInput, "website">;
  status: ApplicationStatus;
  history: { status: ApplicationStatus; at: string; note?: string }[];
  demo?: boolean;
}

export interface ChatLog {
  id: string;
  createdAt: string;
  question: string;
  answered: boolean;
  source: "ai" | "fallback";
  topSources: string[];
}
