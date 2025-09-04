import { users, songs, userProgress, vocabulary, featureFlags, translations, bookmarks, dmcaRequests, contactSubmissions, lessons, learnedLessons, sections, modules, type User, type InsertUser, type ActivateUser, type Song, type InsertSong, type UserProgress, type InsertUserProgress, type Vocabulary, type InsertVocabulary, type FeatureFlag, type InsertFeatureFlag, type Translation, type InsertTranslation, type Bookmark, type InsertBookmark, type DmcaRequest, type InsertDmcaRequest, type ContactSubmission, type InsertContactSubmission, type Lesson, type InsertLesson, type LearnedLesson, type InsertLearnedLesson, type Section, type InsertSection, type Module, type InsertModule } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";
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
  getSongs(filters?: { genre?: string; difficulty?: string; language?: string; limit?: number; offset?: number }): Promise<{ songs: Song[]; totalCount: number }>;
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
  deleteVocabulary(id: number): Promise<void>;
  
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

  // Contact submission methods
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;





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
  updateUserStripeInfo(userId: number, updates: { customerId?: string; subscriptionId?: string; subscriptionStatus?: string; subscriptionEndsAt?: Date; }): Promise<User>;
  updateSubscriptionStatus(userId: number, status: string, endsAt?: Date): Promise<User>;
  
  // Premium user identification
  getUsersBySubscriptionStatus(status: string): Promise<User[]>;
  isPremiumUser(userId: number): Promise<boolean>;


  // DMCA methods
  createDmcaRequest(dmcaRequest: InsertDmcaRequest): Promise<DmcaRequest>;
  getDmcaRequest(id: number): Promise<DmcaRequest | undefined>;
  getAllDmcaRequests(): Promise<DmcaRequest[]>;
  updateDmcaRequestStatus(id: number, status: string, adminNotes?: string, processedBy?: number): Promise<DmcaRequest>;

  // Section methods
  getSections(language: string, difficulty: string): Promise<Section[]>;
  getSection(id: number): Promise<Section | undefined>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: number, updates: Partial<Section>): Promise<Section>;
  deleteSection(id: number): Promise<void>;

  // Module methods  
  getModules(sectionId: number): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, updates: Partial<Module>): Promise<Module>;
  deleteModule(id: number): Promise<void>;

  // Lesson methods
  getLessons(language: string, difficulty: string): Promise<Lesson[]>;
  getLessonsByModule(moduleId: number): Promise<Lesson[]>;
  getSectionsWithModulesAndLessons(language: string, difficulty: string): Promise<any[]>;
  getAllLessons(): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, updates: Partial<Lesson>): Promise<Lesson>;
  deleteLesson(id: number): Promise<void>;
  
  // Learned lesson methods
  getUserCompletedLessons(userId: number): Promise<LearnedLesson[]>;
  completeLesson(completion: InsertLearnedLesson): Promise<LearnedLesson>;
  isLessonUnlocked(userId: number, lessonId: number): Promise<boolean>;
  getUserLessonStats(userId: number): Promise<{
    totalCompleted: number;
    averageScore: number;
    totalWordsLearned: number;
  }>;
  
  // User stats update
  updateUserWordsLearned(userId: number, additionalWords: number): Promise<User>;
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

  async getSongs(filters?: { genre?: string; difficulty?: string; language?: string; limit?: number; offset?: number }): Promise<{ songs: Song[]; totalCount: number }> {
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
    
    // Get total count first
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(songs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalCount = countResult[0].count;
    
    // Get paginated data
    let query = db.select().from(songs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Add ordering and pagination - sort free songs first, then alphabetically
    query = query.orderBy(sql`${songs.isFree} DESC, ${songs.title} ASC`);
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    const songsResult = await query;
    
    return {
      songs: songsResult,
      totalCount
    };
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

  async deleteVocabulary(id: number): Promise<void> {
    await db.delete(vocabulary).where(eq(vocabulary.id, id));
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
      )
      .limit(1); // Only need one result, helps query optimizer
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

  // DMCA methods implementation
  async createDmcaRequest(dmcaRequest: InsertDmcaRequest): Promise<DmcaRequest> {
    const [request] = await db
      .insert(dmcaRequests)
      .values(dmcaRequest)
      .returning();
    return request;
  }

  async getDmcaRequest(id: number): Promise<DmcaRequest | undefined> {
    const [request] = await db
      .select()
      .from(dmcaRequests)
      .where(eq(dmcaRequests.id, id));
    return request;
  }

  async getAllDmcaRequests(): Promise<DmcaRequest[]> {
    return await db
      .select()
      .from(dmcaRequests)
      .orderBy(desc(dmcaRequests.createdAt));
  }

  async updateDmcaRequestStatus(id: number, status: string, adminNotes?: string, processedBy?: number): Promise<DmcaRequest> {
    const updates: any = {
      status,
      updatedAt: new Date()
    };

    if (adminNotes) {
      updates.adminNotes = adminNotes;
    }

    if (processedBy) {
      updates.processedBy = processedBy;
      updates.processedAt = new Date();
    }

    const [request] = await db
      .update(dmcaRequests)
      .set(updates)
      .where(eq(dmcaRequests.id, id))
      .returning();
    
    return request;
  }

  // Contact submission methods implementation
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [contactSubmission] = await db
      .insert(contactSubmissions)
      .values(submission)
      .returning();
    return contactSubmission;
  }

  // Section methods implementation
  async getSections(language: string, difficulty: string): Promise<Section[]> {
    return await db
      .select()
      .from(sections)
      .where(and(
        eq(sections.language, language),
        eq(sections.difficulty, difficulty)
      ))
      .orderBy(sections.order);
  }

  async getSection(id: number): Promise<Section | undefined> {
    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id));
    return section || undefined;
  }

  async createSection(section: InsertSection): Promise<Section> {
    const [newSection] = await db
      .insert(sections)
      .values(section)
      .returning();
    return newSection;
  }

  async updateSection(id: number, updates: Partial<Section>): Promise<Section> {
    const [section] = await db
      .update(sections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sections.id, id))
      .returning();
    return section;
  }

  async deleteSection(id: number): Promise<void> {
    await db
      .delete(sections)
      .where(eq(sections.id, id));
  }

  // Module methods implementation
  async getModules(sectionId: number): Promise<Module[]> {
    return await db
      .select()
      .from(modules)
      .where(eq(modules.sectionId, sectionId))
      .orderBy(modules.order);
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db
      .insert(modules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateModule(id: number, updates: Partial<Module>): Promise<Module> {
    const [module] = await db
      .update(modules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
    return module;
  }

  async deleteModule(id: number): Promise<void> {
    await db
      .delete(modules)
      .where(eq(modules.id, id));
  }

  // Lesson methods implementation
  async getLessons(language: string, difficulty: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(and(
        eq(lessons.language, language),
        eq(lessons.difficulty, difficulty)
      ))
      .orderBy(lessons.order);
  }

  async getLessonsByModule(moduleId: number): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(lessons.order);
  }

  async getSectionsWithModulesAndLessons(language: string, difficulty: string): Promise<any[]> {
    // Get sections for the language/difficulty
    const sectionsData = await this.getSections(language, difficulty);
    
    const sectionsWithContent = await Promise.all(
      sectionsData.map(async (section) => {
        // Get modules for this section
        const modulesData = await this.getModules(section.id);
        
        const modulesWithLessons = await Promise.all(
          modulesData.map(async (module) => {
            // Get lessons for this module
            const lessonsData = await this.getLessonsByModule(module.id);
            
            return {
              ...module,
              lessons: lessonsData
            };
          })
        );
        
        return {
          ...section,
          modules: modulesWithLessons
        };
      })
    );
    
    return sectionsWithContent;
  }

  async getAllLessons(): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .orderBy(lessons.language, lessons.difficulty, lessons.order);
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id));
    return lesson || undefined;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [newLesson] = await db
      .insert(lessons)
      .values(lesson)
      .returning();
    return newLesson;
  }

  async updateLesson(id: number, updates: Partial<Lesson>): Promise<Lesson> {
    const [lesson] = await db
      .update(lessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLesson(id: number): Promise<void> {
    await db
      .delete(lessons)
      .where(eq(lessons.id, id));
  }

  // Learned lesson methods implementation
  async getUserCompletedLessons(userId: number): Promise<LearnedLesson[]> {
    return await db
      .select()
      .from(learnedLessons)
      .where(eq(learnedLessons.userId, userId))
      .orderBy(learnedLessons.completedAt);
  }

  async completeLesson(completion: InsertLearnedLesson): Promise<LearnedLesson> {
    // Check if lesson was already completed
    const [existing] = await db
      .select()
      .from(learnedLessons)
      .where(and(
        eq(learnedLessons.userId, completion.userId),
        eq(learnedLessons.lessonId, completion.lessonId)
      ));

    if (existing) {
      // Update existing completion with better score if applicable
      if (completion.score > existing.score) {
        const [updated] = await db
          .update(learnedLessons)
          .set({ 
            score: completion.score, 
            completedAt: new Date() 
          })
          .where(eq(learnedLessons.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    // Create new completion
    const [newCompletion] = await db
      .insert(learnedLessons)
      .values(completion)
      .returning();
    return newCompletion;
  }

  async isLessonUnlocked(userId: number, lessonId: number): Promise<boolean> {
    // Get the lesson to check its order
    const lesson = await this.getLesson(lessonId);
    if (!lesson) return false;

    // First lesson is always unlocked
    if (lesson.order === 1) return true;

    // Check if previous lesson is completed
    const previousLesson = await db
      .select()
      .from(lessons)
      .where(and(
        eq(lessons.language, lesson.language),
        eq(lessons.difficulty, lesson.difficulty),
        eq(lessons.order, lesson.order - 1)
      ));

    if (previousLesson.length === 0) return true;

    const [prevLesson] = previousLesson;
    const [completion] = await db
      .select()
      .from(learnedLessons)
      .where(and(
        eq(learnedLessons.userId, userId),
        eq(learnedLessons.lessonId, prevLesson.id),
        sql`score >= 80` // Require 80% to unlock next lesson
      ));

    return !!completion;
  }

  async getUserLessonStats(userId: number): Promise<{
    totalCompleted: number;
    averageScore: number;
    totalWordsLearned: number;
  }> {
    const [stats] = await db
      .select({
        totalCompleted: sql<number>`count(*)`,
        averageScore: sql<number>`avg(score)`,
      })
      .from(learnedLessons)
      .where(eq(learnedLessons.userId, userId));

    // Calculate total words learned from completed lessons
    const completedLessons = await db
      .select({
        vocabulary: lessons.vocabulary
      })
      .from(learnedLessons)
      .innerJoin(lessons, eq(learnedLessons.lessonId, lessons.id))
      .where(eq(learnedLessons.userId, userId));

    const totalWordsLearned = completedLessons.reduce((total, lesson) => {
      const vocabArray = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [];
      return total + vocabArray.length;
    }, 0);

    return {
      totalCompleted: stats?.totalCompleted || 0,
      averageScore: stats?.averageScore || 0,
      totalWordsLearned
    };
  }

  async updateUserWordsLearned(userId: number, additionalWords: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        wordsLearned: sql`${users.wordsLearned} + ${additionalWords}`
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

}

export const storage = new DatabaseStorage();