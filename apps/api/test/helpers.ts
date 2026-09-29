import { randomUUID } from "node:crypto";
import { generateKeyPair, SignJWT } from "jose";
import { sql } from "drizzle-orm";
import supertest from "supertest";
import type { Gender } from "@kxq/shared";
import type { AiProvider } from "../src/ai/provider";
import { createApp } from "../src/app";
import { db } from "../src/db/client";
import { env } from "../src/env";
import { pgArray } from "../src/services/profiles";

/** Stands in for Neon Auth's EdDSA signing key. */
export const keys = generateKeyPair("EdDSA", { crv: "Ed25519" });

export async function tokenFor(id: string, opts: { issuer?: string; expiresIn?: string } = {}) {
  const { privateKey } = await keys;
  return new SignJWT({ email: `${id}@test.local` })
    .setProtectedHeader({ alg: "EdDSA" })
    .setSubject(id)
    .setIssuer(opts.issuer ?? env.AUTH_ISSUER)
    .setAudience(env.AUTH_ISSUER)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? "15m")
    .sign(privateKey);
}

export const app = createApp();
export const api = supertest(app);

const created: string[] = [];

interface ProfileOpts {
  gender?: Gender;
  interestedIn?: Gender[];
  age?: number;
  lat?: number;
  lng?: number;
  isDemo?: boolean;
  onboarded?: boolean;
}

/** Inserts a ready-to-discover profile (onboarded, with an approved photo) straight into the DB. */
export async function createUser(o: ProfileOpts = {}) {
  const id = randomUUID();
  created.push(id);
  const age = o.age ?? 27;
  const birthdate = new Date(Date.now() - (age * 365.25 + 30) * 86_400_000).toISOString().slice(0, 10);
  const lat = o.lat ?? 7.07;
  const lng = o.lng ?? 125.61;
  await db.execute(sql`
    insert into profiles (id, display_name, birthdate, gender, interested_in, bio, interests, city,
                          location, is_demo, onboarded_at)
    values (${id}, ${"Test " + id.slice(0, 4)}, ${birthdate}, ${o.gender ?? "woman"},
            ${pgArray(o.interestedIn ?? ["man", "woman", "nonbinary"])}::gender[], 'Test bio',
            ${pgArray(["Hiking", "Coffee", "Diving"])}::text[], 'Davao City',
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${o.isDemo ?? false},
            ${o.onboarded === false ? null : sql`now()`})`);
  await db.execute(sql`
    insert into photos (profile_id, storage_key, position, is_primary, moderation_status)
    values (${id}, 'https://example.com/test.png', 0, true, 'approved')`);
  const token = await tokenFor(id);
  return { id, token, auth: { Authorization: `Bearer ${token}` } };
}

/** Track ids created through the API (not createUser) so they get cleaned up too. */
export function track(id: string) {
  created.push(id);
}

export async function cleanup() {
  if (!created.length) return;
  await db.execute(
    sql`delete from profiles where id in (${sql.join(created.map((id) => sql`${id}::uuid`), sql`, `)})`,
  );
  created.length = 0;
}

/** Deterministic AI: flags messages containing "UNSAFE", otherwise returns canned JSON. */
export const fakeAi: AiProvider = {
  name: "fake",
  async generateJson({ system, prompt }) {
    if (system.includes("safety filter")) {
      const unsafe = prompt.includes("UNSAFE");
      return { flagged: unsafe, category: unsafe ? "harassment" : "none", reason: unsafe ? "test" : "" };
    }
    if (system.includes("opening messages")) {
      return { icebreakers: ["What got you into hiking?", "Best coffee in Davao?", "Favorite dive spot?"] };
    }
    if (system.includes("edit dating profile bios")) return { versions: ["Version one text.", "Version two text."] };
    return { summary: "You both love hiking and coffee." };
  },
};
