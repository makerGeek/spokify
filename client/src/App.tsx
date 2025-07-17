import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initializePWA } from "@/lib/pwa";
import { AudioProvider } from "@/hooks/use-audio";
import { AuthProvider } from "@/contexts/auth-context";
import { InviteProvider } from "@/contexts/invite-context";
import SmartRedirect from "@/components/smart-redirect";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
import LyricsPlayer from "@/pages/lyrics-player";
import { SearchPage } from "@/pages/search";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import Library from "@/pages/library";
import Review from "@/pages/review";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";
import InviteAdmin from "@/pages/invite-admin";
import ServiceWorkerAdmin from "@/pages/service-worker-admin";
import ProtectedRoute from "@/components/protected-route";
import AuthenticatedOnly from "@/components/authenticated-only";
import BottomNavigation from "@/components/bottom-navigation";
import { type User } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";

function ProtectedAdminRoute() {
  const [, setLocation] = useLocation();
  const { databaseUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!databaseUser) {
        // User not authenticated, redirect to home
        setLocation("/");
        return;
      }

      if (!databaseUser.isAdmin) {
        // User authenticated but not admin, redirect to home
        setLocation("/home");
        return;
      }
    }
  }, [databaseUser, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4"></div>
          <p className="text-spotify-muted">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!databaseUser || !databaseUser.isAdmin) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-spotify-muted">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

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
        <Route path="/song-offset" component={ProtectedAdminRoute} />
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
        <InviteProvider>
          <AuthProvider>
            <AudioProvider>
              <div className="min-h-screen bg-spotify-bg text-spotify-text">
                <Toaster />
                <Router />
              </div>
            </AudioProvider>
          </AuthProvider>
        </InviteProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
