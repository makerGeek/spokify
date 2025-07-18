import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { InviteCodeInput } from "@/components/invite-code-input";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  contextMessage?: string;
}

export default function ActivationModal({ 
  isOpen, 
  onClose, 
  onActivated, 
  contextMessage = "To access premium songs, you need to activate your account with an invite code."
}: ActivationModalProps) {
  const [isValidating, setIsValidating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInviteCodeValidated = async (code: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "No user session found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Activate user with invite code
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteCode: code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate account');
      }

      toast({
        title: "Account Activated!",
        description: "Welcome to Spokify! You now have access to all premium songs.",
      });
      
      onActivated();
      onClose();
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-spotify-card border-spotify-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-spotify-text">Activate Your Account</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-spotify-muted hover:text-spotify-text"
            >
              <X size={16} />
            </Button>
          </div>
          <DialogDescription className="text-spotify-muted">
            {contextMessage}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <InviteCodeInput
            onCodeValidated={handleInviteCodeValidated}
            onSkip={handleSkip}
            isLoading={isValidating}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}