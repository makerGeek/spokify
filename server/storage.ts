import { users, songs, userProgress, vocabulary, featureFlags, inviteCodes, type User, type InsertUser, type ActivateUser, type Song, type InsertSong, type UserProgress, type InsertUserProgress, type Vocabulary, type InsertVocabulary, type FeatureFlag, type InsertFeatureFlag, type InviteCode, type InsertInviteCode } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByFacebookId(facebookId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  activateUser(userId: number, activationData: ActivateUser): Promise<User>;

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

  // Invite code methods
  validateInviteCode(code: string): Promise<{ valid: boolean; inviteCode?: InviteCode }>;
  useInviteCode(code: string, userId: number): Promise<InviteCode>;
  createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode>;
  getUserInviteCodes(userId: number): Promise<InviteCode[]>;
  generateUniqueInviteCode(): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.facebookId, facebookId));
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

  async activateUser(userId: number, activationData: ActivateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...activationData,
        isActive: true,
        activatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
      .where(and(eq(userProgress.userId, userId), eq(userProgress.songId, songId)));
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

  async validateInviteCode(code: string): Promise<{ valid: boolean; inviteCode?: InviteCode }> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    
    if (!inviteCode) {
      return { valid: false };
    }

    // Check if code is expired
    if (inviteCode.expiresAt && new Date() > new Date(inviteCode.expiresAt)) {
      return { valid: false };
    }

    // Check if code has reached max uses
    if (inviteCode.currentUses >= inviteCode.maxUses) {
      return { valid: false };
    }

    return { valid: true, inviteCode };
  }

  async useInviteCode(code: string, userId: number): Promise<InviteCode> {
    const validation = await this.validateInviteCode(code);
    
    if (!validation.valid || !validation.inviteCode) {
      throw new Error('Invalid invite code');
    }

    // Update the invite code usage
    const [updatedCode] = await db
      .update(inviteCodes)
      .set({
        currentUses: validation.inviteCode.currentUses + 1,
        usedBy: userId,
        usedAt: new Date(),
      })
      .where(eq(inviteCodes.code, code))
      .returning();

    return updatedCode;
  }

  async createInviteCode(insertInviteCode: InsertInviteCode): Promise<InviteCode> {
    const [code] = await db
      .insert(inviteCodes)
      .values(insertInviteCode)
      .returning();
    return code;
  }

  async getUserInviteCodes(userId: number): Promise<InviteCode[]> {
    return await db.select().from(inviteCodes).where(eq(inviteCodes.createdBy, userId));
  }

  async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if code already exists
      const [existing] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
      isUnique = !existing;
    } while (!isUnique);

    return code;
  }
}

export const storage = new DatabaseStorage();