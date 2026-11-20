"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { estimateProject, formatINR } from "@/lib/estimate";
import {
  BUDGET_BANDS,
  DESIGN_MULTIPLIER,
  SCALE_MULTIPLIER,
  SERVICES,
  TIMELINE_MULTIPLIER,
  getService,
  type ServiceId,
} from "@/lib/pricing.config";
import { chipClass, cx } from "@/lib/ui";

type Role = "founder" | "manager" | "engineer" | "other";

interface Draft {
  service: ServiceId | "";
  features: string[];
  integrations: number;
  goal: string;
  scale: keyof typeof SCALE_MULTIPLIER;
  design: keyof typeof DESIGN_MULTIPLIER;
  timeline: keyof typeof TIMELINE_MULTIPLIER;
  budget: keyof typeof BUDGET_BANDS | "";
  contact: { name: string; email: string; company: string; role: Role; phone: string };
}

const EMPTY: Draft = {
  service: "",
  features: [],
  integrations: 0,
  goal: "",
  scale: "standard",
  design: "refresh",
  timeline: "normal",
  budget: "",
  contact: { name: "", email: "", company: "", role: "founder", phone: "" },
};

const STEPS = ["Service", "Features", "Goal", "Timeline & budget", "Your details"];
const DRAFT_KEY = "cynbit-blueprint-draft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function BlueprintWizard({ initialService }: { initialService?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an unfinished draft (browser storage can be unavailable — ignore errors).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    if (initialService && getService(initialService)) {
      setD((x) => ({ ...x, service: initialService as ServiceId }));
      setStep(1);
    }
  }, [initialService]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  }, [d]);

  const service = d.service ? getService(d.service) : undefined;
  const estimate = useMemo(
    () =>
      d.service
        ? estimateProject({ service: d.service, features: d.features, integrations: d.integrations, scale: d.scale, design: d.design, timeline: d.timeline })
        : null,
    [d.service, d.features, d.integrations, d.scale, d.design, d.timeline],
  );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setContact = (k: keyof Draft["contact"], v: string) => setD((x) => ({ ...x, contact: { ...x.contact, [k]: v } }));

  const stepValid = [
    !!d.service,
    true,
    d.goal.trim().length >= 10,
    !!d.budget,
    d.contact.name.trim().length >= 2 && EMAIL_RE.test(d.contact.email.trim()),
  ];

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...d, website: hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/start/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : submit());

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card p-6 sm:p-8">
        {/* Progress */}
        <ol className="mb-8 flex gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className="w-full text-left"
              >
                <span className={cx("block h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-white/10")} />
                <span className={cx("mt-2 hidden text-xs sm:block", i === step ? "text-text" : "text-muted")}>{s}</span>
              </button>
            </li>
          ))}
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (stepValid[step] && !submitting) next();
          }}
        >
          {step === 0 && (
            <fieldset>
              <legend className="text-2xl font-semibold">What do you need help with?</legend>
              <p className="mt-1 text-sm text-muted">Pick the closest match — you can add details next.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setD((x) => ({ ...x, service: s.id, features: x.service === s.id ? x.features : [] }));
                      setStep(1);
                    }}
                    aria-pressed={d.service === s.id}
                    className={cx(chipClass(d.service === s.id), "p-4")}
                  >
                    <span className="text-xl" aria-hidden>{s.icon}</span>
                    <span className="mt-2 block font-semibold">{s.label}</span>
                    <span className="mt-1 block text-xs text-muted">{s.tagline}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && service && (
            <fieldset>
              <legend className="text-2xl font-semibold">Which of these should it include?</legend>
              <p className="mt-1 text-sm text-muted">Select all that apply. Watch the estimate update on the right.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {service.features.map((f) => {
                  const on = d.features.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      aria-pressed={on}
                      onClick={() => set("features", on ? d.features.filter((x) => x !== f.id) : [...d.features, f.id])}
                      className={cx(chipClass(on), "flex items-center gap-3")}
                    >
                      <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px]", on ? "border-accent bg-accent text-ink" : "border-white/25")}>
                        {on ? "✓" : ""}
                      </span>
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8">
                <span className="label" id="int-label">
                  How many outside systems must it connect to? <span className="text-muted">(payments, CRM, ERP, WhatsApp…)</span>
                </span>
                <div className="flex items-center gap-3" role="group" aria-labelledby="int-label">
                  <button type="button" className="btn-ghost h-10 w-10 p-0" onClick={() => set("integrations", Math.max(0, d.integrations - 1))} aria-label="Fewer integrations">−</button>
                  <output className="w-8 text-center text-lg font-semibold" aria-live="polite">{d.integrations}</output>
                  <button type="button" className="btn-ghost h-10 w-10 p-0" onClick={() => set("integrations", Math.min(10, d.integrations + 1))} aria-label="More integrations">+</button>
                </div>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="text-2xl font-semibold">What are you trying to achieve?</legend>
              <p className="mt-1 text-sm text-muted">A few sentences is enough. Who uses it, what problem it solves, what success looks like.</p>
              <label htmlFor="goal" className="sr-only">Project goal</label>
              <textarea
                id="goal"
                value={d.goal}
                onChange={(e) => set("goal", e.target.value)}
                rows={5}
                maxLength={1500}
                className="input mt-5 resize-y"
                placeholder="e.g. We get 300 WhatsApp enquiries a day and two people answer them by hand. We want an AI agent that answers common questions and books appointments."
              />
              <p className="mt-1 text-right text-xs text-muted">{d.goal.length}/1500</p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="label">How big is the first release?</span>
                  <div className="grid gap-2">
                    {Object.entries(SCALE_MULTIPLIER).map(([k, v]) => (
                      <button type="button" key={k} aria-pressed={d.scale === k} onClick={() => set("scale", k as Draft["scale"])} className={chipClass(d.scale === k)}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="label">Design</span>
                  <div className="grid gap-2">
                    {Object.entries(DESIGN_MULTIPLIER).map(([k, v]) => (
                      <button type="button" key={k} aria-pressed={d.design === k} onClick={() => set("design", k as Draft["design"])} className={chipClass(d.design === k)}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset>
              <legend className="text-2xl font-semibold">When do you need it, and what's the budget?</legend>
              <div className="mt-6">
                <span className="label">Timeline</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(TIMELINE_MULTIPLIER).map(([k, v]) => (
                    <button type="button" key={k} aria-pressed={d.timeline === k} onClick={() => set("timeline", k as Draft["timeline"])} className={chipClass(d.timeline === k)}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <span className="label">Budget you have in mind</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(BUDGET_BANDS).map(([k, v]) => (
                    <button type="button" key={k} aria-pressed={d.budget === k} onClick={() => set("budget", k as Draft["budget"])} className={chipClass(d.budget === k)}>
                      {v.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">This only helps us suggest the right scope — it never changes the estimate.</p>
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <fieldset>
              <legend className="text-2xl font-semibold">Where should we send your blueprint?</legend>
              <p className="mt-1 text-sm text-muted">You'll see it on the next screen and can book a call straight away.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Full name *</label>
                  <input id="name" className="input" autoComplete="name" value={d.contact.name} onChange={(e) => setContact("name", e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="email">Work email *</label>
                  <input id="email" type="email" className="input" autoComplete="email" value={d.contact.email} onChange={(e) => setContact("email", e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="company">Company</label>
                  <input id="company" className="input" autoComplete="organization" value={d.contact.company} onChange={(e) => setContact("company", e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone / WhatsApp</label>
                  <input id="phone" type="tel" className="input" autoComplete="tel" value={d.contact.phone} onChange={(e) => setContact("phone", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <span className="label">Your role</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["founder", "manager", "engineer", "other"] as Role[]).map((r) => (
                      <button type="button" key={r} aria-pressed={d.contact.role === r} onClick={() => setContact("role", r)} className={cx(chipClass(d.contact.role === r), "capitalize")}>
                        {r === "founder" ? "Founder / owner" : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Honeypot: hidden from people, filled by bots */}
              <div aria-hidden className="absolute -left-[9999px]">
                <label>
                  Website <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                </label>
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-hot/30 bg-hot/10 px-4 py-3 text-sm text-hot">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || submitting}>
              ← Back
            </button>
            {step > 0 && (
              <button type="submit" className="btn-primary min-w-40" disabled={!stepValid[step] || submitting}>
                {submitting ? "Writing your brief…" : step === STEPS.length - 1 ? "Get my blueprint" : "Continue →"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Live estimate */}
      <aside className="card h-fit p-6 lg:sticky lg:top-32" aria-live="polite">
        <p className="eyebrow">Live estimate</p>
        {estimate && service ? (
          <>
            <p className="mt-3 text-sm text-muted">{service.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatINR(estimate.costLow)} – {formatINR(estimate.costHigh)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {estimate.weeksLow}–{estimate.weeksHigh} weeks · team of {estimate.teamSize}
            </p>
            <div className="mt-5 space-y-1.5">
              {estimate.phases.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 text-muted">{p.name}</span>
                  <span className="h-1.5 flex-1 rounded-full bg-white/5">
                    <span className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.min(100, (p.weeks / Math.max(...estimate.phases.map((x) => x.weeks))) * 100)}%` }} />
                  </span>
                  <span className="w-10 text-right tabular-nums text-muted">{p.weeks}w</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">Indicative range. The final quote follows a free discovery call.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">Pick a service to see a price and timeline range instantly.</p>
        )}
      </aside>
    </div>
  );
}
