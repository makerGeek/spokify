import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for token verification
// Use existing environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    user_metadata?: any;
  };
}

/**
 * Middleware to verify Supabase JWT tokens
 * Attaches verified user data to request.user
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Development mode: skip authentication if Supabase not configured
    if (!supabase) {
      console.warn('Supabase not configured, skipping authentication');
      // For development, create a mock user
      req.user = {
        id: 'dev-user-1',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Dev User' }
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach verified user data to request
    req.user = {
      id: user.id,
      email: user.email!,
      user_metadata: user.user_metadata
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Token verification failed' });
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
    // Development mode: skip authentication if Supabase not configured
    if (!supabase) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token validation fails
    next();
  }
}

/**
 * Rate limiting middleware
 * Basic in-memory rate limiting (for production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > clientData.resetTime) {
      rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
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
    } catch (error) {
      res.status(400).json({ error: 'Invalid input data', details: error });
    }
  };
}