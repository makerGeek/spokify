import { useState, useEffect } from 'react';
import { useFeatureFlag } from './use-feature-flags';

export function usePWADetection() {
  const { isEnabled: allowAppInstall } = useFeatureFlag('ALLOW_APP_INSTALL');
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
      
      // Only allow install if feature flag is enabled
      if (!allowAppInstall) {
        console.log('App install feature disabled via flag');
        return;
      }
      
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

  const requestFullscreen = async () => {
    try {
      // Check if fullscreen is supported
      if (!document.fullscreenEnabled && !(document as any).webkitFullscreenEnabled && !(document as any).msFullscreenEnabled) {
        console.warn('Fullscreen is not supported by this browser or is disabled by user preferences');
        return false;
      }

      // Try modern fullscreen API first
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      } 
      // Try webkit fullscreen (Safari)
      else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
        return true;
      } 
      // Try MS fullscreen (old Edge)
      else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
        return true;
      } 
      // Try mozRequestFullScreen (Firefox)
      else if ((document.documentElement as any).mozRequestFullScreen) {
        await (document.documentElement as any).mozRequestFullScreen();
        return true;
      } else {
        console.warn('Fullscreen API not available in this browser');
        return false;
      }
    } catch (error) {
      // Handle common fullscreen errors
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            console.warn('Fullscreen request denied by user or browser policy');
            break;
          case 'InvalidStateError':
            console.warn('Element is not connected to the document or is already in fullscreen');
            break;
          case 'TypeError':
            console.warn('Fullscreen request failed due to type error');
            break;
          default:
            console.warn('Fullscreen request failed:', error.message);
        }
      } else {
        console.error('Unexpected error during fullscreen request:', error);
      }
      return false;
    }
  };

  const installApp = async () => {
    if (!allowAppInstall) {
      console.log('App install feature disabled via flag');
      return;
    }
    
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