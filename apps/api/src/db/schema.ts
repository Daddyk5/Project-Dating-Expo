import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** PostGIS geography point (WGS 84). Written with ST_MakePoint, read with ST_X/ST_Y. */
const geographyPoint = customType<{ data: string }>({
  dataType: () => "geography(Point,4326)",
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const genderEnum = pgEnum("gender", ["man", "woman", "nonbinary"]);
export const swipeActionEnum = pgEnum("swipe_action", ["like", "pass", "superlike"]);
export const moderationStatusEnum = pgEnum("moderation_status", ["pending", "approved", "rejected"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "reviewing", "resolved", "dismissed"]);

export const profiles = pgTable(
  "profiles",
  {
    // Same value as neon_auth.user.id. Demo profiles have no auth user, so no FK.
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    birthdate: date("birthdate").notNull(),
    gender: genderEnum("gender").notNull(),
    interestedIn: genderEnum("interested_in").array().notNull().default(sql`'{}'`),
    bio: text("bio").notNull().default(""),
    interests: text("interests").array().notNull().default(sql`'{}'`),
    city: text("city"),
    country: text("country"),
    location: geographyPoint("location"),
    ageMin: integer("age_min").notNull().default(18),
    ageMax: integer("age_max").notNull().default(45),
    maxDistanceKm: integer("max_distance_km").notNull().default(50),
    isVerified: boolean("is_verified").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("profiles_adult", sql`${t.birthdate} <= (current_date - interval '18 years')`),
    check("profiles_age_range", sql`${t.ageMin} >= 18 and ${t.ageMin} <= ${t.ageMax} and ${t.ageMax} <= 99`),
    check("profiles_bio_len", sql`char_length(${t.bio}) <= 500`),
    check("profiles_interests_max", sql`cardinality(${t.interests}) <= 10`),
    check("profiles_distance", sql`${t.maxDistanceKm} between 1 and 500`),
    index("profiles_location_gist").using("gist", t.location),
    index("profiles_last_active_idx").on(t.lastActiveAt),
  ],
);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    // Object key in the private `uploads` bucket, or an https URL for demo avatars.
    storageKey: text("storage_key").notNull(),
    position: smallint("position").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    moderationStatus: moderationStatusEnum("moderation_status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
    check("photos_position", sql`${t.position} between 0 and 5`),
    index("photos_profile_idx").on(t.profileId, t.position),
  ],
);

export const swipes = pgTable(
  "swipes",
  {
    swiperId: uuid("swiper_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    action: swipeActionEnum("action").notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.swiperId, t.targetId] }),
    index("swipes_target_action_idx").on(t.targetId, t.action),
    check("swipes_not_self", sql`${t.swiperId} <> ${t.targetId}`),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Stored sorted (user_a < user_b) so each pair has exactly one row.
    userA: uuid("user_a").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    userB: uuid("user_b").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    ...timestamps,
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    unmatchedAt: timestamp("unmatched_at", { withTimezone: true }),
  },
  (t) => [
    unique("matches_pair_unique").on(t.userA, t.userB),
    check("matches_sorted", sql`${t.userA} < ${t.userB}`),
    index("matches_user_a_idx").on(t.userA),
    index("matches_user_b_idx").on(t.userB),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    ...timestamps,
    readAt: timestamp("read_at", { withTimezone: true }),
    flagged: boolean("flagged").notNull().default(false),
    flagReason: text("flag_reason"),
  },
  (t) => [
    index("messages_match_created_idx").on(t.matchId, t.createdAt),
    check("messages_body_len", sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("blocks_blocked_idx").on(t.blockedId)],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reportedId: uuid("reported_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  ...timestamps,
  status: reportStatusEnum("status").notNull().default("open"),
});

/** Cached AI "what you have in common" line, keyed by the sorted pair. */
export const compatibilityCache = pgTable(
  "compatibility_cache",
  {
    userA: uuid("user_a").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    userB: uuid("user_b").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userA, t.userB] })],
);
