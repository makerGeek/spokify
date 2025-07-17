import { supabase } from '@/lib/supabase';

/**
 * Authenticated fetch wrapper that includes Supabase token
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authentication token available');
  }
  
  // Add authorization header
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Authenticated API request helper
 */
export async function authenticatedApiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || 'Request failed';
    } catch {
      errorMessage = errorText || 'Request failed';
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}