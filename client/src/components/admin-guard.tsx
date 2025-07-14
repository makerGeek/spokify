import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type User } from "@shared/schema";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
    retry: false
  });

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      // User not authenticated, redirect to login/home
      setLocation("/");
      return;
    }

    if (!isLoading && user && !user.isAdmin) {
      // User authenticated but not admin, redirect to home
      setLocation("/home");
      return;
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

  if (error || !user) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-spotify-muted">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-spotify-muted">Admin access required. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}