import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteCodeInputProps {
  onCodeValidated: (code: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function InviteCodeInput({
  onCodeValidated,
  onSkip,
  isLoading = false,
}: InviteCodeInputProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        onCodeValidated(inviteCode.trim());
      } else {
        toast({
          title: "Invalid Invite Code",
          description:
            data.message || "This invite code is not valid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInviteCode();
  };

  return (
    <div className="spotify-bg flex items-center justify-center p-4">
      <div className="spotify-card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <Users
            className="mx-auto mb-4"
            style={{ color: "var(--spotify-green)" }}
            size={48}
          />
          <h1 className="spotify-heading-lg mb-2">Invite Only</h1>
          <p className="spotify-text-secondary">
            Spokify is currently invite-only. Please enter your invite code to
            continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="spotify-text-primary">
              Invite Code
            </Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="Enter your invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="spotify-input"
              disabled={isValidating || isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="spotify-btn-primary w-full"
              disabled={isValidating || isLoading || !inviteCode.trim()}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Continue
                </>
              )}
            </Button>

            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                className="w-full spotify-text-secondary hover:spotify-text-primary"
                onClick={onSkip}
                disabled={isValidating || isLoading}
              >
                Skip for now
              </Button>
            )}
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="spotify-text-muted text-sm">
            Don't have an invite code? Request access from a friend who's
            already using Spokify.
          </p>
        </div>
      </div>
    </div>
  );
}
