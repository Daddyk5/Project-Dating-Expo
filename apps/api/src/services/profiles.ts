import { sql, type SQL } from "drizzle-orm";
import {
  MIN_INTERESTS,
  MIN_PHOTOS,
  type Gender,
  type MyProfile,
  type Photo,
  type Preferences,
  type ProfileUpdate,
  type PublicProfile,
} from "@kxq/shared";
import { db } from "../db/client";
import { env } from "../env";
import { nearestPlace } from "../lib/places";
import { badRequest, conflict, notFound } from "../lib/http";
import { deleteObject, readUrl } from "../lib/storage";
import { isOnline } from "../realtime/notifier";

// ---------- shared row mapping ----------

export interface PublicRow extends Record<string, unknown> {
  id: string;
  display_name: string;
  age: number;
  gender: Gender;
  bio: string;
  interests: string[];
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_demo: boolean;
  is_online: boolean;
  distance_km: number | null;
}

/** Columns every "someone else's profile" query selects. Needs `p` (target) and `me` in scope. */
export const publicColumns = sql`
  p.id, p.display_name, date_part('year', age(p.birthdate))::int as age, p.gender, p.bio,
  p.interests, p.city, p.country, p.is_verified, p.is_demo,
  (p.last_active_at > now() - interval '5 minutes') as is_online,
  case when me.location is null or p.location is null then null
       else round((ST_Distance(p.location, me.location) / 1000)::numeric, 1)::float8 end as distance_km`;

/** Excludes pairs where either side blocked the other. */
export const notBlocked = (a: SQL, b: SQL) => sql`not exists (
  select 1 from blocks bl
  where (bl.blocker_id = ${a} and bl.blocked_id = ${b}) or (bl.blocker_id = ${b} and bl.blocked_id = ${a}))`;

interface PhotoRow extends Record<string, unknown> {
  id: string;
  profile_id: string;
  storage_key: string;
  position: number;
  is_primary: boolean;
  moderation_status: Photo["moderationStatus"];
}

export async function loadPhotos(profileIds: string[], opts: { approvedOnly: boolean }) {
  const byProfile = new Map<string, Photo[]>();
  if (!profileIds.length) return byProfile;
  const { rows } = await db.execute<PhotoRow>(sql`
    select id, profile_id, storage_key, position, is_primary, moderation_status from photos
    where profile_id in (${sql.join(profileIds.map((id) => sql`${id}::uuid`), sql`, `)})
      ${opts.approvedOnly ? sql`and moderation_status = 'approved'` : sql``}
    order by profile_id, position`);
  for (const r of rows) {
    const list = byProfile.get(r.profile_id) ?? [];
    list.push({
      id: r.id,
      url: await readUrl(r.storage_key),
      position: r.position,
      isPrimary: r.is_primary,
      moderationStatus: r.moderation_status,
    });
    byProfile.set(r.profile_id, list);
  }
  return byProfile;
}

export async function toPublicProfiles(rows: PublicRow[]): Promise<PublicProfile[]> {
  const photos = await loadPhotos(rows.map((r) => r.id), { approvedOnly: true });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    age: r.age,
    gender: r.gender,
    bio: r.bio,
    interests: r.interests,
    city: r.city,
    country: r.country,
    isVerified: r.is_verified,
    isDemo: r.is_demo,
    isOnline: r.is_online || isOnline(r.id),
    distanceKm: r.distance_km,
    photos: photos.get(r.id) ?? [],
  }));
}

// ---------- my profile ----------

interface MyRow extends Record<string, unknown> {
  id: string;
  display_name: string;
  birthdate: string;
  age: number;
  gender: Gender;
  interested_in: Gender[];
  bio: string;
  interests: string[];
  city: string | null;
  country: string | null;
  age_min: number;
  age_max: number;
  max_distance_km: number;
  is_verified: boolean;
  is_demo: boolean;
  has_location: boolean;
  onboarded_at: string | null;
}

async function findMyRow(id: string): Promise<MyRow | undefined> {
  const { rows } = await db.execute<MyRow>(sql`
    select id, display_name, birthdate::text as birthdate, date_part('year', age(birthdate))::int as age,
           gender, interested_in::text[] as interested_in, bio, interests, city, country, age_min, age_max, max_distance_km,
           is_verified, is_demo, location is not null as has_location, onboarded_at
    from profiles where id = ${id}`);
  return rows[0];
}

export async function getMyProfile(id: string): Promise<MyProfile | null> {
  const r = await findMyRow(id);
  if (!r) return null;
  const photos = (await loadPhotos([id], { approvedOnly: false })).get(id) ?? [];
  return {
    id: r.id,
    displayName: r.display_name,
    birthdate: r.birthdate,
    age: r.age,
    gender: r.gender,
    interestedIn: r.interested_in,
    bio: r.bio,
    interests: r.interests,
    city: r.city,
    country: r.country,
    ageMin: r.age_min,
    ageMax: r.age_max,
    maxDistanceKm: r.max_distance_km,
    isVerified: r.is_verified,
    isDemo: r.is_demo,
    hasLocation: r.has_location,
    onboardingComplete: r.onboarded_at !== null,
    photos,
  };
}

export async function requireOnboarded(id: string) {
  const r = await findMyRow(id);
  if (!r) throw conflict("Create your profile first");
  if (!r.onboarded_at) throw conflict("Finish onboarding first");
  return r;
}

/** Create the profile on first save (needs name, birthdate, gender), update it afterwards. */
export async function upsertProfile(id: string, u: ProfileUpdate) {
  const existing = await findMyRow(id);
  if (!existing) {
    if (!u.displayName || !u.birthdate || !u.gender) {
      throw badRequest("Name, birthdate and gender are required to create a profile");
    }
    await db.execute(sql`
      insert into profiles (id, display_name, birthdate, gender, interested_in, bio, interests, city, country)
      values (${id}, ${u.displayName}, ${u.birthdate}, ${u.gender},
              ${pgArray(u.interestedIn ?? [])}::gender[], ${u.bio ?? ""}, ${pgArray(u.interests ?? [])}::text[],
              ${u.city ?? null}, ${u.country ?? null})`);
  } else {
    const sets: SQL[] = [];
    if (u.displayName !== undefined) sets.push(sql`display_name = ${u.displayName}`);
    if (u.birthdate !== undefined) sets.push(sql`birthdate = ${u.birthdate}`);
    if (u.gender !== undefined) sets.push(sql`gender = ${u.gender}`);
    if (u.interestedIn !== undefined) sets.push(sql`interested_in = ${pgArray(u.interestedIn)}::gender[]`);
    if (u.bio !== undefined) sets.push(sql`bio = ${u.bio}`);
    if (u.interests !== undefined) sets.push(sql`interests = ${pgArray(dedupe(u.interests))}::text[]`);
    if (u.city !== undefined) sets.push(sql`city = ${u.city}`);
    if (u.country !== undefined) sets.push(sql`country = ${u.country}`);
    if (sets.length) {
      await db.execute(sql`update profiles set ${sql.join(sets, sql`, `)}, updated_at = now() where id = ${id}`);
    }
  }
  return getMyProfile(id);
}

export async function setLocation(id: string, loc: { lat: number; lng: number; city?: string; country?: string }) {
  // Web clients only send coordinates; name the nearest city so profiles don't show a blank location.
  if (!loc.city) loc = { ...loc, ...nearestPlace(loc.lat, loc.lng), ...(loc.country ? { country: loc.country } : {}) };
  const { rowCount } = await db.execute(sql`
    update profiles set location = ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography,
      city = coalesce(${loc.city ?? null}, city), country = coalesce(${loc.country ?? null}, country),
      updated_at = now()
    where id = ${id}`);
  if (!rowCount) throw conflict("Create your profile first");
  return getMyProfile(id);
}

export async function setPreferences(id: string, p: Preferences) {
  const current = await findMyRow(id);
  if (!current) throw conflict("Create your profile first");
  const ageMin = p.ageMin ?? current.age_min;
  const ageMax = p.ageMax ?? current.age_max;
  if (ageMin > ageMax) throw badRequest("Minimum age must be less than maximum age");
  await db.execute(sql`
    update profiles set age_min = ${ageMin}, age_max = ${ageMax},
      max_distance_km = ${p.maxDistanceKm ?? current.max_distance_km},
      interested_in = ${pgArray(p.interestedIn ?? current.interested_in)}::gender[], updated_at = now()
    where id = ${id}`);
  return getMyProfile(id);
}

/** Marks onboarding done once the profile has everything Discover needs. */
export async function completeOnboarding(id: string) {
  const me = await getMyProfile(id);
  if (!me) throw conflict("Create your profile first");
  const missing: string[] = [];
  if (!me.interestedIn.length) missing.push("who you're interested in");
  if (me.photos.filter((p) => p.moderationStatus !== "rejected").length < MIN_PHOTOS) {
    missing.push(`at least ${MIN_PHOTOS} photos`);
  }
  if (me.interests.length < MIN_INTERESTS) missing.push(`at least ${MIN_INTERESTS} interests`);
  if (missing.length) throw badRequest(`Still missing: ${missing.join(", ")}`);

  const { rowCount } = await db.execute(
    sql`update profiles set onboarded_at = now() where id = ${id} and onboarded_at is null`,
  );
  // Dev/test only: some demo profiles "already liked" the newcomer so matches happen quickly.
  if (rowCount && !env.isProd) await seedDemoLikesFor(id, me.gender);
  return getMyProfile(id);
}

export async function seedDemoLikesFor(id: string, gender: Gender, count = 12) {
  await db.execute(sql`
    insert into swipes (swiper_id, target_id, action)
    select d.id, ${id}, 'like' from profiles d
    where d.is_demo and ${gender} = any(d.interested_in)
    order by random() limit ${count}
    on conflict do nothing`);
}

export async function getPublicProfile(viewerId: string, targetId: string): Promise<PublicProfile> {
  const { rows } = await db.execute<PublicRow>(sql`
    select ${publicColumns}
    from profiles p cross join (select * from profiles where id = ${viewerId}) me
    where p.id = ${targetId} and p.onboarded_at is not null
      and ${notBlocked(sql`me.id`, sql`p.id`)}
      and (${!env.isProd} or not p.is_demo)`);
  if (!rows[0]) throw notFound("Profile not found");
  return (await toPublicProfiles(rows))[0];
}

/** App-store requirement: remove the user's data, photos and login. */
export async function deleteAccount(id: string) {
  const { rows } = await db.execute<{ storage_key: string }>(
    sql`select storage_key from photos where profile_id = ${id}`,
  );
  await Promise.all(rows.map((r) => deleteObject(r.storage_key)));
  await db.execute(sql`delete from profiles where id = ${id}`); // cascades to everything else
  // Managed Auth stores users in the neon_auth schema on this branch; removing the
  // row deletes the login and (by FK cascade) its sessions and accounts.
  await db.execute(sql`delete from neon_auth."user" where id = ${id}`).catch((e) => {
    console.warn("[deleteAccount] could not delete auth user", e);
  });
}

// ---------- helpers ----------

function dedupe(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Postgres array literal, passed as one bound parameter. */
export function pgArray(values: readonly string[]) {
  return `{${values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}
