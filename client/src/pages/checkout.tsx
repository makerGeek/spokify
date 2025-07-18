import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, X } from "lucide-react";
import { Link } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
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
        title: "Payment Successful",
        description: "Thank you for your purchase!",
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
            <span>Complete Payment</span>
          </>
        )}
      </button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { amount: 9.99 })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error || 'Failed to create payment intent');
        }
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Payment error:', err);
        setError(err.message || 'Failed to load payment');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" aria-label="Loading"/>
          <p className="spotify-text-secondary">Setting up payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen spotify-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Link href="/profile" className="spotify-text-secondary hover:spotify-text-primary inline-flex items-center space-x-2 mb-4">
              <span>← Back to Profile</span>
            </Link>
            <h1 className="spotify-heading-xl mb-2">Payment Error</h1>
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
        <div className="mb-8">
          <Link href="/profile" className="spotify-text-secondary hover:spotify-text-primary inline-flex items-center space-x-2 mb-4">
            <span>← Back to Profile</span>
          </Link>
          <h1 className="spotify-heading-xl mb-2">One-Time Payment</h1>
          <p className="spotify-text-secondary">Complete your purchase for premium access</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="spotify-card p-6 mb-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold spotify-text-primary mb-1">$9.99</div>
              <div className="spotify-text-secondary text-sm">One-time payment</div>
            </div>
            
            <div className="space-y-3">
              {[
                "Lifetime access to all songs",
                "Advanced vocabulary tracking",
                "No subscription required"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-[var(--spotify-green)] flex-shrink-0" />
                  <span className="spotify-text-secondary text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="spotify-card p-6">
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
              <CheckoutForm />
            </Elements>

            <div className="mt-4 text-xs spotify-text-secondary text-center">
              Secure payment processed by Stripe. Your information is protected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}