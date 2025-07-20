import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { translateText } from "./services/gemini";
import { insertUserSchema, insertUserProgressSchema, insertVocabularySchema, insertFeatureFlagSchema, insertInviteCodeSchema, insertBookmarkSchema, reviewResultSchema } from "@shared/schema";
import { authenticateToken, optionalAuth, rateLimit, requireAdmin, AuthenticatedRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";
import session from "express-session";
import MemoryStore from "memorystore";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper function to check if user can access premium content
function canAccessPremiumContent(user: any): boolean {
  return user?.subscriptionStatus === 'active';
}

// Helper function to check if user can access specific song
async function canAccessSong(user: any, songId: number): Promise<{ canAccess: boolean; song: any; requiresPremium: boolean }> {
  const song = await storage.getSong(songId);
  if (!song) {
    return { canAccess: false, song: null, requiresPremium: false };
  }

  if (song.isFree) {
    return { canAccess: true, song, requiresPremium: false };
  }

  const requiresPremium = true;
  const canAccess = canAccessPremiumContent(user);
  
  return { canAccess, song, requiresPremium };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session configuration for invite code validation
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Use new secure authentication routes
  app.use('/api/auth', authRoutes);
  
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update user" });
    }
  });

  // DEPRECATED: Use /api/auth/user instead
  // Keeping for backward compatibility, but redirect to new secure endpoint
  app.get("/api/user", (req, res) => {
    res.status(301).json({ 
      error: "This endpoint is deprecated. Use /api/auth/user instead.",
      redirectTo: "/api/auth/user"
    });
  });

  // Check if user exists in our database
  app.get("/api/users/check/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      const user = await storage.getUserByUsername(email);
      // Don't return full user data for security - just existence check
      res.json({ exists: !!user });
    } catch (error: any) {
      console.error("Error checking user existence:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DEPRECATED: Use /api/auth/sync instead
  // Keeping for backward compatibility, but redirect to new secure endpoint
  app.post("/api/users/sync", (req, res) => {
    res.status(301).json({ 
      error: "This endpoint is deprecated. Use /api/auth/sync instead.",
      redirectTo: "/api/auth/sync"
    });
  });

  // Song routes
  app.get("/api/songs", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { genre, difficulty, language } = req.query;
      const songs = await storage.getSongs({
        genre: genre as string,
        difficulty: difficulty as string,
        language: language as string
      });

      // Add access control information for each song
      const songsWithAccess = songs.map(song => {
        let canAccess = true;
        let requiresPremium = false;

        // Free songs are always accessible
        if (song.isFree) {
          canAccess = true;
        } else {
          // Premium songs require active subscription
          requiresPremium = true;
          if (req.user?.subscriptionStatus === 'active') {
            canAccess = true;
          } else {
            canAccess = false;
          }
        }

        return {
          ...song,
          canAccess,
          requiresPremium
        };
      });

      res.json(songsWithAccess);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.get("/api/songs/:id", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const accessResult = await canAccessSong(req.user, id);
      
      if (!accessResult.song) {
        return res.status(404).json({ message: "Song not found" });
      }

      const song = accessResult.song;

      // Debug logging
      console.log('Song access check:', {
        songId: id,
        songTitle: song.title,
        isFree: song.isFree,
        hasUser: !!req.user,
        userSubscriptionStatus: req.user?.subscriptionStatus,
        userEmail: req.user?.email,
        canAccess: accessResult.canAccess,
        requiresPremium: accessResult.requiresPremium
      });

      // Security: If user cannot access premium song, return limited data without lyrics
      if (!accessResult.canAccess && accessResult.requiresPremium) {
        return res.json({
          id: song.id,
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          language: song.language,
          difficulty: song.difficulty,
          rating: song.rating,
          albumCover: song.albumCover,
          canAccess: false,
          requiresPremium: true,
          // Exclude: lyrics, youtubeId, spotifyId, keyWords
          message: "Premium subscription required to access full song content"
        });
      }

      res.json({
        ...song,
        canAccess: accessResult.canAccess,
        requiresPremium: accessResult.requiresPremium
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch song" });
    }
  });



  // Progress routes - now protected
  app.get("/api/users/:userId/progress", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own progress
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const progressData = insertUserProgressSchema.parse(req.body);
      
      // Verify user owns this progress record
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== progressData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.createUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid progress data" });
    }
  });

  app.put("/api/progress/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const progress = await storage.updateUserProgress(id, updates);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update progress" });
    }
  });

  // Vocabulary routes - now protected
  app.get("/api/users/:userId/vocabulary", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own vocabulary
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const vocabulary = await storage.getUserVocabulary(userId);
      res.json(vocabulary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vocabulary" });
    }
  });

  app.post("/api/vocabulary", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const vocabularyData = insertVocabularySchema.parse(req.body);
      
      // Verify user owns this vocabulary record
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== vocabularyData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Security: If songId is provided, verify user can access this song
      if (vocabularyData.songId) {
        const accessCheck = await canAccessSong(req.user, vocabularyData.songId);
        if (!accessCheck.canAccess && accessCheck.requiresPremium) {
          return res.status(403).json({ 
            message: "Premium subscription required to save vocabulary from this song",
            requiresPremium: true 
          });
        }
      }
      
      const vocabulary = await storage.createVocabulary(vocabularyData);
      res.json(vocabulary);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid vocabulary data" });
    }
  });

  // Spaced repetition routes
  app.get("/api/users/:userId/vocabulary/due", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own vocabulary
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const dueVocabulary = await storage.getDueVocabulary(userId);
      res.json(dueVocabulary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due vocabulary" });
    }
  });

  app.post("/api/vocabulary/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const vocabularyId = parseInt(req.params.id);
      const reviewData = reviewResultSchema.parse(req.body);
      
      // Verify user owns this vocabulary record
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the vocabulary item to verify ownership
      const allUserVocab = await storage.getUserVocabulary(user.id);
      const vocabItem = allUserVocab.find(v => v.id === vocabularyId);
      if (!vocabItem) {
        return res.status(403).json({ message: "Vocabulary item not found or access denied" });
      }
      
      const updatedVocabulary = await storage.submitReview(vocabularyId, reviewData.quality);
      res.json(updatedVocabulary);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to submit review" });
    }
  });

  app.get("/api/users/:userId/vocabulary/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own vocabulary stats
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stats = await storage.getVocabularyStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vocabulary stats" });
    }
  });

  app.delete("/api/vocabulary/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const vocabularyId = parseInt(req.params.id);
      
      // Get user
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify user owns this vocabulary record
      const allUserVocab = await storage.getUserVocabulary(user.id);
      const vocabItem = allUserVocab.find(v => v.id === vocabularyId);
      if (!vocabItem) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteVocabulary(vocabularyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vocabulary item" });
    }
  });

  // Bookmark routes - protected
  app.get("/api/users/:userId/bookmarks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only access their own bookmarks
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const bookmarkedSongs = await storage.getUserBookmarkedSongs(userId);
      res.json(bookmarkedSongs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.get("/api/songs/:songId/bookmark", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const songId = parseInt(req.params.songId);
      
      // Get user ID
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Security: Verify user can access this song
      const accessCheck = await canAccessSong(req.user, songId);
      if (!accessCheck.canAccess && accessCheck.requiresPremium) {
        return res.status(403).json({ 
          message: "Premium subscription required to bookmark this song",
          requiresPremium: true 
        });
      }
      
      const isBookmarked = await storage.isBookmarked(user.id, songId);
      res.json({ isBookmarked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check bookmark status" });
    }
  });

  app.post("/api/bookmarks", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      
      // Verify user owns this bookmark record
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== bookmarkData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Security: Verify user can access this song
      const accessCheck = await canAccessSong(req.user, bookmarkData.songId);
      if (!accessCheck.canAccess && accessCheck.requiresPremium) {
        return res.status(403).json({ 
          message: "Premium subscription required to bookmark this song",
          requiresPremium: true 
        });
      }
      
      // Check if already bookmarked to prevent duplicates
      const isAlreadyBookmarked = await storage.isBookmarked(bookmarkData.userId, bookmarkData.songId);
      if (isAlreadyBookmarked) {
        return res.status(409).json({ message: "Song already bookmarked" });
      }
      
      const bookmark = await storage.createBookmark(bookmarkData);
      res.json(bookmark);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid bookmark data" });
    }
  });

  app.delete("/api/bookmarks/:userId/:songId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const songId = parseInt(req.params.songId);
      
      // Verify user owns this bookmark
      const user = await storage.getUserByUsername(req.user!.email);
      if (!user || user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteBookmark(userId, songId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bookmark" });
    }
  });

  // Translation routes - protected for premium content
  app.post("/api/translate", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { text, fromLanguage, toLanguage, songId } = req.body;
      if (!text || !fromLanguage || !toLanguage) {
        return res.status(400).json({ message: "Missing required fields: text, fromLanguage, toLanguage" });
      }
      
      // Security: If songId is provided, verify user can access this song
      if (songId) {
        const accessCheck = await canAccessSong(req.user, parseInt(songId));
        if (!accessCheck.canAccess && accessCheck.requiresPremium) {
          return res.status(403).json({ 
            message: "Premium subscription required to translate content from this song",
            requiresPremium: true 
          });
        }
      }
      
      // Check if translation already exists in cache
      const cached = await storage.getTranslation(text, fromLanguage, toLanguage);
      
      if (cached) {
        // Return cached result
        res.json({
          translation: cached.translation,
          confidence: cached.confidence / 100, // Convert back to decimal
          vocabulary: cached.vocabulary
        });
        return;
      }
      
      // Generate new translation if not cached
      const result = await translateText(text, fromLanguage, toLanguage);
      
      // Cache the result in database
      await storage.createTranslation({
        text,
        fromLanguage,
        toLanguage,
        translation: result.translation,
        confidence: Math.round(result.confidence * 100), // Store as percentage
        vocabulary: result.vocabulary
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Translation failed" });
    }
  });

  // Feature flag routes
  app.get("/api/feature-flags", async (req, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();
      res.json(flags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.get("/api/feature-flags/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const flag = await storage.getFeatureFlag(name);
      if (!flag) {
        return res.status(404).json({ message: "Feature flag not found" });
      }
      res.json(flag);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feature flag" });
    }
  });

  app.post("/api/feature-flags", async (req, res) => {
    try {
      const flagData = insertFeatureFlagSchema.parse(req.body);
      const flag = await storage.createFeatureFlag(flagData);
      res.json(flag);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid feature flag data" });
    }
  });

  app.put("/api/feature-flags/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const updates = req.body;
      const flag = await storage.updateFeatureFlag(name, updates);
      res.json(flag);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update feature flag" });
    }
  });

  // Invite code routes
  app.post("/api/invite-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      
      const validation = await storage.validateInviteCode(code);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate invite code" });
    }
  });

  app.post("/api/invite-codes", async (req, res) => {
    try {
      const codeData = insertInviteCodeSchema.parse(req.body);
      const code = await storage.createInviteCode(codeData);
      res.json(code);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid invite code data" });
    }
  });

  app.get("/api/users/:userId/invite-codes", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const codes = await storage.getUserInviteCodes(userId);
      res.json(codes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.post("/api/invite-codes/generate", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const code = await storage.generateUniqueInviteCode();
      const inviteCode = await storage.createInviteCode({
        code,
        createdBy: userId,
        maxUses: 1,
        expiresAt: null, // No expiration by default
      });
      
      res.json(inviteCode);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate invite code" });
    }
  });

  // Admin Management Routes - Require admin privileges
  app.get("/api/management/songs", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { genre, difficulty, language } = req.query;
      const songs = await storage.getSongs({
        genre: genre as string,
        difficulty: difficulty as string,
        language: language as string
      });
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.patch("/api/management/songs/:id/lyrics", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { lyrics } = req.body;

      if (!songId || !lyrics || !Array.isArray(lyrics)) {
        return res.status(400).json({ error: "Invalid song ID or lyrics data" });
      }

      // Validate lyrics format
      const isValidLyrics = lyrics.every(line => 
        typeof line.text === 'string' && 
        typeof line.timestamp === 'number' && 
        typeof line.translation === 'string'
      );

      if (!isValidLyrics) {
        return res.status(400).json({ error: "Invalid lyrics format" });
      }

      // Update the song lyrics in database
      const updatedSong = await storage.updateSongLyrics(songId, lyrics);
      res.json(updatedSong);
    } catch (error: any) {
      console.error("Error updating song lyrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe checkout for new subscriptions
  app.post('/api/stripe-portal', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = req.user;

      if (!user.email) {
        throw new Error('User email is required');
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email.split('@')[0],
        });
        customerId = customer.id;

        // Update user with customer ID
        await storage.updateStripeCustomerId(user.id, customerId);
      }

      // Check if user has active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        // User has active subscription - show billing portal
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${req.headers.origin || 'http://localhost:5000'}/profile`,
        });
        res.json({ url: portalSession.url });
      } else {
        // User doesn't have subscription - create checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price: 'price_1RmA4cGbz9pjaytse6XY1Vtf', // Your actual price ID
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${req.headers.origin || 'http://localhost:5000'}/subscription-confirmation?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.origin || 'http://localhost:5000'}/profile`,
          allow_promotion_codes: true,
        });
        res.json({ url: checkoutSession.url });
      }
    } catch (error: any) {
      console.error('Stripe portal error:', error);
      res.status(400).json({ 
        error: { 
          message: error.message || 'Failed to create portal session'
        } 
      });
    }
  });

  // Verify subscription endpoint
  app.post('/api/verify-subscription', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = req.user;
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        return res.json({ 
          subscriptionActive: false, 
          message: 'No Stripe customer found' 
        });
      }

      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10
      });

      const activeSubscription = subscriptions.data[0];

      if (activeSubscription) {
        // Update user subscription status in database
        await storage.updateUserStripeInfo(user.id, {
          subscriptionId: activeSubscription.id,
          subscriptionStatus: activeSubscription.status,
          subscriptionEndsAt: new Date(activeSubscription.current_period_end * 1000)
        });

        res.json({ 
          subscriptionActive: true,
          subscription: {
            id: activeSubscription.id,
            status: activeSubscription.status,
            currentPeriodEnd: activeSubscription.current_period_end,
            priceId: activeSubscription.items.data[0]?.price.id
          }
        });
      } else {
        // Update user status to indicate no active subscription
        await storage.updateSubscriptionStatus(user.id, 'free');
        
        res.json({ 
          subscriptionActive: false,
          message: 'No active subscription found'
        });
      }
    } catch (error: any) {
      console.error('Verify subscription error:', error);
      res.status(500).json({ 
        error: { 
          message: error.message || 'Failed to verify subscription'
        } 
      });
    }
  });

  // Check if user is premium
  app.get('/api/user/is-premium', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isPremium = await storage.isPremiumUser(req.user.id);
      res.json({ isPremium });
    } catch (error: any) {
      console.error('Check premium status error:', error);
      res.status(500).json({ 
        error: { 
          message: error.message || 'Failed to check premium status'
        } 
      });
    }
  });

  // Get premium users (admin only)
  app.get('/api/admin/premium-users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const premiumUsers = await storage.getUsersBySubscriptionStatus('active');
      res.json(premiumUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndsAt: user.subscriptionEndsAt,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId
      })));
    } catch (error: any) {
      console.error('Get premium users error:', error);
      res.status(500).json({ 
        error: { 
          message: error.message || 'Failed to fetch premium users'
        } 
      });
    }
  });

  // Webhook endpoint for Stripe events
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // You'll need to set STRIPE_WEBHOOK_SECRET in your environment
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const customers = await stripe.customers.list({
          email: subscription.customer as string
        });
        
        if (customers.data.length > 0) {
          const customerEmail = customers.data[0].email;
          if (customerEmail) {
            const user = await storage.getUserByEmail(customerEmail);
            if (user) {
              await storage.updateSubscriptionStatus(
                user.id, 
                subscription.status,
                subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined
              );
            }
          }
        }
        break;
      
      case 'invoice.payment_succeeded':
        // Update subscription status to active
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer && invoice.subscription) {
          const customerEmail = (await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer).email;
          if (customerEmail) {
            const user = await storage.getUserByEmail(customerEmail);
            if (user) {
              await storage.updateSubscriptionStatus(user.id, 'active');
            }
          }
        }
        break;

      case 'invoice.payment_failed':
        // Update subscription status to past_due
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.customer && failedInvoice.subscription) {
          const customerEmail = (await stripe.customers.retrieve(failedInvoice.customer as string) as Stripe.Customer).email;
          if (customerEmail) {
            const user = await storage.getUserByEmail(customerEmail);
            if (user) {
              await storage.updateSubscriptionStatus(user.id, 'past_due');
            }
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
