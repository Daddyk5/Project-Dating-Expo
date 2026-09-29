import type { NextFunction, Request, Response } from "express";
import { HttpError, pgCode } from "../lib/http";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Database constraint violations are client errors (e.g. under-18 birthdate).
  const code = pgCode(err);
  if (code === "23514") return res.status(400).json({ error: "Value not allowed" });
  if (code === "22P02") return res.status(400).json({ error: "Malformed id" });
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Server error" });
}
