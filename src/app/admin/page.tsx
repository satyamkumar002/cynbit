import type { Metadata } from "next";
import Link from "next/link";
import { activeModel, activeProvider } from "@/lib/ai";
import { formatINR } from "@/lib/estimate";
import { getService } from "@/lib/pricing.config";
import { formatSlot } from "@/lib/slots";
import { getStore } from "@/lib/store";
import { TIER_STYLE, cx } from "@/lib/ui";
import { StatusSelect } from "./StatusSelect";

export const metadata: Metadata = { title: "Team dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

const LEAD_STATUSES = ["new", "contacted", "proposal", "won", "lost"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));
const APP_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "Under review" },
  { value: "advisor-call", label: "Advisor call" },
  { value: "enrolled", label: "Enrolled" },
  { value: "waitlisted", label: "Waitlisted" },
];

const STAGE_LABEL: Record<string, string> = {
  "1st-2nd-year": "1st/2nd year",
  "3rd-4th-year": "3rd/4th year",
  graduate: "Graduate",
  working: "Working",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function AdminPage() {
  const store = getStore();
  const [leads, apps, chats] = await Promise.all([store.listLeads(), store.listApplications(), store.listChats(200)]);

  const open = leads.filter((l) => l.status !== "lost" && l.status !== "won");
  const pipelineMid = open.reduce((s, l) => s + (l.estimate.costLow + l.estimate.costHigh) / 2, 0);
  const hot = leads.filter((l) => l.score.tier === "hot").length;
  const booked = leads.filter((l) => l.bookedSlot).sort((a, b) => a.bookedSlot!.localeCompare(b.bookedSlot!));
  const upcoming = booked.filter((l) => l.bookedSlot! >= new Date().toISOString());
  const answeredRate = chats.length ? Math.round((chats.filter((c) => c.answered).length / chats.length) * 100) : 0;
  const unanswered = chats.filter((c) => !c.answered).slice(0, 8);
  const sorted = [...leads].sort((a, b) => b.score.score - a.score.score || b.createdAt.localeCompare(a.createdAt));

  const labCounts = apps.reduce<Record<string, number>>((m, a) => ((m[a.input.lab] = (m[a.input.lab] ?? 0) + 1), m), {});

  const kpis = [
    ["Leads", leads.length, `${hot} hot`],
    ["Open pipeline", formatINR(pipelineMid), "mid-point of estimates"],
    ["Calls booked", booked.length, `${upcoming.length} upcoming`],
    ["Applications", apps.length, `${apps.filter((a) => a.status === "submitted").length} awaiting review`],
    ["Assistant", `${answeredRate}%`, `answered of ${chats.length} questions`],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Team dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Leads, calls and applications</h1>
          <p className="mt-1 text-xs text-muted">
            Storage: <span className="text-text">{store.kind}</span>
            {store.kind === "memory" && " (demo data, resets on restart)"} · AI:{" "}
            <span className="text-text">{activeProvider() === "none" ? "rule-based fallback" : `${activeProvider()} / ${activeModel()}`}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn-ghost text-xs" href="/api/admin/export?type=leads">Export leads CSV</a>
          <a className="btn-ghost text-xs" href="/api/admin/export?type=applications">Export applications CSV</a>
          <form action="/api/admin/logout" method="post">
            <button className="btn-ghost text-xs">Sign out</button>
          </form>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-bold">{value}</dd>
            <dd className="text-xs text-muted">{sub}</dd>
          </div>
        ))}
      </dl>

      {/* Leads */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Leads by score</h2>
        <p className="text-sm text-muted">Expand a lead to read its brief and see why it scored the way it did.</p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 font-medium">Score</th>
                <th scope="col" className="px-4 py-3 font-medium">Lead</th>
                <th scope="col" className="px-4 py-3 font-medium">Project</th>
                <th scope="col" className="px-4 py-3 font-medium">Estimate</th>
                <th scope="col" className="px-4 py-3 font-medium">Call</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => (
                <tr key={l.id} className="border-b border-line/60 align-top last:border-0">
                  <td className="px-4 py-3">
                    <span className={cx("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold", TIER_STYLE[l.score.tier])}>
                      {l.score.score} · {l.score.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.input.contact.name}</p>
                    <p className="text-xs text-muted">
                      {l.input.contact.company || "—"} · {l.input.contact.role}
                    </p>
                    <a className="text-xs text-accent hover:underline" href={`mailto:${l.input.contact.email}`}>{l.input.contact.email}</a>
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <details>
                      <summary className="cursor-pointer">
                        <span className="font-medium">{l.brief.title}</span>
                        <span className="block text-xs text-muted">
                          {getService(l.input.service)?.label} · {fmtDate(l.createdAt)}
                          {l.demo && " · demo"}
                        </span>
                      </summary>
                      <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                        <p className="text-text">{l.brief.summary}</p>
                        <p><span className="text-text">Risks:</span> {l.brief.risks.join(" ")}</p>
                        <p><span className="text-text">Ask on the call:</span> {l.brief.questionsForCall.join(" ")}</p>
                        <p><span className="text-text">Score breakdown:</span> {l.score.reasons.join(", ")}</p>
                        <Link href={`/start/${l.id}`} className="text-accent hover:underline">Open blueprint →</Link>
                      </div>
                    </details>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatINR(l.estimate.costLow)}–{formatINR(l.estimate.costHigh)}
                    <span className="block text-xs text-muted">{l.estimate.weeksLow}–{l.estimate.weeksHigh} wks</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {l.bookedSlot ? (
                      <>
                        {formatSlot(l.bookedSlot).day}
                        <span className="block text-muted">{formatSlot(l.bookedSlot).time} IST</span>
                      </>
                    ) : (
                      <span className="text-muted">Not booked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect label={`Status for ${l.input.contact.name}`} endpoint={`/api/admin/leads/${l.id}`} value={l.status} options={LEAD_STATUSES} />
                  </td>
                </tr>
              ))}
              {!sorted.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">No leads yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Applications */}
        <section>
          <h2 className="text-lg font-semibold">BitElevate applications</h2>
          <p className="text-sm text-muted">
            {Object.entries(labCounts).map(([lab, n]) => `${lab}: ${n}`).join(" · ") || "No applications yet."}
          </p>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-3 font-medium">Applicant</th>
                  <th scope="col" className="px-4 py-3 font-medium">Lab</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.code} className="border-b border-line/60 align-top last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.input.name}</p>
                      <p className="text-xs text-muted">{a.input.college} · {STAGE_LABEL[a.input.stage] ?? a.input.stage}</p>
                      <p className="font-mono text-xs text-muted">{a.code} · {fmtDate(a.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {a.input.lab}
                      {a.input.matchScore != null && <span className="block text-xs text-muted">{a.input.matchScore}% Path Finder fit</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect label={`Status for ${a.input.name}`} endpoint={`/api/admin/applications/${a.code}`} value={a.status} options={APP_STATUSES} withNote />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assistant insights */}
        <section>
          <h2 className="text-lg font-semibold">Questions the assistant couldn&apos;t answer</h2>
          <p className="text-sm text-muted">These are gaps in the website content. Add an answer to the knowledge base or the site.</p>
          <ul className="card mt-4 divide-y divide-line">
            {unanswered.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                “{c.question}”<span className="block text-xs text-muted">{fmtDate(c.createdAt)}</span>
              </li>
            ))}
            {!unanswered.length && <li className="px-4 py-6 text-center text-sm text-muted">Nothing unanswered.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
