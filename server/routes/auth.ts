import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, rateLimit, validateInput, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
// Remove invite code imports
import { storage } from '../storage';

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
 */
router.get('/user',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      // Only return necessary user fields to prevent data leaks
      const safeUserData = {
        id: req.user.id,
        email: req.user.email,
        streak: req.user.streak,
        weeklyGoal: req.user.weeklyGoal,
        wordsLearned: req.user.wordsLearned,
        isActive: req.user.isActive,
        subscriptionStatus: req.user.subscriptionStatus,
        subscriptionEndsAt: req.user.subscriptionEndsAt,
        stripeCustomerId: req.user.stripeCustomerId
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