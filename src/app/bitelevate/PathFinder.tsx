"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LABS, QUESTIONS, matchLabs } from "@/lib/pathfinder";
import { chipClass, cx } from "@/lib/ui";

type Stage = "1st-2nd-year" | "3rd-4th-year" | "graduate" | "working";

const STAGES: { id: Stage; label: string }[] = [
  { id: "1st-2nd-year", label: "1st / 2nd year" },
  { id: "3rd-4th-year", label: "3rd / 4th year" },
  { id: "graduate", label: "Graduate" },
  { id: "working", label: "Working professional" },
];

export function PathFinder() {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [qi, setQi] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [chosenLab, setChosenLab] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", college: "", stage: "3rd-4th-year" as Stage, goals: "", github: "" });
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const results = useMemo(() => matchLabs(answers), [answers]);
  const q = QUESTIONS[qi];
  const selected = answers[q?.id] ?? [];

  function toggle(optId: string) {
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (!q.multi) return { ...a, [q.id]: [optId] };
      if (optId === "none") return { ...a, [q.id]: cur.includes("none") ? [] : ["none"] };
      const without = cur.filter((x) => x !== "none");
      return { ...a, [q.id]: without.includes(optId) ? without.filter((x) => x !== optId) : [...without, optId] };
    });
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!chosenLab) return;
    setBusy(true);
    setError(null);
    try {
      const match = results.find((r) => r.lab.name === chosenLab)?.percent;
      const res = await fetch("/api/bitelevate/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, lab: chosenLab, matchScore: match, website: hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCode(data.code);
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="eyebrow">Application received</p>
        <h2 className="mt-3 text-2xl font-semibold">You&apos;re in the queue for the {chosenLab}</h2>
        <p className="mt-3 text-sm text-muted">Save your application code. You&apos;ll need it with your email to check your status.</p>
        <p className="mx-auto mt-5 w-fit rounded-xl border border-accent/40 bg-accent/10 px-6 py-3 font-mono text-2xl tracking-widest">{code}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/bitelevate/status?code=${code}`} className="btn-primary">Track my application</Link>
          <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button>
        </div>
      </div>
    );
  }

  if (chosenLab) {
    const lab = LABS.find((l) => l.name === chosenLab)!;
    return (
      <form onSubmit={apply} className="card mx-auto max-w-2xl p-6 sm:p-8">
        <button type="button" onClick={() => setChosenLab(null)} className="text-sm text-muted hover:text-text">← Back to results</button>
        <h2 className="mt-4 text-2xl font-semibold">Apply to the {lab.name}</h2>
        <p className="mt-1 text-sm text-muted">An engineering advisor reviews every application and may call you before enrolment.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Full name", "text", "name"],
              ["email", "Email", "email", "email"],
              ["phone", "Phone / WhatsApp", "tel", "tel"],
              ["college", "College / university", "text", "organization"],
            ] as const
          ).map(([k, label, type, ac]) => (
            <div key={k}>
              <label className="label" htmlFor={`f-${k}`}>{label} *</label>
              <input id={`f-${k}`} type={type} autoComplete={ac} required className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <span className="label">Where are you right now?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((s) => (
                <button type="button" key={s.id} aria-pressed={form.stage === s.id} onClick={() => setForm({ ...form, stage: s.id })} className={chipClass(form.stage === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="f-goals">What do you want to get out of BitElevate? *</label>
            <textarea id="f-goals" required minLength={10} maxLength={1000} rows={3} className="input" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="f-gh">GitHub profile <span className="text-muted">(optional)</span></label>
            <input id="f-gh" className="input" placeholder="https://github.com/your-name" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} />
          </div>
        </div>
        <div aria-hidden className="absolute -left-[9999px]">
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-hot">{error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>
        <p className="mt-3 text-center text-xs text-muted">In this flow, the ₹1,499 enrolment fee is collected only after an advisor accepts your application.</p>
      </form>
    );
  }

  if (showResults) {
    const [top, ...rest] = results;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card border-accent/40 p-6 sm:p-8">
          <p className="eyebrow">Your best match · {top.percent}% fit</p>
          <h2 className="mt-2 text-3xl font-bold">{top.lab.name}</h2>
          <p className="mt-1 text-sm text-muted">Project: {top.lab.project}</p>
          <p className="mt-4">{top.lab.pitch}</p>
          {top.reasons.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              <span className="text-text">Why:</span> you picked {top.reasons.map((r) => `“${r}”`).join(", ")}.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {top.lab.stack.map((s) => (
              <span key={s} className="rounded-lg border border-line px-2.5 py-1 text-xs">{s}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Leads to roles like {top.lab.roles.join(" or ")}.</p>
          <button className="btn-primary mt-6" onClick={() => setChosenLab(top.lab.name)}>Apply to this lab</button>
        </div>
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Other labs</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {rest.map((r) => (
            <li key={r.lab.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{r.lab.name}</p>
                <div className="mt-2 h-1.5 w-40 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-accent-2" style={{ width: `${r.percent}%` }} />
                </div>
              </div>
              <button className="btn-ghost text-xs" onClick={() => setChosenLab(r.lab.name)}>
                {r.percent}% · Apply
              </button>
            </li>
          ))}
        </ul>
        <button
          className="mt-6 text-sm text-muted hover:text-text"
          onClick={() => {
            setShowResults(false);
            setQi(0);
            setAnswers({});
          }}
        >
          ↺ Retake the quiz
        </button>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-3xl p-6 sm:p-8">
      <p className="text-sm text-muted">
        Question {qi + 1} of {QUESTIONS.length}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{q.title}</h2>
      {q.multi && <p className="mt-1 text-sm text-muted">Pick as many as you like.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {q.options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button key={o.id} type="button" aria-pressed={on} onClick={() => toggle(o.id)} className={cx(chipClass(on), "py-3.5")}>
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex justify-between">
        <button className="btn-ghost" disabled={qi === 0} onClick={() => setQi(qi - 1)}>← Back</button>
        <button
          className="btn-primary"
          disabled={!selected.length}
          onClick={() => (qi < QUESTIONS.length - 1 ? setQi(qi + 1) : setShowResults(true))}
        >
          {qi < QUESTIONS.length - 1 ? "Next →" : "See my match"}
        </button>
      </div>
    </div>
  );
}
