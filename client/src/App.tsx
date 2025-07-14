import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initializePWA } from "@/lib/pwa";
import { AudioProvider } from "@/hooks/use-audio";
import LanguageSelection from "@/pages/language-selection";
import Home from "@/pages/home";
import LyricsPlayer from "@/pages/lyrics-player";
import Progress from "@/pages/progress";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LanguageSelection} />
      <Route path="/home" component={Home} />
      <Route path="/lyrics/:id" component={LyricsPlayer} />
      <Route path="/progress" component={Progress} />
      <Route path="/song-offset" component={Admin} />
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
        <AudioProvider>
          <div className="min-h-screen bg-spotify-bg text-spotify-text">
            <Toaster />
            <Router />
          </div>
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
