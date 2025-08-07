// Build information utilities
export function getBuildVersion(): string {
  try {
    // Use build timestamp injected by Vite
    const buildDate = new Date(__BUILD_TIMESTAMP__);
    return buildDate.toLocaleString('ja-JP', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '').replace(/:/g, '').replace(' ', '-');
  } catch {
    // Fallback for development
    return 'dev-build';
  }
}

export function getAppVersion(): string {
  // Get package version if available
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}

export function getBuildInfo() {
  return {
    version: getAppVersion(),
    build: getBuildVersion(),
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV
  };
}