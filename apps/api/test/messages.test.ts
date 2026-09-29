import { describe, expect, it } from "vitest";
import { api, createUser } from "./helpers";

async function matchedPair(opts: { bIsDemo?: boolean } = {}) {
  const a = await createUser();
  const b = await createUser({ isDemo: opts.bIsDemo });
  await api.post("/swipes").set(a.auth).send({ targetId: b.id, action: "like" });
  const r = await api.post("/swipes").set(b.auth).send({ targetId: a.id, action: "like" });
  return { a, b, matchId: r.body.matchId as string };
}

describe("messages", () => {
  it("lets matched users chat", async () => {
    const { a, b, matchId } = await matchedPair();
    const sent = await api.post(`/matches/${matchId}/messages`).set(a.auth).send({ body: "Hi there!" }).expect(201);
    expect(sent.body).toMatchObject({ senderId: a.id, body: "Hi there!", flagged: false });

    const list = await api.get(`/matches/${matchId}/messages`).set(b.auth).expect(200);
    expect(list.body.messages.map((m: { body: string }) => m.body)).toEqual(["Hi there!"]);

    const matches = await api.get("/matches").set(b.auth).expect(200);
    expect(matches.body.matches[0].unreadCount).toBe(1);
    await api.post(`/matches/${matchId}/read`).set(b.auth).expect(200);
    const after = await api.get("/matches").set(b.auth).expect(200);
    expect(after.body.matches[0].unreadCount).toBe(0);
  });

  it("stops non-matched users from messaging each other", async () => {
    const { matchId } = await matchedPair();
    const outsider = await createUser();
    await api.post(`/matches/${matchId}/messages`).set(outsider.auth).send({ body: "hey" }).expect(404);
    await api.get(`/matches/${matchId}/messages`).set(outsider.auth).expect(404);
  });

  it("stops messaging after an unmatch or a block", async () => {
    const p1 = await matchedPair();
    await api.delete(`/matches/${p1.matchId}`).set(p1.b.auth).expect(204);
    await api.post(`/matches/${p1.matchId}/messages`).set(p1.a.auth).send({ body: "hello?" }).expect(404);

    const p2 = await matchedPair();
    await api.post("/blocks").set(p2.a.auth).send({ userId: p2.b.id }).expect(201);
    await api.post(`/matches/${p2.matchId}/messages`).set(p2.b.auth).send({ body: "hello?" }).expect(404);
  });

  it("never lets real users message demo profiles", async () => {
    const { a, matchId } = await matchedPair({ bIsDemo: true });
    const r = await api.post(`/matches/${matchId}/messages`).set(a.auth).send({ body: "hi" }).expect(403);
    expect(r.body.error).toMatch(/demo/i);
  });

  it("flags unsafe messages instead of dropping them", async () => {
    const { a, b, matchId } = await matchedPair();
    const scam = await api
      .post(`/matches/${matchId}/messages`)
      .set(a.auth)
      .send({ body: "Please send me 5000 pesos via GCash" })
      .expect(201);
    expect(scam.body.flagged).toBe(true); // caught by the rule layer
    const harassment = await api.post(`/matches/${matchId}/messages`).set(a.auth).send({ body: "UNSAFE text" }).expect(201);
    expect(harassment.body.flagged).toBe(true); // caught by the (fake) model
    const list = await api.get(`/matches/${matchId}/messages`).set(b.auth).expect(200);
    expect(list.body.messages.filter((m: { flagged: boolean }) => m.flagged)).toHaveLength(2);
  });

  it("rejects empty and oversized messages", async () => {
    const { a, matchId } = await matchedPair();
    await api.post(`/matches/${matchId}/messages`).set(a.auth).send({ body: "   " }).expect(400);
    await api.post(`/matches/${matchId}/messages`).set(a.auth).send({ body: "x".repeat(2001) }).expect(400);
  });
});

describe("ai endpoints", () => {
  it("only members get icebreakers for a match", async () => {
    const { a, matchId } = await matchedPair();
    const r = await api.post("/ai/icebreakers").set(a.auth).send({ matchId }).expect(200);
    expect(r.body.icebreakers).toHaveLength(3);
    const outsider = await createUser();
    await api.post("/ai/icebreakers").set(outsider.auth).send({ matchId }).expect(404);
  });

  it("caches compatibility and enforces the hourly quota", async () => {
    const a = await createUser();
    const b = await createUser();
    const first = await api.post("/ai/compatibility").set(a.auth).send({ targetId: b.id }).expect(200);
    expect(first.body.cached).toBe(false);
    const second = await api.post("/ai/compatibility").set(b.auth).send({ targetId: a.id }).expect(200);
    expect(second.body.cached).toBe(true);

    for (let i = 0; i < 19; i++) await api.post("/ai/bio-polish").set(a.auth).send({ draft: "I love hiking and coffee." });
    await api.post("/ai/bio-polish").set(a.auth).send({ draft: "I love hiking and coffee." }).expect(429);
  });
});
