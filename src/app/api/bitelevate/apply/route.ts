import { NextResponse } from "next/server";
import { clientIp, jsonError, rateLimit, zodMessage } from "@/lib/http";
import { applicationCode } from "@/lib/ids";
import { LABS } from "@/lib/pathfinder";
import { getStore } from "@/lib/store";
import { applicationInputSchema, type Application } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`apply:${clientIp(req)}`, 5, 10 * 60_000)) return jsonError("Too many applications from this network.", 429);
  const parsed = applicationInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  if (parsed.data.website) return NextResponse.json({ code: "BE-IGNORE" }, { status: 201 });

  const { website: _hp, ...input } = parsed.data;
  if (!LABS.some((l) => l.name === input.lab)) return jsonError("Unknown lab.", 422);

  const now = new Date().toISOString();
  const app: Application = {
    code: applicationCode(),
    createdAt: now,
    input,
    status: "submitted",
    history: [{ status: "submitted", at: now }],
  };
  await getStore().createApplication(app);
  return NextResponse.json({ code: app.code }, { status: 201 });
}
