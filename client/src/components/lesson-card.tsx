import { useState } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BookOpen, Music, Star, Lock, CheckCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/subscription-context';

interface BaseItem {
  id: number;
  language: string;
  difficulty: string;
  order?: number;
  isFree: boolean;
  title: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  canAccess: boolean;
}

interface Lesson extends BaseItem {
  songId?: number;
  vocabulary: Array<{ word: string; translation: string }>;
}

interface Song extends BaseItem {
  artist: string;
  genre: string;
  albumCover?: string;
}

interface LessonCardProps {
  item: Lesson | Song;
  index: number;
  isLast: boolean;
  type?: 'lesson' | 'song';
}

const difficultyColors = {
  A1: 'bg-green-500',
  A2: 'bg-blue-500',
  B1: 'bg-yellow-500',
  B2: 'bg-orange-500',
  C1: 'bg-red-500',
  C2: 'bg-purple-500',
};

export default function LessonCard({ item, index, isLast, type = 'lesson' }: LessonCardProps) {
  const [, setLocation] = useLocation();
  const { subscription } = useSubscription();
  
  // Check if user can access premium content
  const canAccessPremium = subscription.isPremium;
  
  // Check if item is premium and user doesn't have premium access
  const isPremiumBlocked = !item.isFree && !canAccessPremium;
  
  // For items: First item should always be accessible + check progression
  // For songs: Always accessible if not premium blocked (no progression unlocking)
  const isProgressionAccessible = type === 'song' 
    ? true 
    : item.canAccess && ((item.order === 1) || item.isUnlocked);
  const isAccessible = isProgressionAccessible && !isPremiumBlocked;
  
  // Alternate positions for zigzag pattern
  const isEven = index % 2 === 0;
  const position = isEven ? "items-end pr-4" : "items-start pl-4";
  
  return (
    <div className={`flex flex-col ${position} relative w-full`}>

      
      {/* Lesson Card Container */}
      <div className={`relative z-10 w-full flex ${isEven ? 'flex-row' : 'flex-row-reverse'} items-center gap-6`}>
        {/* Main Lesson Circle */}
        <div className="relative flex-shrink-0">
          <button
            className={cn(
              "lesson-icon cursor-pointer",
              item.isCompleted 
                ? "lesson-icon-completed" 
                : !item.isFree && !canAccessPremium
                ? "lesson-icon-premium"
                : !item.isFree && canAccessPremium
                ? type === 'song' ? "lesson-icon-song" : "lesson-icon-accessible"
                : isProgressionAccessible
                ? type === 'song' ? "lesson-icon-song" : "lesson-icon-accessible"  
                : "lesson-icon-locked cursor-not-allowed"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log(`${type} clicked:`, item.id, 'isAccessible:', isAccessible, 'isProgressionAccessible:', isProgressionAccessible, 'isPremiumBlocked:', isPremiumBlocked);

              // Allow access if: progression allows it AND not premium blocked
              // OR if it's premium content and user has premium access
              const canClick = isAccessible || (!item.isFree && canAccessPremium);

              if (canClick) {
                const route = type === 'song' ? `/lyrics/${item.id}` : `/lesson/${item.id}`;
                console.log(`Navigating to ${type}:`, item.id, 'route:', route);
                setLocation(route);
              } else {
                console.log(`${type} not accessible`);
              }
            }}
          >
            {/* Background glow effect */}
            <div className="lesson-icon-glow" />

            {item.isCompleted ? (
              <CheckCircle className="w-10 h-10 text-white relative z-10" />
            ) : !item.isFree && !canAccessPremium ? (
              <Lock className="w-8 h-8 text-white relative z-10" />
            ) : type === 'song' ? (
              <Music className="w-8 h-8 text-white relative z-10" />
            ) : 'songId' in item && item.songId ? (
              <Music className="w-8 h-8 text-white relative z-10" />
            ) : (
              <BookOpen className="w-8 h-8 text-white relative z-10" />
            )}
          </button>

          {/* Achievement crown for completed items */}
          {item.isCompleted && (
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Star className="w-5 h-5 text-yellow-800 fill-current" />
            </div>
          )}

          {/* Premium diamond */}
          {!item.isFree && !item.isCompleted && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center border-2 border-amber-200">
              <Star className="w-3 h-3 text-amber-800 fill-current" />
            </div>
          )}

          {/* Difficulty badge overlapping bottom of circle */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <Badge
              className={cn(
                "text-xs px-2 py-0.5 shadow-lg",
                difficultyColors[item.difficulty as keyof typeof difficultyColors] || "bg-gray-500"
              )}
            >
              {item.difficulty}
            </Badge>
          </div>
        </div>

        {/* Item Info Card */}
        <div
          className={cn(
            "p-4 rounded-xl shadow-lg border transition-all duration-200 backdrop-blur-sm flex-1 min-w-0",
            item.isCompleted
              ? "bg-green-900/30 border-green-500/40 text-green-100"
              : !item.isFree && !canAccessPremium
              ? "bg-amber-900/30 border-amber-500/40 text-amber-100"
              : !item.isFree && canAccessPremium
              ? type === 'song'
                ? "bg-purple-900/30 border-purple-500/40 text-purple-100 cursor-pointer hover:bg-purple-900/40"
                : "bg-blue-900/30 border-blue-500/40 text-blue-100 cursor-pointer hover:bg-blue-900/40"
              : isProgressionAccessible
              ? type === 'song'
                ? "bg-purple-900/30 border-purple-500/40 text-purple-100 cursor-pointer hover:bg-purple-900/40"
                : "bg-blue-900/30 border-blue-500/40 text-blue-100 cursor-pointer hover:bg-blue-900/40"
              : "bg-gray-900/30 border-gray-500/40 text-gray-300"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Card clicked:', item.id, 'isAccessible:', isAccessible, 'isProgressionAccessible:', isProgressionAccessible, 'isPremiumBlocked:', isPremiumBlocked);

            // Allow access if: progression allows it AND not premium blocked
            // OR if it's premium content and user has premium access
            const canClick = isAccessible || (!item.isFree && canAccessPremium);

            if (canClick) {
              const route = type === 'song' ? `/lyrics/${item.id}` : `/lesson/${item.id}`;
              console.log('Navigating to item from card:', item.id, 'route:', route);
              setLocation(route);
            } else {
              console.log('Card click - Item not accessible');
            }
          }}
        >
          <div className="text-left">
            <h3 className="font-bold text-sm leading-tight mb-2">
              {item.title}
            </h3>

            {/* Song information for songs */}
            {type === 'song' && 'artist' in item && (
              <div className="mb-2">
                <p className="text-xs opacity-80 mb-1">by {item.artist}</p>

              </div>
            )}

            {/* Song information for lessons with songs */}
            {'songId' in item && item.songId && (
              <div className="mb-2 p-2 rounded-lg bg-black/20 border border-white/10">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Music className="w-3 h-3" />
                  <span className="font-medium">Features a Song</span>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                </div>
                <p className="text-xs opacity-75 mt-1">Learn vocabulary through music</p>
              </div>
            )}

            {/* Vocabulary preview for lessons */}
            {'vocabulary' in item && item.vocabulary.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold italic opacity-75">
                  {item.vocabulary.slice(0, 3).map(vocab => vocab.word).join(' • ')}
                  {item.vocabulary.length > 3 && ` • +${item.vocabulary.length - 3} words`}
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {item.isCompleted ? (
              <div className="mt-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
                <div className="text-xs text-green-300 font-medium flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </div>
              </div>
            ) : !item.isFree && !canAccessPremium ? (
              <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30">
                <div className="text-xs text-amber-300 font-medium flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Premium
                </div>
              </div>
            ) : (!item.isFree && canAccessPremium) || isProgressionAccessible ? (
              <div className={cn(
                "mt-2 px-3 py-1 rounded-full border",
                type === 'song'
                  ? "bg-purple-500/20 border-purple-400/30"
                  : "bg-blue-500/20 border-blue-400/30"
              )}>
                <div className={cn(
                  "text-xs font-medium flex items-center justify-center gap-1",
                  type === 'song' ? "text-purple-300" : "text-blue-300"
                )}>
                  <Play className="w-3 h-3" />
                  {type === 'song' ? 'Play Song' : 'Start'}
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