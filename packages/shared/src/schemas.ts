import { z } from "zod";
import {
  DISCOVER_MAX_LIMIT,
  GENDERS,
  MAX_AGE,
  MAX_BIO,
  MAX_INTERESTS,
  MAX_MESSAGE,
  MAX_PHOTOS,
  MIN_AGE,
  REPORT_REASONS,
  SWIPE_ACTIONS,
} from "./constants";

/** Whole years between `birthdate` (YYYY-MM-DD) and `now`. */
export function ageFromBirthdate(birthdate: string, now = new Date()): number {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export const birthdateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .refine((v) => ageFromBirthdate(v) >= MIN_AGE, `You must be at least ${MIN_AGE}`)
  .refine((v) => ageFromBirthdate(v) <= 120, "Invalid date");

export const genderSchema = z.enum(GENDERS);

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2, "Name is too short").max(40, "Name is too long"),
    birthdate: birthdateSchema,
    gender: genderSchema,
    interestedIn: z.array(genderSchema).min(1).max(GENDERS.length),
    bio: z.string().trim().max(MAX_BIO, `Bio must be ${MAX_BIO} characters or less`),
    interests: z.array(z.string().trim().min(1).max(30)).max(MAX_INTERESTS, `Pick up to ${MAX_INTERESTS}`),
    city: z.string().trim().max(80),
    country: z.string().trim().max(80),
  })
  .partial()
  .strict();
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const preferencesSchema = z
  .object({
    ageMin: z.number().int().min(MIN_AGE).max(MAX_AGE),
    ageMax: z.number().int().min(MIN_AGE).max(MAX_AGE),
    maxDistanceKm: z.number().int().min(1).max(500),
    interestedIn: z.array(genderSchema).min(1),
  })
  .partial()
  .strict()
  .refine((p) => p.ageMin === undefined || p.ageMax === undefined || p.ageMin <= p.ageMax, {
    message: "Minimum age must be less than maximum age",
  });
export type Preferences = z.infer<typeof preferencesSchema>;

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
});

export const discoverQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(DISCOVER_MAX_LIMIT).default(20),
});

export const swipeSchema = z.object({
  targetId: z.uuid(),
  action: z.enum(SWIPE_ACTIONS),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message is empty").max(MAX_MESSAGE),
});

export const uploadUrlSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const confirmPhotoSchema = z.object({
  storageKey: z.string().min(1).max(300),
});

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(MAX_PHOTOS),
});

export const blockSchema = z.object({ userId: z.uuid() });

export const reportSchema = z.object({
  userId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

export const icebreakersSchema = z.object({ matchId: z.uuid() });
export const bioPolishSchema = z.object({ draft: z.string().trim().min(10, "Write a little more first").max(1000) });
export const compatibilitySchema = z.object({ targetId: z.uuid() });
