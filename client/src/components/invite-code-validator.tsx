import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { validateInviteCode } from '@/lib/auth';

interface InviteCodeValidatorProps {
  onValidated: (code: string) => void;
  onCancel?: () => void;
}

export function InviteCodeValidator({ onValidated, onCancel }: InviteCodeValidatorProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const isValid = await validateInviteCode(code.trim());
      
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          onValidated(code.trim());
        }, 1000);
      } else {
        setError('Invalid invite code. Please check and try again.');
      }
    } catch (error) {
      setError('Failed to validate invite code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
    setError(null);
    setSuccess(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Enter Invite Code</CardTitle>
        <CardDescription>
          You need an invite code to join Spokify. Enter your code below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="BLUE-MOON-2847"
              value={code}
              onChange={handleCodeChange}
              disabled={isValidating || success}
              className="text-center font-mono text-lg"
              maxLength={50}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Invite code validated successfully! Proceeding...
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isValidating || success || !code.trim()}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Validated
                </>
              ) : (
                'Validate Code'
              )}
            </Button>
            
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isValidating || success}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Don't have an invite code?</p>
          <p>Ask a friend who's already using Spokify to share theirs with you.</p>
        </div>
      </CardContent>
    </Card>
  );
}