import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { api, createUser } from "./helpers";

async function matchRows(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  const { rows } = await db.execute(sql`select id from matches where user_a = ${x} and user_b = ${y}`);
  return rows.length;
}

describe("matching", () => {
  it("a one-sided like does not match", async () => {
    const a = await createUser({ gender: "man", interestedIn: ["woman"] });
    const b = await createUser({ gender: "woman", interestedIn: ["man"] });
    const r = await api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "like" }).expect(200);
    expect(r.body).toEqual({ matched: false, matchId: null });
    expect(await matchRows(a.id, b.id)).toBe(0);
  });

  it("a mutual like creates exactly one match", async () => {
    const a = await createUser({ gender: "man", interestedIn: ["woman"] });
    const b = await createUser({ gender: "woman", interestedIn: ["man"] });
    await api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "like" }).expect(200);
    const r = await api.post("/swipes").set(b.auth).send({ targetId: a.id, action: "superlike" }).expect(200);
    expect(r.body.matched).toBe(true);
    expect(r.body.matchId).toMatch(/^[0-9a-f-]{36}$/);

    // Liking again doesn't create a second match.
    const again = await api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "like" }).expect(200);
    expect(again.body.matchId).toBe(r.body.matchId);
    expect(await matchRows(a.id, b.id)).toBe(1);

    const list = await api.get("/matches").set(a.auth).expect(200);
    expect(list.body.matches.map((m: { id: string }) => m.id)).toEqual([r.body.matchId]);
  });

  it("simultaneous mutual likes still create exactly one match", async () => {
    const a = await createUser();
    const b = await createUser();
    await Promise.all([
      api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "like" }),
      api.post("/swipes").set(b.auth).send({ targetId: a.id, action: "like" }),
    ]);
    expect(await matchRows(a.id, b.id)).toBe(1);
  });

  it("a pass never matches, and undo restores only a pass", async () => {
    const a = await createUser();
    const b = await createUser();
    const c = await createUser();
    await api.post("/swipes").set(b.auth).send({ targetId: a.id, action: "like" });
    await api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "pass" }).expect(200);
    expect(await matchRows(a.id, b.id)).toBe(0);

    const undo = await api.post("/swipes/undo").set(a.auth).expect(200);
    expect(undo.body.profile.id).toBe(b.id);

    await api.post("/swipes").set(a.auth).send({ targetId: c.id, action: "like" });
    await api.post("/swipes/undo").set(a.auth).expect(409);
  });

  it("rejects swiping on yourself", async () => {
    const a = await createUser();
    await api.post("/swipes").set(a.auth).send({ targetId: a.id, action: "like" }).expect(400);
  });
});
