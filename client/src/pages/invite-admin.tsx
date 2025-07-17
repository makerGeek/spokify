import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

interface InviteCode {
  id: number;
  code: string;
  createdBy: number;
  usedBy: number | null;
  usedAt: string | null;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function InviteAdmin() {
  const [maxUses, setMaxUses] = useState(1);
  const [expiresIn, setExpiresIn] = useState(7); // days
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, databaseUser } = useAuth();

  const { data: inviteCodes, isLoading } = useQuery<InviteCode[]>({
    queryKey: databaseUser?.id ? ['/api/users', databaseUser.id, 'invite-codes'] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getInviteCodes(databaseUser.id);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!databaseUser?.id) throw new Error('User not authenticated');
      
      const expiresAt = expiresIn > 0 
        ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      
      return api.auth.generateInvite(databaseUser.id, maxUses, expiresAt);
    },
    onSuccess: () => {
      if (databaseUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', databaseUser.id, 'invite-codes'] });
      }
      toast({
        title: 'Invite Code Generated',
        description: 'New invite code has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invite code.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: `Invite code ${code} copied to clipboard.`,
    });
  };

  const getStatusBadge = (inviteCode: InviteCode) => {
    if (inviteCode.currentUses >= inviteCode.maxUses) {
      return <Badge variant="secondary">Used</Badge>;
    }
    if (inviteCode.expiresAt && new Date() > new Date(inviteCode.expiresAt)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default" style={{ backgroundColor: 'var(--spotify-green)' }}>Active</Badge>;
  };

  return (
    <div className="spotify-bg min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="spotify-heading-lg mb-2">Invite Code Admin</h1>
          <p className="spotify-text-secondary">Manage invite codes for Spokify access</p>
        </div>

        {/* Generate New Code */}
        <Card className="spotify-card mb-8">
          <CardHeader>
            <CardTitle className="spotify-text-primary flex items-center">
              <Plus className="mr-2" size={20} />
              Generate New Invite Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUses" className="spotify-text-primary">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  min="1"
                  max="100"
                  className="spotify-input"
                />
              </div>
              <div>
                <Label htmlFor="expiresIn" className="spotify-text-primary">Expires In (days)</Label>
                <Input
                  id="expiresIn"
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="0 = never expires"
                  className="spotify-input"
                />
              </div>
            </div>
            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
              className="spotify-btn-primary"
            >
              {generateCodeMutation.isPending ? 'Generating...' : 'Generate Invite Code'}
            </Button>
          </CardContent>
        </Card>

        {/* Invite Codes List */}
        <Card className="spotify-card">
          <CardHeader>
            <CardTitle className="spotify-text-primary flex items-center">
              <Users className="mr-2" size={20} />
              Invite Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="spotify-loading"></div>
                <p className="spotify-text-secondary mt-2">Loading invite codes...</p>
              </div>
            ) : !inviteCodes || inviteCodes.length === 0 ? (
              <div className="text-center py-8">
                <p className="spotify-text-secondary">No invite codes created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inviteCodes.map((inviteCode) => (
                  <div
                    key={inviteCode.id}
                    className="flex items-center justify-between p-4 bg-spotify-gray rounded-lg border border-spotify-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <code className="bg-black/30 px-3 py-1 rounded text-spotify-green font-mono">
                          {inviteCode.code}
                        </code>
                        {getStatusBadge(inviteCode)}
                      </div>
                      <div className="mt-2 text-sm spotify-text-secondary">
                        <span>Uses: {inviteCode.currentUses}/{inviteCode.maxUses}</span>
                        {inviteCode.expiresAt && (
                          <span className="ml-4">
                            Expires: {new Date(inviteCode.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="ml-4">
                          Created: {new Date(inviteCode.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(inviteCode.code)}
                        className="spotify-text-secondary hover:spotify-text-primary"
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}