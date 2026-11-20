import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/estimate";
import { getService } from "@/lib/pricing.config";
import { formatSlot } from "@/lib/slots";
import { getStore } from "@/lib/store";
import { BookCall } from "./BookCall";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your project blueprint", robots: { index: false } };

function weekLabel(start: number, end: number): string {
  const a = Math.floor(start) + 1;
  const b = Math.max(a, Math.ceil(end));
  return a === b ? `Week ${a}` : `Weeks ${a}–${b}`;
}

function List({ title, items, tone = "text-text" }: { title: string; items: string[]; tone?: string }) {
  return (
    <section className="card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <ul className={`mt-3 space-y-2 text-sm leading-relaxed ${tone}`}>
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getStore().getLead(id);
  if (!lead) notFound();

  const { estimate: e, brief: b, input } = lead;
  const svc = getService(input.service)!;
  const maxPhase = Math.max(...e.phases.map((p) => p.weeks));
  let cursor = 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Project blueprint · {svc.label}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{b.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Prepared for {input.contact.name}
            {input.contact.company ? `, ${input.contact.company}` : ""} ·{" "}
            {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <PrintButton />
          <Link href="/start" className="btn-ghost">New blueprint</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Summary</h2>
          <p className="mt-3 leading-relaxed">{b.summary}</p>
          <p className="mt-4 text-xs text-muted">
            {b.source === "ai" ? `Brief drafted by AI (${b.provider}) from your answers.` : "Brief generated from your answers."} A Cynbit engineer reviews it before your call.
          </p>
        </div>
        <div className="card bg-gradient-to-br from-accent/10 to-accent-2/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Indicative estimate</h2>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            {formatINR(e.costLow)} – {formatINR(e.costHigh)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {e.weeksLow}–{e.weeksHigh} weeks · team of {e.teamSize}
          </p>
          <p className="mt-3 text-xs text-muted">{e.team.join(" · ")}</p>
        </div>
      </div>

      <section className="card mt-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Delivery plan (Cynbit&apos;s 6-step process)</h2>
        <ol className="mt-4 space-y-2.5">
          {e.phases.map((p, i) => {
            const startW = cursor;
            cursor += p.weeks;
            return (
              <li key={p.name} className="grid grid-cols-[1.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[1.5rem_14rem_1fr_5rem]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs text-muted">{i + 1}</span>
                <span>{p.name}</span>
                <span className="hidden h-2 rounded-full bg-white/5 sm:block">
                  <span className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${(p.weeks / maxPhase) * 100}%` }} />
                </span>
                <span className="col-start-2 text-xs text-muted sm:col-start-auto sm:text-right">
                  {weekLabel(startW, cursor)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <List title="Objectives" items={b.objectives} />
        <List title="Scope" items={b.scope} />
        <List title="Risks to plan for" items={b.risks} />
        <List title="We'll ask you on the call" items={b.questionsForCall} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Suggested stack</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {b.suggestedStack.map((s) => (
              <span key={s} className="rounded-lg border border-line bg-white/[0.03] px-2.5 py-1 text-xs">{s}</span>
            ))}
          </div>
        </section>
        <List title="Assumptions" items={e.assumptions} tone="text-muted" />
      </div>

      <div className="no-print mt-8">
        <BookCall leadId={lead.id} initial={lead.bookedSlot ? formatSlot(lead.bookedSlot) : null} />
      </div>
    </div>
  );
}
