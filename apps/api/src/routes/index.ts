import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  bioPolishSchema,
  blockSchema,
  compatibilitySchema,
  confirmPhotoSchema,
  discoverQuerySchema,
  icebreakersSchema,
  locationSchema,
  messageSchema,
  preferencesSchema,
  profileUpdateSchema,
  reorderPhotosSchema,
  reportSchema,
  swipeSchema,
  uploadUrlSchema,
} from "@kxq/shared";
import { z } from "zod";
import * as ai from "../ai/service";
import { env } from "../env";
import { notFound, parse, userId } from "../lib/http";
import { discover, nearby } from "../services/discover";
import { listMatches, unmatch } from "../services/matches";
import { listMessages, markRead, sendMessage } from "../services/messages";
import { confirmUpload, createUploadUrl, deletePhoto, reorderPhotos } from "../services/photos";
import * as profiles from "../services/profiles";
import { block, report } from "../services/safety";
import { swipe, undoLastPass } from "../services/swipes";

const id = z.uuid("Invalid id");

// ---------- /me ----------
export const meRouter = Router();
meRouter.get("/", async (req, res) => {
  const me = await profiles.getMyProfile(userId(req));
  if (!me) throw notFound("No profile yet");
  res.json(me);
});
meRouter.put("/", async (req, res) => {
  res.json(await profiles.upsertProfile(userId(req), parse(profileUpdateSchema, req.body)));
});
meRouter.put("/location", async (req, res) => {
  res.json(await profiles.setLocation(userId(req), parse(locationSchema, req.body)));
});
meRouter.put("/preferences", async (req, res) => {
  res.json(await profiles.setPreferences(userId(req), parse(preferencesSchema, req.body)));
});
meRouter.post("/complete-onboarding", async (req, res) => {
  res.json(await profiles.completeOnboarding(userId(req)));
});
meRouter.delete("/", async (req, res) => {
  await profiles.deleteAccount(userId(req));
  res.status(204).end();
});

// ---------- /photos ----------
export const photosRouter = Router();
photosRouter.post("/upload-url", async (req, res) => {
  res.json(await createUploadUrl(userId(req), parse(uploadUrlSchema, req.body).contentType));
});
photosRouter.post("/", async (req, res) => {
  res.status(201).json(await confirmUpload(userId(req), parse(confirmPhotoSchema, req.body).storageKey));
});
photosRouter.put("/order", async (req, res) => {
  res.json(await reorderPhotos(userId(req), parse(reorderPhotosSchema, req.body).photoIds));
});
photosRouter.delete("/:id", async (req, res) => {
  res.json(await deletePhoto(userId(req), parse(id, req.params.id)));
});

// ---------- discovery ----------
export const discoverRouter = Router();
discoverRouter.get("/", async (req, res) => {
  res.json({ profiles: await discover(userId(req), parse(discoverQuerySchema, req.query).limit) });
});
export const nearbyRouter = Router();
nearbyRouter.get("/", async (req, res) => {
  res.json({ profiles: await nearby(userId(req), parse(discoverQuerySchema, req.query).limit) });
});
export const profilesRouter = Router();
profilesRouter.get("/:id", async (req, res) => {
  res.json(await profiles.getPublicProfile(userId(req), parse(id, req.params.id)));
});

// ---------- swipes ----------
export const swipesRouter = Router();
swipesRouter.post("/", async (req, res) => {
  const { targetId, action } = parse(swipeSchema, req.body);
  res.json(await swipe(userId(req), targetId, action));
});
swipesRouter.post("/undo", async (req, res) => {
  res.json({ profile: await undoLastPass(userId(req)) });
});

// ---------- matches & messages (messages always belong to a match) ----------
export const matchesRouter = Router();
matchesRouter.get("/", async (req, res) => {
  res.json({ matches: await listMatches(userId(req)) });
});
matchesRouter.delete("/:id", async (req, res) => {
  await unmatch(userId(req), parse(id, req.params.id));
  res.status(204).end();
});
matchesRouter.get("/:id/messages", async (req, res) => {
  const before = parse(z.iso.datetime().optional(), req.query.before);
  res.json({ messages: await listMessages(userId(req), parse(id, req.params.id), before) });
});
matchesRouter.post("/:id/messages", async (req, res) => {
  const { body } = parse(messageSchema, req.body);
  res.status(201).json(await sendMessage(userId(req), parse(id, req.params.id), body));
});
matchesRouter.post("/:id/read", async (req, res) => {
  res.json(await markRead(userId(req), parse(id, req.params.id)));
});

// ---------- safety ----------
export const safetyRouter = Router();
safetyRouter.post("/blocks", async (req, res) => {
  await block(userId(req), parse(blockSchema, req.body).userId);
  res.status(201).json({ ok: true });
});
safetyRouter.post("/reports", async (req, res) => {
  const r = parse(reportSchema, req.body);
  res.status(201).json(await report(userId(req), r.userId, r.reason, r.details));
});

// ---------- AI (server-side only; quota enforced in the service) ----------
export const aiRouter = Router();
// Burst guard on top of the hourly per-user quota.
aiRouter.use(
  rateLimit({ windowMs: 60_000, limit: 10, keyGenerator: (req) => userId(req), standardHeaders: true, skip: () => env.isTest }),
);
aiRouter.post("/icebreakers", async (req, res) => {
  res.json(await ai.icebreakers(userId(req), parse(icebreakersSchema, req.body).matchId));
});
aiRouter.post("/bio-polish", async (req, res) => {
  res.json(await ai.bioPolish(userId(req), parse(bioPolishSchema, req.body).draft));
});
aiRouter.post("/compatibility", async (req, res) => {
  res.json(await ai.compatibility(userId(req), parse(compatibilitySchema, req.body).targetId));
});
