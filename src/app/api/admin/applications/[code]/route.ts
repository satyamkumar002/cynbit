import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["submitted", "under-review", "advisor-call", "enrolled", "waitlisted"]),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid status", 422);
  const app = await getStore().updateApplicationStatus(code, parsed.data.status, parsed.data.note || undefined);
  if (!app) return jsonError("Not found", 404);
  return NextResponse.json({ code: app.code, status: app.status, history: app.history });
}
