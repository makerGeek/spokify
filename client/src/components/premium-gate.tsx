import { Crown, Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PremiumGateProps {
  songTitle?: string;
  className?: string;
}

export function PremiumGate({ songTitle, className = "" }: PremiumGateProps) {
  return (
    <Card className={`spotify-card border-2 border-[var(--spotify-green)]/20 ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <Crown className="h-12 w-12 text-[var(--spotify-green)]" />
            <Lock className="h-6 w-6 text-[var(--spotify-green)] absolute -bottom-1 -right-1 bg-[var(--spotify-dark-gray)] rounded-full p-1" />
          </div>
        </div>
        
        <h3 className="spotify-heading-md mb-2">Premium Content</h3>
        
        {songTitle && (
          <p className="spotify-text-secondary mb-4">
            "{songTitle}" is available for Premium subscribers
          </p>
        )}
        
        <p className="spotify-text-secondary text-sm mb-6">
          Upgrade to Premium to unlock unlimited access to all songs and features
        </p>
        
        <div className="space-y-3">
          <Link href="/subscribe">
            <Button className="w-full spotify-btn-primary">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
          
          <div className="text-xs spotify-text-secondary">
            Already a subscriber? Try refreshing the page
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PremiumBadgeProps {
  className?: string;
}

export function PremiumBadge({ className = "" }: PremiumBadgeProps) {
  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 bg-[var(--spotify-green)]/10 border border-[var(--spotify-green)]/20 rounded-full ${className}`}>
      <Crown className="h-3 w-3 text-[var(--spotify-green)]" />
      <span className="text-xs font-medium text-[var(--spotify-green)]">Premium</span>
    </div>
  );
}