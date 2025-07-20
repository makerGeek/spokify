import * as Sentry from "@sentry/node";

// Initialize Sentry for Node.js backend
export function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    integrations: [
      // Add other integrations as needed
    ],
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from error context
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive query parameters
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]*/gi, 'password=[REDACTED]')
            .replace(/token=[^&]*/gi, 'token=[REDACTED]')
            .replace(/key=[^&]*/gi, 'key=[REDACTED]');
        }
      }
      
      return event;
    },
    initialScope: {
      tags: {
        component: "backend"
      },
    },
  });
}

// Utility functions for backend error tracking
export function captureAPIError(error: Error, req: any, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "api");
    scope.setContext("request", {
      method: req.method,
      url: req.url,
      user_agent: req.get("User-Agent"),
      ip: req.ip,
    });
    
    if (context) {
      scope.setContext("additional", context);
    }
    
    Sentry.captureException(error);
  });
}

export function captureDBError(error: Error, operation: string, table?: string, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "database");
    scope.setTag("operation", operation);
    if (table) scope.setTag("table", table);
    
    if (context) {
      scope.setContext("database", context);
    }
    
    Sentry.captureException(error);
  });
}

export function captureExternalAPIError(error: Error, service: string, endpoint?: string, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "external-api");
    scope.setTag("service", service);
    if (endpoint) scope.setTag("endpoint", endpoint);
    
    if (context) {
      scope.setContext("external_api", context);
    }
    
    Sentry.captureException(error);
  });
}