import { useState } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BookOpen, Music, Star, Lock, CheckCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/subscription-context';

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

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  isLast: boolean;
}

const difficultyColors = {
  A1: 'bg-green-500',
  A2: 'bg-blue-500',
  B1: 'bg-yellow-500',
  B2: 'bg-orange-500',
  C1: 'bg-red-500',
  C2: 'bg-purple-500',
};

export default function LessonCard({ lesson, index, isLast }: LessonCardProps) {
  const [, setLocation] = useLocation();
  const { subscription } = useSubscription();
  
  // Check if user can access premium content
  const canAccessPremium = subscription.isPremium;
  
  // Check if lesson is premium and user doesn't have premium access
  const isPremiumBlocked = !lesson.isFree && !canAccessPremium;
  
  // First lesson should always be accessible
  // For other lessons, check if they're unlocked through progression OR if it's a premium lesson (show as premium, not locked)
  const isProgressionAccessible = lesson.canAccess && ((lesson.order === 1) || lesson.isUnlocked);
  const isAccessible = isProgressionAccessible && !isPremiumBlocked;
  
  // Alternate positions for zigzag pattern
  const isEven = index % 2 === 0;
  const position = isEven ? "items-end pr-4" : "items-start pl-4";
  
  return (
    <div className={`flex flex-col ${position} relative w-full`}>
      {/* Connecting path line */}
      {!isLast && (
        <div className="absolute top-24 w-full h-16 flex items-center justify-center z-0">
          <div className={cn(
            "w-full h-0.5 bg-gradient-to-r",
            isEven 
              ? "from-transparent via-spotify-border to-spotify-accent/30" 
              : "from-spotify-accent/30 via-spotify-border to-transparent"
          )} />
        </div>
      )}
      
      {/* Lesson Card Container */}
      <div className={`relative z-10 w-full flex ${isEven ? 'flex-row' : 'flex-row-reverse'} items-center gap-6`}>
        {/* Main Lesson Circle */}
        <div className="relative flex-shrink-0">
          <button
            className={cn(
              "lesson-icon cursor-pointer",
              lesson.isCompleted 
                ? "lesson-icon-completed" 
                : !lesson.isFree && !canAccessPremium
                ? "lesson-icon-premium"
                : !lesson.isFree && canAccessPremium
                ? "lesson-icon-accessible"
                : isProgressionAccessible
                ? "lesson-icon-accessible"  
                : "lesson-icon-locked cursor-not-allowed"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Lesson clicked:', lesson.id, 'isAccessible:', isAccessible, 'isProgressionAccessible:', isProgressionAccessible, 'isPremiumBlocked:', isPremiumBlocked);
              
              // Allow access if: progression allows it AND not premium blocked
              // OR if it's premium content and user has premium access
              const canClick = isAccessible || (!lesson.isFree && canAccessPremium);
              
              if (canClick) {
                console.log('Navigating to lesson:', lesson.id);
                setLocation(`/lesson/${lesson.id}`);
              } else {
                console.log('Lesson not accessible');
              }
            }}
          >
            {/* Background glow effect */}
            <div className="lesson-icon-glow" />
            
            {lesson.isCompleted ? (
              <CheckCircle className="w-10 h-10 text-white relative z-10" />
            ) : !lesson.isFree && !canAccessPremium ? (
              <Lock className="w-8 h-8 text-white relative z-10" />
            ) : lesson.songId ? (
              <Music className="w-8 h-8 text-white relative z-10" />
            ) : (
              <BookOpen className="w-8 h-8 text-white relative z-10" />
            )}
          </button>
          
          {/* Achievement crown for completed lessons */}
          {lesson.isCompleted && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Star className="w-5 h-5 text-yellow-800 fill-current" />
            </div>
          )}
          
          {/* Premium diamond */}
          {!lesson.isFree && !lesson.isCompleted && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center border-2 border-amber-200">
              <Star className="w-3 h-3 text-amber-800 fill-current" />
            </div>
          )}
          
          {/* Difficulty badge overlapping bottom of circle */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <Badge 
              className={cn(
                "text-xs px-2 py-0.5 shadow-lg",
                difficultyColors[lesson.difficulty as keyof typeof difficultyColors] || "bg-gray-500"
              )}
            >
              {lesson.difficulty}
            </Badge>
          </div>
        </div>
        
        {/* Lesson Info Card */}
        <div 
          className={cn(
            "p-4 rounded-xl shadow-lg border transition-all duration-200 backdrop-blur-sm flex-1 min-w-0",
            lesson.isCompleted 
              ? "bg-green-900/30 border-green-500/40 text-green-100"
              : !lesson.isFree && !canAccessPremium
              ? "bg-amber-900/30 border-amber-500/40 text-amber-100"
              : !lesson.isFree && canAccessPremium
              ? "bg-blue-900/30 border-blue-500/40 text-blue-100 cursor-pointer hover:bg-blue-900/40"
              : isProgressionAccessible
              ? "bg-blue-900/30 border-blue-500/40 text-blue-100 cursor-pointer hover:bg-blue-900/40"
              : "bg-gray-900/30 border-gray-500/40 text-gray-300"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Card clicked:', lesson.id, 'isAccessible:', isAccessible, 'isProgressionAccessible:', isProgressionAccessible, 'isPremiumBlocked:', isPremiumBlocked);
            
            // Allow access if: progression allows it AND not premium blocked
            // OR if it's premium content and user has premium access
            const canClick = isAccessible || (!lesson.isFree && canAccessPremium);
            
            if (canClick) {
              console.log('Navigating to lesson from card:', lesson.id);
              setLocation(`/lesson/${lesson.id}`);
            } else {
              console.log('Card click - Lesson not accessible');
            }
          }}
        >
          <div className="text-left">
            <h3 className="font-bold text-sm leading-tight mb-2">
              {lesson.title}
            </h3>
            
            {/* Song information */}
            {lesson.songId && (
              <div className="mb-2 p-2 rounded-lg bg-black/20 border border-white/10">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Music className="w-3 h-3" />
                  <span className="font-medium">Features a Song</span>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                </div>
                <p className="text-xs opacity-75 mt-1">Learn vocabulary through music</p>
              </div>
            )}
            
            {/* Vocabulary preview for all lessons */}
            {lesson.vocabulary.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold italic opacity-75">
                  {lesson.vocabulary.slice(0, 3).map(vocab => vocab.word).join(' • ')}
                  {lesson.vocabulary.length > 3 && ` • +${lesson.vocabulary.length - 3} words`}
                </div>
              </div>
            )}
            
            {/* Progress indicator */}
            {lesson.isCompleted ? (
              <div className="mt-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
                <div className="text-xs text-green-300 font-medium flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </div>
              </div>
            ) : !lesson.isFree && !canAccessPremium ? (
              <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30">
                <div className="text-xs text-amber-300 font-medium flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Premium
                </div>
              </div>
            ) : (!lesson.isFree && canAccessPremium) || isProgressionAccessible ? (
              <div className="mt-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
                <div className="text-xs text-blue-300 font-medium flex items-center justify-center gap-1">
                  <Play className="w-3 h-3" />
                  Start
                </div>
              </div>
            ) : (
              <div className="mt-2 px-3 py-1 rounded-full bg-gray-500/20 border border-gray-400/30">
                <div className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}