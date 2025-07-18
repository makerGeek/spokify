import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  LogOut,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Flame,
  Download,
  Smartphone,
  Crown,
  Users,
  Copy,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

import { type User, type Vocabulary, type UserProgress } from "@shared/schema";
import { getBuildVersion, getBuildInfo } from "@/lib/build-info";
import { api } from "@/lib/api-client";

export default function Profile() {
  const { user, databaseUser, signOut } = useAuth();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [autoNextReview, setAutoNextReview] = useState(() => {
    const saved = localStorage.getItem("reviewAutoNext");
    return saved ? JSON.parse(saved) : false;
  });

  // Use the user data from auth context instead of making another API call
  const userData = databaseUser;

  const { data: vocabulary = [] } = useQuery<Vocabulary[]>({
    queryKey: userData?.id ? ["/api/users", userData.id, "vocabulary"] : [],
    queryFn: async () => {
      if (!userData?.id) return [];
      return api.users.getVocabulary(userData.id);
    },
    retry: false,
    enabled: !!userData?.id && !!user,
  });

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: userData?.id ? ["/api/users", userData.id, "progress"] : [],
    queryFn: async () => {
      if (!userData?.id) return [];
      return api.users.getProgress(userData.id);
    },
    retry: false,
    enabled: !!userData?.id && !!user,
  });

  // PWA Install functionality
  useEffect(() => {
    console.log("Setting up install prompt listeners");

    const handleBeforeInstallPrompt = (e: any) => {
      console.log("beforeinstallprompt event received");
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      console.log("App installed event received");
      setDeferredPrompt(null);
      setCanInstall(false);
      toast({
        title: "App Installed!",
        description: "Spokify has been installed successfully.",
      });
    };

    // Check if we're in a compatible browser
    const isCompatible =
      "serviceWorker" in navigator && "PushManager" in window;
    console.log("PWA compatible browser:", isCompatible);

    // For development/testing, show install option even without prompt
    if (process.env.NODE_ENV === "development") {
      setCanInstall(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast]);

  const handleInstallApp = async () => {
    console.log("Install button clicked:", { deferredPrompt, canInstall });

    if (!deferredPrompt) {
      // Check if app is already installed
      if ("navigator" in window && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          toast({
            title: "App Installation",
            description:
              "The app may already be installed, or installation is not available in this browser.",
          });
        } else {
          toast({
            title: "Installation Not Available",
            description:
              "App installation is not available in this browser. Try using Chrome, Edge, or another supported browser.",
          });
        }
      }
      return;
    }

    try {
      console.log("Prompting install...");
      const result = await deferredPrompt.prompt();
      console.log("Install result:", result);

      if (result.outcome === "accepted") {
        toast({
          title: "Installing App...",
          description: "Spokify is being installed.",
        });
      } else {
        toast({
          title: "Installation Cancelled",
          description: "App installation was cancelled.",
        });
      }
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error("Install error:", error);
      toast({
        title: "Installation Failed",
        description: "Unable to install the app. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAutoNextToggle = (checked: boolean) => {
    setAutoNextReview(checked);
    localStorage.setItem("reviewAutoNext", JSON.stringify(checked));
    toast({
      title: "Setting Updated",
      description: `Auto next in vocabulary review is now ${checked ? "enabled" : "disabled"}.`,
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const wordsLearned = vocabulary.length;
  const songsCompleted = userProgress.filter(
    (p) => p.progressPercentage === 100,
  ).length;
  const weeklyGoal = userData?.weeklyGoal || 50;
  const streak = userData?.streak || 0;
  const weeklyProgress = Math.min((wordsLearned / weeklyGoal) * 100, 100);

  return (
    <div className="min-h-screen spotify-bg spotify-text-primary">
      {/* Header Section with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 spotify-gradient-header"></div>
        <div className="relative px-6 pt-16 pb-8">
          {/* Profile Header */}
          <div className="flex items-end space-x-6 mb-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-0 shadow-2xl">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl bg-[var(--spotify-light-gray)] spotify-text-primary font-bold border-0">
                  {user?.email ? getInitials(user.email) : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium spotify-text-secondary uppercase tracking-wide mb-2">
                Profile
              </p>
              <h1 className="spotify-heading-xl mb-4">
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "User"}
              </h1>
              <div className="flex items-center space-x-1 text-sm spotify-text-secondary">
                <span>{wordsLearned} words learned</span>
              </div>
            </div>
          </div>

          {/* Plan and Upgrade */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm spotify-text-secondary">
              <span>Current plan:</span>
              <span className="font-medium">Free</span>
            </div>
            <button className="spotify-btn-primary px-6 py-2 flex items-center space-x-2">
              <Crown className="h-4 w-4" />
              <span>Upgrade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="spotify-heading-lg mb-6">Your Progress</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="h-6 w-6 text-[var(--spotify-green)]" />
                <span className="text-3xl font-bold spotify-text-primary">
                  {wordsLearned}
                </span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">
                Words Learned
              </p>
            </div>

            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Flame className="h-6 w-6 text-[#ff6b35]" />
                <span className="text-3xl font-bold spotify-text-primary">
                  {streak}
                </span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">
                Day Streak
              </p>
            </div>

            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="h-6 w-6 text-[var(--spotify-green)]" />
                <span className="text-3xl font-bold spotify-text-primary">
                  {songsCompleted}
                </span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">
                Songs Completed
              </p>
            </div>

            <div className="spotify-card spotify-hover-lift p-6">
              <div className="flex items-center justify-between mb-3">
                <Clock className="h-6 w-6 text-[#8b5cf6]" />
                <span className="text-3xl font-bold spotify-text-primary">
                  15m
                </span>
              </div>
              <p className="spotify-text-secondary text-sm font-medium">
                Time Today
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Goal */}
        <div className="spotify-card spotify-hover-lift p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-[var(--spotify-green)]" />
              <h3 className="spotify-heading-md">Weekly Goal</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold spotify-text-primary">
                {wordsLearned}/{weeklyGoal}
              </p>
              <p className="spotify-text-secondary text-sm">words</p>
            </div>
          </div>
          <div className="mb-3">
            <div className="spotify-progress">
              <div
                className="spotify-progress-fill transition-all duration-500 ease-out"
                style={{ width: `${weeklyProgress}%` }}
              ></div>
            </div>
          </div>
          <p className="spotify-text-secondary text-sm">
            {weeklyGoal - wordsLearned > 0
              ? `${weeklyGoal - wordsLearned} more words to reach your goal`
              : "Goal achieved this week!"}
          </p>
        </div>

        {/* Install App Section */}
        <div className="spotify-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6 text-[var(--spotify-green)]" />
              <div>
                <h3 className="spotify-heading-md">Install App</h3>
                <p className="spotify-text-secondary text-sm">
                  Get the native app experience
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {canInstall ? (
              <button
                className="spotify-btn-primary w-full"
                onClick={handleInstallApp}
              >
                <Download className="mr-2 h-4 w-4" />
                Install Spokify
              </button>
            ) : (
              <div className="text-center p-4 bg-[var(--spotify-light-gray)] rounded-lg">
                <Smartphone className="h-8 w-8 text-[var(--spotify-green)] mx-auto mb-2" />
                <p className="spotify-text-secondary text-sm">
                  App installation is available in supported browsers
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Invite Friends Section */}
        {userData?.inviteCode && (
          <div className="spotify-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-[var(--spotify-green)]" />
                <div>
                  <h3 className="spotify-heading-md">Invite Friends</h3>
                  <p className="spotify-text-secondary text-sm">
                    Share your invite code to let friends join Spokify
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--spotify-light-gray)] rounded-lg">
                <div>
                  <p className="spotify-text-secondary text-sm mb-1">
                    Your invite code:
                  </p>
                  <code className="text-lg font-mono font-bold text-[var(--spotify-green)]">
                    {userData.inviteCode}
                  </code>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(userData.inviteCode);
                    toast({
                      title: "Copied!",
                      description: "Invite code copied to clipboard.",
                    });
                  }}
                  className="spotify-btn-secondary"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="text-center">
                <p className="spotify-text-muted text-sm">
                  Share this code with friends so they can join Spokify and
                  start learning languages through music!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="spotify-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-[var(--spotify-green)]" />
              <div>
                <h3 className="spotify-heading-md">Settings</h3>
                <p className="spotify-text-secondary text-sm">
                  Customize your learning experience
                </p>
              </div>
            </div>
          </div>

          {/* Auto Next Review Setting */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="spotify-text-primary font-medium">
                Auto Next in Review
              </h4>
              <p className="spotify-text-muted text-sm">
                Automatically move to next question after answering
              </p>
            </div>
            <Switch
              checked={autoNextReview}
              onCheckedChange={handleAutoNextToggle}
              className="data-[state=checked]:bg-[var(--spotify-green)]"
            />
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="spotify-card p-6 mb-4">
          <button
            className="spotify-btn-secondary w-full !border-red-500/20 !text-red-400 hover:!bg-red-500/10 hover:!text-red-300"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Logo Section */}
        <div className="text-center pb-6">
          <img 
            src="/logo.png" 
            alt="Spokify Logo" 
            className="h-12 w-auto mx-auto mb-3 opacity-60"
          />
          <p className="text-xs text-spotify-muted opacity-60">
            Build: {getBuildVersion()}
          </p>
        </div>
      </div>
    </div>
  );
}
