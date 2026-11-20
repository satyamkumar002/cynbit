import { KB, type KbDoc } from "./kb/cynbit";

/**
 * Small BM25 retriever. With ~20 short documents, BM25 is accurate, needs no
 * embedding API, has zero cost and runs in <1 ms — embeddings would add a
 * second API dependency without a measurable gain at this size.
 */

const STOP = new Set(
  "a an and are as at be by can do does for from has have how i in is it its me my of on or our so that the this to we what when where which who why will with you your about there their them they cynbit tell know want need like please give any some much many also just us".split(
    " ",
  ),
);

const SYNONYMS: Record<string, string[]> = {
  long: ["duration", "day", "week", "sprint"],
  duration: ["day", "week", "sprint"],
  offer: ["services", "build"],
  founder: ["about", "story"],
  price: ["pricing", "cost", "fee", "fees", "charge"],
  cost: ["pricing", "price", "fee"],
  fee: ["fees", "price", "cost"],
  bitelevate: ["internship"],
  internship: ["bitelevate", "intern", "interns"],
  intern: ["bitelevate", "internship"],
  phone: ["contact", "call"],
  email: ["contact"],
  address: ["contact", "jaipur"],
  location: ["contact", "jaipur", "address"],
  office: ["contact", "jaipur", "address"],
  track: ["lab", "labs"],
  tracks: ["lab", "labs"],
  course: ["bitelevate", "curriculum"],
  syllabus: ["curriculum"],
  chatbot: ["ai", "agents", "rag"],
  app: ["mobile", "web", "development"],
  website: ["web", "development"],
  seo: ["marketing"],
  certificate: ["certification", "credit"],
  reviews: ["revio", "reputation"],
  property: ["tenantease", "rent"],
  rent: ["tenantease"],
  clients: ["case", "studies", "testimonials"],
  portfolio: ["case", "studies"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9₹\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

interface Indexed {
  doc: KbDoc;
  tf: Map<string, number>;
  len: number;
  titleTokens: Set<string>;
}

const INDEX: Indexed[] = KB.map((doc) => {
  const tokens = tokenize(`${doc.title} ${doc.title} ${doc.text}`);
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { doc, tf, len: tokens.length, titleTokens: new Set(tokenize(doc.title)) };
});
const AVG_LEN = INDEX.reduce((s, d) => s + d.len, 0) / INDEX.length;
const DF = new Map<string, number>();
for (const d of INDEX) for (const t of d.tf.keys()) DF.set(t, (DF.get(t) ?? 0) + 1);

function expand(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) for (const s of SYNONYMS[t] ?? []) out.add(tokenize(s)[0] ?? s);
  return [...out];
}

export interface Hit {
  doc: KbDoc;
  score: number;
  /**
   * IDF-weighted share of the visitor's own words (or their synonyms) found in
   * this page, 0–1. BM25 alone will happily match on one generic word like
   * "call"; coverage tells us whether the page is really about the question.
   */
  coverage: number;
}

function idf(t: string): number {
  const df = DF.get(t) ?? 0;
  return Math.log(1 + (INDEX.length - df + 0.5) / (df + 0.5));
}

export function retrieve(query: string, k = 4): Hit[] {
  const original = tokenize(query);
  const q = expand(original);
  if (!q.length) return [];
  const N = INDEX.length;
  const k1 = 1.4;
  const b = 0.75;
  const scored = INDEX.map((d) => {
    let score = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      score += (idf(t) * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * d.len) / AVG_LEN));
    }
    let covered = 0;
    let total = 0;
    for (const t of new Set(original)) {
      const w = idf(t);
      total += w;
      const variants = [t, ...(SYNONYMS[t] ?? []).map((s) => tokenize(s)[0] ?? s)];
      if (variants.some((v) => d.tf.has(v))) covered += w;
    }
    const coverage = total ? covered / total : 0;
    // Small bonus when the visitor's own words appear in a page title.
    if (score > 0) for (const t of original) if (d.titleTokens.has(t)) score += 1;
    return { doc: d.doc, score, coverage };
  });
  void N;
  // Rank by BM25 weighted by coverage, so a page that covers all the visitor's words beats one that repeats a single word.
  const rank = (h: Hit) => h.score * (0.4 + h.coverage);
  return scored.filter((s) => s.score > 0).sort((a, b2) => rank(b2) - rank(a)).slice(0, k);
}

/** Heuristic used when no LLM is available: is this page really about the question? */
export function isConfident(h: Hit): boolean {
  return h.coverage >= 0.5 || (h.score >= 6 && h.coverage >= 0.3);
}
