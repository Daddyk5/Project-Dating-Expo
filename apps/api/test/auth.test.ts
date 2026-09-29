import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { io as connect } from "socket.io-client";
import { describe, expect, it } from "vitest";
import { attachSockets } from "../src/realtime/sockets";
import { api, app, createUser, tokenFor } from "./helpers";

const uuid = "11111111-1111-4111-8111-111111111111";

// Every API route. Only /health is public.
const routes: [method: "get" | "post" | "put" | "delete", path: string][] = [
  ["get", "/me"],
  ["put", "/me"],
  ["put", "/me/location"],
  ["put", "/me/preferences"],
  ["post", "/me/complete-onboarding"],
  ["delete", "/me"],
  ["post", "/photos/upload-url"],
  ["post", "/photos"],
  ["put", "/photos/order"],
  ["delete", `/photos/${uuid}`],
  ["get", "/discover"],
  ["get", "/nearby"],
  ["get", `/profiles/${uuid}`],
  ["post", "/swipes"],
  ["post", "/swipes/undo"],
  ["get", "/matches"],
  ["delete", `/matches/${uuid}`],
  ["get", `/matches/${uuid}/messages`],
  ["post", `/matches/${uuid}/messages`],
  ["post", `/matches/${uuid}/read`],
  ["post", "/blocks"],
  ["post", "/reports"],
  ["post", "/ai/icebreakers"],
  ["post", "/ai/bio-polish"],
  ["post", "/ai/compatibility"],
  ["get", "/some/unknown/route"],
];

describe("auth", () => {
  it("leaves /health public", async () => {
    await api.get("/health").expect(200);
  });

  it.each(routes)("rejects %s %s without a token", async (method, path) => {
    await api[method](path).expect(401);
  });

  it("rejects a token signed by someone else", async () => {
    // Different issuer → fails verification even though the key matches.
    const forged = await tokenFor(randomUUID(), { issuer: "https://evil.example.com" });
    await api.get("/me").set("Authorization", `Bearer ${forged}`).expect(401);
  });

  it("rejects an expired token", async () => {
    const expired = await tokenFor(randomUUID(), { expiresIn: "-1m" });
    await api.get("/me").set("Authorization", `Bearer ${expired}`).expect(401);
  });

  it("accepts a valid token", async () => {
    const u = await createUser();
    await api.get("/me").set(u.auth).expect(200);
  });
});

describe("socket auth", () => {
  async function server() {
    const http = createServer(app);
    attachSockets(http);
    await new Promise<void>((r) => http.listen(0, r));
    return { http, url: `http://localhost:${(http.address() as AddressInfo).port}` };
  }

  const tryConnect = (url: string, auth: Record<string, unknown>) =>
    new Promise<"connected" | "rejected">((resolve) => {
      const s = connect(url, { auth, transports: ["websocket"], reconnection: false });
      s.on("connect", () => (s.close(), resolve("connected")));
      s.on("connect_error", () => (s.close(), resolve("rejected")));
    });

  it("rejects a client that only claims a uid (the old impersonation bug)", async () => {
    const { http, url } = await server();
    const victim = await createUser();
    expect(await tryConnect(url, { user: { uid: victim.id } })).toBe("rejected");
    http.close();
  });

  it("accepts a verified JWT", async () => {
    const { http, url } = await server();
    const u = await createUser();
    expect(await tryConnect(url, { token: u.token })).toBe("connected");
    http.close();
  });
});
