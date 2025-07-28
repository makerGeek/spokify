import { PWAErrorHandler } from './pwa-error-handler';
import { api } from './api-client';

export function initializePWA() {
  // Initialize error handling first
  PWAErrorHandler.initialize();
  PWAErrorHandler.checkRecoveryStatus();

  // Detect if running as installed PWA
  const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true ||
                   document.referrer.includes('android-app://');
  
  if (isPWAMode) {
    console.log('PWA: Running in standalone mode');
    // Add PWA-specific handling if needed
    document.documentElement.classList.add('pwa-mode');
    
    // Add error recovery listener
    window.addEventListener('pwaRecovery', () => {
      console.log('PWA recovery event received');
    });
  }

  // Service Worker registration - skip in development to avoid caching issues
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // Check if SW was previously disabled due to errors
    const swDisabled = localStorage.getItem('sw-disabled');
    if (swDisabled) {
      console.log('Service Worker disabled due to previous errors');
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Listen for service worker errors
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('SW activated successfully');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed: ', registrationError);
        // Disable SW temporarily if registration fails repeatedly
        const failCount = parseInt(localStorage.getItem('sw-fail-count') || '0') + 1;
        localStorage.setItem('sw-fail-count', failCount.toString());
        
        if (failCount >= 3) {
          console.log('SW failed 3 times, disabling for 1 hour');
          localStorage.setItem('sw-disabled', Date.now().toString());
          // Re-enable after 1 hour
          setTimeout(() => {
            localStorage.removeItem('sw-disabled');
            localStorage.removeItem('sw-fail-count');
          }, 60 * 60 * 1000);
        }
      });

    // Add global error handler for service worker
    navigator.serviceWorker.addEventListener('error', (error) => {
      console.error('SW runtime error:', error);
      // If SW is causing critical errors, provide bypass mechanism
      const errorMessage = (error as any)?.message || 'Service Worker Error';
      if (errorMessage.includes('503')) {
        console.log('SW causing 503 errors, temporarily disabling');
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister());
        });
      }
    });

  } else if (import.meta.env.DEV) {
    console.log('Service Worker disabled in development mode');
    // Aggressively clear any existing service workers and caches in development
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(async function(registrations) {
        for(let registration of registrations) {
          await registration.unregister();
          console.log('Unregistered existing service worker:', registration.scope);
        }
        
        // Also clear all caches to prevent 503 errors
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('Cleared cache in dev mode:', cacheName);
          }
        }
        
        console.log('✅ Development mode: All SW and caches cleared');
      }).catch(error => {
        console.error('Error clearing SW in dev mode:', error);
      });
    }
  }

  // Track user engagement
  trackUserEngagement();

  // Install prompt handling
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', async (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Check if install features are enabled via feature flag
    try {
      const response = await api.get('/feature-flags/ALLOW_APP_INSTALL');
      if (!response?.enabled) {
        console.log('App install feature disabled via flag');
        return;
      }
    } catch (error) {
      console.log('Feature flag check failed, disabling install prompts:', error);
      return;
    }
    
    // Check if user previously dismissed or hasn't engaged enough
    if (shouldShowInstallPrompt()) {
      showInstallPrompt();
    }
  });

  function shouldShowInstallPrompt(): boolean {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    const engagementScore = getEngagementScore();
    
    // Don't show if dismissed within last 7 days
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        console.log('Install prompt dismissed recently, not showing');
        return false;
      }
    }
    
    // Require minimum engagement (3 page views or 2 minutes on site)
    if (engagementScore < 3) {
      console.log('Insufficient user engagement for install prompt');
      return false;
    }
    
    return true;
  }

  function trackUserEngagement() {
    // Track page views
    const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0') + 1;
    localStorage.setItem('pwa-page-views', pageViews.toString());
    
    // Track time on site
    const sessionStart = Date.now();
    const totalTime = parseInt(localStorage.getItem('pwa-total-time') || '0');
    
    window.addEventListener('beforeunload', () => {
      const sessionTime = Date.now() - sessionStart;
      localStorage.setItem('pwa-total-time', (totalTime + sessionTime).toString());
    });
    
    // Track interactions (clicks, scrolls)
    let interactions = parseInt(localStorage.getItem('pwa-interactions') || '0');
    
    const trackInteraction = () => {
      interactions++;
      localStorage.setItem('pwa-interactions', interactions.toString());
    };
    
    document.addEventListener('click', trackInteraction, { once: true });
    document.addEventListener('scroll', trackInteraction, { once: true });
  }

  function getEngagementScore(): number {
    const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
    const totalTimeMs = parseInt(localStorage.getItem('pwa-total-time') || '0');
    const interactions = parseInt(localStorage.getItem('pwa-interactions') || '0');
    
    // Convert milliseconds to seconds, then to minutes
    const totalTimeSeconds = totalTimeMs / 1000;
    const minutesOnSite = totalTimeSeconds / 60;
    
    // Calculate engagement score (page views + minutes on site + interactions)
    return pageViews + Math.floor(minutesOnSite) + interactions;
  }

  function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.id = 'pwa-install-prompt';
    installPrompt.className = 'fixed top-0 left-0 right-0 z-50 bg-spotify-green p-4 text-center';
    installPrompt.innerHTML = `
      <p class="text-sm font-medium text-white">Install Spokify for the best experience!</p>
      <button id="install-btn" class="mt-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100">
        Install App
      </button>
      <button id="dismiss-btn" class="mt-2 ml-2 text-white text-sm underline">
        Dismiss
      </button>
    `;

    document.body.appendChild(installPrompt);

    document.getElementById('install-btn')?.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
          installPrompt.remove();
        });
      }
    });

    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      // Store dismissal timestamp
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
      installPrompt.remove();
    });
  }
}
