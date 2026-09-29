import type { NextFunction, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { verifyAccessToken, type AuthUser } from "../auth/jwt";
import { db } from "../db/client";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const lastTouched = new Map<string, number>();
const TOUCH_EVERY_MS = 60_000;

/** Update last_active_at at most once a minute per user (drives "online now"). */
export function touchLastActive(id: string) {
  const now = Date.now();
  if ((lastTouched.get(id) ?? 0) > now - TOUCH_EVERY_MS) return;
  lastTouched.set(id, now);
  db.execute(sql`update profiles set last_active_at = now() where id = ${id}`).catch(() => {});
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    req.user = await verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  touchLastActive(req.user.id);
  next();
}
