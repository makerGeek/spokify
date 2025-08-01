import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Crown, Check, X } from "lucide-react";
import { Link } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/profile",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription is now active. Enjoy unlimited access!",
      });
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button 
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full spotify-btn-primary px-6 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Crown className="h-5 w-5" />
            <span>Subscribe to Premium</span>
          </>
        )}
      </button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useUser();

  useEffect(() => {
    // Only create subscription if user is loaded
    if (!user) return;
    
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/get-or-create-subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error.message || 'Failed to create subscription');
        }
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Subscription error:', err);
        setError(err.message || 'Failed to load subscription');
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" aria-label="Loading"/>
          <p className="spotify-text-secondary">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen spotify-bg">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/profile" className="spotify-text-secondary hover:spotify-text-primary inline-flex items-center space-x-2 mb-4">
              <span>← Back to Profile</span>
            </Link>
            <h1 className="spotify-heading-xl mb-2">Subscription Error</h1>
          </div>

          <div className="max-w-md mx-auto spotify-card p-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="spotify-heading-lg mb-4">Something went wrong</h2>
            <p className="spotify-text-secondary mb-6">{error}</p>
            <Link href="/profile" className="spotify-btn-primary px-6 py-2">
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="spotify-text-secondary">Unable to load payment form</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen spotify-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="spotify-text-secondary hover:spotify-text-primary inline-flex items-center space-x-2 mb-4">
            <span>← Back to Profile</span>
          </Link>
          <h1 className="spotify-heading-xl mb-2">Upgrade to Premium</h1>
          <p className="spotify-text-secondary">Unlock unlimited access to all songs and features</p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Benefits */}
          <div className="spotify-card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Crown className="h-8 w-8 text-[var(--spotify-green)]" />
              <h2 className="spotify-heading-lg">Premium Features</h2>
            </div>
            
            <div className="space-y-4">
              {[
                "Unlimited access to all songs",
                "Advanced vocabulary tracking",
                "Offline learning mode",
                "Priority customer support",
                "No ads or interruptions",
                "Export your vocabulary lists"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-[var(--spotify-green)] flex-shrink-0" />
                  <span className="spotify-text-primary">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 spotify-surface rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-bold spotify-text-primary mb-1">$9.99</div>
                <div className="spotify-text-secondary text-sm">per month</div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="spotify-card p-6">
            <h2 className="spotify-heading-lg mb-6">Payment Information</h2>
            
            {/* User Info */}
            {user && (
              <div className="mb-6 p-4 spotify-surface rounded-lg">
                <div className="text-sm spotify-text-secondary mb-1">Subscribing as:</div>
                <div className="spotify-text-primary font-medium">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </div>
                <div className="text-sm spotify-text-secondary">{user.email}</div>
              </div>
            )}

            {/* Stripe Elements Form */}
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#1db954',
                    colorBackground: '#121212',
                    colorText: '#ffffff',
                    colorDanger: '#f15e6c',
                    fontFamily: 'inherit',
                    borderRadius: '8px',
                  }
                }
              }}
            >
              <SubscribeForm />
            </Elements>

            <div className="mt-4 text-xs spotify-text-secondary text-center">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              You can cancel anytime from your profile settings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};