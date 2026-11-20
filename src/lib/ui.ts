export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const chipClass = (on: boolean) =>
  cx("chip", on ? "border-accent/70 bg-accent/10 ring-1 ring-accent/40" : "border-line bg-white/[0.02] hover:border-white/20");

export const TIER_STYLE = {
  hot: "bg-hot/15 text-hot border-hot/30",
  warm: "bg-warm/15 text-warm border-warm/30",
  cold: "bg-cold/15 text-cold border-cold/30",
} as const;
