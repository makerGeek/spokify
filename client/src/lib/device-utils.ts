/**
 * iOS detection utility
 * Detects iPad, iPhone, iPod, and iPad Pro (which shows as MacIntel with touch)
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};