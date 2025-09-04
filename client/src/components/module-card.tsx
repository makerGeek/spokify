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
  const [expanded, setExpanded] = useState(true);
  
  const handleToggle = () => {
    setExpanded(!expanded);
  };
  
  // Calculate module progress
  const totalLessons = module.lessons.length;
  const completedLessons = module.lessons.filter(lesson => lesson.isCompleted).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const isCompleted = progressPercent === 100;
  const hasStarted = completedLessons > 0;
  
  return (
    <>
      {/* Module Header - Clean and Bold */}
      <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={handleToggle}>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shadow-md",
          isCompleted 
            ? "bg-gradient-to-br from-green-500 to-green-600 text-white" 
            : hasStarted
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : !module.canAccess
            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
            : "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
        )}>
          {isCompleted ? (
            <CheckCircle className="w-5 h-5" />
          ) : !module.canAccess ? (
            <Lock className="w-4 h-4" />
          ) : (
            <BookOpen className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-spotify-text">{module.title}</h3>
            
            {!module.isFree && (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Premium
              </Badge>
            )}
          </div>
          
          {module.description && (
            <p className="text-spotify-muted text-sm mt-1">{module.description}</p>
          )}
          
          <div className="flex items-center gap-3 mt-1 text-sm text-spotify-muted">
            <span className="font-medium">{totalLessons} lessons</span>
            {hasStarted && (
              <>
                <span>•</span>
                <span className="text-spotify-green font-medium">{progressPercent}% complete</span>
              </>
            )}
          </div>
        </div>

        {/* Toggle Icon */}
        <div className="ml-2">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-spotify-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-spotify-muted" />
          )}
        </div>
      </div>

      {/* Lessons - Flat Layout */}
      {expanded && (
        <div className="space-y-6 mb-8">
          {module.lessons.map((lesson, lessonIndex) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              isLast={lessonIndex === module.lessons.length - 1}
            />
          ))}
        </div>
      )}
    </>
  );
}