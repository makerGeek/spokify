import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateInviteCode } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface InviteCodeValidatorProps {
  onValidCode: (code: string) => void;
  disabled?: boolean;
}

export function InviteCodeValidator({ onValidCode, disabled }: InviteCodeValidatorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!code.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await validateInviteCode(code.trim().toUpperCase());
      
      if (result.valid) {
        toast({
          title: "Valid Code",
          description: "Invite code is valid! Proceeding...",
        });
        onValidCode(code.trim().toUpperCase());
      } else {
        toast({
          title: "Invalid Code",
          description: result.message || "This invite code is not valid",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Invite code validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">Enter Invite Code</h3>
        <p className="text-gray-400 text-sm">
          You need an invite code to create an account
        </p>
      </div>
      
      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Enter invite code (e.g. WELCOME1)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={disabled || loading}
          className="spotify-input text-center text-lg tracking-wider"
          maxLength={20}
        />
        
        <Button
          onClick={handleValidate}
          disabled={disabled || loading || !code.trim()}
          className="w-full spotify-btn-primary"
        >
          {loading ? 'Validating...' : 'Validate Code'}
        </Button>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Don't have an invite code? Ask a friend who's already using Spokify!
        </p>
      </div>
    </div>
  );
}