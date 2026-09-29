import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// The repo keeps a single .env at the root (Neon writes it on link/checkout/deploy).
// Values already present in process.env win, so tests can point at another branch.
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. See .env.example.`);
  return v;
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const authBase = required("NEON_AUTH_BASE_URL");

export const env = {
  NODE_ENV,
  isProd: NODE_ENV === "production",
  isTest: NODE_ENV === "test",
  PORT: Number(process.env.PORT ?? 8080),
  CORS_ORIGINS: (process.env.CORS_ORIGIN ?? "http://localhost:8081").split(",").map((s) => s.trim()),

  DATABASE_URL: required("DATABASE_URL"),

  NEON_AUTH_BASE_URL: authBase,
  NEON_AUTH_JWKS_URL: process.env.NEON_AUTH_JWKS_URL ?? `${authBase}/.well-known/jwks.json`,
  /** Neon Auth JWTs use the Auth URL's origin as both `iss` and `aud`. */
  AUTH_ISSUER: new URL(authBase).origin,

  UPLOADS_BUCKET: process.env.UPLOADS_BUCKET ?? "uploads",

  AI_PROVIDER: (process.env.AI_PROVIDER ?? "ollama") as "ollama" | "anthropic" | "neon-gateway",
  AI_MODEL: process.env.AI_MODEL ?? "llama3.2:3b",
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
  AI_REQUESTS_PER_HOUR: Number(process.env.AI_REQUESTS_PER_HOUR ?? 20),
  OLLAMA_URL: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  NEON_AI_GATEWAY_URL: process.env.NEON_AI_GATEWAY_URL ?? "",
  NEON_AI_GATEWAY_TOKEN: process.env.NEON_AI_GATEWAY_TOKEN ?? "",
};
