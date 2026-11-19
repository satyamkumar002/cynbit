"use client";

import { useState } from "react";

export function StatusSelect({
  endpoint,
  value,
  options,
  withNote = false,
  label,
}: {
  endpoint: string;
  value: string;
  options: { value: string; label: string }[];
  withNote?: boolean;
  label: string;
}) {
  const [v, setV] = useState(value);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(next: string) {
    const prev = v;
    setV(next);
    setState("saving");
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next, ...(withNote && note.trim() ? { note: note.trim() } : {}) }),
    });
    if (res.ok) {
      setNote("");
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } else {
      setV(prev);
      setState("error");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {withNote && (
        <input
          aria-label="Note shown to the applicant (optional)"
          placeholder="Note to applicant (optional)"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          className="w-44 rounded-lg border border-line bg-ink px-2 py-1 text-xs"
        />
      )}
      <select aria-label={label} value={v} onChange={(e) => save(e.target.value)} className="rounded-lg border border-line bg-ink px-2 py-1 text-xs">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="w-10 text-[11px] text-muted" aria-live="polite">
        {state === "saving" ? "…" : state === "saved" ? "Saved" : state === "error" ? "Failed" : ""}
      </span>
    </span>
  );
}
