import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
}

export interface DatabaseUser {
  id: number;
  email: string;
  inviteCode?: string;
  streak: number;
  weeklyGoal?: number;
  wordsLearned: number;
  isActive: boolean;
}

export interface UserSyncResult {
  user: DatabaseUser;
  isNewUser: boolean;
  inviteCodeUsed: boolean;
}

/**
 * Get current Supabase session token
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Note: User sync is now handled automatically by backend middleware
 * No need for manual sync calls - users are created/updated on first API request
 */

/**
 * Get current authenticated user from our database
 */
export async function getCurrentUser(): Promise<DatabaseUser | null> {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  const response = await fetch('/api/auth/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 404) {
      return null;
    }
    throw new Error('Failed to get current user');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Validate invite code
 */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; message: string }> {
  const response = await fetch('/api/auth/validate-invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error('Failed to validate invite code');
  }

  return response.json();
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: Partial<DatabaseUser>): Promise<DatabaseUser> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Generate new invite code
 */
export async function generateInviteCode(options: { maxUses?: number; expiresInDays?: number } = {}): Promise<any> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch('/api/auth/generate-invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate invite code');
  }

  const data = await response.json();
  return data.inviteCode;
}

/**
 * Get user's invite codes
 */
export async function getUserInviteCodes(): Promise<any[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch('/api/auth/invite-codes', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get invite codes');
  }

  const data = await response.json();
  return data.inviteCodes;
}