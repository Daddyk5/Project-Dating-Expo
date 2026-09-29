import { describe, expect, it } from "vitest";
import { api, createUser } from "./helpers";

describe("likes you", () => {
  it("lists people who liked me, super likes first, until I swipe on them", async () => {
    const me = await createUser({ gender: "woman", interestedIn: ["man"] });
    const liker = await createUser({ gender: "man", interestedIn: ["woman"] });
    const superLiker = await createUser({ gender: "man", interestedIn: ["woman"] });
    const passer = await createUser({ gender: "man", interestedIn: ["woman"] });
    await api.post("/swipes").set(liker.auth).send({ targetId: me.id, action: "like" }).expect(200);
    await api.post("/swipes").set(superLiker.auth).send({ targetId: me.id, action: "superlike" }).expect(200);
    await api.post("/swipes").set(passer.auth).send({ targetId: me.id, action: "pass" }).expect(200);

    const r = await api.get("/likes").set(me.auth).expect(200);
    expect(r.body.likes.map((l: { profile: { id: string } }) => l.profile.id)).toEqual([superLiker.id, liker.id]);
    expect(r.body.likes[0].superlike).toBe(true);
    expect(r.body.likes[0].profile.photos.length).toBeGreaterThan(0);

    // Liking back matches and removes them from the list.
    const back = await api.post("/swipes").set(me.auth).send({ targetId: liker.id, action: "like" }).expect(200);
    expect(back.body.matched).toBe(true);
    const after = await api.get("/likes").set(me.auth).expect(200);
    expect(after.body.likes.map((l: { profile: { id: string } }) => l.profile.id)).toEqual([superLiker.id]);
  });

  it("hides people I blocked", async () => {
    const me = await createUser();
    const liker = await createUser();
    await api.post("/swipes").set(liker.auth).send({ targetId: me.id, action: "like" }).expect(200);
    await api.post("/blocks").set(me.auth).send({ userId: liker.id }).expect(201);
    const r = await api.get("/likes").set(me.auth).expect(200);
    expect(r.body.likes).toEqual([]);
  });
});

describe("blocked people", () => {
  it("lists and unblocks", async () => {
    const me = await createUser();
    const other = await createUser();
    await api.post("/blocks").set(me.auth).send({ userId: other.id }).expect(201);

    const list = await api.get("/blocks").set(me.auth).expect(200);
    expect(list.body.blocks).toHaveLength(1);
    expect(list.body.blocks[0]).toMatchObject({ id: other.id, displayName: expect.stringMatching(/^Test /) });

    // The blocked person can't see who blocked them.
    expect((await api.get("/blocks").set(other.auth).expect(200)).body.blocks).toEqual([]);

    await api.delete(`/blocks/${other.id}`).set(me.auth).expect(204);
    expect((await api.get("/blocks").set(me.auth).expect(200)).body.blocks).toEqual([]);
    await api.get(`/profiles/${other.id}`).set(me.auth).expect(200);
  });
});
