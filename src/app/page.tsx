import Link from "next/link";

const FEATURES = [
  {
    href: "/start",
    tag: "For clients",
    title: "AI Project Blueprint",
    body: "A 2-minute guided flow replaces the blank contact form. Visitors get an instant cost and timeline range, an AI-written project brief and a discovery-call slot they book themselves.",
    cta: "Build a blueprint",
  },
  {
    href: "#ask",
    tag: "For everyone",
    title: "Ask Cynbit assistant",
    body: "A chat assistant that answers only from Cynbit's own pages and links to its sources. Questions it can't answer are logged, so the team can see which content is missing.",
    cta: "Open the assistant (bottom right)",
  },
  {
    href: "/bitelevate",
    tag: "For students",
    title: "BitElevate Path Finder",
    body: "A 3-question quiz that recommends one of the six labs and explains why. Students apply with one form and track their status with an application code.",
    cta: "Find my lab",
  },
];

const BEFORE_AFTER = [
  ["Every CTA leads to one generic form with an empty message box", "A guided flow captures service, scope, timeline and budget in structured form"],
  ["No price or timeline until someone replies (up to 24 h)", "An indicative range appears instantly and updates live as visitors choose options"],
  ["A discovery call needs an email back-and-forth", "Visitors pick a 30-minute IST slot and get a calendar invite"],
  ["The sales team gets free text and has to qualify every lead by hand", "Each lead arrives with a structured brief, risks, questions for the call and a lead score (0–100)"],
  ["An AI-first company with no AI on its own site", "Ask Cynbit gives grounded answers with sources and passes visitors on to the right next step"],
  ["The header “Get Started Now” button goes nowhere", "It now starts the Blueprint flow"],
  ["“Generate My Custom Path” doesn't explain how a path is chosen", "Path Finder shows the match score and the answers behind it"],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-20 sm:py-28">
        <p className="eyebrow">AI automation · Software · Cloud</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Tell us what you want to build. <span className="gradient-text">Get a plan in two minutes.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Cynbit builds AI agents, web and mobile apps, cloud systems and growth engines. Get an instant estimate, a project brief and a
          discovery-call slot in one go.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/start" className="btn-primary px-6 py-3 text-base">
            Start your blueprint
          </Link>
          <a href="https://www.cynbit.in/case-studies" target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-base">
            View case studies
          </a>
        </div>
        <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 text-sm">
          {[
            ["~2 min", "to a full blueprint"],
            ["0 emails", "to book a discovery call"],
            ["24/7", "answers from Ask Cynbit"],
          ].map(([v, l]) => (
            <div key={l}>
              <dt className="text-2xl font-bold text-text">{v}</dt>
              <dd className="text-muted">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="improvements" className="scroll-mt-28">
        <p className="eyebrow">What this prototype adds</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Three improvements, one goal: turn visitors into conversations</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} {...(f.href === "#ask" ? { "data-open-ask": true } : {})} className="card group flex flex-col p-6 transition hover:border-accent/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-2">{f.tag}</span>
              <h3 className="mt-2 text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
              <span className="mt-5 text-sm font-semibold text-accent group-hover:underline">{f.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-bold tracking-tight">Before and after</h2>
        <div className="card mt-6 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">On cynbit.in today</th>
                <th scope="col" className="px-5 py-3 font-medium">With this prototype</th>
              </tr>
            </thead>
            <tbody>
              {BEFORE_AFTER.map(([b, a]) => (
                <tr key={b} className="border-t border-line align-top">
                  <td className="px-5 py-3.5 text-muted">{b}</td>
                  <td className="px-5 py-3.5">{a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">
          Reviewers: the <Link href="/admin" className="text-accent hover:underline">team dashboard</Link> shows what Cynbit&apos;s team would see —
          scored leads, booked calls, applications and unanswered assistant questions.
        </p>
      </section>
    </div>
  );
}
