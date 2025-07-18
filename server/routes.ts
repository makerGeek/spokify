import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { translateText } from "./services/gemini";
import { insertUserSchema, insertUserProgressSchema, insertVocabularySchema, insertFeatureFlagSchema, insertInviteCodeSchema } from "@shared/schema";
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
      const song = await storage.getSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      // Add access control information
      let canAccess = true;
      let requiresPremium = false;

      if (song.isFree) {
        canAccess = true;
      } else {
        requiresPremium = true;
        if (req.user?.subscriptionStatus === 'active') {
          canAccess = true;
        } else {
          canAccess = false;
        }
      }

      res.json({
        ...song,
        canAccess,
        requiresPremium
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

  // Subscription route for premium features
  app.post('/api/get-or-create-subscription', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let user = req.user;

      // Check if user already has a subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        });
        return;
      }
      
      if (!user.email) {
        throw new Error('No user email on file');
      }

      try {
        let customer;
        
        // Check if user already has a Stripe customer ID
        if (user.stripeCustomerId) {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email: user.email,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email.split('@')[0],
          });

          // Update user with customer ID
          user = await storage.updateStripeCustomerId(user.id, customer.id);
        }

        // Create subscription with actual Stripe price
        if (!process.env.STRIPE_PRICE_ID) {
          throw new Error('STRIPE_PRICE_ID environment variable is required. Please create a product in your Stripe dashboard and set the price ID.');
        }

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{
            price: process.env.STRIPE_PRICE_ID,
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        // Update user with subscription info
        await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
    
        res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        });
      } catch (error: any) {
        console.error('Stripe error:', error);
        return res.status(400).json({ error: { message: error.message } });
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      return res.status(500).json({ error: { message: error.message } });
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
