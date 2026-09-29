import { sql } from "drizzle-orm";
import type { PublicProfile } from "@kxq/shared";
import { db } from "../db/client";
import { env } from "../env";
import { notBlocked, publicColumns, requireOnboarded, toPublicProfiles, type PublicRow } from "./profiles";

/**
 * Candidates both sides would want to see: gender and age preferences go both ways,
 * blocked pairs and (in production) demo profiles are excluded, and only profiles
 * with at least one approved photo appear.
 */
const eligible = sql`
  p.id <> me.id
  and p.onboarded_at is not null
  and p.gender = any(me.interested_in) and me.gender = any(p.interested_in)
  and date_part('year', age(p.birthdate)) between me.age_min and me.age_max
  and date_part('year', age(me.birthdate)) between p.age_min and p.age_max
  and ${notBlocked(sql`me.id`, sql`p.id`)}
  and exists (select 1 from photos ph where ph.profile_id = p.id and ph.moderation_status = 'approved')`;

const demoFilter = () => (env.isProd ? sql`and not p.is_demo` : sql``);

/** Tinder-style deck: unseen people within my distance, ranked by closeness and recent activity. */
export async function discover(userId: string, limit: number): Promise<PublicProfile[]> {
  await requireOnboarded(userId);
  const { rows } = await db.execute<PublicRow & { rank: number }>(sql`
    with me as (select * from profiles where id = ${userId}),
    candidates as (
      select ${publicColumns}, p.last_active_at, me.max_distance_km
      from profiles p cross join me
      where ${eligible} ${demoFilter()}
        and not exists (select 1 from swipes s where s.swiper_id = me.id and s.target_id = p.id)
        and (me.location is null or p.location is null
             or ST_DWithin(p.location, me.location, me.max_distance_km * 1000))
    )
    select *,
      0.6 * coalesce(distance_km, max_distance_km / 2.0) / greatest(max_distance_km, 1)
      + 0.4 * least(extract(epoch from now() - last_active_at) / 86400.0 / 14, 1) as rank
    from candidates
    order by rank, id
    limit ${limit}`);
  return toPublicProfiles(rows);
}

/** Badoo-style "People Nearby": everyone matching my preferences, nearest first. */
export async function nearby(userId: string, limit: number): Promise<PublicProfile[]> {
  await requireOnboarded(userId);
  const { rows } = await db.execute<PublicRow>(sql`
    with me as (select * from profiles where id = ${userId})
    select ${publicColumns}
    from profiles p cross join me
    where ${eligible} ${demoFilter()}
    order by distance_km nulls last, p.last_active_at desc
    limit ${limit}`);
  return toPublicProfiles(rows);
}
