import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    
    // Log additional PWA/Service Worker context
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('🔧 Service Worker Registrations:', registrations);
      });
    }

    // Check if it's the React #300 hook order error
    if (error.message.includes('300') || error.message.includes('hooks')) {
      console.error('🪝 React Hooks Order Error detected - this typically occurs when hooks are called conditionally');
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Clear any cached state that might be causing the issue
    try {
      localStorage.removeItem('sw-disabled');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    window.location.reload();
  };

  handleClearAndReload = async () => {
    try {
      // Clear service worker and caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Force reload
      window.location.href = window.location.href;
    } catch (error) {
      console.error('Error during cleanup:', error);
      this.handleReload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-lg p-6 text-center space-y-4 border">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                The app encountered an unexpected error. This sometimes happens with PWA installations.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={this.handleReload} className="w-full" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload App
              </Button>
              
              <Button 
                onClick={this.handleClearAndReload} 
                variant="outline" 
                className="w-full" 
                size="sm"
              >
                <Bug className="w-4 h-4 mr-2" />
                Clear Cache & Reload
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left text-xs bg-muted p-3 rounded mt-4">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-safe wrapper component for contexts
export function HookSafeWrapper({ 
  children, 
  condition = true,
  fallback = null 
}: { 
  children: ReactNode;
  condition?: boolean;
  fallback?: ReactNode;
}) {
  // Always render children, use CSS to hide if needed
  return (
    <div style={{ display: condition ? 'contents' : 'none' }}>
      {children}
    </div>
  );
}