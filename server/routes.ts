import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { translateText, assessDifficulty, generateVocabularyExplanation } from "./services/openai";
import { insertUserSchema, insertUserProgressSchema, insertVocabularySchema, insertFeatureFlagSchema, insertInviteCodeSchema } from "@shared/schema";
import { authenticateToken, optionalAuth, rateLimit, AuthenticatedRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";
import session from "express-session";
import MemoryStore from "memorystore";

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
  app.get("/api/songs", async (req, res) => {
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

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const song = await storage.getSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json(song);
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
      
      const vocabulary = await storage.createVocabulary(vocabularyData);
      res.json(vocabulary);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid vocabulary data" });
    }
  });

  // Translation routes
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, fromLanguage, toLanguage } = req.body;
      if (!text || !fromLanguage || !toLanguage) {
        return res.status(400).json({ message: "Missing required fields: text, fromLanguage, toLanguage" });
      }
      
      const result = await translateText(text, fromLanguage, toLanguage);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Translation failed" });
    }
  });

  app.post("/api/difficulty", async (req, res) => {
    try {
      const { text, language } = req.body;
      if (!text || !language) {
        return res.status(400).json({ message: "Missing required fields: text, language" });
      }
      
      const result = await assessDifficulty(text, language);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Difficulty assessment failed" });
    }
  });

  app.post("/api/vocabulary/explain", async (req, res) => {
    try {
      const { word, context, language, targetLanguage } = req.body;
      if (!word || !context || !language || !targetLanguage) {
        return res.status(400).json({ message: "Missing required fields: word, context, language, targetLanguage" });
      }
      
      const result = await generateVocabularyExplanation(word, context, language, targetLanguage);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Vocabulary explanation failed" });
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

  // Admin routes for lyrics management
  app.patch("/api/admin/songs/:id/lyrics", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
