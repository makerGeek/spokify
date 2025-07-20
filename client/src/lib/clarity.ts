// Microsoft Clarity integration for user behavior analytics
declare global {
  interface Window {
    clarity: any;
  }
}

export function initializeClarity() {
  if (!import.meta.env.VITE_CLARITY_PROJECT_ID) {
    console.warn("Clarity Project ID not configured - user analytics disabled");
    return;
  }

  // Load Clarity script
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${import.meta.env.VITE_CLARITY_PROJECT_ID}");
  `;
  document.head.appendChild(script);
}

// Utility functions for custom Clarity events
export function trackUserAction(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', eventName, properties);
  }
}

export function setUserIdentity(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('identify', userId, properties);
  }
}

export function trackPageView(pageName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', 'page_view', {
      page: pageName,
      ...properties
    });
  }
}

export function trackLearningProgress(action: string, songId?: number, language?: string, progress?: number) {
  trackUserAction('learning_progress', {
    action,
    song_id: songId,
    language,
    progress_percentage: progress
  });
}

export function trackSubscriptionEvent(event: string, plan?: string, status?: string) {
  trackUserAction('subscription', {
    event,
    plan,
    status
  });
}

export function trackAudioEvent(action: string, songId?: number, position?: number) {
  trackUserAction('audio_interaction', {
    action,
    song_id: songId,
    position_seconds: position
  });
}