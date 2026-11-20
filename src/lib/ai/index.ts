/**
 * Provider-agnostic LLM client. Uses plain fetch (no SDKs) so the bundle stays
 * small and switching provider is a single env var.
 *
 *   AI_PROVIDER = gemini | openai | anthropic | none   (empty = auto-detect)
 *
 * Every caller must handle `null` — that is the signal to use the
 * deterministic fallback, so the site keeps working with no key, an expired
 * key, a rate limit or a provider outage.
 */

export type ProviderId = "gemini" | "openai" | "anthropic" | "none";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system: string;
  messages: ChatMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

const DEFAULT_MODELS: Record<Exclude<ProviderId, "none">, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-5-5",
};

export function activeProvider(): ProviderId {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit === "none") return "none";
  if (explicit === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (explicit === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

export function activeModel(): string | null {
  const p = activeProvider();
  if (p === "none") return null;
  return process.env.AI_MODEL?.trim() || DEFAULT_MODELS[p];
}

async function withTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(o: GenerateOptions, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await withTimeout(
    url,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: o.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: o.temperature ?? 0.4,
          maxOutputTokens: o.maxTokens ?? 1024,
          ...(o.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
    o.timeoutMs ?? 20_000,
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts as { text?: string }[] | undefined;
  return parts?.map((p) => p.text ?? "").join("") || null;
}

async function callOpenAI(o: GenerateOptions, model: string): Promise<string | null> {
  const res = await withTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: o.temperature ?? 0.4,
        max_tokens: o.maxTokens ?? 1024,
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: o.system }, ...o.messages],
      }),
    },
    o.timeoutMs ?? 20_000,
  );
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

async function callAnthropic(o: GenerateOptions, model: string): Promise<string | null> {
  const res = await withTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: o.maxTokens ?? 1024,
        temperature: o.temperature ?? 0.4,
        system: o.json ? `${o.system}\n\nRespond with a single valid JSON object and nothing else.` : o.system,
        messages: o.messages,
      }),
    },
    o.timeoutMs ?? 20_000,
  );
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const blocks = data?.content as { type: string; text?: string }[] | undefined;
  return blocks?.filter((b) => b.type === "text").map((b) => b.text).join("") || null;
}

/** Returns model text, or null if no provider is configured or the call failed. */
export async function generate(o: GenerateOptions): Promise<string | null> {
  const provider = activeProvider();
  const model = activeModel();
  if (provider === "none" || !model) return null;
  try {
    if (provider === "gemini") return await callGemini(o, model);
    if (provider === "openai") return await callOpenAI(o, model);
    return await callAnthropic(o, model);
  } catch (err) {
    console.error(`[ai] ${provider} call failed, using fallback:`, (err as Error).message);
    return null;
  }
}

/** Pulls the first JSON object out of a model response (handles ```json fences). */
export function parseJsonLoose<T>(text: string | null): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
