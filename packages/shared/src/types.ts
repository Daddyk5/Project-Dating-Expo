import type { Gender, SwipeAction } from "./constants";

export interface Photo {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
}

/** What other people see. */
export interface PublicProfile {
  id: string;
  displayName: string;
  age: number;
  gender: Gender;
  bio: string;
  interests: string[];
  city: string | null;
  country: string | null;
  isVerified: boolean;
  isDemo: boolean;
  isOnline: boolean;
  distanceKm: number | null;
  photos: Photo[];
}

/** The signed-in user's own profile. */
export interface MyProfile extends Omit<PublicProfile, "distanceKm" | "isOnline"> {
  birthdate: string;
  interestedIn: Gender[];
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  hasLocation: boolean;
  onboardingComplete: boolean;
}

export interface SwipeResult {
  matched: boolean;
  matchId: string | null;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  flagged: boolean;
}

export interface MatchSummary {
  id: string;
  createdAt: string;
  lastMessageAt: string | null;
  other: PublicProfile;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface SwipeRecord {
  targetId: string;
  action: SwipeAction;
}

/** Socket.io events, shared by server and client. */
export interface ServerToClientEvents {
  "message:new": (msg: Message) => void;
  "message:read": (p: { matchId: string; readerId: string; at: string }) => void;
  typing: (p: { matchId: string; userId: string; isTyping: boolean }) => void;
  "match:new": (p: { matchId: string }) => void;
  "match:removed": (p: { matchId: string }) => void;
  "error:chat": (p: { message: string }) => void;
}

export interface ClientToServerEvents {
  "match:join": (p: { matchId: string }, ack?: (r: { ok: boolean; error?: string }) => void) => void;
  "message:send": (
    p: { matchId: string; body: string },
    ack?: (r: { ok: true; message: Message } | { ok: false; error: string }) => void,
  ) => void;
  typing: (p: { matchId: string; isTyping: boolean }) => void;
  "message:read": (p: { matchId: string }) => void;
}
