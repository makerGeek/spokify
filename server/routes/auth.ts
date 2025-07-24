import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, rateLimit, validateInput, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
// Remove invite code imports
import { storage } from '../storage';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const router = Router();



/**
 * Check if user is active
 * GET /api/auth/isActive
 * Requires valid Supabase JWT token
 * Returns user's activation status
 */
router.get('/isActive',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      res.json({ 
        isActive: req.user.isActive || false,
        email: req.user.email 
      });
    } catch (error) {
      console.error('Check active status error:', error);
      res.status(500).json({ error: 'Failed to check activation status' });
    }
  }
);

/**
 * Get current authenticated user
 * GET /api/auth/user
 * Requires valid Supabase JWT token
 * User is automatically synced by middleware
 * Also syncs subscription status with Stripe
 */
router.get('/user',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      let user = req.user;

      // Sync subscription status with Stripe
      try {
        let customerId = user.stripeCustomerId;

        // If no customer ID, try to find by email
        if (!customerId) {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            // Update user with found customer ID
            await storage.updateStripeCustomerId(user.id, customerId);
            user.stripeCustomerId = customerId;
          }
        }

        // If we have a customer ID, check for active subscriptions
        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });

          const activeSubscription = subscriptions.data[0];

          if (activeSubscription) {
            // Update user subscription status in database
            const updatedUser = await storage.updateUserStripeInfo(user.id, {
              subscriptionId: activeSubscription.id,
              subscriptionStatus: activeSubscription.status,
              subscriptionEndsAt: new Date(activeSubscription.current_period_end * 1000)
            });
            user = updatedUser;
          } else {
            // No active subscription found, update status to free
            const updatedUser = await storage.updateSubscriptionStatus(user.id, 'free');
            user = updatedUser;
          }
        }
      } catch (stripeError) {
        console.error('Stripe sync error during auth:', stripeError);
        // Continue with existing user data if Stripe sync fails
      }

      // Only return necessary user fields to prevent data leaks
      const safeUserData = {
        id: user.id,
        email: user.email,
        streak: user.streak,
        weeklyGoal: user.weeklyGoal,
        wordsLearned: user.wordsLearned,
        isActive: user.isActive,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndsAt: user.subscriptionEndsAt,
        stripeCustomerId: user.stripeCustomerId
      };

      res.json({ user: safeUserData });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }
);

/**
 * Check if current user has admin privileges
 * GET /api/auth/admin-check
 * Returns 200 if admin, 403 if not admin, 401 if not authenticated
 */
router.get('/admin-check',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      res.json({ isAdmin: true });
    } catch (error) {
      console.error('Admin check error:', error);
      res.status(500).json({ error: 'Failed to check admin status' });
    }
  }
);





/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile',
  authenticateToken,
  validateInput(z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    nativeLanguage: z.string().optional(),
    targetLanguage: z.string().optional(),
    level: z.string().optional(),
    weeklyGoal: z.number().optional(),
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      const updatedUser = await storage.updateUser(req.user.id, req.body);
      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);



export default router;