import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import {
  aiRouter,
  discoverRouter,
  likesRouter,
  matchesRouter,
  meRouter,
  nearbyRouter,
  photosRouter,
  profilesRouter,
  safetyRouter,
  swipesRouter,
} from "./routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  if (!env.isTest) app.use(morgan("dev"));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest }));

  // Only public route.
  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

  // Everything below requires a valid Neon Auth JWT.
  const api = express.Router();
  api.use(requireAuth);
  api.use("/me", meRouter);
  api.use("/photos", photosRouter);
  api.use("/discover", discoverRouter);
  api.use("/nearby", nearbyRouter);
  api.use("/profiles", profilesRouter);
  api.use("/swipes", swipesRouter);
  api.use("/likes", likesRouter);
  api.use("/matches", matchesRouter);
  api.use("/", safetyRouter); // /blocks, /reports
  api.use("/ai", aiRouter);
  api.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(api);

  app.use(errorHandler);
  return app;
}
