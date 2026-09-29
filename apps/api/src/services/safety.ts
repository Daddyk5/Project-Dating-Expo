import { sql } from "drizzle-orm";
import type { BlockedUser, ReportReason } from "@kxq/shared";
import { db } from "../db/client";
import { badRequest } from "../lib/http";
import { loadPhotos } from "./profiles";
import { emitToUsers } from "../realtime/notifier";
import { sortedPair } from "./swipes";

/** Blocking also ends any match between the two, so neither can see or message the other. */
export async function block(userId: string, targetId: string) {
  if (userId === targetId) throw badRequest("You can't block yourself");
  await db.execute(sql`
    insert into blocks (blocker_id, blocked_id) values (${userId}, ${targetId}) on conflict do nothing`);
  const [a, b] = sortedPair(userId, targetId);
  const { rows } = await db.execute<{ id: string }>(sql`
    update matches set unmatched_at = now()
    where user_a = ${a} and user_b = ${b} and unmatched_at is null returning id`);
  if (rows[0]) emitToUsers([userId, targetId], "match:removed", { matchId: rows[0].id });
}

/** People I blocked, newest first. */
export async function listBlocks(userId: string): Promise<BlockedUser[]> {
  const { rows } = await db.execute<{ id: string; display_name: string; created_at: string }>(sql`
    select p.id, p.display_name, bl.created_at from blocks bl
    join profiles p on p.id = bl.blocked_id
    where bl.blocker_id = ${userId}
    order by bl.created_at desc`);
  const photos = await loadPhotos(rows.map((r) => r.id), { approvedOnly: true });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    photoUrl: photos.get(r.id)?.[0]?.url ?? null,
    blockedAt: new Date(r.created_at).toISOString(),
  }));
}

/** Lets them appear in Discover again. A match ended by the block stays ended. */
export async function unblock(userId: string, targetId: string) {
  await db.execute(sql`delete from blocks where blocker_id = ${userId} and blocked_id = ${targetId}`);
}

export async function report(userId: string, targetId: string, reason: ReportReason, details?: string) {
  if (userId === targetId) throw badRequest("You can't report yourself");
  const { rows } = await db.execute<{ id: string }>(sql`
    insert into reports (reporter_id, reported_id, reason, details)
    values (${userId}, ${targetId}, ${reason}, ${details ?? null}) returning id`);
  return { id: rows[0].id };
}
