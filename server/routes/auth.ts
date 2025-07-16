import { Router } from 'express';
import { authenticateToken, optionalAuth, rateLimit, validateInput, AuthenticatedRequest } from '../middleware/auth';
import { syncUserToDatabase, validateInviteCode } from '../services/auth';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Validation schemas
const inviteCodeSchema = z.object({
  code: z.string().min(1, 'Invite code is required')
});

const userSyncSchema = z.object({
  inviteCode: z.string().optional()
});

/**
 * Validate invite code
 * POST /api/auth/validate-invite
 */
router.post('/validate-invite', 
  rateLimit(5, 60000), // 5 attempts per minute
  validateInput(inviteCodeSchema),
  async (req, res) => {
    try {
      const { code } = req.body;
      
      const isValid = await validateInviteCode(code);
      
      if (!isValid) {
        return res.status(400).json({ 
          error: 'Invalid or expired invite code' 
        });
      }
      
      // Store validated code in session (you might want to use Redis in production)
      req.session = req.session || {};
      req.session.validatedInviteCode = code;
      
      res.json({ 
        valid: true, 
        message: 'Invite code validated successfully' 
      });
    } catch (error) {
      console.error('Error validating invite code:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Sync authenticated user to database
 * POST /api/auth/sync
 * Requires valid Supabase JWT token
 */
router.post('/sync',
  rateLimit(3, 60000), // 3 sync attempts per minute
  authenticateToken,
  validateInput(userSyncSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { inviteCode } = req.body;
      
      // Use validated invite code from session if available
      const validatedCode = inviteCode || req.session?.validatedInviteCode;
      
      // Sync user using verified Supabase data
      const result = await syncUserToDatabase(req.user!, validatedCode);
      
      // Clear validated invite code from session after use
      if (req.session?.validatedInviteCode) {
        delete req.session.validatedInviteCode;
      }
      
      res.json({
        user: result.user,
        isNewUser: result.isNewUser,
        inviteCodeUsed: result.inviteCodeUsed
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Failed to sync user' });
    }
  }
);

/**
 * Get current authenticated user
 * GET /api/auth/user
 */
router.get('/user',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByUsername(req.user!.email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found in database' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
);

/**
 * Get user's invite codes
 * GET /api/auth/invite-codes
 */
router.get('/invite-codes',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByUsername(req.user!.email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const inviteCodes = await storage.getUserInviteCodes(user.id);
      
      res.json(inviteCodes);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      res.status(500).json({ error: 'Failed to fetch invite codes' });
    }
  }
);

/**
 * Generate new invite code for user
 * POST /api/auth/generate-invite
 */
router.post('/generate-invite',
  authenticateToken,
  rateLimit(1, 86400000), // 1 new code per day
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByUsername(req.user!.email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const newInviteCode = await storage.createInviteCode({
        code: await storage.generateUniqueInviteCode(),
        createdBy: user.id,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      res.json(newInviteCode);
    } catch (error) {
      console.error('Error generating invite code:', error);
      res.status(500).json({ error: 'Failed to generate invite code' });
    }
  }
);

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByUsername(req.user!.email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Only allow updating specific fields
      const allowedUpdates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        nativeLanguage: req.body.nativeLanguage,
        targetLanguage: req.body.targetLanguage,
        level: req.body.level,
        weeklyGoal: req.body.weeklyGoal
      };
      
      // Remove undefined values
      const updates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );
      
      const updatedUser = await storage.updateUser(user.id, updates);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;