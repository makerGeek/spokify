import { supabase } from './supabase';

/**
 * Get authenticated user's JWT token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make authenticated API request
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Validate invite code with server
 */
export async function validateInviteCode(code: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/validate-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    return response.ok && data.valid;
  } catch (error) {
    console.error('Error validating invite code:', error);
    return false;
  }
}

/**
 * Sync user to database with authentication
 */
export async function syncUserToDatabase(inviteCode?: string): Promise<any> {
  const response = await authFetch('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ inviteCode })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync user');
  }
  
  return response.json();
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<any> {
  const response = await authFetch('/api/auth/user');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user');
  }
  
  return response.json();
}

/**
 * Get user's invite codes
 */
export async function getUserInviteCodes(): Promise<any[]> {
  const response = await authFetch('/api/auth/invite-codes');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch invite codes');
  }
  
  return response.json();
}

/**
 * Generate new invite code
 */
export async function generateInviteCode(): Promise<any> {
  const response = await authFetch('/api/auth/generate-invite', {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate invite code');
  }
  
  return response.json();
}

/**
 * Update user profile
 */
export async function updateProfile(updates: any): Promise<any> {
  const response = await authFetch('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  
  return response.json();
}