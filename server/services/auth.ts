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
  inviteCodeUsed?: boolean;
}

/**
 * Securely sync Supabase user to our database
 * Only uses verified user data from Supabase session
 */
export async function syncUserToDatabase(
  supabaseUser: SupabaseUser,
  inviteCode?: string
): Promise<UserSyncResult> {
  try {
    // Check if user already exists
    let user = await storage.getUserBySupabaseId(supabaseUser.id);
    
    if (user) {
      return { user, isNewUser: false };
    }

    // Create new inactive user
    const userData: InsertUser = {
      email: supabaseUser.email,
      supabaseId: supabaseUser.id,
      firstName: extractFirstName(supabaseUser.user_metadata),
      lastName: extractLastName(supabaseUser.user_metadata),
      profileImageUrl: extractProfileImage(supabaseUser.user_metadata),
    };

    user = await storage.createUser(userData);

    // If invite code provided, validate and activate
    if (inviteCode) {
      const validation = await storage.validateInviteCode(inviteCode);
      if (validation.valid && validation.inviteCode) {
        // Activate user with invite code
        const activationData: ActivateUser = {
          invitedBy: validation.inviteCode.createdBy.toString(),
          inviteCode: await generateSecureInviteCode(),
          isActive: true,
          activatedAt: new Date(),
        };

        user = await storage.activateUser(user.id, activationData);
        await storage.useInviteCode(inviteCode, user.id);
        
        return { user, isNewUser: true, inviteCodeUsed: true };
      }
    }

    return { user, isNewUser: true, inviteCodeUsed: false };
  } catch (error) {
    console.error('User sync error:', error);
    throw new Error('Failed to sync user to database');
  }
}

/**
 * Validate invite code and store in server-side session
 */
export async function validateInviteCode(code: string): Promise<boolean> {
  try {
    const validation = await storage.validateInviteCode(code);
    return validation.valid;
  } catch (error) {
    console.error('Invite code validation error:', error);
    return false;
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
 * Generate secure invite code
 */
export async function generateSecureInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;

  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const validation = await storage.validateInviteCode(code);
    isUnique = !validation.valid;
  } while (!isUnique);

  return code;
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