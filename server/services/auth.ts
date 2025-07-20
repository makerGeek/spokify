import { storage } from '../storage';
import type { InsertUser, ActivateUser } from '@shared/schema';
import { nanoid } from 'nanoid';

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

export interface UserSyncResult {
  user: any;
  isNewUser: boolean;
}

/**
 * Securely sync Supabase user to our database
 * Only uses verified user data from Supabase session
 */
export async function syncUserToDatabase(
  supabaseUser: SupabaseUser
): Promise<UserSyncResult> {
  try {
    // Check if user already exists
    let user = await storage.getUserBySupabaseId(supabaseUser.id);
    
    if (user) {
      return { user, isNewUser: false };
    }

    // Create new active user (no invite system)
    const userData: InsertUser = {
      email: supabaseUser.email,
      supabaseId: supabaseUser.id,
      firstName: extractFirstName(supabaseUser.user_metadata),
      lastName: extractLastName(supabaseUser.user_metadata),
      profileImageUrl: extractProfileImage(supabaseUser.user_metadata),
    };

    user = await storage.createUser(userData);

    // Automatically activate user
    const activationData: ActivateUser = {
      isActive: true,
      activatedAt: new Date(),
    };

    user = await storage.activateUser(user.id, activationData);

    return { user, isNewUser: true };
  } catch (error) {
    console.error('User sync error:', error);
    throw new Error('Failed to sync user to database');
  }
}



/**
 * Extract first name from Supabase user metadata
 */
function extractFirstName(userMetadata?: any): string | null {
  if (!userMetadata) return null;
  
  return userMetadata.first_name || 
         userMetadata.given_name ||
         (userMetadata.full_name ? userMetadata.full_name.split(' ')[0] : null) ||
         null;
}

/**
 * Extract last name from Supabase user metadata
 */
function extractLastName(userMetadata?: any): string | null {
  if (!userMetadata) return null;
  
  return userMetadata.last_name || 
         userMetadata.family_name ||
         (userMetadata.full_name ? userMetadata.full_name.split(' ').slice(1).join(' ') : null) ||
         null;
}

/**
 * Extract profile image from Supabase user metadata
 */
function extractProfileImage(userMetadata?: any): string | null {
  if (!userMetadata) return null;
  
  return userMetadata.avatar_url || 
         userMetadata.picture || 
         null;
}



/**
 * Check if user has admin privileges
 */
export async function checkAdminPrivileges(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUserBySupabaseId(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}