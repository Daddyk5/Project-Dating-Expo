import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@kxq/shared";

type Io = Server<ClientToServerEvents, ServerToClientEvents>;
let io: Io | null = null;

export function setIo(server: Io) {
  io = server;
}

export const userRoom = (id: string) => `user:${id}`;

/** Push an event to every socket a user has open. No-op when sockets aren't running (tests). */
export function emitToUsers<E extends keyof ServerToClientEvents>(
  userIds: string[],
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
) {
  if (!io) return;
  io.to(userIds.map(userRoom)).emit(event, ...args);
}

export function isOnline(id: string): boolean {
  return (io?.sockets.adapter.rooms.get(userRoom(id))?.size ?? 0) > 0;
}
