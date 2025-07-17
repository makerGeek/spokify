import React from 'react';
import { useAuth } from '../contexts/passport-auth-context';
import { PassportLoginForm } from './passport-login-form';

interface PassportAuthenticatedOnlyProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
  inviteCode?: string;
}

export default function PassportAuthenticatedOnly({ 
  children, 
  fallback: Fallback,
  inviteCode 
}: PassportAuthenticatedOnlyProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="spotify-loading mx-auto mb-4"></div>
          <p className="spotify-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (Fallback) {
      return <Fallback />;
    }
    
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center p-4">
        <PassportLoginForm 
          inviteCode={inviteCode}
          onSuccess={() => {
            // Refresh will happen automatically via auth context
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}