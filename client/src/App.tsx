import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initializePWA } from "@/lib/pwa";
import { initGA, trackVisitorInfo, setupSessionTracking } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import { AudioProvider } from "@/hooks/use-audio";
import { AppStateProvider } from "@/contexts/app-state-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import SmartRedirect from "@/components/smart-redirect";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { ArtistPage } from "@/pages/artist";
import { AlbumPage } from "@/pages/album";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Library from "@/pages/library";
import Review from "@/pages/review";
import ReviewSession from "@/pages/review-session";
import ExerciseMatch from "@/pages/exercise-match";
import ExerciseWordBuilder from "@/pages/exercise-word-builder";
import ExerciseFillBlanks from "@/pages/exercise-fill-blanks";

import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";

import ServiceWorkerAdmin from "@/pages/service-worker-admin";
import PWADebug from "@/pages/pwa-debug";
import Subscribe from "@/pages/subscribe";
import SubscriptionConfirmation from "@/pages/subscription-confirmation";
import Checkout from "@/pages/checkout";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import DMCATakedown from "@/pages/dmca-takedown";
import ProtectedRoute from "@/components/protected-route";
import AuthenticatedOnly from "@/components/authenticated-only";
import BottomNavigation from "@/components/bottom-navigation";
import MiniPlayer from "@/components/mini-player";
import MiniPlayerIOS from "@/components/mini-player-ios";
import { isIOS } from "@/lib/device-utils";
import { type User } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { getAuthToken } from "@/lib/auth";
import { useAudio } from "@/hooks/use-audio";
import { AudioIOSProvider } from "@/hooks/use-audio-ios";

// Admin route component - authorization is handled by the APIs themselves
function AdminRoute() {
  return <Admin />;
}

function Router() {
  const [location] = useLocation();
  const { currentSong } = useAudio();
  
  // Track page views when routes change
  useAnalytics();
  
  // Determine current page for bottom navigation
  const getCurrentPage = () => {
    if (location === '/home') return 'home';
    if (location === '/search') return 'search';
    if (location === '/library') return 'library';
    if (location === '/review' || location === '/review-session') return 'review';
    if (location === '/profile') return 'profile';
    if (location.startsWith('/lyrics/')) return 'home'; // Lyrics player belongs to home flow
    return 'home';
  };

  // Check if we're on library page with saved songs tab
  const isLibrarySavedTab = location === '/library' && 
    (new URLSearchParams(window.location.search).get('tab') === 'saved' || 
     !new URLSearchParams(window.location.search).get('tab')); // Default to saved if no tab specified

  return (
    <div className="relative min-h-screen">
      <Switch>
        <Route path="/" component={SmartRedirect} />
        <Route path="/language-selection" component={LanguageSelection} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/home" component={Home} />
        <Route path="/search">
          <AuthenticatedOnly contextMessage="Login to search and discover new music to learn from">
            <SearchPage />
          </AuthenticatedOnly>
        </Route>
        <Route path="/artist/:artistId" component={ArtistPage} />
        <Route path="/album/:albumId" component={AlbumPage} />
        <Route path="/lyrics/:id" component={Home} />
        <Route path="/library">
          <AuthenticatedOnly contextMessage="Login to see your favorite songs and learned vocabulary">
            <Library />
          </AuthenticatedOnly>
        </Route>
        <Route path="/review">
          <AuthenticatedOnly contextMessage="Login to practice vocabulary with interactive quizzes">
            <Review />
          </AuthenticatedOnly>
        </Route>
        <Route path="/review-session">
          <AuthenticatedOnly contextMessage="Login to start vocabulary review session">
            <ReviewSession />
          </AuthenticatedOnly>
        </Route>
        <Route path="/exercise/match">
          <AuthenticatedOnly contextMessage="Login to play matching exercises">
            <ExerciseMatch />
          </AuthenticatedOnly>
        </Route>
        <Route path="/exercise/word-builder">
          <AuthenticatedOnly contextMessage="Login to play word building exercises">
            <ExerciseWordBuilder />
          </AuthenticatedOnly>
        </Route>
        <Route path="/exercise/fill-blanks">
          <AuthenticatedOnly contextMessage="Login to play fill-in-the-blanks exercises">
            <ExerciseFillBlanks />
          </AuthenticatedOnly>
        </Route>
        <Route path="/profile">
          <AuthenticatedOnly contextMessage="Login to view your learning progress and stats">
            <Profile />
          </AuthenticatedOnly>
        </Route>
        <Route path="/subscribe">
          <AuthenticatedOnly contextMessage="Login to upgrade to premium">
            <Subscribe />
          </AuthenticatedOnly>
        </Route>
        <Route path="/subscription-confirmation">
          <AuthenticatedOnly contextMessage="Login to confirm your subscription">
            <SubscriptionConfirmation />
          </AuthenticatedOnly>
        </Route>
        <Route path="/checkout">
          <AuthenticatedOnly contextMessage="Login to make a payment">
            <Checkout />
          </AuthenticatedOnly>
        </Route>
        <Route path="/song-offset" component={AdminRoute} />

        <Route path="/service-worker-admin" component={ServiceWorkerAdmin} />
        <Route path="/pwa-debug" component={PWADebug} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/dmca-takedown" component={DMCATakedown} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Mini Player - Visible on home, lyrics pages, and library saved songs tab */}
      {currentSong && (location === '/home' || location.startsWith('/lyrics/') || isLibrarySavedTab) && (
        !isIOS() && <MiniPlayer />
      )}
      
      {/* Bottom Navigation - visible on main app pages */}
      {location !== '/' && location !== '/language-selection' && location !== '/song-offset' && 
       location !== '/login' && location !== '/forgot-password' && location !== '/reset-password' && (
        <BottomNavigation currentPage={getCurrentPage()} />
      )}
    </div>
  );
}

function AppContent() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize PWA functionality
        initializePWA();
        
        // Initialize Google Analytics
        if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
          console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
        } else {
          initGA();
          
          // Setup enhanced analytics tracking
          setTimeout(() => {
            trackVisitorInfo();
            setupSessionTracking();
          }, 1000); // Delay to ensure GA is fully loaded
        }
        
        // Add small delay to ensure proper initialization in PWA mode
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsAppReady(true);
      } catch (error) {
        console.error('App initialization error:', error);
        // Still set ready to true to prevent permanent black screen
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while app initializes
  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-spotify-bg text-spotify-text flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4 mx-auto"></div>
          <p className="text-spotify-muted">Initializing Spokify...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-bg text-spotify-text">
      <Toaster />
      <Router />
    </div>
  );
}

function App() {
  const AudioProviderComponent = isIOS() ? AudioIOSProvider : AudioProvider;
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppStateProvider>
            <ErrorBoundary>
              <AudioProviderComponent>
                <AppContent />
              </AudioProviderComponent>
            </ErrorBoundary>
          </AppStateProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
