import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ServiceWorkerAdmin() {
  const [swStatus, setSwStatus] = useState<'loading' | 'active' | 'inactive' | 'error'>('loading');
  const [swInfo, setSwInfo] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const { toast } = useToast();

  const checkServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        if (registrations.length > 0) {
          const registration = registrations[0];
          setSwStatus('active');
          setSwInfo({
            scope: registration.scope,
            updateViaCache: registration.updateViaCache,
            installing: !!registration.installing,
            waiting: !!registration.waiting,
            active: !!registration.active
          });
        } else {
          setSwStatus('inactive');
          setSwInfo(null);
        }

        // Get cache statistics
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          const cacheData = await Promise.all(
            cacheNames.map(async (name) => {
              const cache = await caches.open(name);
              const keys = await cache.keys();
              return { name, count: keys.length };
            })
          );
          setCacheStats(cacheData);
        }
      } else {
        setSwStatus('inactive');
      }
    } catch (error) {
      console.error('Error checking service worker:', error);
      setSwStatus('error');
    }
  };

  const unregisterServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          await registration.unregister();
        }
        
        toast({
          title: "Service Worker Unregistered",
          description: "All service workers have been removed.",
        });
        
        await checkServiceWorker();
      }
    } catch (error) {
      console.error('Error unregistering service worker:', error);
      toast({
        title: "Error",
        description: "Failed to unregister service worker.",
        variant: "destructive"
      });
    }
  };

  const clearAllCaches = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        toast({
          title: "Caches Cleared",
          description: `Cleared ${cacheNames.length} cache(s).`,
        });
        
        await checkServiceWorker();
      }
    } catch (error) {
      console.error('Error clearing caches:', error);
      toast({
        title: "Error",
        description: "Failed to clear caches.",
        variant: "destructive"
      });
    }
  };

  const forceServiceWorkerUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          await registration.update();
        }
        
        toast({
          title: "Update Triggered",
          description: "Service worker update has been triggered.",
        });
        
        await checkServiceWorker();
      }
    } catch (error) {
      console.error('Error updating service worker:', error);
      toast({
        title: "Error",
        description: "Failed to update service worker.",
        variant: "destructive"
      });
    }
  };

  const toggleServiceWorkerDisabled = () => {
    const isDisabled = localStorage.getItem('sw-disabled');
    
    if (isDisabled) {
      localStorage.removeItem('sw-disabled');
      localStorage.removeItem('sw-fail-count');
      toast({
        title: "Service Worker Enabled",
        description: "Service worker will register on next page reload.",
      });
    } else {
      localStorage.setItem('sw-disabled', Date.now().toString());
      toast({
        title: "Service Worker Disabled",
        description: "Service worker registration has been disabled.",
      });
    }
  };

  useEffect(() => {
    checkServiceWorker();
  }, []);

  const isDisabled = localStorage.getItem('sw-disabled');
  const failCount = localStorage.getItem('sw-fail-count');

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Service Worker Administration</h1>
        <p className="text-muted-foreground">
          Monitor and control service worker behavior in production
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Worker Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Service Worker Status
              {swStatus === 'active' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {swStatus === 'inactive' && <XCircle className="h-5 w-5 text-gray-500" />}
              {swStatus === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
            </CardTitle>
            <CardDescription>Current service worker registration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={swStatus === 'active' ? 'default' : 'secondary'}>
                {swStatus.toUpperCase()}
              </Badge>
              {isDisabled && <Badge variant="destructive">DISABLED</Badge>}
            </div>

            {swInfo && (
              <div className="space-y-2 text-sm">
                <div><strong>Scope:</strong> {swInfo.scope}</div>
                <div><strong>Update Via Cache:</strong> {swInfo.updateViaCache}</div>
                <div><strong>Installing:</strong> {swInfo.installing ? 'Yes' : 'No'}</div>
                <div><strong>Waiting:</strong> {swInfo.waiting ? 'Yes' : 'No'}</div>
                <div><strong>Active:</strong> {swInfo.active ? 'Yes' : 'No'}</div>
              </div>
            )}

            {failCount && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Failure count: {failCount}
                </p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={checkServiceWorker} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={toggleServiceWorkerDisabled} variant="outline" size="sm">
                {isDisabled ? 'Enable' : 'Disable'} SW
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Management</CardTitle>
            <CardDescription>View and manage application caches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cacheStats && cacheStats.length > 0 ? (
              <div className="space-y-2">
                {cacheStats.map((cache: any) => (
                  <div key={cache.name} className="flex justify-between items-center">
                    <span className="font-mono text-sm">{cache.name}</span>
                    <Badge variant="outline">{cache.count} items</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No caches found</p>
            )}

            <Button onClick={clearAllCaches} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Emergency Actions</CardTitle>
            <CardDescription>
              Use these actions if the service worker is causing issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button onClick={forceServiceWorkerUpdate} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Update
              </Button>
              
              <Button onClick={unregisterServiceWorker} variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Unregister SW
              </Button>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Hard Reload
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">Emergency Recovery</h4>
              <p className="text-sm text-yellow-700">
                If the app is completely broken due to service worker issues:
              </p>
              <ol className="text-sm text-yellow-700 mt-2 list-decimal list-inside space-y-1">
                <li>Click "Disable SW" to prevent future registrations</li>
                <li>Click "Unregister SW" to remove current worker</li>
                <li>Click "Clear All Caches" to remove cached files</li>
                <li>Perform a hard reload (Ctrl+Shift+R)</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}