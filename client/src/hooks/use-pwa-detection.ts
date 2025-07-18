import { useState, useEffect } from 'react';

export function usePWADetection() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running in PWA mode
    const checkPWAMode = () => {
      // Check if running in standalone mode (PWA installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running in fullscreen mode
      const isFullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      // Check if launched from home screen on mobile
      const isHomeScreen = (window.navigator as any).standalone === true;
      
      const pwaInstalled = isStandalone || isFullscreenMode || isHomeScreen;
      setIsInstalled(pwaInstalled);
      setIsFullscreen(isFullscreenMode || isStandalone);
    };

    // Check PWA mode on load
    checkPWAMode();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsFullscreen(e.matches);
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
      setIsFullscreen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
      (document.documentElement as any).msRequestFullscreen();
    }
  };

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setCanInstall(false);
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    }
  };

  return {
    isInstalled,
    canInstall,
    isFullscreen,
    requestFullscreen,
    installApp,
    deferredPrompt
  };
}