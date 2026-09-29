/**
 * Neon Auth (Managed Better Auth) client.
 *
 * Calls the same Better Auth endpoints as `@neondatabase/auth` (sign-up/email,
 * sign-in/email, get-session, token, sign-out, sign-in/social). The SDK itself can't
 * be installed in this workspace yet (npm resolver crash on its peer tree), so this
 * is a thin fetch client. The session lives in Neon Auth's HttpOnly cookie
 * (SameSite=None; Secure; Partitioned); the API gets a 15-minute JWT from /token.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { AUTH_URL } from "./config";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

class AuthError extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${AUTH_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new AuthError(data?.message ?? data?.error ?? `Auth error (${res.status})`);
  return data as T;
}

function decodeExp(jwt: string): number {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "="))).exp * 1000;
  } catch {
    return 0;
  }
}

let cachedToken: { value: string; exp: number } | null = null;
let inflight: Promise<string | null> | null = null;

/** A valid API token, refreshed a minute before it expires. Null when signed out. */
export async function getToken(force = false): Promise<string | null> {
  if (!force && cachedToken && cachedToken.exp - 60_000 > Date.now()) return cachedToken.value;
  inflight ??= call<{ token?: string }>("/token")
    .then((r) => {
      cachedToken = r.token ? { value: r.token, exp: decodeExp(r.token) } : null;
      return cachedToken?.value ?? null;
    })
    .catch(() => {
      cachedToken = null;
      return null;
    })
    .finally(() => (inflight = null));
  return inflight;
}

/**
 * Email a password-reset link. Better Auth ≥1.3 calls it /request-password-reset;
 * older versions use /forget-password. Needs email delivery configured in Neon Auth.
 */
export async function requestPasswordReset(email: string) {
  const body = JSON.stringify({ email, redirectTo: Platform.OS === "web" ? `${window.location.origin}/reset-password` : undefined });
  try {
    await call("/request-password-reset", { method: "POST", body });
  } catch (e) {
    if (!(e instanceof AuthError) || !/404|not found/i.test(e.message)) throw e;
    await call("/forget-password", { method: "POST", body });
  }
}

/** Set a new password with the token from the reset email link. */
export async function resetPassword(token: string, newPassword: string) {
  await call("/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
}

/** Change the password while signed in; other devices are signed out. */
export async function changePassword(currentPassword: string, newPassword: string) {
  await call("/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }) });
  cachedToken = null;
}

interface AuthState {
  status: "loading" | "signedIn" | "signedOut";
  user: AuthUser | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  /** Clears local state after the account is deleted server-side. */
  forget(): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const mounted = useRef(true);

  const applySession = useCallback((s: { user?: AuthUser } | null) => {
    if (!mounted.current) return;
    setUser(s?.user ?? null);
    setStatus(s?.user ? "signedIn" : "signedOut");
  }, []);

  const refresh = useCallback(
    () => call<{ user?: AuthUser } | null>("/get-session").then(applySession, () => applySession(null)),
    [applySession],
  );

  // Restore the session on launch (the cookie survives reloads).
  useEffect(() => {
    mounted.current = true;
    call<{ user?: AuthUser } | null>("/get-session").then(applySession, () => applySession(null));
    return () => {
      mounted.current = false;
    };
  }, [applySession]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        await call("/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
        cachedToken = null;
        await refresh();
      },
      async signUp(name, email, password) {
        await call("/sign-up/email", { method: "POST", body: JSON.stringify({ name, email, password }) });
        cachedToken = null;
        await refresh();
      },
      async signInWithGoogle() {
        if (Platform.OS !== "web") throw new AuthError("Google sign-in is available on the web app for now");
        const r = await call<{ url?: string }>("/sign-in/social", {
          method: "POST",
          body: JSON.stringify({ provider: "google", callbackURL: window.location.origin }),
        });
        if (r.url) window.location.href = r.url;
      },
      async signOut() {
        await call("/sign-out", { method: "POST", body: "{}" }).catch(() => {});
        cachedToken = null;
        setUser(null);
        setStatus("signedOut");
      },
      forget() {
        cachedToken = null;
        setUser(null);
        setStatus("signedOut");
      },
    }),
    [status, user, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
