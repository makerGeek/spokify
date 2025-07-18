import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number; // Our internal database ID
    email: string;
    supabaseId: string;
    name?: string;
    targetLanguage?: string;
    nativeLanguage?: string;
    inviteCode?: string;
    invitedBy?: number | null;
    isAdmin?: boolean;
    isActive?: boolean;
    streak?: number;
    weeklyGoal?: number;
    wordsLearned?: number;
  };
}

/**
 * Get or create user in our database from Supabase user data
 */
async function getOrCreateUser(supabaseUser: any) {
  const { id: supabaseId, email, user_metadata } = supabaseUser;
  
  // First try to find user by supabaseId
  let user = await storage.getUserBySupabaseId(supabaseId);
  
  // If not found, try by email (for backward compatibility)
  if (!user) {
    user = await storage.getUserByEmail(email);
    
    // If found by email but missing supabaseId, update it
    if (user && !user.supabaseId) {
      await storage.updateUser(user.id, { supabaseId });
      user.supabaseId = supabaseId;
    }
  }
  
  // If still not found, create new user
  if (!user) {
    const newUser = {
      email,
      supabaseId,
      name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
      inviteCode: nanoid(8),
      targetLanguage: 'es', // Default target language
      nativeLanguage: 'en', // Default native language
      isAdmin: false,
      isActive: false, // Users start inactive and need invite code
      invitedBy: null // Will be set when they use invite code
    };
    
    user = await storage.createUser(newUser);
  }
  
  return user;
}

/**
 * Middleware to verify Supabase JWT tokens and sync user to our database
 * Attaches complete user data to request.user
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get or create user in our database
    const dbUser = await getOrCreateUser(supabaseUser);
    req.user = dbUser;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware for optional authentication
 * Sets req.user if valid token provided, but doesn't block if missing
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (!error && supabaseUser) {
      // Get or create user in our database
      const dbUser = await getOrCreateUser(supabaseUser);
      req.user = dbUser;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without user on error
  }
}

/**
 * Rate limiting middleware
 * Basic in-memory rate limiting (for production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'anonymous';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    record.count++;
    next();
  };
}

/**
 * Input validation middleware
 */
export function validateInput(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message,
      });
    }
  };
}

/**
 * Admin-only middleware
 * Requires authentication and admin privileges
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
}