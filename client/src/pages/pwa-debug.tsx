import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PWAErrorHandler } from '@/lib/pwa-error-handler';
import { RefreshCw, Bug, Download, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PWADebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    collectDebugInfo();
  }, []);

  const collectDebugInfo = async () => {
    setIsLoading(true);
    
    const info: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      isStandalone: (window.navigator as any).standalone === true,
      referrer: document.referrer,
      url: window.location.href,
      screenSize: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: {},
      sessionStorage: {},
      serviceWorker: {},
      caches: [],
      lastError: null,
      reactVersion: React.version || 'Unknown'
    };

    // Check PWA detection
    info.pwaDetection = {
      matchMedia: window.matchMedia('(display-mode: standalone)').matches,
      standalone: (window.navigator as any).standalone === true,
      referrerCheck: document.referrer.includes('android-app://'),
      hasManifest: !!document.querySelector('link[rel="manifest"]'),
      hasServiceWorker: 'serviceWorker' in navigator
    };

    // Collect localStorage info (safely)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          info.localStorage[key] = localStorage.getItem(key);
        }
      }
    } catch (e) {
      info.localStorage = { error: `Cannot access localStorage: ${e}` };
    }

    // Collect sessionStorage info (safely)
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          info.sessionStorage[key] = sessionStorage.getItem(key);
        }
      }
    } catch (e) {
      info.sessionStorage = { error: `Cannot access sessionStorage: ${e}` };
    }

    // Collect Service Worker info
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        info.serviceWorker = {
          supported: true,
          registrations: registrations.map(reg => ({
            scope: reg.scope,
            state: reg.active?.state,
            scriptURL: reg.active?.scriptURL,
            updateViaCache: reg.updateViaCache
          }))
        };
      } catch (e) {
        info.serviceWorker = { error: `${e}` };
      }
    } else {
      info.serviceWorker = { supported: false };
    }

    // Collect Cache info
    if ('caches' in window) {
      try {
        info.caches = await caches.keys();
      } catch (e) {
        info.caches = [`Error: ${e}`];
      }
    }

    // Get last error from PWA Error Handler
    info.lastError = PWAErrorHandler.getLastError();

    setDebugInfo(info);
    setIsLoading(false);
  };

  const clearAllData = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      toast({
        title: "Data Cleared",
        description: "All PWA data has been cleared. Please reload the app.",
      });

      // Refresh debug info
      setTimeout(collectDebugInfo, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clear data: ${error}`,
        variant: "destructive"
      });
    }
  };

  const downloadDebugReport = () => {
    if (!debugInfo) return;

    const report = JSON.stringify(debugInfo, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pwa-debug-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Debug report has been saved to your downloads."
    });
  };

  const forceReload = () => {
    window.location.reload();
  };

  if (isLoading || !debugInfo) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-8">
          <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-4" />
          <p>Collecting debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PWA Debug Center</h1>
        <div className="flex gap-2">
          <Button onClick={collectDebugInfo} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={downloadDebugReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* PWA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {debugInfo.isPWA ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            PWA Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Running as PWA:</span>
            <Badge variant={debugInfo.isPWA ? "default" : "secondary"}>
              {debugInfo.isPWA ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Display Mode Standalone: {debugInfo.pwaDetection.matchMedia ? "✅" : "❌"}</div>
            <div>iOS Standalone: {debugInfo.pwaDetection.standalone ? "✅" : "❌"}</div>
            <div>Android App Referrer: {debugInfo.pwaDetection.referrerCheck ? "✅" : "❌"}</div>
            <div>Has Manifest: {debugInfo.pwaDetection.hasManifest ? "✅" : "❌"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Error Information */}
      {debugInfo.lastError && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Bug className="w-5 h-5" />
              Last Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{debugInfo.lastError.type}:</strong> {debugInfo.lastError.error}
                <br />
                <small>Occurred: {new Date(debugInfo.lastError.timestamp).toLocaleString()}</small>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Service Worker Info */}
      <Card>
        <CardHeader>
          <CardTitle>Service Worker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Supported:</span> {debugInfo.serviceWorker.supported ? "✅" : "❌"}
            </div>
            {debugInfo.serviceWorker.registrations && (
              <div>
                <span className="font-medium">Registrations:</span> {debugInfo.serviceWorker.registrations.length}
                {debugInfo.serviceWorker.registrations.map((reg: any, i: number) => (
                  <div key={i} className="ml-4 text-sm bg-muted p-2 rounded mt-1">
                    <div>Scope: {reg.scope}</div>
                    <div>State: {reg.state}</div>
                    <div>Script: {reg.scriptURL}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cache Info */}
      <Card>
        <CardHeader>
          <CardTitle>Caches</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <span className="font-medium">Cache Names ({debugInfo.caches.length}):</span>
            <div className="grid grid-cols-1 gap-1 mt-2">
              {debugInfo.caches.map((cache: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {cache}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>User Agent:</strong> {debugInfo.userAgent}</div>
          <div><strong>Screen Size:</strong> {debugInfo.screenSize}</div>
          <div><strong>Viewport Size:</strong> {debugInfo.viewportSize}</div>
          <div><strong>React Version:</strong> {debugInfo.reactVersion}</div>
          <div><strong>Current URL:</strong> {debugInfo.url}</div>
          <div><strong>Referrer:</strong> {debugInfo.referrer || 'None'}</div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              If you're experiencing React Error #300 or other PWA issues, try these recovery steps in order:
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={forceReload} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Reload
            </Button>
            
            <Button onClick={clearAllData} variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>1. Force Reload:</strong> Refreshes the app without clearing data</p>
            <p><strong>2. Clear All Data:</strong> Removes all cached data, storage, and service workers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}