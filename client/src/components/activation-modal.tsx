import { useState } from "react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="spotify-card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="spotify-heading-lg mb-2">Activate Your Account</h1>
          <p className="spotify-text-secondary">
            {contextMessage}
          </p>
        </div>
        
        <InviteCodeInput
          onCodeValidated={handleInviteCodeValidated}
          onSkip={handleSkip}
          isLoading={isValidating}
        />
      </div>
    </div>
  );
}