# Cynbit Blueprint: Technical Report — Improving Cynbit's Website

Full Stack Developer Intern assessment · 19 Nov 2026

## Summary

I rebuilt the path from "interested visitor" to "qualified conversation" on [cynbit.in](https://www.cynbit.in) as a working Next.js 15 prototype. The site currently sends every call to action to one generic contact form; the prototype replaces it with three connected features and a team dashboard.

- **AI Project Blueprint:** a 2-minute guided flow that returns an instant cost and timeline range, an AI-written project brief and a self-booked discovery call.
- **Ask Cynbit:** a site assistant that answers only from Cynbit's own pages, cites them, and logs what it cannot answer.
- **BitElevate Path Finder:** a 3-question lab matcher with one-step application and status tracking.
- **Team dashboard:** scored leads, booked calls, applications and content gaps in one view.

| Deliverable | Link |
| --- | --- |
| GitHub repository | `https://github.com/<your-username>/cynbit-blueprint` |
| Live prototype | `https://<your-deployment>.vercel.app` |
| Team dashboard | `/admin` on the live URL (demo password `cynbit-demo`) |

The codebase has 18 focused commits, 25 passing automated tests and a clean production build. It works with no API keys and upgrades to Gemini, OpenAI or Claude with one environment variable.

## Problem statement

The biggest gap on cynbit.in is conversion: a visitor who wants something built has no way to learn what it costs, how long it takes, or when they can talk to someone, short of writing an email into a blank box and waiting. I audited the home, services, products, case studies, BitElevate and contact pages in November 2026.

| Area | What I found | Who it hurts |
| --- | --- | --- |
| Lead capture | "Start discovery", "Inquire" and "Get Started Now" all lead to one form: name, email, optional company and industry, and a free-text message. The header "Get Started Now" button appears to have no destination. | Prospects, sales team |
| Pricing and timeline | No prices, ranges or timelines anywhere. The contact page promises a reply within 24 hours. | Prospects |
| Booking | No calendar or booking tool. The FAQ says the team will schedule a discovery call after you email or phone. | Prospects, sales team |
| Lead quality | Every enquiry arrives as unstructured text; nothing tells the team which lead is urgent or has budget. | Sales team |
| Self-service answers | No chatbot or search. Facts like the BitElevate fee, the six labs or the office address are spread over several long pages. | Everyone |
| BitElevate | "Generate My Custom Path" does not explain how a path is chosen; there is no way to check an application's status. | Students |
| Smaller issues | Three phone numbers with no labels or hours; generic image alt text; some unsupported claims ("3x ROI uplift", "100% success"). | Everyone |

The irony is the strongest argument: Cynbit sells AI automation and lead-management agents, but its own website qualifies leads by hand. I chose to fix that funnel end to end rather than polish one page, because it touches what the business depends on — new client projects and BitElevate enrolments.

## Solution overview

Each feature turns an unstructured step into a structured one, and all of them feed the same team dashboard.

### 1. AI Project Blueprint (`/start`)

1. The visitor picks a service (AI automation, web app, mobile app, cloud, marketing/SEO or one of Cynbit's products).
2. They tick the features they need and the number of outside systems to connect. A live estimate panel updates on every click.
3. They describe the goal in their own words and choose scale (MVP, production, enterprise) and design needs.
4. They choose a timeline and a budget band. The budget never changes the estimate; it only feeds the lead score and the risk list.
5. They leave contact details. The server creates a shareable blueprint page with the estimate, a phase plan mapped to Cynbit's own six-step process, and an AI brief: objectives, scope, risks, questions for the call and a suggested stack.
6. They book a 30-minute IST slot and download a calendar invite.

![Blueprint wizard with the live estimate panel](docs/screenshots/03-start-features.png)

*Step 2 of the wizard: each ticked feature updates the price range, timeline and phase plan on the right.*

### 2. Ask Cynbit

A chat button on every page. Answers are grounded in a knowledge base written from Cynbit's pages, with source chips linking back to cynbit.in. The reply also suggests the next step (get an estimate, find a lab, or email the team). Questions it cannot answer are logged and shown on the dashboard as content gaps.

![Ask Cynbit answering a fee question with a source chip](docs/screenshots/07-chat.png)

*A grounded answer with its source page and a next-step link to the Path Finder.*

### 3. BitElevate Path Finder (`/bitelevate`)

Three questions score all six labs. The result shows the best match, the answers behind it ("you picked Python, ML libraries…"), the stack and the roles it leads to. Applying gives a code such as `BE-7K3QX9`; the status page shows a Submitted → Under review → Advisor call → Enrolled timeline, plus any note from the team.

### 4. Team dashboard (`/admin`)

Password-protected. It shows KPIs (leads, hot leads, open pipeline value, calls booked, applications, assistant answer rate), leads sorted by a transparent 0–100 score with the reasons behind it, status pipelines for leads and applications, unanswered assistant questions, and CSV export.

![Team dashboard with KPIs, scored leads, applications and unanswered questions](docs/screenshots/11-admin.png)

*The dashboard in demo mode. One lead is expanded to show its brief and score breakdown.*

## Technical stack choices

I picked the stack Cynbit already uses wherever I could find evidence of it, so the work can be merged rather than rewritten. cynbit.in's meta tags suggest Next.js, and the BitElevate Full Stack lab teaches Next.js 15, React 19, PostgreSQL and Tailwind.

| Layer | Choice | Why this, not the alternative |
| --- | --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript | One codebase for pages and API routes; zero-config deploys on Vercel; matches Cynbit's stack. |
| Styling | Tailwind CSS 4 | Consistent design tokens with no runtime CSS cost. |
| Validation | zod | One schema per endpoint gives type safety and readable error messages. |
| Database | PostgreSQL via postgres.js | Small and fast, no code generation or binary engine (unlike Prisma). Schema is created automatically on first use. JSONB holds the flexible brief; status, score and booked slot are real columns with indexes and a `UNIQUE` constraint. |
| AI | Own provider-agnostic client over `fetch` for Gemini, OpenAI and Anthropic Claude | No vendor lock-in or SDK weight; provider is one env var. Gemini's free tier makes the demo free to run. |
| Retrieval | BM25 with synonym expansion and a query-coverage check | With about 20 short pages, BM25 is accurate, instant and free. Embeddings would add a second API and a vector store for no measurable gain at this size. |
| Lead scoring | Rule-based, 0–100 with written reasons | The sales team can see exactly why a lead is "hot". An LLM score would be opaque and could change between runs. |
| Testing | Node's built-in test runner + tsx; PGlite for Postgres | No test framework to install; PGlite runs real Postgres in-process, so the SQL is tested without a database server. |
| Hosting | Vercel + Neon Postgres (both free tiers) | Push-to-deploy; Neon connects from the Vercel dashboard and sets the connection string automatically. |

## Architecture and implementation

The app has three layers: React pages in the browser, Next.js route handlers on the server, and three swappable back ends (storage, AI and the knowledge base). The rule I designed around is graceful degradation: with no API key, an expired key, a rate limit, a timeout or malformed model output, every feature still works.

![System architecture: browser, Next.js route handlers, and the store, AI client and knowledge base](docs/screenshots/architecture.png)

The browser talks only to the route handlers; the route handlers talk only to interfaces, so Postgres can swap for the demo store and Gemini for Claude without touching a page.

### Key implementation decisions

- **One estimator, two places.** `estimateProject()` is a pure function: the wizard runs it on every click for the live panel, and the server runs it again on submit, so the number the visitor saw is exactly the number the team sees. All rates and multipliers live in `pricing.config.ts`.
- **The AI writes words, never numbers.** The brief prompt passes the fixed estimate and tells the model not to change it. The response is parsed as JSON, checked field by field, and replaced by the rule-based brief if anything is missing.
- **Grounded assistant.** Each question retrieves the top pages; the model is told to answer only from them and to end with `ANSWERED: yes` or `no`. "No" hides the source chips, offers the email route and logs the question as a content gap.
- **Double booking is a database guarantee.** `booked_slot` has a `UNIQUE` constraint and the update only succeeds when the lead has no slot yet, so two visitors racing for 11:00 cannot both win.
- **Transparent lead score.** Budget fit against the estimate (up to 30), decision-maker role (15), company and work email (15), urgency (10) and detail of the goal (10), on a base of 20. Hot is 70 or more, warm 45 or more.
- **Privacy by default.** Blueprint links use unguessable IDs; status lookups need code and email together, and both mismatches return the same message so codes cannot be enumerated.

Setup, environment variables and the Vercel + Neon deployment steps are at the end of this README.

## Testing and quality

All 25 automated tests pass (`npm test`), the TypeScript build is clean, and every user journey was clicked through end to end in a headless browser on desktop and mobile.

| What is tested | How |
| --- | --- |
| Estimator | Deterministic output; more features, enterprise scale and rush timelines cost more; unknown features ignored; rounding and ₹ formatting. |
| Lead score | Strong vs weak leads land in the right tier; score stays within 0–100. |
| AI providers | `fetch` is stubbed to check the exact request shape for Gemini, OpenAI and Claude, explicit provider choice, and fallback on HTTP errors, malformed JSON and network failure. |
| Assistant | Correct page retrieved for common questions; off-topic questions that share one generic word ("Do you sign NDAs before a call?") are not answered; short follow-ups keep context but an old topic does not leak into a new question. |
| Booking | Slots fall only in Mon–Sat 11:00–18:00 IST; booked slots disappear; Sunday and past slots are rejected; `.ics` escaping. |
| Storage | In-memory store and the real Postgres store (against in-process PGlite) both block double booking and round-trip leads, applications and chat logs. |
| Security | Admin cookie verifies and rejects tampering; honeypot and bad emails rejected by the schema. |

One bug found in testing shaped the design: the first assistant version answered "Do you sign NDAs before a call?" with the booking page, because both mention "call". I added an IDF-weighted coverage check, so a page must contain most of the question's important words before it is treated as an answer.

Security and abuse controls: zod validation on every endpoint, honeypot fields, per-IP rate limits on AI, booking, application, status and login routes, an HMAC-signed `httpOnly` admin session checked in middleware, unguessable blueprint IDs, status lookup by code and email together, CSV formula-injection guard and standard security headers.

## Results

The prototype takes a visitor from landing page to a booked discovery call in about two minutes, with no email back and forth, and hands the team a scored, structured lead. Business impact can only be proven with real traffic, so below are what was measured locally and how Cynbit could measure the rest.

| Measure | Result |
| --- | --- |
| Contact form → booked call | 5 guided steps plus slot pick, replacing a blank form and a 24-hour email wait |
| Estimate feedback | Instant, computed in the browser on every click (same function the server uses) |
| Blueprint API, rule-based mode | About 5 ms per request on a local production build; an LLM brief adds the provider's response time (not measured here: no key in the test environment; capped by a 20 s timeout, then the fallback) |
| Assistant retrieval | About 0.04 ms per query over the knowledge base |
| First-load JavaScript | 106–111 kB per page |
| Works without an API key | Yes — every feature degrades to a rule-based path |

### How to measure impact on the live site

- Run the Blueprint flow as an A/B test against the current contact form and compare enquiry rate and booked-call rate.
- Track `blueprint_started`, each step completed and `call_booked` to find where visitors drop off.
- Compare the lead score with deals that are won, and tune the weights.
- Watch the assistant's unanswered list weekly; each recurring question is a page the site should add.

### Limitations

- **Prices are assumptions.** Cynbit publishes no rates, so `pricing.config.ts` uses typical Indian agency figures. Every estimate is labelled indicative, and the team can replace the numbers in one file.
- **No outbound email yet.** Bookings and applications show on the dashboard straight away; confirmation emails need a provider such as Resend.
- **The knowledge base is written by hand** from the public pages; a build-time crawler should keep it current.
- **It is a standalone prototype,** not a patch to cynbit.in, because the site's source is not public. Each feature is a self-contained page plus API route, so it can move into Cynbit's codebase.
- On serverless hosting, a database must be connected; the in-memory demo store is for local runs.

### Next steps

1. Email and WhatsApp confirmations, plus Google Calendar sync for bookings.
2. Crawl cynbit.in at build time to refresh the assistant's knowledge base.
3. Analytics events and the A/B test above.
4. Send hot leads to a CRM (HubSpot or Zoho) through a webhook.

---

# Setup

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — everything works with no keys
npm run dev                  # http://localhost:3000
npm test                     # 25 tests: estimator, scoring, retrieval, slots, auth, AI providers (stubbed), Postgres store (in-process PGlite)
npm run build
```

With no `DATABASE_URL`, the app uses an in-memory store seeded with clearly labelled demo data.

### Environment variables

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `gemini` \| `openai` \| `anthropic` \| `none`. Leave empty to auto-detect from whichever key is set. |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Provider keys. Gemini has a free tier ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)). |
| `AI_MODEL` | Optional model override. Defaults: `gemini-2.5-flash`, `gpt-4.1-mini`, `claude-haiku-5-5`. |
| `DATABASE_URL` (or `POSTGRES_URL`) | Postgres connection string (Neon, Supabase, Vercel Postgres). |
| `ADMIN_PASSWORD` | Dashboard password. Falls back to `cynbit-demo`, and the login page then says so. |
| `SESSION_SECRET` | Long random string used to sign the admin cookie. |

## Deploy (Vercel + Neon, both free)

1. Push this repo to GitHub, then on vercel.com choose **Add New → Project → Import** this repo.
2. In the project, go to **Storage → Create → Neon (Postgres)** and connect it. This sets `DATABASE_URL`/`POSTGRES_URL` automatically.
3. Under **Settings → Environment Variables**, add `GEMINI_API_KEY` (or another provider key), `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. Redeploy. Check `/api/health`: it should show `"storage":"postgres"` and your AI provider.

> On serverless hosts, set a database. The in-memory store lives inside a single function instance, so a blueprint created by one instance might not be visible to another. Memory mode is meant for local development and quick demos.

## Project structure

```
src/
  app/
    page.tsx                 landing page + before/after
    start/                   Blueprint wizard, result page, booking
    bitelevate/              Path Finder, application, status tracker
    admin/                   login + dashboard
    api/                     route handlers (see Architecture)
  components/                header, footer, chat widget
  lib/
    pricing.config.ts        ← the only file Cynbit needs to edit to match its real rate card
    estimate.ts scoring.ts brief.ts assistant.ts retrieval.ts pathfinder.ts slots.ts auth.ts
    ai/                      provider-agnostic LLM client
    kb/cynbit.ts             assistant knowledge base
    store/                   Store interface, Postgres + in-memory implementations, demo seed
tests/                       node:test unit tests
```
