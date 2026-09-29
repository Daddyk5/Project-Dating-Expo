import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { env } from "../env";

export interface AuthUser {
  id: string;
  email?: string;
}

let keyResolver: JWTVerifyGetKey | null = null;

function getKeyResolver(): JWTVerifyGetKey {
  // jose caches the JWKS and refetches on unknown `kid` (key rotation).
  keyResolver ??= createRemoteJWKSet(new URL(env.NEON_AUTH_JWKS_URL));
  return keyResolver;
}

/** Tests sign tokens with a local key pair instead of Neon Auth. */
export function setKeyResolverForTests(resolver: JWTVerifyGetKey) {
  if (!env.isTest) throw new Error("setKeyResolverForTests is test-only");
  keyResolver = resolver;
}

/** Verify a Neon Auth (Managed Better Auth) JWT: EdDSA signature, issuer, audience, expiry. */
export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getKeyResolver(), {
    issuer: env.AUTH_ISSUER,
    audience: env.AUTH_ISSUER,
  });
  if (!payload.sub) throw new Error("Token has no subject");
  if (payload.banned === true) throw new Error("User is banned");
  return { id: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}
