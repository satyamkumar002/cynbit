"use client";

import { useState } from "react";
import { cx } from "@/lib/ui";

const PIPELINE = [
  { id: "submitted", label: "Submitted", help: "We've received your application." },
  { id: "under-review", label: "Under review", help: "An engineering advisor is reading it." },
  { id: "advisor-call", label: "Advisor call", help: "We'll call you to confirm your lab and start date." },
  { id: "enrolled", label: "Enrolled", help: "Welcome aboard — check your email for repo access." },
] as const;

interface Result {
  code: string;
  name: string;
  lab: string;
  status: string;
  history: { status: string; at: string; note?: string }[];
}

export function StatusLookup({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch("/api/bitelevate/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRes(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const waitlisted = res?.status === "waitlisted";
  const idx = res ? PIPELINE.findIndex((p) => p.id === res.status) : -1;
  const reached = waitlisted ? 1 : idx;
  const latestNote = res?.history.filter((h) => h.note).at(-1)?.note;

  return (
    <>
      <form onSubmit={lookup} className="card grid gap-4 p-6 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="code">Application code</label>
          <input id="code" className="input font-mono uppercase" placeholder="BE-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? "Checking…" : "Check status"}</button>
      </form>
      <p className="mt-3 text-xs text-muted">Demo: code <span className="font-mono">BE-DEMO77</span> with mohit.demo@example.com</p>

      {error && <p role="alert" className="mt-6 text-sm text-hot">{error}</p>}

      {res && (
        <section className="card mt-6 p-6" aria-live="polite">
          <p className="text-sm text-muted">
            {res.code} · {res.lab}
          </p>
          <h2 className="mt-1 text-xl font-semibold">Hi {res.name}, here&apos;s where things stand</h2>
          {waitlisted && (
            <p className="mt-3 rounded-xl border border-warm/30 bg-warm/10 px-4 py-3 text-sm text-warm">
              This cohort is full, so you&apos;re on the waitlist for the next one. We&apos;ll email you when a seat opens.
            </p>
          )}
          <ol className="mt-6 space-y-5">
            {PIPELINE.map((p, i) => {
              const done = i <= reached;
              const at = res.history.find((h) => h.status === p.id)?.at;
              return (
                <li key={p.id} className="flex gap-4">
                  <span className={cx("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs", done ? "border-accent bg-accent text-ink" : "border-line text-muted")}>
                    {done ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className={cx("font-medium", !done && "text-muted")}>{p.label}</p>
                    <p className="text-sm text-muted">
                      {p.help}
                      {at && ` · ${new Date(at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {latestNote && <p className="mt-6 rounded-xl bg-white/[0.03] px-4 py-3 text-sm"><span className="text-muted">Note from the team:</span> {latestNote}</p>}
        </section>
      )}
    </>
  );
}
