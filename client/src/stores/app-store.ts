import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DatabaseUser } from '@shared/schema';

interface Song {
  id: number;
  title: string;
  artist: string;
  isFree: boolean;
}

interface AppState {
  // Authentication state
  user: DatabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Subscription state
  isPremium: boolean;
  subscriptionStatus: string | null;
  
  // Premium modal state
  showPremiumModal: boolean;
  premiumModalSong: Song | null;
  
  // Audio player state
  currentSong: Song | null;
  isPlaying: boolean;
  
  // Actions
  setUser: (user: DatabaseUser | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPremium: (isPremium: boolean) => void;
  setSubscriptionStatus: (status: string | null) => void;
  showPremiumModalFor: (song: Song) => void;
  hidePremiumModal: () => void;
  setCurrentSong: (song: Song | null) => void;
  setPlaying: (playing: boolean) => void;
  refreshUserData: () => Promise<void>;
}

const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isPremium: false,
    subscriptionStatus: null,
    showPremiumModal: false,
    premiumModalSong: null,
    currentSong: null,
    isPlaying: false,
    
    // Actions
    setUser: (user) => {
      const isPremium = user?.subscriptionStatus === 'active';
      set({ 
        user, 
        isAuthenticated: !!user,
        isPremium,
        subscriptionStatus: user?.subscriptionStatus || null
      });
    },
    
    setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setPremium: (isPremium) => set({ isPremium }),
    
    setSubscriptionStatus: (status) => {
      const isPremium = status === 'active';
      set({ subscriptionStatus: status, isPremium });
    },
    
    showPremiumModalFor: (song) => set({ 
      showPremiumModal: true, 
      premiumModalSong: song 
    }),
    
    hidePremiumModal: () => set({ 
      showPremiumModal: false, 
      premiumModalSong: null 
    }),
    
    setCurrentSong: (song) => set({ currentSong: song }),
    
    setPlaying: (playing) => set({ isPlaying: playing }),
    
    refreshUserData: async () => {
      const { setUser, setLoading } = get();
      setLoading(true);
      
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  }))
);

export default useAppStore;

// Simple selectors that return individual values to prevent object re-creation
export const useIsPremium = () => useAppStore((state) => state.isPremium);
export const useSubscriptionStatus = () => useAppStore((state) => state.subscriptionStatus);
export const useShowPremiumModal = () => useAppStore((state) => state.showPremiumModal);
export const usePremiumModalSong = () => useAppStore((state) => state.premiumModalSong);
export const useShowPremiumModalFor = () => useAppStore((state) => state.showPremiumModalFor);
export const useHidePremiumModal = () => useAppStore((state) => state.hidePremiumModal);

// Utility function for song access logic (outside of store to prevent re-renders)
export const canAccessSong = (song: Song, isPremium: boolean): boolean => {
  return song.isFree || isPremium;
};