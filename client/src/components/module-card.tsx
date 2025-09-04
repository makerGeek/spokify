import { Badge } from '@/components/ui/badge';
import { BookOpen, Star, Lock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import LessonCard from './lesson-card';

interface Module {
  id: number;
  sectionId: number;
  order: number;
  title: string;
  description?: string;
  isFree: boolean;
  canAccess: boolean;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  moduleId: number;
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

interface ModuleCardProps {
  module: Module;
  index: number;
}

export default function ModuleCard({ module, index }: ModuleCardProps) {
  // Calculate module progress
  const totalLessons = module.lessons.length;
  const completedLessons = module.lessons.filter(lesson => lesson.isCompleted).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const isCompleted = progressPercent === 100;
  const hasStarted = completedLessons > 0;
  
  // Different background colors for each module
  const moduleColors = [
    'bg-gradient-to-br from-purple-100/10 to-purple-200/5', // Module 1 - Purple
    'bg-gradient-to-br from-blue-100/10 to-blue-200/5',     // Module 2 - Blue  
    'bg-gradient-to-br from-pink-100/10 to-pink-200/5',     // Module 3 - Pink
    'bg-gradient-to-br from-orange-100/10 to-orange-200/5', // Module 4 - Orange
    'bg-gradient-to-br from-cyan-100/10 to-cyan-200/5',     // Module 5 - Cyan
    'bg-gradient-to-br from-emerald-100/10 to-emerald-200/5', // Module 6 - Emerald
  ];
  
  const moduleColor = moduleColors[index % moduleColors.length];

  // Mock songs data for now - in real implementation, this would come from the API
  const getMockSongForLesson = (lessonIndex: number) => ({
    id: 1000 + (index * 10) + lessonIndex,
    title: lessonIndex === 0 ? "Hallo Welt" : "Deutschland Über Alles",
    artist: lessonIndex === 0 ? "Deutsche Musik" : "Klassik Band",
    genre: lessonIndex === 0 ? "pop" : "classical", 
    language: "de",
    difficulty: "A1",
    isFree: lessonIndex === 0,
    albumCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    isCompleted: false,
    isUnlocked: true,
    canAccess: true
  });
  
  return (
    <div className={cn("p-4 -m-4 rounded-lg", moduleColor)}>
      {/* Ultra-compact Module Header */}
      <div className="text-center py-2 pb-4">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-sm font-bold text-spotify-text uppercase tracking-wider">
            {module.title}
          </h3>
          
          {hasStarted && (
            <span className="text-xs bg-spotify-green/20 text-spotify-green px-2 py-0.5 rounded-full font-medium">
              {progressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Lessons and Songs - Keep vertical spacing */}
      <div className="space-y-6">
        {module.lessons.map((lesson, lessonIndex) => {
          const mockSong = getMockSongForLesson(lessonIndex);
          const isLastLesson = lessonIndex === module.lessons.length - 1;
          
          return (
            <div key={`lesson-${lesson.id}`}>
              {/* Lesson Card */}
              <LessonCard
                item={lesson}
                index={lessonIndex * 2} // Even indices for lessons
                isLast={false} // Never last since song follows
                type="lesson"
              />
              
              {/* Song Card after each lesson */}
              <div className="mt-6">
                <LessonCard
                  item={mockSong}
                  index={(lessonIndex * 2) + 1} // Odd indices for songs
                  isLast={isLastLesson} // Song is last if it's the last lesson's song
                  type="song"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}