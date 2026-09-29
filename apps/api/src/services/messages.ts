import { sql } from "drizzle-orm";
import type { Message } from "@kxq/shared";
import { checkMessageSafety } from "../ai/service";
import { db } from "../db/client";
import { forbidden } from "../lib/http";
import { emitToUsers } from "../realtime/notifier";
import { getMatchForUser, toMessage, type MessageRow } from "./matches";

/** Chat history for a match, oldest first. `before` pages backwards. */
export async function listMessages(userId: string, matchId: string, before?: string, limit = 50) {
  await getMatchForUser(userId, matchId);
  const { rows } = await db.execute<MessageRow>(sql`
    select id, match_id, sender_id, body, created_at, read_at, flagged from messages
    where match_id = ${matchId} ${before ? sql`and created_at < ${before}` : sql``}
    order by created_at desc limit ${limit}`);
  return rows.reverse().map(toMessage);
}

/**
 * The single send path for REST and Socket.io. Only members of an active match can
 * send, demo profiles never receive messages, and every message gets a safety check.
 */
export async function sendMessage(userId: string, matchId: string, body: string): Promise<Message> {
  const match = await getMatchForUser(userId, matchId);
  if (match.other_is_demo) throw forbidden("Demo profiles can't receive messages");

  const safety = await checkMessageSafety(body);
  const { rows } = await db.execute<MessageRow>(sql`
    insert into messages (match_id, sender_id, body, flagged, flag_reason)
    values (${matchId}, ${userId}, ${body}, ${safety.flagged}, ${safety.reason})
    returning id, match_id, sender_id, body, created_at, read_at, flagged`);
  await db.execute(sql`update matches set last_message_at = now() where id = ${matchId}`);

  const message = toMessage(rows[0]);
  emitToUsers([userId, match.other_id], "message:new", message);
  return message;
}

export async function markRead(userId: string, matchId: string) {
  const match = await getMatchForUser(userId, matchId);
  const { rowCount } = await db.execute(sql`
    update messages set read_at = now()
    where match_id = ${matchId} and sender_id <> ${userId} and read_at is null`);
  if (rowCount) {
    emitToUsers([match.other_id], "message:read", { matchId, readerId: userId, at: new Date().toISOString() });
  }
  return { updated: rowCount ?? 0 };
}
