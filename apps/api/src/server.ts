import http from "node:http";
import { createApp } from "./app";
import { env } from "./env";
import { checkBucketCors } from "./lib/storage";
import { attachSockets } from "./realtime/sockets";
import { getProvider } from "./ai/provider";

const server = http.createServer(createApp());
attachSockets(server);

checkBucketCors().catch((e) => console.warn("[storage] could not read bucket CORS:", (e as Error).message));

server.listen(env.PORT, () => {
  console.log(
    `[api] listening on http://localhost:${env.PORT} (branch=${process.env.NEON_BRANCH ?? "?"}, ai=${getProvider().name})`,
  );
});
