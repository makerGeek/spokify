import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  nativeLanguage: text("native_language").notNull().default("en"),
  targetLanguage: text("target_language").notNull().default("es"),
  level: text("level").notNull().default("A1"),
  weeklyGoal: integer("weekly_goal").notNull().default(50),
  wordsLearned: integer("words_learned").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date").defaultNow(),
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
  context: text("context"),
  learnedAt: timestamp("learned_at").defaultNow(),
  reviewCount: integer("review_count").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  nativeLanguage: true,
  targetLanguage: true,
  level: true,
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
export type User = typeof users.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertVocabulary = z.infer<typeof insertVocabularySchema>;
export type Vocabulary = typeof vocabulary.$inferSelect;
