import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { api, tokenFor, track } from "./helpers";

const yearsAgo = (y: number, extraDays = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(d.getDate() + extraDays);
  return d.toISOString().slice(0, 10);
};

async function newUser() {
  const id = randomUUID();
  track(id);
  return { id, auth: { Authorization: `Bearer ${await tokenFor(id)}` } };
}

describe("signup / profile", () => {
  it("rejects anyone under 18", async () => {
    const u = await newUser();
    const r = await api
      .put("/me")
      .set(u.auth)
      .send({ displayName: "Teen", birthdate: yearsAgo(18, 1), gender: "woman" }) // turns 18 tomorrow
      .expect(400);
    expect(r.body.error).toMatch(/18/);
    await api.get("/me").set(u.auth).expect(404);
  });

  it("accepts someone who turned 18 today", async () => {
    const u = await newUser();
    await api.put("/me").set(u.auth).send({ displayName: "Adult", birthdate: yearsAgo(18), gender: "woman" }).expect(200);
  });

  it("the database itself rejects under-18 birthdates", async () => {
    await expect(
      db.execute(sql`insert into profiles (id, display_name, birthdate, gender)
                     values (${randomUUID()}, 'Kid', ${yearsAgo(17)}, 'man')`),
    ).rejects.toThrow();
  });

  it("validates profile updates", async () => {
    const u = await newUser();
    await api.put("/me").set(u.auth).send({ displayName: "Val", birthdate: yearsAgo(25), gender: "man" }).expect(200);
    await api.put("/me").set(u.auth).send({ bio: "x".repeat(501) }).expect(400);
    await api.put("/me").set(u.auth).send({ interests: Array.from({ length: 11 }, (_, i) => `i${i}`) }).expect(400);
    await api.put("/me").set(u.auth).send({ displayName: "A" }).expect(400);
    await api.put("/me").set(u.auth).send({ isVerified: true }).expect(400); // unknown fields rejected
    const ok = await api.put("/me").set(u.auth).send({ bio: "Hello there" }).expect(200);
    expect(ok.body.bio).toBe("Hello there");
  });

  it("won't finish onboarding without 2 photos and 3 interests", async () => {
    const u = await newUser();
    await api
      .put("/me")
      .set(u.auth)
      .send({ displayName: "New", birthdate: yearsAgo(25), gender: "man", interestedIn: ["woman"], interests: ["A"] })
      .expect(200);
    const r = await api.post("/me/complete-onboarding").set(u.auth).expect(400);
    expect(r.body.error).toMatch(/photos/);
    expect(r.body.error).toMatch(/interests/);
  });
});
