import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

/** Device-local app settings. Nothing here is sent to the API. */
export interface Settings {
  theme: "system" | "light" | "dark";
  notifyMatches: boolean;
  notifyMessages: boolean;
  notifyLikes: boolean;
  notifyTips: boolean;
  /** Show the "Tip: use ← → ↑" hint on web Discover. */
  keyboardHints: boolean;
  /** Joined the KingxQueen Royal waitlist from this device. */
  royalWaitlist: boolean;
  seenIntro: boolean;
}

const DEFAULTS: Settings = {
  theme: "system",
  notifyMatches: true,
  notifyMessages: true,
  notifyLikes: true,
  notifyTips: false,
  keyboardHints: true,
  royalWaitlist: false,
  seenIntro: false,
};

const KEY = "kxq.settings.v1";
let state: Settings = DEFAULTS;
const listeners = new Set<() => void>();

// Hydrate once at startup; screens render with defaults until then.
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) setState({ ...DEFAULTS, ...JSON.parse(raw) }, false);
  })
  .catch(() => {});

function setState(next: Settings, persist = true) {
  state = next;
  listeners.forEach((l) => l());
  if (persist) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export function updateSettings(patch: Partial<Settings>) {
  setState({ ...state, ...patch });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
