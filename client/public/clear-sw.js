// Emergency service worker clearing script
// This script forcefully removes all service workers and caches

(async function clearServiceWorker() {
  console.log('🚨 Emergency SW clearing script activated');
  
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service worker registrations`);
      
      for (const registration of registrations) {
        console.log('Unregistering SW:', registration.scope);
        await registration.unregister();
      }
      console.log('✅ All service workers unregistered');
    }
    
    // 2. Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches:`, cacheNames);
      
      for (const cacheName of cacheNames) {
        console.log('Deleting cache:', cacheName);
        await caches.delete(cacheName);
      }
      console.log('✅ All caches cleared');
    }
    
    // 3. Clear localStorage items related to SW
    const swKeys = Object.keys(localStorage).filter(key => 
      key.includes('sw-') || key.includes('pwa-')
    );
    swKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared localStorage key:', key);
    });
    
    console.log('✅ Emergency SW cleanup complete');
    
    // 4. Force reload to ensure clean state
    setTimeout(() => {
      console.log('🔄 Forcing page reload...');
      window.location.reload(true);
    }, 1000);
    
  } catch (error) {
    console.error('❌ Emergency SW clearing failed:', error);
    // Still try to reload even if something failed
    setTimeout(() => window.location.reload(true), 2000);
  }
})();