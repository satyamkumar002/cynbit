import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["new", "contacted", "proposal", "won", "lost"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid status", 422);
  const lead = await getStore().updateLeadStatus(id, parsed.data.status);
  if (!lead) return jsonError("Not found", 404);
  return NextResponse.json({ id: lead.id, status: lead.status });
}
