-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "vocabulary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"word" text NOT NULL,
	"translation" text NOT NULL,
	"language" text NOT NULL,
	"difficulty" text NOT NULL,
	"song_id" integer,
	"context" text,
	"learned_at" timestamp DEFAULT now(),
	"review_count" integer DEFAULT 0 NOT NULL,
	"song_name" text,
	"memorization_score" integer DEFAULT 50 NOT NULL,
	"next_review_date" timestamp DEFAULT now(),
	"last_reviewed_at" timestamp,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"song_id" integer NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"words_learned" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"genre" text NOT NULL,
	"language" text NOT NULL,
	"difficulty" text NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"album_cover" text,
	"audio_url" text,
	"duration" integer DEFAULT 0 NOT NULL,
	"lyrics" jsonb NOT NULL,
	"spotify_id" text,
	"youtube_id" text,
	"key_words" jsonb,
	"is_free" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"native_language" text DEFAULT 'en' NOT NULL,
	"target_language" text DEFAULT 'es' NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"weekly_goal" integer DEFAULT 50 NOT NULL,
	"words_learned" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" timestamp DEFAULT now(),
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"supabase_id" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'free',
	"subscription_ends_at" timestamp,
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"from_language" text NOT NULL,
	"to_language" text NOT NULL,
	"translation" text NOT NULL,
	"confidence" integer NOT NULL,
	"vocabulary" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"song_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);

*/