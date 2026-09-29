import { sql } from "drizzle-orm";
import type { MatchSummary, Message } from "@kxq/shared";
import { db } from "../db/client";
import { notFound } from "../lib/http";
import { emitToUsers } from "../realtime/notifier";
import { publicColumns, notBlocked, toPublicProfiles, type PublicRow } from "./profiles";

export interface MessageRow extends Record<string, unknown> {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: Date | string;
  read_at: Date | string | null;
  flagged: boolean;
}

const iso = (v: Date | string) => new Date(v).toISOString();

export function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    matchId: r.match_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: iso(r.created_at),
    readAt: r.read_at ? iso(r.read_at) : null,
    flagged: r.flagged,
  };
}

/** Active match the user belongs to, with the other person's id. 404 otherwise. */
export async function getMatchForUser(userId: string, matchId: string) {
  const { rows } = await db.execute<{ id: string; other_id: string; other_is_demo: boolean }>(sql`
    select m.id, o.id as other_id, o.is_demo as other_is_demo
    from matches m
    join profiles o on o.id = case when m.user_a = ${userId} then m.user_b else m.user_a end
    where m.id = ${matchId} and ${userId} in (m.user_a, m.user_b) and m.unmatched_at is null
      and ${notBlocked(sql`${userId}::uuid`, sql`o.id`)}`);
  if (!rows[0]) throw notFound("Match not found");
  return rows[0];
}

export async function listMatches(userId: string): Promise<MatchSummary[]> {
  const { rows } = await db.execute<
    PublicRow & {
      match_id: string;
      match_created_at: Date;
      last_message_at: Date | null;
      unread_count: number;
      lm: MessageRow | null;
    }
  >(sql`
    with me as (select * from profiles where id = ${userId}),
    my_matches as (
      select m.*, case when m.user_a = me.id then m.user_b else m.user_a end as other_id
      from matches m cross join me
      where me.id in (m.user_a, m.user_b) and m.unmatched_at is null
    )
    select ${publicColumns},
      mm.id as match_id, mm.created_at as match_created_at, mm.last_message_at,
      (select count(*)::int from messages x
         where x.match_id = mm.id and x.sender_id <> me.id and x.read_at is null) as unread_count,
      (select row_to_json(l) from (
         select id, match_id, sender_id, body, created_at, read_at, flagged from messages
         where match_id = mm.id order by created_at desc limit 1) l) as lm
    from my_matches mm
    cross join me
    join profiles p on p.id = mm.other_id
    where ${notBlocked(sql`me.id`, sql`p.id`)}
    order by coalesce(mm.last_message_at, mm.created_at) desc`);

  const profiles = await toPublicProfiles(rows);
  return rows.map((r, i) => ({
    id: r.match_id,
    createdAt: iso(r.match_created_at),
    lastMessageAt: r.last_message_at ? iso(r.last_message_at) : null,
    other: profiles[i],
    lastMessage: r.lm ? toMessage(r.lm) : null,
    unreadCount: r.unread_count,
  }));
}

export async function unmatch(userId: string, matchId: string) {
  const m = await getMatchForUser(userId, matchId);
  await db.execute(sql`update matches set unmatched_at = now() where id = ${matchId}`);
  emitToUsers([userId, m.other_id], "match:removed", { matchId });
}
