import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Music, BookOpen, Play, Star, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import AppHeader from '@/components/app-header';

interface Lesson {
  id: number;
  language: string;
  difficulty: string;
  order: number;
  isFree: boolean;
  title: string;
  songId?: number;
  vocabulary: Array<{ word: string; translation: string }>;
  canAccess: boolean;
}

const difficultyColors = {
  A1: 'bg-green-500',
  A2: 'bg-blue-500', 
  B1: 'bg-yellow-500',
  B2: 'bg-orange-500',
  C1: 'bg-red-500',
  C2: 'bg-purple-500',
};

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [score, setScore] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/lessons/${lessonId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Access denied');
        }
        throw new Error('Failed to fetch lesson');
      }
      
      return response.json() as Promise<Lesson>;
    },
    enabled: !!lessonId && !!user,
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (finalScore: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: finalScore }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete lesson');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Lesson Completed! 🎉",
        description: `You scored ${score}% and learned ${data.wordsLearned} new words!`,
      });
      
      // Invalidate lessons query to refresh progress
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setLocation('/lessons');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleStartLesson = () => {
    // For now, simulate lesson completion with a random score
    // In a real implementation, this would start the lesson flow
    setIsCompleting(true);
    
    // Simulate lesson completion after 2 seconds
    setTimeout(() => {
      const randomScore = Math.floor(Math.random() * 40) + 60; // 60-100%
      setScore(randomScore);
      completeLessonMutation.mutate(randomScore);
    }, 2000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Login Required</h2>
        <p className="text-spotify-muted text-center mb-6">
          Please login to access lessons
        </p>
        <Button onClick={() => setLocation('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg">
        <div className="sticky top-0 z-10 bg-spotify-bg/95 backdrop-blur border-b border-spotify-border">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/lessons')}
              className="text-spotify-text hover:bg-spotify-hover"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Lessons
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Lock className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Access Denied</h2>
        <p className="text-spotify-muted text-center mb-6">
          {error.message}
        </p>
        <Button onClick={() => setLocation('/lessons')}>
          Back to Lessons
        </Button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Lesson Not Found</h2>
        <Button onClick={() => setLocation('/lessons')}>
          Back to Lessons
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-bg">
      {/* Use standard app header */}
      <AppHeader />
      
      {/* Back button */}
      <div className="p-4 border-b border-spotify-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/lessons')}
          className="text-spotify-text hover:bg-spotify-hover -ml-2"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Lessons
        </Button>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20 space-y-6">
        {/* Lesson Header */}
        <div className="bg-spotify-card rounded-xl p-6">
          <div className="flex items-center gap-6">
            {/* Lesson Icon */}
            <div className="relative flex-shrink-0">
              <div className="lesson-icon lesson-icon-accessible">
                {/* Background glow effect */}
                <div className="lesson-icon-glow" />
                
                {lesson.songId ? (
                  <Music className="w-8 h-8 text-white relative z-10" />
                ) : (
                  <BookOpen className="w-8 h-8 text-white relative z-10" />
                )}
              </div>
            </div>
            
            {/* Lesson Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-spotify-text">{lesson.title}</h1>
                {!lesson.isFree && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-amber-400 fill-current" />
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">
                      Premium
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-spotify-muted">
                <span>Lesson {lesson.order}</span>
                <span>•</span>
                <span>{lesson.vocabulary.length} words</span>
                <span>•</span>
                <Badge 
                  className={cn(
                    "text-xs",
                    difficultyColors[lesson.difficulty as keyof typeof difficultyColors] || "bg-gray-500"
                  )}
                >
                  {lesson.difficulty}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Progress Simulation */}
        {isCompleting && (
          <Card className="bg-spotify-card border-spotify-border">
            <CardHeader>
              <CardTitle className="text-center text-spotify-text">Completing Lesson...</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={75} className="mb-2" />
              <p className="text-center text-sm text-spotify-muted">
                Processing your answers...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Vocabulary Preview */}
        <Card className="bg-spotify-card border-spotify-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-spotify-text">
              <BookOpen className="w-5 h-5 text-green-500" />
              Vocabulary You'll Learn
            </CardTitle>
            <CardDescription className="text-spotify-muted">
              Master these {lesson.vocabulary.length} words in this lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lesson.vocabulary.slice(0, 6).map((vocab, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-spotify-hover rounded-lg border border-spotify-border/50">
                  <span className="font-medium text-spotify-text text-lg">{vocab.word}</span>
                  <span className="text-spotify-muted">{vocab.translation}</span>
                </div>
              ))}
              {lesson.vocabulary.length > 6 && (
                <div className="text-center py-2">
                  <p className="text-spotify-muted text-sm">
                    +{lesson.vocabulary.length - 6} more words to discover...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Song Information */}
        {lesson.songId && (
          <Card className="bg-spotify-card border-spotify-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-spotify-text">
                <Music className="w-5 h-5 text-blue-500" />
                Featured Song
              </CardTitle>
              <CardDescription className="text-spotify-muted">
                Practice vocabulary through music
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-spotify-muted">
                This lesson includes a carefully selected song to help you learn the vocabulary in context.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Start Lesson Button */}
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleStartLesson}
            disabled={isCompleting || completeLessonMutation.isPending}
            className="w-full h-14 text-lg font-semibold bg-spotify-green hover:bg-green-600 text-black rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
          >
            {isCompleting || completeLessonMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <>
                <Play className="w-6 h-6 mr-2 fill-current" />
                Start Lesson
              </>
            )}
          </Button>
          
          <div className="text-center bg-spotify-card rounded-lg p-3 border border-spotify-border">
            <p className="text-sm text-spotify-muted">
              💡 Complete with <span className="font-semibold text-spotify-text">80% accuracy</span> to unlock the next lesson
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}