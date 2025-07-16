import { storage } from '../storage';
import { createClient } from '@supabase/supabase-js';
import { InsertUser } from '../../shared/schema';

// Use existing environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

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
  validatedInviteCode?: string
): Promise<UserSyncResult> {
  try {
    // Check if user already exists in our database
    const existingUser = await storage.getUserByUsername(supabaseUser.email);
    
    if (existingUser) {
      return { user: existingUser, isNewUser: false };
    }

    // Extract user data from verified Supabase user object
    const userData: InsertUser = {
      email: supabaseUser.email,
      firstName: extractFirstName(supabaseUser.user_metadata),
      lastName: extractLastName(supabaseUser.user_metadata),
      profileImageUrl: extractProfileImage(supabaseUser.user_metadata),
      invitedBy: validatedInviteCode || null,
      inviteCode: await storage.generateUniqueInviteCode(),
      nativeLanguage: 'en',
      targetLanguage: 'es',
      level: 'A1'
    };

    // Create user in our database
    const newUser = await storage.createUser(userData);

    // If they used an invite code, mark it as used
    let inviteCodeUsed = false;
    if (validatedInviteCode) {
      try {
        await storage.useInviteCode(validatedInviteCode, newUser.id);
        inviteCodeUsed = true;
      } catch (error) {
        console.warn('Failed to mark invite code as used:', error);
      }
    }

    return { user: newUser, isNewUser: true, inviteCodeUsed };
  } catch (error) {
    console.error('Error syncing user to database:', error);
    throw new Error('Failed to sync user to database');
  }
}

/**
 * Validate invite code and store in server-side session
 */
export async function validateInviteCode(code: string): Promise<boolean> {
  try {
    const result = await storage.validateInviteCode(code);
    return result.valid;
  } catch (error) {
    console.error('Error validating invite code:', error);
    return false;
  }
}

/**
 * Extract first name from Supabase user metadata
 */
function extractFirstName(userMetadata?: any): string | null {
  if (!userMetadata) return null;
  
  return userMetadata.first_name || 
         userMetadata.full_name?.split(' ')[0] || 
         null;
}

/**
 * Extract last name from Supabase user metadata
 */
function extractLastName(userMetadata?: any): string | null {
  if (!userMetadata) return null;
  
  return userMetadata.last_name || 
         userMetadata.full_name?.split(' ').slice(1).join(' ') || 
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
  const words = [
    'SWIFT', 'BRIGHT', 'STAR', 'MOON', 'WAVE', 'FIRE', 'BLUE', 'GOLD',
    'DREAM', 'MAGIC', 'STORM', 'LIGHT', 'PEACE', 'HOPE', 'BRAVE', 'WISE'
  ];
  
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  
  return `${word1}-${word2}-${digits}`;
}

/**
 * Check if user has admin privileges
 */
export async function checkAdminPrivileges(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUserByUsername(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    return false;
  }
}