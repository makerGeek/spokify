import { users, songs, userProgress, vocabulary, featureFlags, inviteCodes, translations, bookmarks, type User, type InsertUser, type ActivateUser, type Song, type InsertSong, type UserProgress, type InsertUserProgress, type Vocabulary, type InsertVocabulary, type FeatureFlag, type InsertFeatureFlag, type InviteCode, type InsertInviteCode, type Translation, type InsertTranslation, type Bookmark, type InsertBookmark } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
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
  
  // Spaced repetition methods
  getDueVocabulary(userId: number): Promise<Vocabulary[]>;
  submitReview(vocabularyId: number, quality: number): Promise<Vocabulary>;
  getVocabularyStats(userId: number): Promise<{
    totalWords: number;
    dueCount: number;
    masteredCount: number;
    averageScore: number;
    streak: number;
  }>;

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
  getInviteCodeByCode(code: string): Promise<InviteCode | undefined>;
  updateInviteCode(id: number, updates: Partial<InviteCode>): Promise<InviteCode>;



  // Translation caching methods
  getTranslation(text: string, fromLanguage: string, toLanguage: string): Promise<Translation | undefined>;
  createTranslation(translation: InsertTranslation): Promise<Translation>;

  // Bookmark methods
  getUserBookmarks(userId: number): Promise<Bookmark[]>;
  getUserBookmarkedSongs(userId: number): Promise<Song[]>;
  isBookmarked(userId: number, songId: number): Promise<boolean>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(userId: number, songId: number): Promise<void>;

  // Stripe-related methods
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionStatus(userId: number, status: string, endsAt?: Date): Promise<User>;
  
  // Premium user identification
  getUsersBySubscriptionStatus(status: string): Promise<User[]>;
  isPremiumUser(userId: number): Promise<boolean>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
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

  // Spaced repetition implementation
  async getDueVocabulary(userId: number): Promise<Vocabulary[]> {
    const now = new Date();
    return await db
      .select()
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, userId),
          sql`${vocabulary.nextReviewDate} <= ${now}`
        )
      )
      .orderBy(vocabulary.nextReviewDate);
  }

  async submitReview(vocabularyId: number, quality: number): Promise<Vocabulary> {
    // First get the current vocabulary item
    const [currentVocab] = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.id, vocabularyId));

    if (!currentVocab) {
      throw new Error("Vocabulary item not found");
    }

    // Calculate new values using SM-2 algorithm
    const result = this.calculateSpacedRepetition(currentVocab, quality);

    // Update the vocabulary item with new spaced repetition values
    const [updatedVocab] = await db
      .update(vocabulary)
      .set({
        memorizationScore: result.memorizationScore,
        nextReviewDate: result.nextReviewDate,
        lastReviewedAt: new Date(),
        correctAnswers: currentVocab.correctAnswers + (quality >= 3 ? 1 : 0),
        totalReviews: currentVocab.totalReviews + 1,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
        reviewCount: currentVocab.reviewCount + 1,
      })
      .where(eq(vocabulary.id, vocabularyId))
      .returning();

    return updatedVocab;
  }

  async getVocabularyStats(userId: number): Promise<{
    totalWords: number;
    dueCount: number;
    masteredCount: number;
    averageScore: number;
    streak: number;
  }> {
    const now = new Date();
    
    // Get all vocabulary for the user
    const allVocab = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.userId, userId));

    // Count due words
    const dueWords = await db
      .select()
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, userId),
          sql`${vocabulary.nextReviewDate} <= ${now}`
        )
      );

    // Count mastered words (score >= 90)
    const masteredWords = allVocab.filter(word => word.memorizationScore >= 90);

    // Calculate average score
    const averageScore = allVocab.length > 0 
      ? Math.round(allVocab.reduce((sum, word) => sum + word.memorizationScore, 0) / allVocab.length)
      : 0;

    // Calculate streak (consecutive days with reviews)
    // For now, we'll use a simple calculation based on recent review activity
    const streak = await this.calculateReviewStreak(userId);

    return {
      totalWords: allVocab.length,
      dueCount: dueWords.length,
      masteredCount: masteredWords.length,
      averageScore,
      streak,
    };
  }

  private calculateSpacedRepetition(vocab: Vocabulary, quality: number): {
    memorizationScore: number;
    nextReviewDate: Date;
    intervalDays: number;
    easeFactor: number;
  } {
    const currentScore = vocab.memorizationScore;
    const currentInterval = vocab.intervalDays;
    const currentEase = vocab.easeFactor; // Stored as integer (250 = 2.5)
    
    // Calculate new memorization score (0-100)
    let newScore = currentScore;
    switch (quality) {
      case 5: // Perfect
        newScore = Math.min(100, currentScore + 15);
        break;
      case 4: // Good
        newScore = Math.min(100, currentScore + 10);
        break;
      case 3: // Okay
        newScore = Math.min(100, currentScore + 5);
        break;
      case 2: // Hard
        newScore = Math.max(10, currentScore - 10);
        break;
      case 1: // Again
        newScore = Math.max(10, currentScore - 20);
        break;
    }

    // Calculate new ease factor using SM-2 algorithm
    let newEase = currentEase;
    if (quality >= 3) {
      newEase = Math.max(130, currentEase + (8 - (9 - quality) * (8 - (9 - quality)) - 2) * 10);
    } else {
      newEase = Math.max(130, currentEase - 20);
    }

    // Calculate new interval
    let newInterval: number;
    if (quality < 3) {
      // Reset interval for poor performance
      newInterval = 1;
    } else if (vocab.totalReviews === 0) {
      // First review
      newInterval = 1;
    } else if (vocab.totalReviews === 1) {
      // Second review
      newInterval = 6;
    } else {
      // Use ease factor for subsequent reviews
      newInterval = Math.round(currentInterval * (newEase / 100));
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      memorizationScore: newScore,
      nextReviewDate,
      intervalDays: newInterval,
      easeFactor: newEase,
    };
  }

  private async calculateReviewStreak(userId: number): Promise<number> {
    // Simple streak calculation based on consecutive review days
    // This could be enhanced to track actual daily review completion
    const recentReviews = await db
      .select()
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, userId),
          sql`${vocabulary.lastReviewedAt} IS NOT NULL`
        )
      )
      .orderBy(sql`${vocabulary.lastReviewedAt} DESC`)
      .limit(30); // Look at last 30 reviews

    if (recentReviews.length === 0) return 0;

    // Group reviews by date and count consecutive days
    const reviewDates = new Set();
    recentReviews.forEach(review => {
      if (review.lastReviewedAt) {
        const dateStr = review.lastReviewedAt.toISOString().split('T')[0];
        reviewDates.add(dateStr);
      }
    });

    const sortedDates = Array.from(reviewDates).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);

    for (const dateStr of sortedDates) {
      const reviewDate = new Date(dateStr);
      const daysDiff = Math.floor((currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
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

  async getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return inviteCode || undefined;
  }

  async updateInviteCode(id: number, updates: Partial<InviteCode>): Promise<InviteCode> {
    const [inviteCode] = await db
      .update(inviteCodes)
      .set(updates)
      .where(eq(inviteCodes.id, id))
      .returning();
    return inviteCode;
  }



  async getTranslation(text: string, fromLanguage: string, toLanguage: string): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.text, text),
          eq(translations.fromLanguage, fromLanguage),
          eq(translations.toLanguage, toLanguage)
        )
      );
    return translation || undefined;
  }

  async createTranslation(insertTranslation: InsertTranslation): Promise<Translation> {
    const [translation] = await db
      .insert(translations)
      .values(insertTranslation)
      .returning();
    return translation;
  }

  async getUserBookmarks(userId: number): Promise<Bookmark[]> {
    return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
  }

  async getUserBookmarkedSongs(userId: number): Promise<Song[]> {
    const result = await db
      .select({
        id: songs.id,
        title: songs.title,
        artist: songs.artist,
        genre: songs.genre,
        language: songs.language,
        difficulty: songs.difficulty,
        rating: songs.rating,
        albumCover: songs.albumCover,
        audioUrl: songs.audioUrl,
        duration: songs.duration,
        lyrics: songs.lyrics,
        spotifyId: songs.spotifyId,
        youtubeId: songs.youtubeId,
        keyWords: songs.keyWords,
        isFree: songs.isFree,
      })
      .from(bookmarks)
      .innerJoin(songs, eq(bookmarks.songId, songs.id))
      .where(eq(bookmarks.userId, userId));
    
    return result;
  }

  async isBookmarked(userId: number, songId: number): Promise<boolean> {
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.songId, songId)));
    return !!bookmark;
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db
      .insert(bookmarks)
      .values(insertBookmark)
      .returning();
    return bookmark;
  }

  async deleteBookmark(userId: number, songId: number): Promise<void> {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.songId, songId)));
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, updates: {
    customerId?: string;
    subscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date;
  }): Promise<User> {
    const updateData: any = {};
    
    if (updates.customerId) updateData.stripeCustomerId = updates.customerId;
    if (updates.subscriptionId) updateData.stripeSubscriptionId = updates.subscriptionId;
    if (updates.subscriptionStatus) updateData.subscriptionStatus = updates.subscriptionStatus;
    if (updates.subscriptionEndsAt) updateData.subscriptionEndsAt = updates.subscriptionEndsAt;
    
    updateData.updatedAt = new Date();
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateSubscriptionStatus(userId: number, status: string, endsAt?: Date): Promise<User> {
    const updates: any = { 
      subscriptionStatus: status,
      updatedAt: new Date()
    };
    
    if (endsAt) {
      updates.subscriptionEndsAt = endsAt;
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersBySubscriptionStatus(status: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.subscriptionStatus, status));
  }

  async isPremiumUser(userId: number): Promise<boolean> {
    const [user] = await db
      .select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionEndsAt: users.subscriptionEndsAt
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return false;
    
    // Check if user has active subscription
    if (user.subscriptionStatus === 'active') {
      // If subscription has an end date, check if it's still valid
      if (user.subscriptionEndsAt) {
        return new Date() < new Date(user.subscriptionEndsAt);
      }
      return true;
    }
    
    return false;
  }
}

export const storage = new DatabaseStorage();