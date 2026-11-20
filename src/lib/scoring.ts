import { BUDGET_BANDS } from "./pricing.config";
import type { BlueprintInput, Estimate, LeadScore } from "./types";

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|proton|protonmail|rediffmail)\./i;

/**
 * Transparent, rule-based lead score (0–100). Every point has a reason the
 * sales team can read, so nobody has to trust a black box.
 */
export function scoreLead(input: Omit<BlueprintInput, "website">, estimate: Estimate): LeadScore {
  let score = 20;
  const reasons: string[] = [];

  // 1. Budget fit (up to 30)
  const band = BUDGET_BANDS[input.budget as keyof typeof BUDGET_BANDS];
  if (input.budget === "unsure") {
    score += 10;
    reasons.push("+10 budget not decided yet");
  } else if (band.max >= estimate.costLow) {
    score += 30;
    reasons.push("+30 budget covers the estimate");
  } else if (band.max >= estimate.costLow * 0.6) {
    score += 15;
    reasons.push("+15 budget is close to the estimate");
  } else {
    reasons.push("+0 budget well below the estimate");
  }

  // 2. Decision-maker (up to 15)
  if (input.contact.role === "founder") {
    score += 15;
    reasons.push("+15 founder / decision-maker");
  } else if (input.contact.role === "manager") {
    score += 10;
    reasons.push("+10 manager");
  }

  // 3. Business identity (up to 15)
  if (input.contact.company) {
    score += 7;
    reasons.push("+7 company named");
  }
  if (!FREE_MAIL.test(input.contact.email)) {
    score += 8;
    reasons.push("+8 work email domain");
  }

  // 4. Urgency (up to 10)
  if (input.timeline === "rush") {
    score += 10;
    reasons.push("+10 wants to start within a month");
  } else if (input.timeline === "normal") {
    score += 6;
    reasons.push("+6 starting in 1–3 months");
  }

  // 5. Clarity of the brief (up to 10)
  const words = input.goal.split(/\s+/).filter(Boolean).length;
  if (words >= 40) {
    score += 10;
    reasons.push("+10 detailed goal description");
  } else if (words >= 15) {
    score += 5;
    reasons.push("+5 reasonable goal description");
  }

  score = Math.max(0, Math.min(100, score));
  const tier = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  return { score, tier, reasons };
}
