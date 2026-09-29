import { sql } from "drizzle-orm";
import type { ReportReason } from "@kxq/shared";
import { db } from "../db/client";
import { badRequest } from "../lib/http";
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

export async function report(userId: string, targetId: string, reason: ReportReason, details?: string) {
  if (userId === targetId) throw badRequest("You can't report yourself");
  const { rows } = await db.execute<{ id: string }>(sql`
    insert into reports (reporter_id, reported_id, reason, details)
    values (${userId}, ${targetId}, ${reason}, ${details ?? null}) returning id`);
  return { id: rows[0].id };
}
