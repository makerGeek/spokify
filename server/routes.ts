import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { translateText, assessDifficulty, generateVocabularyExplanation } from "./services/openai";
import { insertUserSchema, insertUserProgressSchema, insertVocabularySchema, insertFeatureFlagSchema, insertInviteCodeSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  // Current user endpoint (for auth purposes)
  app.get("/api/user", async (req, res) => {
    try {
      // For demo purposes, get user with ID 1 (first user in database)
      // In a real app, this would be from session/JWT token
      const user = await storage.getUser(1);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: error.message });
    }
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

  // Progress routes
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const progressData = insertUserProgressSchema.parse(req.body);
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

  // Vocabulary routes
  app.get("/api/users/:userId/vocabulary", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const vocabulary = await storage.getUserVocabulary(userId);
      res.json(vocabulary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vocabulary" });
    }
  });

  app.post("/api/vocabulary", async (req, res) => {
    try {
      const vocabularyData = insertVocabularySchema.parse(req.body);
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
