/**
 * LLM client for Relay NL engine. Uses OpenAI-compatible API (env OPENAI_API_KEY, optional OPENAI_BASE_URL, OPENAI_MODEL).
 */

export interface LlmClientOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const DEFAULT_MODEL = "gpt-4o-mini";

function getJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (codeBlock) return codeBlock[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

export class LlmClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options: LlmClientOptions = {}) {
    this.apiKey =
      options.apiKey ??
      process.env["OPENAI_API_KEY"] ??
      process.env["RELAY_LLM_API_KEY"] ??
      "";
    this.baseUrl =
      options.baseUrl ??
      process.env["OPENAI_BASE_URL"] ??
      process.env["RELAY_LLM_BASE_URL"] ??
      "https://api.openai.com/v1";
    this.model =
      options.model ??
      process.env["OPENAI_MODEL"] ??
      process.env["RELAY_LLM_MODEL"] ??
      DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Send prompt and return raw response text.
   */
  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "LLM not configured. Set OPENAI_API_KEY or RELAY_LLM_API_KEY (and optionally OPENAI_BASE_URL, OPENAI_MODEL)."
      );
    }

    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: this.model,
      messages: [{ role: "user" as const, content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 500)}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    return content;
  }

  /**
   * Complete and parse JSON from response. Strips markdown code blocks if present.
   */
  async completeJson<T>(prompt: string): Promise<T> {
    const text = await this.complete(prompt);
    const jsonStr = getJsonFromResponse(text);
    try {
      return JSON.parse(jsonStr) as T;
    } catch (e) {
      throw new Error(`LLM returned invalid JSON: ${jsonStr.slice(0, 200)}...`);
    }
  }
}
