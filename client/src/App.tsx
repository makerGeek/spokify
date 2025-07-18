import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initializePWA } from "@/lib/pwa";
import { AudioProvider } from "@/hooks/use-audio";
import { AuthProvider } from "@/contexts/auth-context";
import { InviteProvider } from "@/contexts/invite-context";
import SmartRedirect from "@/components/smart-redirect";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
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
import AuthGuard from "@/components/auth-guard";
import BottomNavigation from "@/components/bottom-navigation";
import { type User } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { getAuthToken } from "@/lib/auth";
import { useFeatureFlag } from "@/hooks/use-feature-flags";

// Admin route component - authorization is handled by the APIs themselves
function AdminRoute() {
  return <Admin />;
}

function Router() {
  const [location] = useLocation();
  const { isEnabled: authGuardAllApp } = useFeatureFlag('AUTHGUARD_ALL_APP');
  
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

  // If AUTHGUARD_ALL_APP is enabled, wrap content routes in AuthGuard (but not login/admin pages)
  if (authGuardAllApp) {
    return (
      <div className="relative min-h-screen">
        <Switch>
          <Route path="/" component={SmartRedirect} />
          <Route path="/language-selection" component={LanguageSelection} />
          <Route path="/login" component={Login} />
          <Route path="/song-offset" component={AdminRoute} />
          <Route path="/invite-admin" component={InviteAdmin} />
          <Route path="/service-worker-admin" component={ServiceWorkerAdmin} />
          <Route>
            <AuthGuard>
              <Switch>
                <Route path="/home" component={Home} />
                <Route path="/search" component={SearchPage} />
                <Route path="/lyrics/:id" component={Home} />
                <Route path="/library" component={Library} />
                <Route path="/review" component={Review} />
                <Route path="/profile" component={Profile} />
                <Route component={NotFound} />
              </Switch>
            </AuthGuard>
          </Route>
        </Switch>
        
        {/* Bottom navigation - only show on main app pages */}
        {!['/language-selection', '/login', '/song-offset', '/invite-admin', '/service-worker-admin'].includes(location) && (
          <BottomNavigation currentPage={getCurrentPage()} />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Switch>
        <Route path="/" component={SmartRedirect} />
        <Route path="/language-selection" component={LanguageSelection} />
        <Route path="/login" component={Login} />
        <Route path="/home" component={Home} />
        <Route path="/search" component={SearchPage} />
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
        <Route path="/profile">
          <AuthenticatedOnly contextMessage="Login to view your learning progress and stats">
            <Profile />
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
