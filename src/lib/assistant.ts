import { activeProvider, generate, type ChatMessage } from "./ai";
import { isConfident, retrieve, tokenize, type Hit } from "./retrieval";

export type AssistantAction = "start-blueprint" | "bitelevate" | "contact" | null;

export interface AssistantReply {
  answer: string;
  sources: { title: string; url: string }[];
  action: AssistantAction;
  answered: boolean;
  source: "ai" | "fallback";
}

export function detectAction(text: string): AssistantAction {
  const t = text.toLowerCase();
  if (/(intern|bitelevate|student|college|lab\b|track|certificate)/.test(t)) return "bitelevate";
  if (/(build|develop|quote|estimate|cost|price|pricing|budget|hire|project|automate|app|website|chatbot|agent)/.test(t))
    return "start-blueprint";
  if (/(contact|call|phone|email|talk|meet|human|person)/.test(t)) return "contact";
  return null;
}

/**
 * Short follow-ups ("how much is it?", "and the duration?") borrow the previous
 * question's words; full questions are retrieved on their own so an earlier
 * topic doesn't leak into an unrelated new one.
 */
export function retrieveWithFollowUp(question: string, history: ChatMessage[]): Hit[] {
  const own = retrieve(question, 4);
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content;
  if (!lastUser || tokenize(question).length > 3 || own.some(isConfident)) return own;
  return retrieve(`${question} ${lastUser}`, 4);
}

function fallbackAnswer(question: string, hits: Hit[]): AssistantReply {
  const good = hits.filter(isConfident);
  const action = detectAction(question);
  if (!good.length) {
    return {
      answer:
        "I couldn't find that on Cynbit's site. The team can answer it directly — email opportunities@cynbit.in or call +91 89479 62667, and they usually reply within 24 hours.",
      sources: [],
      action: action ?? "contact",
      answered: false,
      source: "fallback",
    };
  }
  // Show the best page, plus a second one only if it is nearly as relevant.
  const rank = (h: Hit) => h.score * (0.4 + h.coverage);
  const top = good.filter((h, i) => i === 0 || rank(h) >= 0.6 * rank(good[0])).slice(0, 2);
  return {
    answer: top.map((h) => h.doc.text).join("\n\n"),
    sources: top.map((h) => ({ title: h.doc.title, url: h.doc.url })),
    action,
    answered: true,
    source: "fallback",
  };
}

const SYSTEM = `You are "Ask Cynbit", the website assistant for Cynbit Technologies (AI automation and software development, Jaipur, India).
Answer ONLY from the CONTEXT provided. If the context does not contain the answer, say you don't know and suggest emailing opportunities@cynbit.in — never guess prices, dates, names or numbers.
Style: friendly, direct, 2-5 short sentences, plain text (no markdown headings). Use bullet points only for lists of 3+ items, written as "- item".
If the visitor wants a project built or asks about cost, mention they can get an instant estimate and brief with the Project Blueprint builder.
If they ask about internships, mention the BitElevate Path Finder.
End your reply with a line "ANSWERED: yes" if the context answered the question, or "ANSWERED: no" if it did not.`;

export async function answer(question: string, history: ChatMessage[]): Promise<AssistantReply> {
  const hits = retrieveWithFollowUp(question, history);
  if (activeProvider() === "none") return fallbackAnswer(question, hits);

  const context = hits.length
    ? hits.map((h, i) => `[${i + 1}] ${h.doc.title} (${h.doc.url})\n${h.doc.text}`).join("\n\n")
    : "(no relevant context found)";

  const messages: ChatMessage[] = [
    ...history.slice(-6),
    { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
  ];
  const raw = await generate({ system: SYSTEM, messages, maxTokens: 500, temperature: 0.2 });
  if (!raw) return fallbackAnswer(question, hits);

  const answered = !/ANSWERED:\s*no/i.test(raw);
  const text = raw.replace(/\n?\s*ANSWERED:\s*(yes|no)\s*$/i, "").trim();
  return {
    answer: text,
    sources: answered ? hits.filter(isConfident).slice(0, 3).map((h) => ({ title: h.doc.title, url: h.doc.url })) : [],
    action: detectAction(question) ?? (answered ? null : "contact"),
    answered,
    source: "ai",
  };
}
