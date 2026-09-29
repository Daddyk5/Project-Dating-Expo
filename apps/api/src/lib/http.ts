import type { Request } from "express";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = "Unauthorized") => new HttpError(401, msg);
export const forbidden = (msg = "Forbidden") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
export const tooMany = (msg: string) => new HttpError(429, msg);

/** Validate input with zod; throws a 400 carrying the first issue as the message. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.length ? `${first.path.join(".")}: ` : "";
    throw badRequest(`${path}${first?.message ?? "Invalid input"}`, result.error.issues);
  }
  return result.data;
}

/** The authenticated user id. Only valid behind requireAuth. */
export function userId(req: Request): string {
  if (!req.user) throw unauthorized();
  return req.user.id;
}

/** Postgres error codes we translate into 4xx. */
export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
