import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MatchSummary, Message, MyProfile } from "@kxq/shared";
import { api, ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

export const keys = {
  me: ["me"] as const,
  discover: ["discover"] as const,
  nearby: ["nearby"] as const,
  matches: ["matches"] as const,
  messages: (matchId: string) => ["messages", matchId] as const,
  profile: (id: string) => ["profile", id] as const,
  compat: (id: string) => ["compat", id] as const,
};

/** Null means "signed in but no profile yet" (first login → onboarding). */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: keys.me,
    enabled,
    queryFn: async (): Promise<MyProfile | null> => {
      try {
        return await api.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

export function useSetMe() {
  const qc = useQueryClient();
  return (me: MyProfile) => qc.setQueryData(keys.me, me);
}

export function useMatches() {
  return useQuery({ queryKey: keys.matches, queryFn: async () => (await api.matches()).matches });
}

export function useMessages(matchId: string) {
  return useQuery({ queryKey: keys.messages(matchId), queryFn: async () => (await api.messages(matchId)).messages });
}

export function useProfile(id: string) {
  return useQuery({ queryKey: keys.profile(id), queryFn: () => api.profile(id) });
}

/** Merge a message into cached chat + match list (from sends and socket events). */
export function applyMessage(qc: QueryClient, msg: Message, myId: string | undefined) {
  qc.setQueryData<Message[]>(keys.messages(msg.matchId), (prev) =>
    prev ? (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]) : prev,
  );
  qc.setQueryData<MatchSummary[]>(keys.matches, (prev) => {
    if (!prev) return prev;
    const next = prev.map((m) =>
      m.id === msg.matchId
        ? {
            ...m,
            lastMessage: msg,
            lastMessageAt: msg.createdAt,
            unreadCount: msg.senderId === myId ? m.unreadCount : m.unreadCount + 1,
          }
        : m,
    );
    return next.sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  });
}

export function useSendMessage(matchId: string, myId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(matchId, body),
    onSuccess: (msg) => applyMessage(qc, msg, myId),
  });
}
