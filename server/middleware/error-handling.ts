import { Request, Response, NextFunction } from "express";
import { captureAPIError, captureDBError, captureExternalAPIError } from "../lib/sentry";

// Async wrapper to catch errors in async route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database error handler
export function handleDBError(error: Error, operation: string, table?: string, context?: any) {
  captureDBError(error, operation, table, context);
  
  // Return user-friendly error
  if (error.message.includes('duplicate key')) {
    throw new Error('This record already exists');
  }
  
  if (error.message.includes('foreign key')) {
    throw new Error('Referenced record not found');
  }
  
  if (error.message.includes('not found')) {
    throw new Error('Record not found');
  }
  
  // Generic database error
  throw new Error('Database operation failed');
}

// External API error handler
export function handleExternalAPIError(error: Error, service: string, endpoint?: string, context?: any) {
  captureExternalAPIError(error, service, endpoint, context);
  
  // Return user-friendly error based on service
  if (service === 'openai' || service === 'gemini') {
    throw new Error('AI service temporarily unavailable');
  }
  
  if (service === 'stripe') {
    throw new Error('Payment service temporarily unavailable');
  }
  
  if (service === 'supabase') {
    throw new Error('Authentication service temporarily unavailable');
  }
  
  // Generic external API error
  throw new Error(`${service} service temporarily unavailable`);
}

// Validation error handler
export function handleValidationError(error: any) {
  if (error.name === 'ZodError') {
    const issues = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    
    const response = new Error('Validation failed');
    (response as any).status = 400;
    (response as any).validation = issues;
    throw response;
  }
  
  throw error;
}

// Rate limiting error
export function createRateLimitError() {
  const error = new Error('Too many requests. Please try again later.');
  (error as any).status = 429;
  return error;
}

// Authentication error
export function createAuthError(message = 'Authentication required') {
  const error = new Error(message);
  (error as any).status = 401;
  return error;
}

// Authorization error
export function createAuthorizationError(message = 'Insufficient permissions') {
  const error = new Error(message);
  (error as any).status = 403;
  return error;
}

// Not found error
export function createNotFoundError(resource = 'Resource') {
  const error = new Error(`${resource} not found`);
  (error as any).status = 404;
  return error;
}