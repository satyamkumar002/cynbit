import {
  DESIGN_MULTIPLIER,
  INTEGRATION_EFFORT,
  PROCESS_PHASES,
  RANGE_SPREAD,
  RATE_PER_PERSON_WEEK,
  SCALE_MULTIPLIER,
  TIMELINE_MULTIPLIER,
  getService,
} from "./pricing.config";
import type { BlueprintInput, Estimate } from "./types";

type EstimateInput = Pick<
  BlueprintInput,
  "service" | "features" | "scale" | "timeline" | "design" | "integrations"
>;

/** Round money to a "quotable" number: nearest ₹5,000 under 2L, nearest ₹10,000 above. */
export function roundMoney(n: number): number {
  const step = n < 200_000 ? 5_000 : 10_000;
  return Math.max(step, Math.round(n / step) * step);
}

/**
 * Pure, deterministic estimator. Same input always gives the same output, so
 * the estimate a visitor sees is exactly what the sales team sees later.
 */
export function estimateProject(input: EstimateInput): Estimate {
  const service = getService(input.service);
  if (!service) throw new Error(`Unknown service: ${input.service}`);

  const chosen = service.features.filter((f) => input.features.includes(f.id));
  const featureEffort = chosen.reduce((sum, f) => sum + f.effort, 0);
  const integrationEffort = input.integrations * INTEGRATION_EFFORT;

  const scale = SCALE_MULTIPLIER[input.scale as keyof typeof SCALE_MULTIPLIER].factor;
  const design = DESIGN_MULTIPLIER[input.design as keyof typeof DESIGN_MULTIPLIER].factor;
  const rush = TIMELINE_MULTIPLIER[input.timeline as keyof typeof TIMELINE_MULTIPLIER].factor;

  const effortWeeks = (service.baseEffort + featureEffort + integrationEffort) * scale * design;

  // Bigger projects get more people working in parallel; rush projects get one extra.
  let teamSize = Math.min(service.team.length + 1, Math.max(1, Math.ceil(effortWeeks / 6)));
  if (input.timeline === "rush") teamSize = Math.min(teamSize + 1, service.team.length + 2);

  // Parallel work is never perfectly efficient (Brooks's law): ~15% overhead per extra person.
  const parallelEfficiency = 1 / (1 + 0.15 * (teamSize - 1));
  const calendarWeeks = Math.max(service.minWeeks, effortWeeks / (teamSize * parallelEfficiency));

  const cost = effortWeeks * RATE_PER_PERSON_WEEK * rush;
  const costLow = roundMoney(cost * RANGE_SPREAD.low);
  const costHigh = roundMoney(cost * RANGE_SPREAD.high);
  const weeksLow = Math.max(1, Math.round(calendarWeeks * 0.9));
  const weeksHigh = Math.max(weeksLow + 1, Math.round(calendarWeeks * 1.3));

  const midWeeks = (weeksLow + weeksHigh) / 2;
  const phases = PROCESS_PHASES.map((p) => ({
    name: p.name,
    weeks: Math.max(0.5, Math.round(midWeeks * p.share * 2) / 2),
  }));

  const assumptions = [
    `Based on ${chosen.length} selected feature${chosen.length === 1 ? "" : "s"} and ${input.integrations} third-party integration${input.integrations === 1 ? "" : "s"}.`,
    `Scale: ${SCALE_MULTIPLIER[input.scale as keyof typeof SCALE_MULTIPLIER].label}.`,
    `Design: ${DESIGN_MULTIPLIER[input.design as keyof typeof DESIGN_MULTIPLIER].label}.`,
    input.timeline === "rush"
      ? "Rush timeline adds ~25% for a larger, parallel team."
      : `Timeline: ${TIMELINE_MULTIPLIER[input.timeline as keyof typeof TIMELINE_MULTIPLIER].label}.`,
    "Excludes third-party costs (cloud hosting, API usage, app-store fees).",
    "Indicative only — the final quote follows the discovery call.",
  ];

  return {
    costLow,
    costHigh,
    weeksLow,
    weeksHigh,
    effortWeeks: Math.round(effortWeeks * 10) / 10,
    teamSize,
    team: service.team.slice(0, Math.max(2, Math.min(service.team.length, teamSize + 1))),
    phases,
    assumptions,
  };
}

export function formatINR(n: number): string {
  if (n >= 100_000) {
    const lakh = n / 100_000;
    return `₹${lakh >= 10 ? lakh.toFixed(0) : lakh.toFixed(1).replace(/\.0$/, "")}L`;
  }
  return `₹${Math.round(n / 1000)}k`;
}
