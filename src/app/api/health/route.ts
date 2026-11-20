import { NextResponse } from "next/server";
import { activeModel, activeProvider } from "@/lib/ai";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    storage: getStore().kind,
    ai: { provider: activeProvider(), model: activeModel() },
    time: new Date().toISOString(),
  });
}
