import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/app-header';
import { api } from '@/lib/api-client';
import LessonCard from '@/components/lesson-card';

interface Lesson {
  id: number;
  language: string;
  difficulty: string;
  order: number;
  isFree: boolean;
  title: string;
  songId?: number;
  vocabulary: Array<{ word: string; translation: string }>;
  isCompleted: boolean;
  isUnlocked: boolean;
  canAccess: boolean;
}

interface LessonsPageProps {
  language?: string;
  difficulty?: string;
}


function LessonPath({ lessons }: { lessons: Lesson[] }) {
  return (
    <div className="relative min-h-screen">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient background overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-spotify-bg via-transparent to-spotify-bg/50 pointer-events-none" />
        
        {/* Decorative path background */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-spotify-green/10 via-transparent to-blue-500/10" />
        </div>
      </div>
      
      {/* Main lesson path */}
      <div className="relative z-10 w-full mx-auto px-6 py-12">
        <div className="space-y-12">
          {lessons.map((lesson, index) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={index}
              isLast={index === lessons.length - 1}
            />
          ))}
          
          {/* Coming soon teaser */}
          <div className="flex justify-center py-8">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-spotify-card/50 to-transparent border border-spotify-border/30 backdrop-blur-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center opacity-50">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-spotify-muted text-sm font-medium mb-2">More lessons coming soon!</h3>
              <p className="text-xs text-spotify-muted/70">Keep learning to unlock advanced content</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get user's language and level from stored preferences like other pages
  const userPreferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const selectedLanguage = userPreferences.targetLanguage || 'de';
  const selectedDifficulty = userPreferences.level || 'A1';

  const { data: lessons, isLoading, error } = useQuery({
    queryKey: ['lessons', selectedLanguage, selectedDifficulty],
    queryFn: async () => {
      return api.lessons.getAll(selectedLanguage, selectedDifficulty) as Promise<Lesson[]>;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Login Required</h2>
        <p className="text-spotify-muted text-center mb-6">
          Please login to access your personalized learning path
        </p>
        <Button onClick={() => setLocation('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load lessons. Please try again.",
    });
  }

  return (
    <div className="min-h-screen bg-spotify-bg">
      {/* Use the standard app header */}
      <AppHeader />

      {/* Main Content */}
      <div className="pb-20"> {/* Space for bottom navigation */}
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : lessons && lessons.length > 0 ? (
          <LessonPath lessons={lessons} />
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
            <h2 className="text-xl font-bold text-spotify-text mb-2">No Lessons Yet</h2>
            <p className="text-spotify-muted text-center">
              Lessons for {selectedLanguage.toUpperCase()} {selectedDifficulty} are coming soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}