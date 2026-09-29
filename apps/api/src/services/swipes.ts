import { sql } from "drizzle-orm";
import type { PublicProfile, SwipeAction, SwipeResult } from "@kxq/shared";
import { db } from "../db/client";
import { badRequest, conflict, notFound } from "../lib/http";
import { emitToUsers } from "../realtime/notifier";
import { getPublicProfile, notBlocked, requireOnboarded } from "./profiles";

export const sortedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

/**
 * Record a swipe; on a like/superlike that is reciprocated, create the match.
 * Runs in one transaction so two simultaneous likes still yield exactly one match.
 */
export async function swipe(userId: string, targetId: string, action: SwipeAction): Promise<SwipeResult> {
  if (userId === targetId) throw badRequest("You can't swipe on yourself");
  await requireOnboarded(userId);

  const { rows: target } = await db.execute<{ id: string }>(sql`
    select p.id from profiles p
    where p.id = ${targetId} and p.onboarded_at is not null and ${notBlocked(sql`${userId}::uuid`, sql`p.id`)}`);
  if (!target[0]) throw notFound("Profile not found");

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into swipes (swiper_id, target_id, action) values (${userId}, ${targetId}, ${action})
      on conflict (swiper_id, target_id) do update set action = excluded.action, created_at = now()`);
    if (action === "pass") return { matched: false, matchId: null };

    const { rows: reverse } = await tx.execute(sql`
      select 1 from swipes
      where swiper_id = ${targetId} and target_id = ${userId} and action in ('like', 'superlike')`);
    if (!reverse.length) return { matched: false, matchId: null };

    const [a, b] = sortedPair(userId, targetId);
    const { rows: created } = await tx.execute<{ id: string }>(sql`
      insert into matches (user_a, user_b) values (${a}, ${b})
      on conflict (user_a, user_b) do nothing returning id`);
    if (created[0]) return { matched: true, matchId: created[0].id, isNew: true };

    // Already matched (e.g. a repeated like). An unmatched pair stays unmatched.
    const { rows: existing } = await tx.execute<{ id: string; unmatched_at: string | null }>(
      sql`select id, unmatched_at from matches where user_a = ${a} and user_b = ${b}`,
    );
    const m = existing[0];
    return m && !m.unmatched_at ? { matched: true, matchId: m.id } : { matched: false, matchId: null };
  });

  if ("isNew" in result && result.matchId) emitToUsers([targetId], "match:new", { matchId: result.matchId });
  return { matched: result.matched, matchId: result.matchId };
}

/** Undo my most recent swipe, only if it was a pass. Returns the profile to put back on the deck. */
export async function undoLastPass(userId: string): Promise<PublicProfile> {
  const { rows } = await db.execute<{ target_id: string; action: SwipeAction }>(sql`
    select target_id, action from swipes where swiper_id = ${userId}
    order by created_at desc limit 1`);
  const last = rows[0];
  if (!last) throw notFound("Nothing to undo");
  if (last.action !== "pass") throw conflict("Only a pass can be undone");
  await db.execute(sql`delete from swipes where swiper_id = ${userId} and target_id = ${last.target_id}`);
  return getPublicProfile(userId, last.target_id);
}
