import { Button } from "@/components/ui/button";
import { Crown, Check, ExternalLink, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { type Song } from "@shared/schema";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song | null;
}

export function PremiumModal({ isOpen, onClose, song }: PremiumModalProps) {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        isVisible ? "bg-black/60 backdrop-blur-sm opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      onClick={handleOverlayClick}
    >
      <div
        className={`spotify-card-glass border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 transition-all duration-500 transform relative ${
          isVisible
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95"
        }`}
        style={{
          background: "rgba(24, 24, 24, 0.95)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-spotify-muted hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Compact header */}
        <div className="text-center mb-6 pr-8">
          <div className="flex items-center justify-center mb-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
              <Crown className="h-5 w-5 text-black" />
            </div>
          </div>
          <h2 className="spotify-heading-sm text-white mb-2">
            Premium Required
          </h2>
          {song ? (
            <p className="spotify-text-muted text-sm">
              "{song.title}" by {song.artist} is available for Premium subscribers only
            </p>
          ) : (
            <p className="spotify-text-muted text-sm">
              Upgrade to unlock all premium features
            </p>
          )}
        </div>

        {/* Compact features list */}
        <div className="space-y-3 mb-6">
          {[
            "All songs unlocked",
            "Vocabulary tracking",
            "Offline mode",
            "No ads"
          ].map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Check className="h-4 w-4 text-[var(--spotify-green)] flex-shrink-0" />
              <span className="spotify-text-secondary text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="spotify-gradient-green p-4 rounded-lg mb-4">
            <div className="text-2xl font-black text-black">$9.99</div>
            <div className="text-xs font-semibold text-black/80">per month</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full spotify-btn-primary" 
            onClick={handleUpgradeClick}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2" />
            ) : (
              <Crown className="h-4 w-4 mr-2" />
            )}
            Start Premium
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          
          <button 
            className="w-full p-2 text-sm spotify-text-secondary hover:spotify-text-primary transition-colors" 
            onClick={onClose}
          >
            Not now
          </button>
        </div>

        <div className="text-xs spotify-text-muted text-center mt-4">
          🔒 Secure billing through Stripe
        </div>
      </div>
    </div>
  );
}