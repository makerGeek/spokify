// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number,
  customParams?: Record<string, any>
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParams
  });
};

// Enhanced visitor tracking
export const trackVisitorInfo = () => {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Get device info
  const deviceInfo = getDeviceInfo();
  
  // Get session info
  const sessionInfo = getSessionInfo();
  
  // Track visitor session start
  trackEvent('session_start', 'engagement', 'visitor_info', undefined, {
    ...deviceInfo,
    ...sessionInfo,
    referrer: document.referrer || 'direct',
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_resolution: `${screen.width}x${screen.height}`,
    window_size: `${window.innerWidth}x${window.innerHeight}`
  });
};

// Song play tracking
export const trackSongPlay = (songId: number, songTitle: string, artist: string, genre: string, language: string, duration?: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  trackEvent('song_play', 'music', `${artist} - ${songTitle}`, duration, {
    song_id: songId,
    song_title: songTitle,
    artist: artist,
    genre: genre,
    language: language,
    player_type: 'web'
  });
};

// Song view tracking (when song page is viewed without playing)
export const trackSongView = (songId: number, songTitle: string, artist: string, genre: string, language: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  trackEvent('song_view', 'music', `${artist} - ${songTitle}`, undefined, {
    song_id: songId,
    song_title: songTitle,
    artist: artist,
    genre: genre,
    language: language
  });
};

// Song completion tracking
export const trackSongComplete = (songId: number, songTitle: string, listenDuration: number, totalDuration: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const completionRate = totalDuration > 0 ? (listenDuration / totalDuration) * 100 : 0;
  
  trackEvent('song_complete', 'music', songTitle, Math.round(completionRate), {
    song_id: songId,
    listen_duration: Math.round(listenDuration),
    total_duration: Math.round(totalDuration),
    completion_rate: Math.round(completionRate)
  });
};

// User engagement tracking
export const trackUserEngagement = (action: string, details?: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  trackEvent(action, 'engagement', undefined, undefined, {
    timestamp: Date.now(),
    ...details
  });
};

// Feature usage tracking
export const trackFeatureUsage = (feature: string, action: string, value?: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  trackEvent(action, 'feature_usage', feature, value, {
    feature_name: feature,
    user_agent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
  });
};

// Helper function to get device information
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  let os = 'unknown';
  let browser = 'unknown';

  // Device type detection
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Browser detection
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  return {
    device_type: deviceType,
    operating_system: os,
    browser: browser,
    is_mobile: deviceType === 'mobile',
    is_pwa: window.matchMedia('(display-mode: standalone)').matches
  };
}

// Helper function to get session information
function getSessionInfo() {
  const sessionStart = Date.now();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    session_start: sessionStart,
    timezone: timeZone,
    local_time: new Date().toISOString(),
    page_load_time: performance.now()
  };
}

// Track session duration on page unload
export const setupSessionTracking = () => {
  if (typeof window === 'undefined') return;
  
  const sessionStart = Date.now();
  
  const trackSessionEnd = () => {
    const sessionDuration = Date.now() - sessionStart;
    trackEvent('session_end', 'engagement', 'session_duration', Math.round(sessionDuration / 1000), {
      session_duration_ms: sessionDuration,
      session_duration_seconds: Math.round(sessionDuration / 1000)
    });
  };
  
  // Track session end on page unload
  window.addEventListener('beforeunload', trackSessionEnd);
  
  // Track session end on visibility change (when user switches tabs/apps)
  let visibilityStart = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityStart = Date.now();
    } else {
      const hiddenDuration = Date.now() - visibilityStart;
      if (hiddenDuration > 30000) { // If hidden for more than 30 seconds, track as session pause
        trackEvent('session_pause', 'engagement', 'tab_hidden', Math.round(hiddenDuration / 1000));
      }
    }
  });
};