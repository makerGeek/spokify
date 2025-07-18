import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, X } from "lucide-react";
import { Link } from "wouter";
import { type Song } from "@shared/schema";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: Song;
}

export function PremiumModal({ isOpen, onClose, song }: PremiumModalProps) {
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
              <Link href="/subscribe">
                <Button className="w-full spotify-btn-primary" onClick={onClose}>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
              
              <Button variant="ghost" className="w-full spotify-text-secondary hover:spotify-text-primary" onClick={onClose}>
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}