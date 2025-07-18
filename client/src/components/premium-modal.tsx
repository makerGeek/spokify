import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, ExternalLink } from "lucide-react";
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
      <DialogContent className="sm:max-w-md spotify-surface border-spotify-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 spotify-text-primary">
            <Crown className="h-5 w-5 text-[var(--spotify-green)]" />
            <span>Premium Required</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {song && (
            <div className="text-center">
              <p className="spotify-text-secondary">
                <span className="font-medium spotify-text-primary">"{song.title}"</span> by {song.artist} is available for Premium subscribers only.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="font-semibold spotify-text-primary">Premium Features:</h3>
            <div className="space-y-3">
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
          </div>
          
          <div className="text-center space-y-3">
            <div className="p-3 spotify-card rounded-lg">
              <div className="text-2xl font-bold spotify-text-primary">$9.99</div>
              <div className="text-sm spotify-text-secondary">per month</div>
            </div>
            
            <div className="space-y-2">
              <Button 
                className="w-full spotify-btn-primary" 
                onClick={handleUpgradeClick}
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Upgrade to Premium
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              
              <Button variant="ghost" className="w-full spotify-text-secondary hover:spotify-text-primary" onClick={onClose}>
                Maybe Later
              </Button>
            </div>
            
            <div className="text-xs spotify-text-secondary">
              Secure billing through Stripe
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}