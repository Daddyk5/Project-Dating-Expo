import { sql } from "drizzle-orm";
import type { IncomingLike } from "@kxq/shared";
import { db } from "../db/client";
import { env } from "../env";
import { notBlocked, publicColumns, requireOnboarded, toPublicProfiles, type PublicRow } from "./profiles";

/**
 * People who liked or super liked me that I haven't swiped on yet — liking one back
 * matches instantly. Super likes first, then newest. Preferences aren't applied: they
 * already chose me, and I decide from here.
 */
export async function likesYou(userId: string, limit: number): Promise<IncomingLike[]> {
  await requireOnboarded(userId);
  const { rows } = await db.execute<PublicRow & { superlike: boolean; liked_at: string }>(sql`
    with me as (select * from profiles where id = ${userId})
    select ${publicColumns}, s.action = 'superlike' as superlike, s.created_at as liked_at
    from swipes s
    join profiles p on p.id = s.swiper_id
    cross join me
    where s.target_id = me.id
      and s.action in ('like', 'superlike')
      and p.onboarded_at is not null
      and ${notBlocked(sql`me.id`, sql`p.id`)}
      and not exists (select 1 from swipes mine where mine.swiper_id = me.id and mine.target_id = p.id)
      ${env.isProd ? sql`and not p.is_demo` : sql``}
    order by superlike desc, s.created_at desc
    limit ${limit}`);
  const profiles = await toPublicProfiles(rows);
  return rows.map((r, i) => ({ profile: profiles[i], superlike: r.superlike, likedAt: new Date(r.liked_at).toISOString() }));
}
