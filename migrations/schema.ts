import { pgTable, serial, varchar, text, integer, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const vocabulary = pgTable("vocabulary", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	word: text().notNull(),
	translation: text().notNull(),
	language: text().notNull(),
	difficulty: text().notNull(),
	songId: integer("song_id"),
	context: text(),
	learnedAt: timestamp("learned_at", { mode: 'string' }).defaultNow(),
	reviewCount: integer("review_count").default(0).notNull(),
	songName: text("song_name"),
	memorizationScore: integer("memorization_score").default(50).notNull(),
	nextReviewDate: timestamp("next_review_date", { mode: 'string' }).defaultNow(),
	lastReviewedAt: timestamp("last_reviewed_at", { mode: 'string' }),
	correctAnswers: integer("correct_answers").default(0).notNull(),
	totalReviews: integer("total_reviews").default(0).notNull(),
	intervalDays: integer("interval_days").default(1).notNull(),
	easeFactor: integer("ease_factor").default(250).notNull(),
});

export const userProgress = pgTable("user_progress", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	songId: integer("song_id").notNull(),
	progressPercentage: integer("progress_percentage").default(0).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	wordsLearned: integer("words_learned").default(0).notNull(),
});

export const songs = pgTable("songs", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	artist: text().notNull(),
	genre: text().notNull(),
	language: text().notNull(),
	difficulty: text().notNull(),
	rating: integer().default(0).notNull(),
	albumCover: text("album_cover"),
	audioUrl: text("audio_url"),
	duration: integer().default(0).notNull(),
	lyrics: jsonb().notNull(),
	spotifyId: text("spotify_id"),
	youtubeId: text("youtube_id"),
	keyWords: jsonb("key_words"),
	isFree: boolean("is_free").default(false).notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: varchar(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	nativeLanguage: text("native_language").default('en').notNull(),
	targetLanguage: text("target_language").default('es').notNull(),
	level: text().default('A1').notNull(),
	weeklyGoal: integer("weekly_goal").default(50).notNull(),
	wordsLearned: integer("words_learned").default(0).notNull(),
	streak: integer().default(0).notNull(),
	lastActiveDate: timestamp("last_active_date", { mode: 'string' }).defaultNow(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	supabaseId: text("supabase_id").notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	activatedAt: timestamp("activated_at", { mode: 'string' }),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	subscriptionStatus: text("subscription_status").default('free'),
	subscriptionEndsAt: timestamp("subscription_ends_at", { mode: 'string' }),
}, (table) => [
	unique("users_supabase_id_unique").on(table.supabaseId),
]);

export const featureFlags = pgTable("feature_flags", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	enabled: boolean().default(false).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const translations = pgTable("translations", {
	id: serial().primaryKey().notNull(),
	text: text().notNull(),
	fromLanguage: text("from_language").notNull(),
	toLanguage: text("to_language").notNull(),
	translation: text().notNull(),
	confidence: integer().notNull(),
	vocabulary: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	songId: integer("song_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
