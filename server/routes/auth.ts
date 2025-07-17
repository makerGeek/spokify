import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, rateLimit, validateInput, type AuthenticatedRequest } from '../middleware/auth';
import { 
  syncUserToDatabase, 
  validateInviteCode, 
  generateSecureInviteCode,
  checkAdminPrivileges,
  type SupabaseUser 
} from '../services/auth';
import { storage } from '../storage';

const router = Router();

/**
 * Validate invite code
 * POST /api/auth/validate-invite
 */
router.post('/validate-invite', 
  rateLimit(5, 60000), // 5 attempts per minute
  validateInput(z.object({
    code: z.string().min(1).max(20),
  })),
  async (req, res) => {
    try {
      const { code } = req.body;
      const isValid = await validateInviteCode(code);
      
      res.json({ 
        valid: isValid,
        message: isValid ? 'Invite code is valid' : 'Invalid invite code'
      });
    } catch (error) {
      console.error('Invite validation error:', error);
      res.status(500).json({ error: 'Failed to validate invite code' });
    }
  }
);

/**
 * Sync authenticated user to database
 * POST /api/auth/sync
 * Requires valid Supabase JWT token
 */
router.post('/sync',
  authenticateToken,
  rateLimit(10, 300000), // 10 attempts per 5 minutes
  validateInput(z.object({
    inviteCode: z.string().optional(),
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      const supabaseUser: SupabaseUser = {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user.user_metadata,
      };

      const result = await syncUserToDatabase(supabaseUser, req.body.inviteCode);
      
      res.json({
        user: result.user,
        isNewUser: result.isNewUser,
        inviteCodeUsed: result.inviteCodeUsed || false,
      });
    } catch (error) {
      console.error('User sync error:', error);
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
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      const user = await storage.getUserBySupabaseId(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found in database' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
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
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      const user = await storage.getUserBySupabaseId(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const inviteCodes = await storage.getUserInviteCodes(user.id);
      res.json({ inviteCodes });
    } catch (error) {
      console.error('Get invite codes error:', error);
      res.status(500).json({ error: 'Failed to get invite codes' });
    }
  }
);

/**
 * Generate new invite code for user
 * POST /api/auth/generate-invite
 */
router.post('/generate-invite',
  authenticateToken,
  rateLimit(3, 300000), // 3 codes per 5 minutes
  validateInput(z.object({
    maxUses: z.number().min(1).max(10).default(1),
    expiresInDays: z.number().min(1).max(365).default(30),
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No authenticated user' });
      }

      const user = await storage.getUserBySupabaseId(req.user.id);
      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not activated' });
      }

      const { maxUses, expiresInDays } = req.body;
      const code = await generateSecureInviteCode();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const inviteCode = await storage.createInviteCode({
        code,
        createdBy: user.id,
        maxUses,
        expiresAt,
      });

      res.json({ inviteCode });
    } catch (error) {
      console.error('Generate invite error:', error);
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

      const user = await storage.getUserBySupabaseId(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await storage.updateUser(user.id, req.body);
      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;