import { NextResponse } from "next/server";
import { generateSlots } from "@/lib/slots";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const booked = new Set(await getStore().listBookedSlots(now.toISOString()));
  return NextResponse.json({ timezone: "Asia/Kolkata", slots: generateSlots(now, booked) });
}
