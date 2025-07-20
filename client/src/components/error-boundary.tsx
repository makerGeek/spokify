import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="spotify-card p-8 space-y-6">
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold spotify-text-primary">
              Something went wrong
            </h1>
            <p className="spotify-text-secondary text-sm">
              We encountered an unexpected error. Our team has been notified and is working on a fix.
            </p>
          </div>

          {import.meta.env.DEV && (
            <div className="text-left p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Development Error Details:
              </h3>
              <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={resetError} className="spotify-btn-secondary flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoHome} className="spotify-btn-primary flex-1">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <Button 
            onClick={handleReload} 
            variant="ghost" 
            size="sm" 
            className="spotify-text-secondary hover:spotify-text-primary"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

// Create Sentry Error Boundary with custom fallback
export const AppErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ErrorFallback,
    beforeCapture: (scope, error, hint) => {
      scope.setTag('component', 'error-boundary');
      scope.setLevel('error');
    },
  }
);

// Component-specific error boundary for non-critical sections
interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  componentName: string;
}

export function ComponentErrorBoundary({ 
  children, 
  fallback: FallbackComponent, 
  componentName 
}: ComponentErrorBoundaryProps) {
  const DefaultFallback = ({ error, resetError }: ErrorFallbackProps) => (
    <div className="spotify-card p-4 border-red-200 dark:border-red-800">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div>
          <h3 className="font-medium spotify-text-primary">
            Unable to load {componentName}
          </h3>
          <p className="text-sm spotify-text-secondary">
            This section is temporarily unavailable
          </p>
        </div>
      </div>
      
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  return (
    <Sentry.ErrorBoundary
      fallback={FallbackComponent || DefaultFallback}
      beforeCapture={(scope, error, hint) => {
        scope.setTag('component', componentName);
        scope.setLevel('warning');
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}