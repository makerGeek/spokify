import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  supabaseId: text("supabase_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  nativeLanguage: text("native_language").default("en"),
  targetLanguage: text("target_language").default("es"),
  level: text("level").default("A1"),
  weeklyGoal: integer("weekly_goal").default(50),
  wordsLearned: integer("words_learned").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date").defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  activatedAt: timestamp("activated_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"), // free, active, canceled, past_due
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  genre: text("genre").notNull(),
  language: text("language").notNull(),
  difficulty: text("difficulty").notNull(),
  rating: integer("rating").notNull().default(0),
  albumCover: text("album_cover"),
  audioUrl: text("audio_url"),
  duration: integer("duration").notNull().default(0),
  lyrics: jsonb("lyrics").notNull(), // Array of { text, timestamp, translation }
  spotifyId: text("spotify_id"),
  youtubeId: text("youtube_id"),
  keyWords: jsonb("key_words"), // Object with key vocabulary translations
  isFree: boolean("is_free").notNull().default(false),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  songId: integer("song_id").notNull(),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  completedAt: timestamp("completed_at"),
  wordsLearned: integer("words_learned").notNull().default(0),
});

export const vocabulary = pgTable("vocabulary", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  word: text("word").notNull(),
  translation: text("translation").notNull(),
  language: text("language").notNull(),
  difficulty: text("difficulty").notNull(),
  songId: integer("song_id"),
  songName: text("song_name"),
  context: text("context"),
  learnedAt: timestamp("learned_at").defaultNow(),
  reviewCount: integer("review_count").notNull().default(0),
  // Spaced repetition fields
  memorizationScore: integer("memorization_score").notNull().default(50), // 0-100
  nextReviewDate: timestamp("next_review_date").defaultNow(), // When word is due for review
  lastReviewedAt: timestamp("last_reviewed_at"), // Last time word was reviewed
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  intervalDays: integer("interval_days").notNull().default(1), // Days until next review
  easeFactor: integer("ease_factor").notNull().default(250), // SM-2 ease factor * 100 (2.5 = 250)
});

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});





export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  fromLanguage: text("from_language").notNull(),
  toLanguage: text("to_language").notNull(),
  translation: text("translation").notNull(),
  confidence: integer("confidence").notNull(), // Stored as percentage (0-100)
  vocabulary: jsonb("vocabulary").notNull(), // Array of vocabulary objects
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  songId: integer("song_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  supabaseId: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  nativeLanguage: true,
  targetLanguage: true,
  level: true,
});

export const activateUserSchema = createInsertSchema(users).pick({
  isActive: true,
  activatedAt: true,
});

export const insertSongSchema = createInsertSchema(songs).pick({
  title: true,
  artist: true,
  genre: true,
  language: true,
  difficulty: true,
  rating: true,
  albumCover: true,
  audioUrl: true,
  duration: true,
  lyrics: true,
  spotifyId: true,
  youtubeId: true,
  keyWords: true,
  isFree: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  songId: true,
  progressPercentage: true,
  wordsLearned: true,
});

export const insertVocabularySchema = createInsertSchema(vocabulary).pick({
  userId: true,
  word: true,
  translation: true,
  language: true,
  difficulty: true,
  songId: true,
  songName: true,
  context: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).pick({
  name: true,
  enabled: true,
  description: true,
});





export const insertTranslationSchema = createInsertSchema(translations).pick({
  text: true,
  fromLanguage: true,
  toLanguage: true,
  translation: true,
  confidence: true,
  vocabulary: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).pick({
  userId: true,
  songId: true,
});

// Review result schema for spaced repetition
export const reviewResultSchema = z.object({
  quality: z.number().min(1).max(5), // 1=Again, 2=Hard, 3=Okay, 4=Good, 5=Perfect
});

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type ActivateUser = z.infer<typeof activateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertVocabulary = z.infer<typeof insertVocabularySchema>;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;


export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
