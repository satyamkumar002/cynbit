import { siteUrl } from "@/lib/http";
import { toIcs } from "@/lib/slots";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getStore().getLead(id);
  if (!lead?.bookedSlot) return new Response("No call booked", { status: 404 });
  const url = `${siteUrl(req)}/start/${lead.id}`;
  const ics = toIcs({
    iso: lead.bookedSlot,
    uid: lead.id,
    title: "Cynbit discovery call",
    description: `Discovery call about: ${lead.brief.title}\nYour blueprint: ${url}`,
    url,
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="cynbit-discovery-call.ics"`,
    },
  });
}
