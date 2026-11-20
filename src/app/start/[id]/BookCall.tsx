"use client";

import { useEffect, useMemo, useState } from "react";
import { cx } from "@/lib/ui";

interface Slot {
  iso: string;
  day: string;
  time: string;
}

export function BookCall({ leadId, initial }: { leadId: string; initial: Slot | null }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [booked, setBooked] = useState<Slot | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/slots", { cache: "no-store" });
    const data = await res.json();
    setSlots(data.slots);
    setDay((d) => d ?? data.slots[0]?.day ?? null);
  }

  useEffect(() => {
    if (!booked) load().catch(() => setError("Couldn't load available times."));
  }, [booked]);

  const days = useMemo(() => [...new Set((slots ?? []).map((s) => s.day))], [slots]);
  const daySlots = (slots ?? []).filter((s) => s.day === day);

  async function book() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprint/${leadId}/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setPicked(null);
        await load();
        return;
      }
      setBooked({ iso: data.iso, day: data.day, time: data.time });
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <section className="card border-accent/40 p-6 sm:p-8">
        <p className="eyebrow">Discovery call booked</p>
        <h2 className="mt-2 text-2xl font-semibold">
          {booked.day} at {booked.time} IST
        </h2>
        <p className="mt-2 text-sm text-muted">
          30 minutes with a Cynbit engineer. The booking shows up on Cynbit&apos;s team dashboard straight away, and they send you the meeting link. On the call you&apos;ll walk through this blueprint and turn it into a fixed quote.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="btn-primary" href={`/api/blueprint/${leadId}/ics`}>Add to calendar (.ics)</a>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            Copy blueprint link
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="book-title">
      <p className="eyebrow">Next step</p>
      <h2 id="book-title" className="mt-2 text-2xl font-semibold">Book a free 30-minute discovery call</h2>
      <p className="mt-1 text-sm text-muted">All times are India Standard Time (IST). Pick a day, then a time.</p>

      {!slots && !error && <p className="mt-6 text-sm text-muted">Loading available times…</p>}

      {slots && (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Day">
            {days.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={d === day}
                onClick={() => {
                  setDay(d);
                  setPicked(null);
                }}
                className={cx("btn shrink-0 border", d === day ? "border-accent bg-accent/10 text-text" : "border-line text-muted hover:text-text")}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {daySlots.map((s) => (
              <button
                key={s.iso}
                onClick={() => setPicked(s.iso)}
                aria-pressed={picked === s.iso}
                className={cx("rounded-lg border px-2 py-2 text-sm tabular-nums transition", picked === s.iso ? "border-accent bg-accent text-ink" : "border-line hover:border-white/25")}
              >
                {s.time}
              </button>
            ))}
            {!daySlots.length && <p className="col-span-full text-sm text-muted">No times left on this day.</p>}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-hot">
          {error}
        </p>
      )}

      <button className="btn-primary mt-6" onClick={book} disabled={!picked || busy}>
        {busy ? "Booking…" : "Confirm booking"}
      </button>
    </section>
  );
}
