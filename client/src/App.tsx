import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initializePWA } from "@/lib/pwa";
import { AudioProvider } from "@/hooks/use-audio";
import { AuthProvider } from "@/contexts/auth-context";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
import LyricsPlayer from "@/pages/lyrics-player";

import Profile from "@/pages/profile";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";
import ProtectedRoute from "@/components/protected-route";
import { type User } from "@shared/schema";

function ProtectedAdminRoute() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false
  });

  useEffect(() => {
    if (!isLoading) {
      if (error || !user) {
        // User not authenticated, redirect to home
        setLocation("/");
        return;
      }

      if (!user.isAdmin) {
        // User authenticated but not admin, redirect to home
        setLocation("/home");
        return;
      }
    }
  }, [user, isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4"></div>
          <p className="text-spotify-muted">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !user.isAdmin) {
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
  return (
    <Switch>
      <Route path="/" component={LanguageSelection} />
      <Route path="/login" component={Login} />
      <Route path="/home" component={Home} />
      <Route path="/lyrics/:id" component={LyricsPlayer} />

      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/song-offset" component={ProtectedAdminRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initializePWA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AudioProvider>
            <div className="min-h-screen bg-spotify-bg text-spotify-text">
              <Toaster />
              <Router />
            </div>
          </AudioProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
