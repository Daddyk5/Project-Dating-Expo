import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z, type ZodType } from "zod";
import { env } from "../env";

export interface JsonRequest {
  system: string;
  prompt: string;
  schema: ZodType;
  maxTokens?: number;
  temperature?: number;
}

/**
 * One interface for every model backend. Providers return parsed JSON; the caller
 * validates it with the zod schema (and retries once on invalid output).
 */
export interface AiProvider {
  name: string;
  generateJson(req: JsonRequest): Promise<unknown>;
}

/** Local models via Ollama. `format` constrains decoding to the JSON schema. */
export function ollamaProvider(): AiProvider {
  return {
    name: `ollama:${env.AI_MODEL}`,
    async generateJson({ system, prompt, schema, maxTokens = 600, temperature = 0.7 }) {
      const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
        body: JSON.stringify({
          model: env.AI_MODEL,
          stream: false,
          format: z.toJSONSchema(schema),
          options: { temperature, num_predict: maxTokens },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { message?: { content?: string } };
      return JSON.parse(data.message?.content ?? "");
    },
  };
}

/** Claude via the official SDK with structured outputs. */
export function anthropicProvider(): AiProvider {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY || undefined, timeout: env.AI_TIMEOUT_MS });
  const model = env.AI_MODEL.startsWith("claude-") ? env.AI_MODEL : "claude-haiku-4-5-20251001";
  return {
    name: `anthropic:${model}`,
    async generateJson({ system, prompt, schema, maxTokens = 1024 }) {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.stop_reason === "refusal") throw new Error("Model declined the request");
      if (response.parsed_output == null) throw new Error("No structured output");
      return response.parsed_output;
    },
  };
}

/** Neon AI Gateway (paid plans): OpenAI-compatible chat completions endpoint. */
export function neonGatewayProvider(): AiProvider {
  return {
    name: `neon-gateway:${env.AI_MODEL}`,
    async generateJson({ system, prompt, schema, maxTokens = 600, temperature = 0.7 }) {
      if (!env.NEON_AI_GATEWAY_URL) throw new Error("NEON_AI_GATEWAY_URL is not set");
      const res = await fetch(`${env.NEON_AI_GATEWAY_URL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NEON_AI_GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
        body: JSON.stringify({
          model: env.AI_MODEL,
          max_tokens: maxTokens,
          temperature,
          response_format: { type: "json_schema", json_schema: { name: "result", schema: z.toJSONSchema(schema) } },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return JSON.parse(data.choices?.[0]?.message?.content ?? "");
    },
  };
}

let provider: AiProvider | null = null;

export function getProvider(): AiProvider {
  if (provider) return provider;
  switch (env.AI_PROVIDER) {
    case "anthropic":
      provider = anthropicProvider();
      break;
    case "neon-gateway":
      provider = neonGatewayProvider();
      break;
    default:
      provider = ollamaProvider();
  }
  return provider;
}

/** Tests swap in a fake provider. */
export function setProviderForTests(p: AiProvider | null) {
  provider = p;
}
