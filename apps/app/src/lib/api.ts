import type {
  MatchSummary,
  Message,
  MyProfile,
  Preferences,
  ProfileUpdate,
  PublicProfile,
  ReportReason,
  SwipeAction,
  SwipeResult,
} from "@kxq/shared";
import { getToken } from "./auth";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiError(401, "Please sign in again");
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && retry) {
    await getToken(true);
    return request<T>(method, path, body, false);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  me: () => request<MyProfile>("GET", "/me"),
  updateMe: (u: ProfileUpdate) => request<MyProfile>("PUT", "/me", u),
  setLocation: (loc: { lat: number; lng: number; city?: string; country?: string }) =>
    request<MyProfile>("PUT", "/me/location", loc),
  setPreferences: (p: Preferences) => request<MyProfile>("PUT", "/me/preferences", p),
  completeOnboarding: () => request<MyProfile>("POST", "/me/complete-onboarding"),
  deleteAccount: () => request<void>("DELETE", "/me"),

  uploadUrl: (contentType: string) =>
    request<{ uploadUrl: string; storageKey: string }>("POST", "/photos/upload-url", { contentType }),
  confirmPhoto: (storageKey: string) => request<MyProfile>("POST", "/photos", { storageKey }),
  reorderPhotos: (photoIds: string[]) => request<MyProfile>("PUT", "/photos/order", { photoIds }),
  deletePhoto: (id: string) => request<MyProfile>("DELETE", `/photos/${id}`),

  discover: (limit = 20) => request<{ profiles: PublicProfile[] }>("GET", `/discover?limit=${limit}`),
  nearby: (limit = 50) => request<{ profiles: PublicProfile[] }>("GET", `/nearby?limit=${limit}`),
  profile: (id: string) => request<PublicProfile>("GET", `/profiles/${id}`),

  swipe: (targetId: string, action: SwipeAction) => request<SwipeResult>("POST", "/swipes", { targetId, action }),
  undo: () => request<{ profile: PublicProfile }>("POST", "/swipes/undo"),

  matches: () => request<{ matches: MatchSummary[] }>("GET", "/matches"),
  unmatch: (matchId: string) => request<void>("DELETE", `/matches/${matchId}`),
  messages: (matchId: string) => request<{ messages: Message[] }>("GET", `/matches/${matchId}/messages`),
  sendMessage: (matchId: string, body: string) => request<Message>("POST", `/matches/${matchId}/messages`, { body }),
  markRead: (matchId: string) => request<{ updated: number }>("POST", `/matches/${matchId}/read`),

  block: (userId: string) => request<{ ok: true }>("POST", "/blocks", { userId }),
  report: (userId: string, reason: ReportReason, details?: string) =>
    request<{ id: string }>("POST", "/reports", { userId, reason, details }),

  icebreakers: (matchId: string) => request<{ icebreakers: string[] }>("POST", "/ai/icebreakers", { matchId }),
  bioPolish: (draft: string) => request<{ versions: string[] }>("POST", "/ai/bio-polish", { draft }),
  compatibility: (targetId: string) =>
    request<{ summary: string; cached: boolean }>("POST", "/ai/compatibility", { targetId }),
};
