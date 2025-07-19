import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DatabaseUser, Song } from '@shared/schema';

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
    },

  }))
);

export default useAppStore;

// Convenience hooks for specific slices
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  setLoading: state.setLoading,
  refreshUserData: state.refreshUserData,
}));

export const useSubscription = () => {
  const isPremium = useAppStore((state) => state.isPremium);
  const subscriptionStatus = useAppStore((state) => state.subscriptionStatus);
  const setPremium = useAppStore((state) => state.setPremium);
  const setSubscriptionStatus = useAppStore((state) => state.setSubscriptionStatus);
  
  const canAccessSong = (song: Song) => {
    return song.isFree || isPremium;
  };
  
  return {
    isPremium,
    subscriptionStatus,
    setPremium,
    setSubscriptionStatus,
    canAccessSong,
  };
};

export const usePremiumModal = () => useAppStore((state) => ({
  showPremiumModal: state.showPremiumModal,
  premiumModalSong: state.premiumModalSong,
  showPremiumModalFor: state.showPremiumModalFor,
  hidePremiumModal: state.hidePremiumModal,
}));

export const useAudioPlayer = () => useAppStore((state) => ({
  currentSong: state.currentSong,
  isPlaying: state.isPlaying,
  setCurrentSong: state.setCurrentSong,
  setPlaying: state.setPlaying,
}));