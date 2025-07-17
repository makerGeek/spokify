import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { REAL_TIME_CONFIG } from '../lib/query-config';

interface User {
  id: number;
  email: string;
  name: string;
  profilePicture?: string;
  nativeLanguage: string;
  targetLanguage: string;
  level: string;
  weeklyGoal: number;
  wordsLearned: number;
  streak: number;
  isAdmin: boolean;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/auth/user'],
    queryFn: () => apiRequest('/auth/user'),
    ...REAL_TIME_CONFIG,
    retry: false
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/auth/user'] });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      name, 
      inviteCode 
    }: { 
      email: string; 
      password: string; 
      name?: string; 
      inviteCode?: string; 
    }) => {
      return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, inviteCode }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/auth/user'] });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      return apiRequest('/auth/logout', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/auth/user'] });
      queryClient.clear(); // Clear all cached data on logout
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<User>) => {
      return apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/auth/user'] });
    }
  });

  const contextValue: AuthContextType = {
    user: user?.user || null,
    loading: isLoading,
    isAuthenticated: !!user?.user && !error,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    register: async (email: string, password: string, name?: string, inviteCode?: string) => {
      await registerMutation.mutateAsync({ 
        email, 
        password, 
        name, 
        inviteCode: inviteCode || pendingInviteCode || undefined 
      });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    updateProfile: async (updates: Partial<User>) => {
      await updateProfileMutation.mutateAsync(updates);
    }
  };

  // Handle OAuth redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Remove auth parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/auth/user'] });
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// For setting invite codes during the authentication flow
export function useInviteCode() {
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    () => localStorage.getItem('pendingInviteCode')
  );

  const setInviteCode = (code: string | null) => {
    setPendingInviteCode(code);
    if (code) {
      localStorage.setItem('pendingInviteCode', code);
    } else {
      localStorage.removeItem('pendingInviteCode');
    }
  };

  return { pendingInviteCode, setInviteCode };
}