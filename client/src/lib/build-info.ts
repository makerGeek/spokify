// Build information utilities
export function getBuildVersion(): string {
  // Try to get build date from environment variable (if available)
  const buildDate = (globalThis as any).__BUILD_DATE__ || import.meta.env.VITE_BUILD_DATE;
  
  if (buildDate) {
    return new Date(buildDate).toLocaleString('ja-JP', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '').replace(/:/g, '').replace(' ', '-');
  }
  
  // Fallback to package.json version or current date
  try {
    // Use import timestamp as build indicator
    const now = new Date();
    return now.toLocaleString('ja-JP', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '').replace(/:/g, '').replace(' ', '-');
  } catch {
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