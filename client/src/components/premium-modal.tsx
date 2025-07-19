import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, ExternalLink, X } from "lucide-react";
import { type Song } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song;
}

export function PremiumModal({ isOpen, onClose, song }: PremiumModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgradeClick = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe-portal");
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to create portal session');
      }
      
      // Redirect to Stripe portal
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Portal error:', err);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md spotify-card-glass border-0 text-white overflow-hidden">
        {/* Close Button - Spotify Style */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Header with Gradient */}
        <div className="spotify-gradient-header -m-6 mb-0 p-6 pb-8">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center space-x-3 spotify-text-primary text-xl font-bold">
              <div className="p-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
                <Crown className="h-6 w-6 text-black" />
              </div>
              <span>Upgrade to Premium</span>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="space-y-6 p-6 -mt-6">
          {song && (
            <div className="text-center p-4 rounded-xl bg-black/20 border border-white/10">
              <p className="spotify-text-secondary text-sm">
                <span className="font-semibold spotify-text-primary text-base">"{song.title}"</span>
                <br />
                <span className="text-sm">by {song.artist}</span>
                <br />
                <span className="text-xs opacity-75 mt-1 block">Premium song - upgrade to unlock</span>
              </p>
            </div>
          )}
          
          {/* Premium Features */}
          <div className="space-y-4">
            <h3 className="font-semibold spotify-text-primary text-center">What you get:</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                "🎵 Unlimited access to all songs",
                "📚 Advanced vocabulary tracking",
                "💾 Offline learning mode", 
                "🚫 No ads or interruptions",
                "💬 Priority customer support"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Check className="h-4 w-4 text-[var(--spotify-green)] flex-shrink-0" />
                  <span className="spotify-text-secondary text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing */}
          <div className="text-center space-y-4">
            <div className="spotify-gradient-green p-6 rounded-2xl shadow-xl">
              <div className="text-3xl font-black text-black">$9.99</div>
              <div className="text-sm font-semibold text-black/80">per month</div>
              <div className="text-xs text-black/60 mt-1">Cancel anytime</div>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full spotify-btn-primary text-base font-bold py-3 h-12" 
                onClick={handleUpgradeClick}
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                ) : (
                  <Crown className="h-5 w-5 mr-2" />
                )}
                Start Premium
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              
              <button 
                className="w-full p-3 text-sm spotify-text-secondary hover:spotify-text-primary transition-colors font-medium underline decoration-dotted underline-offset-4" 
                onClick={onClose}
              >
                Not now
              </button>
            </div>
            
            <div className="text-xs spotify-text-muted flex items-center justify-center space-x-1">
              <span>🔒</span>
              <span>Secure billing through Stripe</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}