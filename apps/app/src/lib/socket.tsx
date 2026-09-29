import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { ClientToServerEvents, Message, ServerToClientEvents } from "@kxq/shared";
import { getToken, useAuth } from "./auth";
import { API_URL } from "./config";
import { applyMessage, keys } from "./queries";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const SocketContext = createContext<AppSocket | null>(null);

/** One authenticated socket per signed-in session; keeps the query cache live. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  // Created disconnected; the effect below owns connecting and cleanup.
  const socket = useMemo<AppSocket | null>(() => {
    if (status !== "signedIn" || !userId) return null;
    return io(API_URL, {
      autoConnect: false,
      transports: ["websocket"],
      // Called on every (re)connect, so an expired JWT is replaced automatically.
      auth: (cb) => {
        getToken().then((token) => cb({ token }));
      },
    });
  }, [status, userId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("message:new", (msg: Message) => applyMessage(qc, msg, userId));
    socket.on("message:read", ({ matchId, at }) => {
      qc.setQueryData<Message[]>(keys.messages(matchId), (prev) =>
        prev?.map((m) => (m.senderId === userId && !m.readAt ? { ...m, readAt: at } : m)),
      );
    });
    socket.on("match:new", () => qc.invalidateQueries({ queryKey: keys.matches }));
    socket.on("match:removed", () => qc.invalidateQueries({ queryKey: keys.matches }));
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, qc, userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
