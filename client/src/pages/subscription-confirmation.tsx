import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Crown, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';

export default function SubscriptionConfirmation() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { refreshUserData } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [hasVerified, setHasVerified] = useState(false);

  // Get session_id from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    const verifySubscription = async () => {
      if (hasVerified) return;
      setHasVerified(true);
      
      try {
        // Wait 2 seconds to ensure Stripe has processed the subscription
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await apiRequest('POST', '/api/verify-subscription');
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Failed to verify subscription');
        }

        if (data.subscriptionActive) {
          setStatus('success');
          setSubscriptionData(data.subscription);
          
          // Refresh user data to update subscription status in UI
          await refreshUserData();
          
          toast({
            title: "Welcome to Premium!",
            description: "Your subscription is now active. Enjoy unlimited access!",
          });
        } else {
          setStatus('error');
          toast({
            title: "Subscription Not Found",
            description: "We couldn't find an active subscription. Please contact support if you completed payment.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('Subscription verification error:', error);
        setStatus('error');
        toast({
          title: "Verification Failed",
          description: "Unable to verify your subscription. Please try again or contact support.",
          variant: "destructive",
        });
      }
    };

    verifySubscription();
  }, []); // Empty dependency array to run only once

  return (
    <div className="min-h-screen spotify-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="spotify-card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="mb-6">
                <div className="animate-spin w-12 h-12 border-4 border-[var(--spotify-green)] border-t-transparent rounded-full mx-auto mb-4" />
                <Crown className="h-8 w-8 text-[var(--spotify-green)] mx-auto" />
              </div>
              <h1 className="spotify-heading-lg mb-4">Enabling subscription...</h1>
              <p className="spotify-text-secondary">
                Please wait while we activate your Premium access.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6">
                <CheckCircle className="h-16 w-16 text-[var(--spotify-green)] mx-auto mb-4" />
                <Crown className="h-8 w-8 text-[var(--spotify-green)] mx-auto" />
              </div>
              <h1 className="spotify-heading-lg mb-4">Welcome to Premium!</h1>
              <p className="spotify-text-secondary mb-6">
                Your subscription is now active. You have unlimited access to all songs and premium features.
              </p>
              
              {subscriptionData && (
                <div className="spotify-card bg-[var(--spotify-light-gray)] p-4 mb-6 text-left">
                  <h3 className="font-semibold spotify-text-primary mb-2">Subscription Details</h3>
                  <div className="space-y-1 text-sm spotify-text-secondary">
                    <p>Status: <span className="text-[var(--spotify-green)] font-medium">Active</span></p>
                    <p>Plan: <span className="spotify-text-primary">Premium Monthly</span></p>
                    <p>Next billing: <span className="spotify-text-primary">
                      {new Date(subscriptionData.currentPeriodEnd * 1000).toLocaleDateString()}
                    </span></p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Link href="/profile">
                  <Button className="w-full spotify-btn-primary">
                    Go to Profile
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full spotify-text-secondary hover:spotify-text-primary">
                    Start Learning
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              </div>
              <h1 className="spotify-heading-lg mb-4">Verification Failed</h1>
              <p className="spotify-text-secondary mb-6">
                We couldn't verify your subscription. If you completed payment, please contact support or try again.
              </p>
              
              <div className="space-y-3">
                <Button 
                  className="w-full spotify-btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
                <Link href="/profile">
                  <Button variant="ghost" className="w-full spotify-text-secondary hover:spotify-text-primary">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>

        {sessionId && (
          <div className="mt-4 text-center">
            <p className="text-xs spotify-text-secondary">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}