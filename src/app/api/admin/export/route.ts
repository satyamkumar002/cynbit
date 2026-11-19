import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") === "applications" ? "applications" : "leads";
  const store = getStore();
  let rows: unknown[][];
  if (type === "leads") {
    const leads = await store.listLeads();
    rows = [
      ["created_at", "name", "email", "company", "role", "service", "score", "tier", "status", "cost_low", "cost_high", "weeks_low", "weeks_high", "booked_call", "brief_title"],
      ...leads.map((l) => [
        l.createdAt, l.input.contact.name, l.input.contact.email, l.input.contact.company, l.input.contact.role, l.input.service,
        l.score.score, l.score.tier, l.status, l.estimate.costLow, l.estimate.costHigh, l.estimate.weeksLow, l.estimate.weeksHigh,
        l.bookedSlot ?? "", l.brief.title,
      ]),
    ];
  } else {
    const apps = await store.listApplications();
    rows = [
      ["created_at", "code", "name", "email", "phone", "college", "stage", "lab", "match", "status"],
      ...apps.map((a) => [a.createdAt, a.code, a.input.name, a.input.email, a.input.phone, a.input.college, a.input.stage, a.input.lab, a.input.matchScore ?? "", a.status]),
    ];
  }
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cynbit-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
