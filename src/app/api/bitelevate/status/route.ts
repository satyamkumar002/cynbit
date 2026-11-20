import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, rateLimit } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().trim().toUpperCase().max(12), email: z.string().trim().toLowerCase().max(120) });

export async function POST(req: Request) {
  if (!rateLimit(`status:${clientIp(req)}`, 15, 10 * 60_000)) return jsonError("Too many lookups, try again shortly.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your application code and email.", 422);

  const app = await getStore().getApplication(parsed.data.code);
  // Same message for "no such code" and "wrong email" so codes can't be enumerated.
  if (!app || app.input.email.toLowerCase() !== parsed.data.email) {
    return jsonError("No application found for that code and email.", 404);
  }
  return NextResponse.json({
    code: app.code,
    name: app.input.name.split(" ")[0],
    lab: app.input.lab,
    status: app.status,
    history: app.history,
    createdAt: app.createdAt,
  });
}
