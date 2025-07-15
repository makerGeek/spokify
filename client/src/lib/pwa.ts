export function initializePWA() {
  // Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  }

  // Track user engagement
  trackUserEngagement();

  // Install prompt handling
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
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
    const totalTime = parseInt(localStorage.getItem('pwa-total-time') || '0');
    const interactions = parseInt(localStorage.getItem('pwa-interactions') || '0');
    
    // Calculate engagement score (page views + minutes on site + interactions)
    const minutesOnSite = totalTime / (1000 * 60);
    return pageViews + Math.floor(minutesOnSite) + interactions;
  }

  function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.id = 'pwa-install-prompt';
    installPrompt.className = 'fixed top-0 left-0 right-0 z-50 bg-spotify-green p-4 text-center';
    installPrompt.innerHTML = `
      <p class="text-sm font-medium text-white">Install LyricLingo for the best experience!</p>
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
