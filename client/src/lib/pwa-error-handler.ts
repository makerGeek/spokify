// PWA Error Handler - Prevents React Error #300 and other PWA-related issues

export class PWAErrorHandler {
  private static initialized = false;
  private static failureCount = 0;
  private static readonly MAX_FAILURES = 3;
  private static readonly COOLDOWN_TIME = 60000; // 1 minute

  static initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Add global error handlers for PWA-specific issues
    this.setupGlobalErrorHandlers();
    this.setupServiceWorkerErrorHandling();
    this.setupReactErrorHandling();
  }

  private static setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError('Global Error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason);
      // Prevent default handling (which logs to console)
      event.preventDefault();
    });
  }

  private static setupServiceWorkerErrorHandling() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('error', (event) => {
      this.handleError('Service Worker Error', event);
    });

    // Monitor service worker registration failures
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.addEventListener('error', (event) => {
          this.handleError('Service Worker Registration Error', event);
        });
      });
    });
  }

  private static setupReactErrorHandling() {
    // Monitor for React-specific errors in production
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      // Detect React Error #300 specifically
      if (errorMessage.includes('300') || errorMessage.includes('Minified React error')) {
        this.handleReactHookError(errorMessage, args);
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };
  }

  private static handleReactHookError(message: string, args: any[]) {
    console.warn('🪝 React Hook Order Error detected:', message);
    
    // If we're in a PWA, try to recover
    if (this.isPWAMode()) {
      this.incrementFailureCount();
      
      if (this.failureCount >= this.MAX_FAILURES) {
        this.triggerEmergencyRecovery();
      } else {
        console.warn(`Hook error ${this.failureCount}/${this.MAX_FAILURES}. Attempting recovery...`);
        this.attemptSoftRecovery();
      }
    }
  }

  private static handleError(type: string, error: any, context?: any) {
    console.error(`PWA ${type}:`, error, context);
    
    // Store error for debugging
    try {
      const errorLog = {
        type,
        error: error?.toString() || 'Unknown error',
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        isPWA: this.isPWAMode()
      };
      
      localStorage.setItem('pwa-last-error', JSON.stringify(errorLog));
    } catch (e) {
      console.warn('Could not store error log:', e);
    }
  }

  private static isPWAMode(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  private static incrementFailureCount() {
    this.failureCount++;
    localStorage.setItem('pwa-failure-count', this.failureCount.toString());
    localStorage.setItem('pwa-last-failure', Date.now().toString());
  }

  private static attemptSoftRecovery() {
    try {
      // Clear any problematic cached state
      sessionStorage.clear();
      
      // Reset any audio or video players that might be causing issues
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach(el => {
        try {
          (el as any).pause();
          (el as any).currentTime = 0;
        } catch (e) {
          console.warn('Could not reset media element:', e);
        }
      });
      
      // Force a gentle re-render after a short delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('pwaRecovery'));
      }, 1000);
      
    } catch (error) {
      console.error('Soft recovery failed:', error);
      this.triggerEmergencyRecovery();
    }
  }

  private static triggerEmergencyRecovery() {
    console.warn('🚨 Emergency PWA recovery triggered');
    
    try {
      // Mark service worker as problematic
      localStorage.setItem('sw-disabled', 'true');
      localStorage.setItem('sw-disabled-until', (Date.now() + this.COOLDOWN_TIME).toString());
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Unregister service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister());
        });
      }
      
      // Clear caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Force reload after cleanup
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Emergency recovery failed:', error);
      // Last resort: hard reload
      window.location.href = window.location.href;
    }
  }

  static checkRecoveryStatus() {
    const disabledUntil = localStorage.getItem('sw-disabled-until');
    if (disabledUntil && Date.now() > parseInt(disabledUntil)) {
      localStorage.removeItem('sw-disabled');
      localStorage.removeItem('sw-disabled-until');
      localStorage.removeItem('pwa-failure-count');
      this.failureCount = 0;
      console.log('PWA recovery cooldown completed');
    }
  }

  static getLastError() {
    try {
      const errorLog = localStorage.getItem('pwa-last-error');
      return errorLog ? JSON.parse(errorLog) : null;
    } catch (e) {
      return null;
    }
  }
}