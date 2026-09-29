import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { messageSchema, type ClientToServerEvents, type ServerToClientEvents } from "@kxq/shared";
import { z } from "zod";
import { verifyAccessToken } from "../auth/jwt";
import { env } from "../env";
import { HttpError } from "../lib/http";
import { touchLastActive } from "../middleware/auth";
import { getMatchForUser } from "../services/matches";
import { markRead, sendMessage } from "../services/messages";
import { setIo, userRoom } from "./notifier";

interface SocketData {
  userId: string;
  /** matchId → other user's id, for matches this socket has joined (verified membership). */
  matches: Map<string, string>;
}

const matchId = z.uuid();
const errorText = (e: unknown) => (e instanceof HttpError ? e.message : "Something went wrong");

export function attachSockets(server: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
    cors: { origin: env.CORS_ORIGINS },
  });

  // Identity comes only from a verified JWT, never from client-supplied fields.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") return next(new Error("unauthorized"));
    try {
      const user = await verifyAccessToken(token);
      socket.data.userId = user.id;
      socket.data.matches = new Map();
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    socket.join(userRoom(uid));
    touchLastActive(uid);

    const membership = async (id: unknown) => {
      const mid = matchId.parse(id);
      const cached = socket.data.matches.get(mid);
      if (cached) return { mid, otherId: cached };
      const m = await getMatchForUser(uid, mid);
      socket.data.matches.set(mid, m.other_id);
      return { mid, otherId: m.other_id };
    };

    socket.on("match:join", async (p, ack) => {
      try {
        await membership(p?.matchId);
        ack?.({ ok: true });
      } catch (e) {
        ack?.({ ok: false, error: errorText(e) });
      }
    });

    socket.on("message:send", async (p, ack) => {
      try {
        const { mid } = await membership(p?.matchId);
        const { body } = messageSchema.parse({ body: p?.body });
        const message = await sendMessage(uid, mid, body); // emits message:new to both users
        ack?.({ ok: true, message });
      } catch (e) {
        const error = e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid message" : errorText(e);
        ack?.({ ok: false, error });
      }
    });

    socket.on("typing", async (p) => {
      try {
        const { mid, otherId } = await membership(p?.matchId);
        io.to(userRoom(otherId)).emit("typing", { matchId: mid, userId: uid, isTyping: !!p?.isTyping });
      } catch {
        /* ignore typing for matches the user isn't in */
      }
    });

    socket.on("message:read", async (p) => {
      try {
        const { mid } = await membership(p?.matchId);
        await markRead(uid, mid);
      } catch (e) {
        socket.emit("error:chat", { message: errorText(e) });
      }
    });
  });

  setIo(io);
  return io;
}
