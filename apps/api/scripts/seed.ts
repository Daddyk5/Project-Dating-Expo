/**
 * Demo data for UI testing: 40 clearly fictional profiles (is_demo = true) with
 * illustrated DiceBear avatars — never photos of real people.
 *
 *   npm run seed        replace all demo profiles with a fresh set of 40
 *   npm run seed:reset  remove all demo profiles (and their swipes/matches/photos)
 *
 * Refuses to run when NODE_ENV=production.
 */
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { INTERESTS, type Gender } from "@kxq/shared";
import { db, pool } from "../src/db/client";
import { env } from "../src/env";
import { pgArray, seedDemoLikesFor } from "../src/services/profiles";

if (env.isProd) {
  console.error("Refusing to seed: NODE_ENV=production.");
  process.exit(1);
}

// Deterministic PRNG so every run produces the same cast.
let state = 20260929;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const sample = <T>(xs: readonly T[], n: number) => [...xs].sort(() => rand() - 0.5).slice(0, n);

const CITIES = [
  // Davao City gets the most profiles so "nearby" is populated for local testing.
  ...Array(22).fill({ city: "Davao City", lat: 7.0731, lng: 125.6128, spread: 0.07 }),
  { city: "Tagum", lat: 7.4478, lng: 125.8078, spread: 0.03 },
  { city: "Digos", lat: 6.7497, lng: 125.3572, spread: 0.03 },
  { city: "Panabo", lat: 7.308, lng: 125.6843, spread: 0.02 },
  { city: "Island Garden City of Samal", lat: 7.0735, lng: 125.7081, spread: 0.03 },
  { city: "Mati", lat: 6.9551, lng: 126.2166, spread: 0.02 },
  { city: "Cagayan de Oro", lat: 8.4542, lng: 124.6319, spread: 0.04 },
  { city: "General Santos", lat: 6.1164, lng: 125.1716, spread: 0.04 },
  { city: "Butuan", lat: 8.9475, lng: 125.5406, spread: 0.03 },
  { city: "Zamboanga City", lat: 6.9214, lng: 122.079, spread: 0.04 },
  { city: "Koronadal", lat: 6.5031, lng: 124.8469, spread: 0.02 },
  { city: "Cebu City", lat: 10.3157, lng: 123.8854, spread: 0.04 },
  { city: "Iloilo City", lat: 10.7202, lng: 122.5621, spread: 0.03 },
  { city: "Quezon City", lat: 14.676, lng: 121.0437, spread: 0.04 },
  { city: "Makati", lat: 14.5547, lng: 121.0244, spread: 0.02 },
  { city: "Baguio", lat: 16.4023, lng: 120.596, spread: 0.02 },
  { city: "Bacolod", lat: 10.6765, lng: 122.9509, spread: 0.03 },
  { city: "Dumaguete", lat: 9.3068, lng: 123.3054, spread: 0.02 },
  { city: "Tacloban", lat: 11.2444, lng: 125.0039, spread: 0.02 },
];

const NAMES: Record<Gender, string[]> = {
  woman: ["Aya", "Bea", "Carmi", "Dani", "Ela", "Faye", "Gabbi", "Hana", "Isay", "Jem", "Kaye", "Lia", "Mika", "Nina", "Pia", "Rina", "Sab", "Tin", "Yani", "Zia"],
  man: ["Aldo", "Benj", "Carlo", "Dom", "Enzo", "Franz", "Gio", "Hans", "Ivan", "Jiro", "Kiko", "Lance", "Migo", "Nico", "Paolo", "Rafa", "Seb", "Tonio", "Vito", "Yuan"],
  nonbinary: ["Alex", "Blue", "Charlie", "Jules", "Kai", "Rain", "Sky", "Robin"],
};

const OPENERS = [
  "Weekend plans usually involve {a} and too much {b}.",
  "Ask me about my {a} era.",
  "Looking for someone to join me for {a} — bonus points if you're into {b}.",
  "Part-time {a} enthusiast, full-time {b} snob.",
  "My ideal Sunday: {a}, then {b}, then a long nap.",
  "I will judge you (kindly) by your {a} recommendations.",
];
const CLOSERS = [
  "Demo profile — just here to help test the app!",
  "Fictional person, real good vibes.",
  "Not a real person, but I'd still recommend a good kinilaw spot.",
  "I'm a test profile, so swipe freely.",
];

const STYLES = ["notionists", "lorelei", "adventurer", "micah", "open-peeps"];
const BACKGROUNDS = ["ffd5dc", "c0aede", "b6e3f4", "d1d4f9", "ffdfbf", "e0f2e9"];

function avatar(seed: string, i: number) {
  const style = STYLES[(seed.charCodeAt(0) + i) % STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(`${seed}-${i}`)}&size=256&backgroundColor=${pick(BACKGROUNDS)}`;
}

function interestedIn(g: Gender): Gender[] {
  const r = rand();
  if (g === "nonbinary") return r < 0.5 ? ["man", "woman", "nonbinary"] : [pick(["man", "woman"] as const), "nonbinary"];
  const opposite: Gender = g === "man" ? "woman" : "man";
  if (r < 0.75) return [opposite];
  if (r < 0.9) return [opposite, "nonbinary"];
  return ["man", "woman", "nonbinary"];
}

function birthdate(age: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - between(10, 340)); // stays within the same age
  return d.toISOString().slice(0, 10);
}

async function reset() {
  const { rowCount } = await db.execute(sql`delete from profiles where is_demo`);
  console.log(`Removed ${rowCount ?? 0} demo profiles.`);
}

async function seed() {
  await reset();
  const used = new Set<string>();
  // Build everything first, then insert in two batched statements (each round trip to
  // the database costs a few hundred ms from far-away regions).
  const profileRows: ReturnType<typeof sql>[] = [];
  const photoRows: ReturnType<typeof sql>[] = [];
  for (let i = 0; i < 40; i++) {
    const r = rand();
    const gender: Gender = r < 0.45 ? "woman" : r < 0.9 ? "man" : "nonbinary";
    const unused = NAMES[gender].filter((n) => !used.has(n));
    const name = unused.length ? pick(unused) : `${pick(NAMES[gender])} ${String.fromCharCode(65 + i % 26)}.`;
    used.add(name);

    const age = between(18, 40);
    const place = CITIES[i % CITIES.length];
    const lat = place.lat + (rand() - 0.5) * 2 * place.spread;
    const lng = place.lng + (rand() - 0.5) * 2 * place.spread;
    const interests = sample(INTERESTS, between(3, 7));
    const bio = `${pick(OPENERS).replace("{a}", interests[0].toLowerCase()).replace("{b}", interests[1].toLowerCase())} ${pick(CLOSERS)}`;
    const minutesAgo = rand() < 0.25 ? between(0, 4) : between(10, 60 * 72);
    const id = randomUUID();

    profileRows.push(sql`(${id}::uuid, ${name}, ${birthdate(age)}::date, ${gender}::gender,
        ${pgArray(interestedIn(gender))}::gender[], ${bio}, ${pgArray(interests)}::text[], ${place.city}, 'Philippines',
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        18, ${Math.min(99, Math.max(age + 8, 40))}::int, ${pick([25, 50, 100, 200])}::int, ${rand() < 0.3}::boolean,
        true, now(), now() - make_interval(mins => ${minutesAgo}::int))`);

    const photoCount = between(2, 4);
    for (let p = 0; p < photoCount; p++) {
      photoRows.push(sql`(${id}::uuid, ${avatar(name, p)}, ${p}::smallint, ${p === 0}::boolean, 'approved'::moderation_status)`);
    }
  }
  await db.execute(sql`
    insert into profiles (id, display_name, birthdate, gender, interested_in, bio, interests, city, country,
      location, age_min, age_max, max_distance_km, is_verified, is_demo, onboarded_at, last_active_at)
    values ${sql.join(profileRows, sql`, `)}`);
  await db.execute(sql`
    insert into photos (profile_id, storage_key, position, is_primary, moderation_status)
    values ${sql.join(photoRows, sql`, `)}`);
  console.log(`Inserted 40 demo profiles with ${photoRows.length} illustrated photos.`);

  // Some demo profiles "already liked" every real user, so testers get matches quickly.
  const { rows } = await db.execute<{ id: string; gender: Gender }>(
    sql`select id, gender from profiles where not is_demo and onboarded_at is not null`,
  );
  for (const u of rows) await seedDemoLikesFor(u.id, u.gender);
  console.log(`Added demo likes toward ${rows.length} existing real user(s).`);
}

try {
  console.log(`Neon branch: ${process.env.NEON_BRANCH ?? "unknown"}`);
  if (process.argv.includes("--reset")) await reset();
  else await seed();
} finally {
  await pool.end();
}
