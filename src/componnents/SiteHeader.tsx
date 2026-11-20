import Link from "next/link";

const NAV = [
  { href: "/#improvements", label: "What's new" },
  { href: "/start", label: "Project Blueprint" },
  { href: "/bitelevate", label: "BitElevate" },
  { href: "/bitelevate/status", label: "Track application" },
];

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-ink/75 backdrop-blur-xl">
      <div className="bg-accent-2/15 px-4 py-1.5 text-center text-xs text-muted">
        Prototype built for a Cynbit technical assessment — not the official cynbit.in site.{" "}
        <a href="https://www.cynbit.in" className="underline underline-offset-2 hover:text-text" target="_blank" rel="noreferrer">
          Visit the real site
        </a>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="Cynbit home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm text-ink">C</span>
          <span className="text-lg">cynbit</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-text">
              {n.label}
            </Link>
          ))}
        </nav>
        {/* On cynbit.in this button has no destination; here it starts the Blueprint flow. */}
        <Link href="/start" className="btn-primary">
          Get Started Now
        </Link>
      </div>
      <nav aria-label="Main mobile" className="flex gap-4 overflow-x-auto border-t border-line px-4 py-2 text-sm text-muted md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-text">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
