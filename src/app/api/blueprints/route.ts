import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";
import { estimateProject } from "@/lib/estimate";
import { clientIp, jsonError, rateLimit, zodMessage } from "@/lib/http";
import { leadId } from "@/lib/ids";
import { scoreLead } from "@/lib/scoring";
import { getStore } from "@/lib/store";
import { blueprintInputSchema, type Lead } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`bp:${clientIp(req)}`, 8, 10 * 60_000)) {
    return jsonError("Too many blueprints from this network. Please try again in a few minutes.", 429);
  }
  const body = await req.json().catch(() => null);
  const parsed = blueprintInputSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  // Honeypot filled → pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ id: "bp_ignored" }, { status: 201 });

  const { website: _hp, ...input } = parsed.data;
  // The estimator ignores feature ids that don't belong to the chosen service.
  const estimate = estimateProject(input);
  const brief = await generateBrief(input, estimate);
  const lead: Lead = {
    id: leadId(),
    createdAt: new Date().toISOString(),
    input,
    estimate,
    brief,
    score: scoreLead(input, estimate),
    status: "new",
    bookedSlot: null,
    source: "blueprint",
  };
  await getStore().createLead(lead);
  return NextResponse.json({ id: lead.id, briefSource: brief.source }, { status: 201 });
}
