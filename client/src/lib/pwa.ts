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

  // Install prompt handling
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
  });

  function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.id = 'pwa-install-prompt';
    installPrompt.className = 'fixed top-0 left-0 right-0 z-50 bg-spotify-green p-4 text-center';
    installPrompt.innerHTML = `
      <p class="text-sm font-medium text-white">Install LyricLingo for the best experience!</p>
      <button id="install-btn" class="mt-2 bg-white text-spotify-green px-4 py-2 rounded-full text-sm font-medium">
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
      installPrompt.remove();
    });
  }
}
