// Build information utilities

// Static build version - computed once at module load time, not at runtime
const STATIC_BUILD_VERSION = (() => {
  // Try to get build date from environment variable (if available)
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  
  if (buildDate) {
    return new Date(buildDate).toLocaleString('ja-JP', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '').replace(/:/g, '').replace(' ', '-');
  }
  
  // Fallback: Create a static version identifier based on the package version
  // This will stay consistent per build but change when the version updates
  const packageVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  
  // Use a simple hash of the import.meta environment to create build identifier
  const envString = JSON.stringify({
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    version: packageVersion
  });
  
  // Create a simple hash from the environment string
  let hash = 0;
  for (let i = 0; i < envString.length; i++) {
    const char = envString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to a short alphanumeric string
  const buildId = Math.abs(hash).toString(36).slice(0, 6);
  return `${packageVersion}-${buildId}`;
})();

export function getBuildVersion(): string {
  return STATIC_BUILD_VERSION;
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