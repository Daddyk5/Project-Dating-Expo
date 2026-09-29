import { sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { db } from "../db/client";
import { env } from "../env";
import { HttpError, tooMany } from "../lib/http";
import { getMatchForUser } from "../services/matches";
import { notBlocked } from "../services/profiles";
import { sortedPair } from "../services/swipes";
import { getProvider } from "./provider";
import * as P from "./prompts";

// ---------- structured generation ----------

/** Ask the model for JSON matching `schema`; retry once if the output is invalid. */
export async function generate<T>(
  schema: ZodType<T>,
  system: string,
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<T> {
  const provider = getProvider();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await provider.generateJson({
        system,
        prompt: attempt === 0 ? prompt : `${prompt}\n\nYour previous reply was not valid. Reply with JSON only, following every rule.`,
        schema,
        ...opts,
      });
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (e) {
      lastError = e;
    }
  }
  console.warn(`[ai] ${provider.name} gave no valid output`, lastError);
  throw new HttpError(502, "The AI assistant is unavailable right now. Try again in a moment.");
}

// ---------- per-user quota ----------

const usage = new Map<string, number[]>();

/** Counts only user-triggered model calls (not safety checks or cache hits). */
export function consumeQuota(userId: string) {
  const hourAgo = Date.now() - 3_600_000;
  const recent = (usage.get(userId) ?? []).filter((t) => t > hourAgo);
  if (recent.length >= env.AI_REQUESTS_PER_HOUR) {
    usage.set(userId, recent);
    throw tooMany(`You've used the AI assistant ${env.AI_REQUESTS_PER_HOUR} times this hour. Try again later.`);
  }
  recent.push(Date.now());
  usage.set(userId, recent);
}

export function resetQuotaForTests() {
  usage.clear();
}

// ---------- profile facts ----------

interface FactsRow extends Record<string, unknown> {
  id: string;
  display_name: string;
  age: number;
  bio: string;
  interests: string[];
  city: string | null;
}

async function facts(ids: string[]): Promise<Map<string, P.ProfileFacts>> {
  const { rows } = await db.execute<FactsRow>(sql`
    select id, display_name, date_part('year', age(birthdate))::int as age, bio, interests, city
    from profiles where id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`);
  return new Map(
    rows.map((r) => [r.id, { name: r.display_name, age: r.age, bio: r.bio, interests: r.interests, city: r.city }]),
  );
}

const sharedInterests = (a: P.ProfileFacts, b: P.ProfileFacts) => {
  const theirs = new Set(b.interests.map((i) => i.toLowerCase()));
  return a.interests.filter((i) => theirs.has(i.toLowerCase()));
};

// ---------- features ----------

export async function icebreakers(userId: string, matchId: string) {
  const match = await getMatchForUser(userId, matchId);
  consumeQuota(userId);
  const f = await facts([userId, match.other_id]);
  const me = f.get(userId)!;
  const them = f.get(match.other_id)!;
  const out = await generate(P.icebreakersOutput, P.icebreakers.system, P.icebreakers.prompt(me, them, sharedInterests(me, them)), {
    temperature: 0.9,
  });
  return { icebreakers: out.icebreakers };
}

export async function bioPolish(userId: string, draft: string) {
  consumeQuota(userId);
  const out = await generate(P.bioPolishOutput, P.bioPolish.system, P.bioPolish.prompt(draft), { temperature: 0.7 });
  // Small models sometimes wrap the text in quotes.
  return { versions: out.versions.map((v) => v.trim().replace(/^["'“]+|["'”]+$/g, "").trim()) };
}

/** One friendly line about what two people share. Cached per pair; only cache misses use quota. */
export async function compatibility(userId: string, targetId: string) {
  if (userId === targetId) throw new HttpError(400, "Pick someone else");
  const [a, b] = sortedPair(userId, targetId);
  const { rows: allowed } = await db.execute(sql`
    select 1 from profiles where id = ${targetId} and onboarded_at is not null
      and ${notBlocked(sql`${userId}::uuid`, sql`${targetId}::uuid`)}`);
  if (!allowed.length) throw new HttpError(404, "Profile not found");

  const { rows: cached } = await db.execute<{ summary: string }>(sql`
    select summary from compatibility_cache
    where user_a = ${a} and user_b = ${b} and created_at > now() - interval '7 days'`);
  if (cached[0]) return { summary: cached[0].summary, cached: true };

  consumeQuota(userId);
  const f = await facts([userId, targetId]);
  const viewer = f.get(userId)!;
  const profile = f.get(targetId)!;
  const out = await generate(
    P.compatibilityOutput,
    P.compatibility.system,
    P.compatibility.prompt(viewer, profile, sharedInterests(viewer, profile)),
    { temperature: 0.6, maxTokens: 200 },
  );
  // Written from the viewer's side, which reads naturally either way ("You both...").
  await db.execute(sql`
    insert into compatibility_cache (user_a, user_b, summary) values (${a}, ${b}, ${out.summary})
    on conflict (user_a, user_b) do update set summary = excluded.summary, created_at = now()`);
  return { summary: out.summary, cached: false };
}

// ---------- message safety ----------

export interface SafetyResult {
  flagged: boolean;
  reason: string | null;
}

// Fast, model-free signals. They run first and also cover the case where the model is down.
const RULES: { category: string; pattern: RegExp }[] = [
  {
    category: "scam",
    pattern:
      /\b(send|lend|loan|wire|transfer)\b[^.?!]{0,40}\b(money|cash|funds|php|pesos?|usd|\$|₱|gcash|maya|paypal|bitcoin|btc|usdt)\b/i,
  },
  { category: "scam", pattern: /\b(gift ?cards?|itunes card|steam card)\b/i },
  {
    category: "scam",
    pattern: /\b(crypto|forex|bitcoin|usdt|binary options?)\b[^.?!]{0,60}\b(invest|investment|profit|returns?|trading|mentor)\b/i,
  },
  { category: "scam", pattern: /\b(invest|investment)\b[^.?!]{0,60}\b(guaranteed|double|profit|returns?)\b/i },
];

function ruleCheck(body: string): SafetyResult {
  const hit = RULES.find((r) => r.pattern.test(body));
  return hit ? { flagged: true, reason: `${hit.category}: matched a known pattern` } : { flagged: false, reason: null };
}

/**
 * Runs on every message. Rules catch obvious scams instantly; the model covers
 * harassment, explicit content and subtler scams. If the model is unavailable the
 * message still goes through with the rule result, so chat never blocks on AI.
 */
export async function checkMessageSafety(body: string): Promise<SafetyResult> {
  const rules = ruleCheck(body);
  if (rules.flagged) return rules;
  try {
    const out = await generate(P.safetyOutput, P.messageSafety.system, P.messageSafety.prompt(body), {
      temperature: 0,
      maxTokens: 120,
    });
    const flagged = out.flagged && out.category !== "none";
    return flagged ? { flagged: true, reason: `${out.category}: ${out.reason}` } : { flagged: false, reason: null };
  } catch {
    return rules;
  }
}
