"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/ui";

type Action = "start-blueprint" | "bitelevate" | "contact" | null;

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
  action?: Action;
}

const SUGGESTIONS = [
  "What does Cynbit build?",
  "How much does a project cost?",
  "What is the BitElevate fee?",
  "Which internship labs are there?",
  "Where is your office?",
];

const ACTIONS: Record<Exclude<Action, null>, { href: string; label: string }> = {
  "start-blueprint": { href: "/start", label: "Get an instant estimate →" },
  bitelevate: { href: "/bitelevate", label: "Find your BitElevate lab →" },
  contact: { href: "mailto:opportunities@cynbit.in", label: "Email the team →" },
};

function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={i} className="my-1 list-disc space-y-0.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•*]\s+/, "").replace(/\*\*/g, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-1 whitespace-pre-line">
            {b.replace(/\*\*/g, "")}
          </p>
        );
      })}
    </>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hi! I'm Ask Cynbit. I answer from Cynbit's own website — services, products, BitElevate internships and contact details. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Any element with data-open-ask (e.g. the homepage card) opens the assistant.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("[data-open-ask]");
      if (el) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.slice(1).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMsgs((m) => [...m, { role: "assistant", content: data.answer, sources: data.sources, action: data.action }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message || "I couldn't reach the server. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ask-cynbit"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-2 px-5 py-3 text-sm font-semibold text-ink shadow-lg shadow-accent/20 transition hover:scale-[1.03]"
      >
        <span aria-hidden>{open ? "✕" : "💬"}</span> {open ? "Close" : "Ask Cynbit"}
      </button>

      {open && (
        <section
          id="ask-cynbit"
          role="dialog"
          aria-label="Ask Cynbit assistant"
          className="fixed bottom-20 right-3 z-50 flex h-[min(620px,calc(100vh-7rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Ask Cynbit</p>
              <p className="text-xs text-muted">Answers come from cynbit.in pages</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" /> Online
            </span>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed",
                    m.role === "user" ? "bg-accent text-ink" : "border border-line bg-panel-2",
                  )}
                >
                  <Rich text={m.content} />
                  {!!m.sources?.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <a
                          key={s.title}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted hover:text-text"
                        >
                          ↗ {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.action && (
                    <Link
                      href={ACTIONS[m.action].href}
                      onClick={() => m.action !== "contact" && setOpen(false)}
                      className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
                    >
                      {ACTIONS[m.action].label}
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-1 px-1 text-muted" aria-label="Assistant is typing">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce [animation-delay:120ms]">•</span>
                <span className="animate-bounce [animation-delay:240ms]">•</span>
              </div>
            )}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent/50 hover:text-text">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <input
              id="ask-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about services, pricing, internships…"
              className="input"
            />
            <button className="btn-primary px-3" disabled={busy || !input.trim()} aria-label="Send">
              ➤
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
