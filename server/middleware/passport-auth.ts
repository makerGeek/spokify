import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name?: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware to ensure user is authenticated with Passport.js
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated() && req.user) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * Middleware for optional authentication
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // User is available via req.user if authenticated, otherwise undefined
  // Always continue regardless of auth status
  next();
}

/**
 * Middleware to ensure user is admin
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
}