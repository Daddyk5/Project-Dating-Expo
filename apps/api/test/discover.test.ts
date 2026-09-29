import { describe, expect, it } from "vitest";
import { api, createUser } from "./helpers";

const ids = (body: { profiles: { id: string }[] }) => body.profiles.map((p) => p.id);

describe("discover", () => {
  it("shows eligible people and never blocked users (either direction)", async () => {
    const me = await createUser({ gender: "man", interestedIn: ["woman"] });
    const visible = await createUser({ gender: "woman", interestedIn: ["man"] });
    const iBlocked = await createUser({ gender: "woman", interestedIn: ["man"] });
    const blockedMe = await createUser({ gender: "woman", interestedIn: ["man"] });

    await api.post("/blocks").set(me.auth).send({ userId: iBlocked.id }).expect(201);
    await api.post("/blocks").set(blockedMe.auth).send({ userId: me.id }).expect(201);

    for (const path of ["/discover?limit=50", "/nearby?limit=50"]) {
      const r = await api.get(path).set(me.auth).expect(200);
      expect(ids(r.body)).toContain(visible.id);
      expect(ids(r.body)).not.toContain(iBlocked.id);
      expect(ids(r.body)).not.toContain(blockedMe.id);
    }
    await api.get(`/profiles/${iBlocked.id}`).set(me.auth).expect(404);
    await api.get(`/profiles/${blockedMe.id}`).set(me.auth).expect(404);
  });

  it("excludes people I already swiped, and respects gender preferences both ways", async () => {
    const me = await createUser({ gender: "man", interestedIn: ["woman"] });
    const swiped = await createUser({ gender: "woman", interestedIn: ["man"] });
    const wrongGender = await createUser({ gender: "man", interestedIn: ["man"] });
    const notIntoMe = await createUser({ gender: "woman", interestedIn: ["woman"] });

    await api.post("/swipes").set(me.auth).send({ targetId: swiped.id, action: "pass" }).expect(200);
    const r = await api.get("/discover?limit=50").set(me.auth).expect(200);
    expect(ids(r.body)).not.toContain(swiped.id);
    expect(ids(r.body)).not.toContain(wrongGender.id);
    expect(ids(r.body)).not.toContain(notIntoMe.id);
  });

  it("excludes people outside my distance", async () => {
    const me = await createUser({ gender: "man", interestedIn: ["woman"] }); // Davao, default 50 km
    const manila = await createUser({ gender: "woman", interestedIn: ["man"], lat: 14.6, lng: 120.98 });
    const r = await api.get("/discover?limit=50").set(me.auth).expect(200);
    expect(ids(r.body)).not.toContain(manila.id);
  });

  it("caps the page size at 50", async () => {
    const me = await createUser();
    await api.get("/discover?limit=500").set(me.auth).expect(400);
    await api.get("/discover?limit=50").set(me.auth).expect(200);
  });
});
