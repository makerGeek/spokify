import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initializePWA } from "@/lib/pwa";
import { AudioProvider } from "@/hooks/use-audio";
import { AppStateProvider } from "@/contexts/app-state-provider";
import SmartRedirect from "@/components/smart-redirect";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
import { SearchPage } from "@/pages/search";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import Library from "@/pages/library";
import Review from "@/pages/review";
import LyricsPlayer from "@/pages/lyrics-player";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";
import InviteAdmin from "@/pages/invite-admin";
import ServiceWorkerAdmin from "@/pages/service-worker-admin";
import Subscribe from "@/pages/subscribe";
import SubscriptionConfirmation from "@/pages/subscription-confirmation";
import Checkout from "@/pages/checkout";
import ProtectedRoute from "@/components/protected-route";
import AuthenticatedOnly from "@/components/authenticated-only";
import BottomNavigation from "@/components/bottom-navigation";
import { type User } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { getAuthToken } from "@/lib/auth";

// Admin route component - authorization is handled by the APIs themselves
function AdminRoute() {
  return <Admin />;
}

function Router() {
  const [location] = useLocation();
  
  // Determine current page for bottom navigation
  const getCurrentPage = () => {
    if (location === '/home') return 'home';
    if (location === '/search') return 'search';
    if (location === '/library') return 'library';
    if (location === '/review') return 'review';
    if (location === '/profile') return 'profile';
    if (location.startsWith('/lyrics/')) return 'home'; // Lyrics player belongs to home flow
    return 'home';
  };

  return (
    <div className="relative min-h-screen">
      <Switch>
        <Route path="/" component={SmartRedirect} />
        <Route path="/language-selection" component={LanguageSelection} />
        <Route path="/login" component={Login} />
        <Route path="/home" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/lyrics/:id" component={LyricsPlayer} />
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
        <Route path="/invite-admin" component={InviteAdmin} />
        <Route path="/service-worker-admin" component={ServiceWorkerAdmin} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Bottom Navigation - visible on main app pages */}
      {location !== '/' && location !== '/language-selection' && location !== '/song-offset' && (
        <BottomNavigation currentPage={getCurrentPage()} />
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    initializePWA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppStateProvider>
          <AudioProvider>
            <div className="min-h-screen bg-spotify-bg text-spotify-text">
              <Toaster />
              <Router />
            </div>
          </AudioProvider>
        </AppStateProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
