/**
 * Discovery-call slots: 30-minute calls, Mon–Sat, 11:00–18:00 IST, for the next
 * 10 working days, starting at least 3 hours from now. IST has no DST, so a
 * fixed +05:30 offset is safe.
 */

const IST_OFFSET_MIN = 330;
export const SLOT_MINUTES = 30;
const DAY_START = 11; // 11:00 IST
const DAY_END = 18; // last slot starts 17:30 IST
const LEAD_TIME_MS = 3 * 3600_000;
const WORKING_DAYS = 10;

export interface Slot {
  iso: string;
  /** e.g. "Mon, 23 Nov" */
  day: string;
  /** e.g. "11:30 AM" */
  time: string;
}

function istParts(d: Date) {
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), day: ist.getUTCDate(), dow: ist.getUTCDay() };
}

/** UTC Date for a given IST wall-clock time */
function fromIst(y: number, m: number, day: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m, day, h, min) - IST_OFFSET_MIN * 60_000);
}

export function formatSlot(iso: string): Slot {
  const d = new Date(iso);
  const opts = { timeZone: "Asia/Kolkata" } as const;
  return {
    iso,
    day: d.toLocaleDateString("en-IN", { ...opts, weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-IN", { ...opts, hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase(),
  };
}

export function generateSlots(now: Date, booked: Set<string>): Slot[] {
  const out: Slot[] = [];
  const start = istParts(now);
  let found = 0;
  for (let offset = 0; found < WORKING_DAYS && offset < 21; offset++) {
    const dayDate = fromIst(start.y, start.m, start.day + offset, 12, 0);
    const p = istParts(dayDate);
    if (p.dow === 0) continue; // Sunday off
    found++;
    for (let h = DAY_START; h < DAY_END; h++) {
      for (const min of [0, 30]) {
        const slot = fromIst(p.y, p.m, p.day, h, min);
        if (slot.getTime() - now.getTime() < LEAD_TIME_MS) continue;
        const iso = slot.toISOString();
        if (!booked.has(iso)) out.push(formatSlot(iso));
      }
    }
  }
  return out;
}

export function isValidSlot(iso: string, now: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.toISOString() !== iso) return false;
  return generateSlots(now, new Set()).some((s) => s.iso === iso);
}

/** Minimal RFC 5545 calendar file so the visitor can add the call to any calendar. */
export function toIcs(opts: { iso: string; title: string; description: string; url: string; uid: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(opts.iso);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cynbit Blueprint//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@cynbit-blueprint`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `URL:${opts.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
