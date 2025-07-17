import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { storage } from '../storage.js';
import { nanoid } from 'nanoid';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  inviteCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Local registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, inviteCode } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate invite code if provided
    let invitedBy = null;
    if (inviteCode) {
      const { valid, inviteCode: validInviteCode } = await storage.validateInviteCode(inviteCode);
      if (!valid || !validInviteCode) {
        return res.status(400).json({ error: 'Invalid invite code' });
      }
      invitedBy = validInviteCode.createdBy;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await storage.createUser({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      invitedBy,
      inviteCode: nanoid(10),
      isEmailVerified: false
    });

    // Use invite code if provided
    if (inviteCode) {
      await storage.useInviteCode(inviteCode, user.id);
    }

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed after registration' });
      }
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Local login
router.post('/login', (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified
        }
      });
    });
  })(req, res, next);
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to home
    res.redirect('/?auth=success');
  }
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to home
    res.redirect('/?auth=success');
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
      nativeLanguage: user.nativeLanguage,
      targetLanguage: user.targetLanguage,
      level: user.level,
      weeklyGoal: user.weeklyGoal,
      wordsLearned: user.wordsLearned,
      streak: user.streak,
      isAdmin: user.isAdmin,
      isEmailVerified: user.isEmailVerified
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = req.user as any;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.id;
    delete updates.passwordHash;
    delete updates.email;
    delete updates.googleId;
    delete updates.facebookId;
    delete updates.isAdmin;

    const updatedUser = await storage.updateUser(user.id, updates);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;