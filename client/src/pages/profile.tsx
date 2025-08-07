import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import {
  LogOut,
  Trophy,
  Download,
  Smartphone,
  Crown,
  Copy,
  Settings,
  Gift,
  Mail,
  Send,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { type User, type Vocabulary, type UserProgress } from "@shared/schema";
import { getBuildVersion, getBuildInfo } from "@/lib/build-info";
import { api } from "@/lib/api-client";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useFeatureFlag } from "@/hooks/use-feature-flags";

export default function Profile() {
  const { user, databaseUser, signOut } = useAuth();
  const { subscription, upgradeToPreemium, manageBilling } = useSubscription();
  const { toast } = useToast();
  const { isEnabled: allowAppInstall } = useFeatureFlag('ALLOW_APP_INSTALL');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [autoNextReview, setAutoNextReview] = useState(() => {
    const saved = localStorage.getItem("reviewAutoNext");
    return saved ? JSON.parse(saved) : false;
  });

  // Contact form state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

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
    staleTime: 60 * 1000, // Cache for 1 minute to prevent rapid refetches
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: userData?.id ? ["/api/users", userData.id, "progress"] : [],
    queryFn: async () => {
      if (!userData?.id) return [];
      return api.users.getProgress(userData.id);
    },
    retry: false,
    enabled: !!userData?.id && !!user,
    staleTime: 60 * 1000, // Cache for 1 minute to prevent rapid refetches  
    refetchOnWindowFocus: false, // Don't refetch on window focus
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

  const handleUpgradeClick = async () => {
    if (!user) return;
    await upgradeToPreemium();
  };

  const handleManageBilling = async () => {
    if (!user) return;
    await manageBilling();
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast({
        title: "Required Fields",
        description: "Please fill in both subject and message.",
        variant: "destructive",
      });
      return;
    }

    if (contactSubject.length > 200) {
      toast({
        title: "Subject Too Long",
        description: "Subject must be less than 200 characters.",
        variant: "destructive",
      });
      return;
    }

    if (contactMessage.length > 2000) {
      toast({
        title: "Message Too Long",
        description: "Message must be less than 2000 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingContact(true);

    try {
      await api.contact.submit(contactSubject.trim(), contactMessage.trim());
      
      toast({
        title: "Message Sent!",
        description: "We've received your message and will get back to you soon.",
      });
      
      // Reset form
      setContactSubject("");
      setContactMessage("");
      setShowContactForm(false);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const wordsLearned = vocabulary.length;

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
              <span className="font-medium">
                {subscription.isPremium ? 'Premium' : 'Free'}
              </span>
              {subscription.isPremium && (
                <Crown className="h-4 w-4 text-[var(--spotify-green)]" />
              )}
            </div>
            {!subscription.isPremium && (
              <button 
                className="spotify-btn-primary px-6 py-2 flex items-center space-x-2 disabled:opacity-50"
                onClick={handleUpgradeClick}
                disabled={subscription.loading}
              >
                {subscription.loading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                <span>Upgrade</span>
              </button>
            )}
            {subscription.isPremium && (
              <button 
                className="spotify-btn-secondary px-6 py-2 flex items-center space-x-2"
                onClick={handleManageBilling}
              >
                <span>Manage Billing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="spotify-heading-lg mb-6">Your Progress</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="spotify-card-nohover p-6">
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
          </div>
        </div>



        {/* Install App Section - Hidden behind feature flag */}
        {allowAppInstall && (
          <div className="spotify-card-nohover p-6 mb-8">
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
        )}



        {/* Settings Section */}
        <div className="spotify-card-nohover p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-[var(--spotify-green)]" />
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

        {/* Contact Us Section */}
        <div className="spotify-card-nohover p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-[var(--spotify-green)]" />
              <div>
                <h3 className="spotify-heading-md">Contact Us</h3>
                <p className="spotify-text-secondary text-sm">
                  Get in touch with our team
                </p>
              </div>
            </div>
          </div>

          {!showContactForm ? (
            <Button
              className="spotify-btn-primary w-full"
              onClick={() => setShowContactForm(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send us a message
            </Button>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium spotify-text-primary mb-2">
                  Subject
                </label>
                <Input
                  id="subject"
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="What can we help you with?"
                  maxLength={200}
                  className="w-full bg-[var(--spotify-light-gray)] border-[var(--spotify-border)] spotify-text-primary"
                />
                <p className="text-xs spotify-text-muted mt-1">
                  {contactSubject.length}/200 characters
                </p>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium spotify-text-primary mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Tell us more about your question or feedback..."
                  maxLength={2000}
                  rows={5}
                  className="w-full bg-[var(--spotify-light-gray)] border-[var(--spotify-border)] spotify-text-primary resize-none"
                />
                <p className="text-xs spotify-text-muted mt-1">
                  {contactMessage.length}/2000 characters
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="spotify-btn-primary flex-1"
                >
                  {isSubmittingContact ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isSubmittingContact ? 'Sending...' : 'Send Message'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowContactForm(false);
                    setContactSubject("");
                    setContactMessage("");
                  }}
                  className="spotify-btn-secondary px-6"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Sign Out Section */}
        <div className="spotify-card-nohover p-6 mb-4">
          <button
            className="spotify-btn-secondary w-full !border-red-500/20 !text-red-400 hover:!bg-red-500/10 hover:!text-red-300"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Legal Links */}
        <div className="text-center pb-4">
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/terms-of-service" className="text-xs text-spotify-muted hover:text-spotify-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="text-xs text-spotify-muted hover:text-spotify-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center pb-4">
          <img
            src="/logo.png"
            alt="Spokify Logo"
            className="mx-auto"
            style={{ width: "40vw", maxWidth: "250px" }}
          />
        </div>
        {/* Build Version */}
        <div className="text-center pb-4">
          <p className="text-xs text-spotify-muted opacity-60">
            Build: {getBuildVersion()}
          </p>
        </div>
        {/* Made in France */}
        <div className="text-center pb-8">
          <p className="text-xs text-spotify-muted opacity-60">
            Made in France
          </p>
        </div>
      </div>
    </div>
  );
}
