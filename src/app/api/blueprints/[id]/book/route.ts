import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, rateLimit } from "@/lib/http";
import { formatSlot, isValidSlot } from "@/lib/slots";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const bodySchema = z.object({ slot: z.string().max(40) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`book:${clientIp(req)}`, 10, 10 * 60_000)) return jsonError("Too many attempts, try again shortly.", 429);
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Pick a time slot.", 422);
  const { slot } = parsed.data;

  if (!isValidSlot(slot, new Date())) return jsonError("That time is not available any more. Please pick another.", 409);

  const store = getStore();
  const lead = await store.getLead(id);
  if (!lead) return jsonError("Blueprint not found.", 404);
  if (lead.bookedSlot) return jsonError("A call is already booked for this blueprint.", 409, { bookedSlot: lead.bookedSlot });

  const ok = await store.bookSlot(id, slot);
  if (!ok) return jsonError("Someone just booked that slot. Please pick another.", 409);
  return NextResponse.json({ bookedSlot: slot, ...formatSlot(slot) });
}
