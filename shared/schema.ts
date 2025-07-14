import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Changed to varchar for Replit user IDs
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nativeLanguage: text("native_language").notNull().default("en"),
  targetLanguage: text("target_language").notNull().default("es"),
  level: text("level").notNull().default("A1"),
  weeklyGoal: integer("weekly_goal").notNull().default(50),
  wordsLearned: integer("words_learned").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date").defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
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
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar for Replit Auth
  songId: integer("song_id").notNull(),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  completedAt: timestamp("completed_at"),
  wordsLearned: integer("words_learned").notNull().default(0),
});

export const vocabulary = pgTable("vocabulary", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar for Replit Auth
  word: text("word").notNull(),
  translation: text("translation").notNull(),
  language: text("language").notNull(),
  difficulty: text("difficulty").notNull(),
  songId: integer("song_id"),
  context: text("context"),
  learnedAt: timestamp("learned_at").defaultNow(),
  reviewCount: integer("review_count").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  nativeLanguage: true,
  targetLanguage: true,
  level: true,
  weeklyGoal: true,
  wordsLearned: true,
  streak: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
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
  context: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertVocabulary = z.infer<typeof insertVocabularySchema>;
export type Vocabulary = typeof vocabulary.$inferSelect;
