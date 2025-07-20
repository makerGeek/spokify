import * as Sentry from "@sentry/react";

// Initialize Sentry for React frontend
export function initializeSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn("Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [],
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session replay for debugging
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Filter out development noise
    beforeSend(event, hint) {
      // Don't send console logs in development
      if (!import.meta.env.PROD && event.level === 'log') {
        return null;
      }
      
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Filter out network errors that are user-related
          if (error.message.includes('NetworkError') || 
              error.message.includes('Failed to fetch') ||
              error.message.includes('Load failed')) {
            return null;
          }
        }
      }
      
      return event;
    },
    // Tag with user context
    initialScope: {
      tags: {
        component: "frontend"
      },
    },
  });
}

// Utility functions for manual error reporting
export function captureUserAction(action: string, extra?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: action,
    category: "user-action",
    level: "info",
    data: extra,
  });
}

export function captureAPIError(error: Error, endpoint: string, context?: Record<string, any>) {
  Sentry.captureException(error, {
    tags: {
      component: "api",
      endpoint,
    },
    extra: context,
  });
}

export function setUserContext(user: { id: string; email?: string; subscription?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    subscription: user.subscription,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}