import { Crown, Check, X, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useSubscription } from "@/contexts/subscription-context";

export default function Subscribe() {
  const { subscription, upgradeToPreemium, manageBilling } = useSubscription();

  return (
    <div className="min-h-screen spotify-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/profile" className="spotify-text-secondary hover:spotify-text-primary inline-flex items-center space-x-2 mb-4">
            <span>← Back to Profile</span>
          </Link>
          <h1 className="spotify-heading-xl mb-2">
            {subscription.isPremium ? 'Manage Premium Subscription' : 'Upgrade to Premium'}
          </h1>
          <p className="spotify-text-secondary">
            {subscription.isPremium 
              ? 'Manage your premium subscription and billing settings' 
              : 'Unlock unlimited access to all songs and features'
            }
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="spotify-card p-6 mb-6">
            <div className="text-center mb-6">
              <Crown className="h-12 w-12 text-[var(--spotify-green)] mx-auto mb-4" />
              <div className="text-3xl font-bold spotify-text-primary mb-1">$9.99</div>
              <div className="spotify-text-secondary text-sm">per month</div>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                "Unlimited access to all songs",
                "Advanced vocabulary tracking",
                "Offline learning mode",
                "No ads or interruptions",
                "Priority customer support"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-[var(--spotify-green)] flex-shrink-0" />
                  <span className="spotify-text-secondary text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {subscription.isPremium ? (
              <button
                onClick={manageBilling}
                disabled={subscription.loading}
                className="w-full spotify-btn-secondary px-6 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscription.loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Manage Billing</span>
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={upgradeToPreemium}
                disabled={subscription.loading}
                className="w-full spotify-btn-primary px-6 py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscription.loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  <span>Upgrade to Premium</span>
                  <ExternalLink className="h-4 w-4" />
                </>
                )}
              </button>
            )}

            <div className="mt-4 text-xs spotify-text-secondary text-center">
              You'll be redirected to Stripe to manage your subscription securely.
              Cancel anytime from your profile.
            </div>
          </div>

          <div className="spotify-card p-4">
            <h3 className="font-semibold spotify-text-primary mb-2">Free Plan</h3>
            <div className="space-y-2">
              {[
                "Access to 2 songs per language",
                "Basic vocabulary tracking",
                "Limited learning features"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <span className="spotify-text-secondary text-xs">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}