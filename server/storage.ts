import { users, songs, userProgress, vocabulary, featureFlags, type User, type InsertUser, type Song, type InsertSong, type UserProgress, type InsertUserProgress, type Vocabulary, type InsertVocabulary, type FeatureFlag, type InsertFeatureFlag } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Song methods
  getSongs(filters?: { genre?: string; difficulty?: string; language?: string }): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSongLyrics(id: number, lyrics: any[]): Promise<Song>;

  // User progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserProgressBySong(userId: number, songId: number): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: number, updates: Partial<UserProgress>): Promise<UserProgress>;

  // Vocabulary methods
  getUserVocabulary(userId: number): Promise<Vocabulary[]>;
  createVocabulary(vocabulary: InsertVocabulary): Promise<Vocabulary>;
  updateVocabulary(id: number, updates: Partial<Vocabulary>): Promise<Vocabulary>;

  // Feature flag methods
  getFeatureFlag(name: string): Promise<FeatureFlag | undefined>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  createFeatureFlag(featureFlag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(name: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getSongs(filters?: { genre?: string; difficulty?: string; language?: string }): Promise<Song[]> {
    let query = db.select().from(songs);
    const conditions = [];
    
    if (filters?.genre) {
      conditions.push(eq(songs.genre, filters.genre));
    }
    if (filters?.difficulty) {
      conditions.push(eq(songs.difficulty, filters.difficulty));
    }
    if (filters?.language) {
      conditions.push(eq(songs.language, filters.language));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const [song] = await db
      .insert(songs)
      .values(insertSong)
      .returning();
    return song;
  }

  async updateSongLyrics(id: number, lyrics: any[]): Promise<Song> {
    const [song] = await db
      .update(songs)
      .set({ lyrics })
      .where(eq(songs.id, id))
      .returning();
    return song;
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async getUserProgressBySong(userId: number, songId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .where(eq(userProgress.songId, songId));
    return progress || undefined;
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const [progress] = await db
      .insert(userProgress)
      .values(insertProgress)
      .returning();
    return progress;
  }

  async updateUserProgress(id: number, updates: Partial<UserProgress>): Promise<UserProgress> {
    const [progress] = await db
      .update(userProgress)
      .set(updates)
      .where(eq(userProgress.id, id))
      .returning();
    return progress;
  }

  async getUserVocabulary(userId: number): Promise<Vocabulary[]> {
    return await db.select().from(vocabulary).where(eq(vocabulary.userId, userId));
  }

  async createVocabulary(insertVocabulary: InsertVocabulary): Promise<Vocabulary> {
    const [vocab] = await db
      .insert(vocabulary)
      .values(insertVocabulary)
      .returning();
    return vocab;
  }

  async updateVocabulary(id: number, updates: Partial<Vocabulary>): Promise<Vocabulary> {
    const [vocab] = await db
      .update(vocabulary)
      .set(updates)
      .where(eq(vocabulary.id, id))
      .returning();
    return vocab;
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag || undefined;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags);
  }

  async createFeatureFlag(insertFeatureFlag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db
      .insert(featureFlags)
      .values(insertFeatureFlag)
      .returning();
    return flag;
  }

  async updateFeatureFlag(name: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const [flag] = await db
      .update(featureFlags)
      .set(updates)
      .where(eq(featureFlags.name, name))
      .returning();
    return flag;
  }
}

export const storage = new DatabaseStorage();