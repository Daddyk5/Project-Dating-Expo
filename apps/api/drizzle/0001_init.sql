CREATE TYPE "public"."gender" AS ENUM('man', 'woman', 'nonbinary');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."swipe_action" AS ENUM('like', 'pass', 'superlike');--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "compatibility_cache" (
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compatibility_cache_user_a_user_b_pk" PRIMARY KEY("user_a","user_b")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone,
	"unmatched_at" timestamp with time zone,
	CONSTRAINT "matches_pair_unique" UNIQUE("user_a","user_b"),
	CONSTRAINT "matches_sorted" CHECK ("matches"."user_a" < "matches"."user_b")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	CONSTRAINT "messages_body_len" CHECK (char_length("messages"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"position" smallint NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_position" CHECK ("photos"."position" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"birthdate" date NOT NULL,
	"gender" "gender" NOT NULL,
	"interested_in" "gender"[] DEFAULT '{}' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"city" text,
	"country" text,
	"location" geography(Point,4326),
	"age_min" integer DEFAULT 18 NOT NULL,
	"age_max" integer DEFAULT 45 NOT NULL,
	"max_distance_km" integer DEFAULT 50 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp with time zone,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_adult" CHECK ("profiles"."birthdate" <= (current_date - interval '18 years')),
	CONSTRAINT "profiles_age_range" CHECK ("profiles"."age_min" >= 18 and "profiles"."age_min" <= "profiles"."age_max" and "profiles"."age_max" <= 99),
	CONSTRAINT "profiles_bio_len" CHECK (char_length("profiles"."bio") <= 500),
	CONSTRAINT "profiles_interests_max" CHECK (cardinality("profiles"."interests") <= 10),
	CONSTRAINT "profiles_distance" CHECK ("profiles"."max_distance_km" between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"swiper_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"action" "swipe_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swipes_swiper_id_target_id_pk" PRIMARY KEY("swiper_id","target_id"),
	CONSTRAINT "swipes_not_self" CHECK ("swipes"."swiper_id" <> "swipes"."target_id")
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_profiles_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_profiles_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_cache" ADD CONSTRAINT "compatibility_cache_user_a_profiles_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_cache" ADD CONSTRAINT "compatibility_cache_user_b_profiles_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_profiles_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_profiles_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_id_profiles_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiper_id_profiles_id_fk" FOREIGN KEY ("swiper_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_target_id_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "matches_user_a_idx" ON "matches" USING btree ("user_a");--> statement-breakpoint
CREATE INDEX "matches_user_b_idx" ON "matches" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "messages_match_created_idx" ON "messages" USING btree ("match_id","created_at");--> statement-breakpoint
CREATE INDEX "photos_profile_idx" ON "photos" USING btree ("profile_id","position");--> statement-breakpoint
CREATE INDEX "profiles_location_gist" ON "profiles" USING gist ("location");--> statement-breakpoint
CREATE INDEX "profiles_last_active_idx" ON "profiles" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "swipes_target_action_idx" ON "swipes" USING btree ("target_id","action");