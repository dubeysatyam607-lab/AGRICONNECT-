/**
 * Shared AI gateway for Supabase edge functions.
 *
 * Root-cause fix for AI failures: the previous functions hard-coded a single
 * Lovable-proxy gateway + `LOVABLE_API_KEY`, which is absent in standalone
 * deployments, so every AI call returned 500. This gateway tries the best
 * configured provider — native Gemini first, then any OpenAI-compatible
 * endpoint, then the Lovable gateway — with hard timeouts so a hung upstream
 * can never leave a farmer staring at an infinite spinner.
 *
 * Messages use the OpenAI wire format (`content` as string OR as parts array
 * with `image_url`), which is converted to Gemini's native shape when needed.
 */

export type AiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string | AiContentPart[];
}

export interface AiGatewayOptions {
  /** Force a specific provider ("auto" picks the best configured). */
  provider?: "auto" | "gemini" | "openai" | "lovable";
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export class AiGatewayError extends Error {
  kind: "config" | "timeout" | "rate_limit" | "quota" | "upstream" | "empty";
  constructor(kind: AiGatewayError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

const DEFAULT_TIMEOUT_MS = 25000;

interface Provider {
  name: "gemini" | "openai" | "lovable";
  key: string | undefined;
  baseUrl: string;
  defaultModel: string;
}

function configuredProviders(): Provider[] {
  const providers: Provider[] = [];

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey && geminiKey.startsWith("AIza")) {
    providers.push({
      name: "gemini",
      key: geminiKey,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      defaultModel: "gemini-2.0-flash",
    });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    providers.push({
      name: "openai",
      key: openaiKey,
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
    });
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push({
      name: "lovable",
      key: lovableKey,
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      defaultModel: "google/gemini-2.0-flash",
    });
  }

  return providers;
}

function pickProviders(preferred?: "auto" | "gemini" | "openai" | "lovable"): Provider[] {
  const all = configuredProviders();
  if (preferred && preferred !== "auto") {
    const chosen = all.find((p) => p.name === preferred);
    if (chosen) return [chosen];
  }
  return all;
}

/** Return the human-friendly provider name for logging. */
function providerLabel(p: Provider): string {
  return p.name;
}

/** Extract the final text from a provider-specific response envelope. */
function extractText(payload: Record<string, unknown>): string {
  // OpenAI / Lovable gateway format.
  const choices = payload.choices as
    | Array<{ message?: { content?: unknown } }>
    | undefined;
  if (choices && choices.length > 0) {
    const content = choices[0].message?.content;
    if (typeof content === "string" && content.trim()) return content.trim();
  }
  // Gemini native format.
  const candidates = payload.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  if (candidates && candidates.length > 0) {
    const parts = candidates[0].content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (text) return text;
  }
  return "";
}

/** Convert OpenAI-format content into Gemini parts (handles images). */
function toGeminiParts(content: string | AiContentPart[]): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push({ text: part.text });
    } else if (part.type === "image_url") {
      const url = part.image_url.url;
      const match = url.match(/^data:([^;,]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      } else if (url.startsWith("http")) {
        // Gemini accepts inline data only; keep the URL as text guidance.
        parts.push({ text: `Image reference: ${url}` });
      }
    }
  }
  return parts;
}

function buildGeminiBody(messages: AiMessage[], temperature: number, maxTokens: number) {
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: unknown[] }> = [];
  for (const message of messages) {
    if (message.role === "system") {
      if (typeof message.content === "string") systemParts.push(message.content);
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(message.content),
    });
  }
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts.map((text) => ({ text })) };
  }
  return body;
}

async function callProvider(
  provider: Provider,
  model: string,
  messages: AiMessage[],
  options: AiGatewayOptions,
): Promise<string> {
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 1024;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url = "";
  let body: unknown;

  if (provider.name === "gemini") {
    const geminiModel = model.replace(/^google\//, "");
    url = `${provider.baseUrl}/models/${geminiModel}:generateContent`;
    headers["x-goog-api-key"] = provider.key!;
    body = buildGeminiBody(messages, temperature, maxTokens);
  } else {
    headers.Authorization = `Bearer ${provider.key}`;
    url = `${provider.baseUrl}/chat/completions`;
    body = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
    };
  }

  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "TimeoutError";
    throw new AiGatewayError(aborted ? "timeout" : "upstream", "AI provider unreachable");
  }

  if (response.status === 429) throw new AiGatewayError("rate_limit", "Too many requests to AI provider");
  if (response.status === 402 || response.status === 403) throw new AiGatewayError("quota", "AI quota exhausted");

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new AiGatewayError("upstream", `AI provider error ${response.status}: ${detail}`);
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) throw new AiGatewayError("upstream", "Invalid AI provider response");
  const text = extractText(payload);
  if (!text) throw new AiGatewayError("empty", "AI provider returned no content");
  return text;
}

/**
 * Run a chat completion against the best available provider.
 * Falls back provider-by-provider so a single bad key never breaks the app.
 */
export async function aiChatCompletion(
  messages: AiMessage[],
  options: AiGatewayOptions = {},
): Promise<{ text: string; provider: string }> {
  const providers = pickProviders(options.provider);
  if (providers.length === 0) {
    throw new AiGatewayError(
      "config",
      "No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY.",
    );
  }

  let lastError: unknown = null;
  for (const provider of providers) {
    const model = options.model ?? provider.defaultModel;
    try {
      const text = await callProvider(provider, model, messages, options);
      return { text, provider: providerLabel(provider) };
    } catch (err) {
      lastError = err;
      // A quota/config failure on one provider should not block the others;
      // only a hard timeout is terminal for the remaining budget.
      if (err instanceof AiGatewayError && err.kind === "timeout") throw err;
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new AiGatewayError("upstream", "All AI providers failed");
}
