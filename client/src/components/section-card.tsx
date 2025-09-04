import { Badge } from '@/components/ui/badge';
import { BookOpen, Star, Lock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import ModuleCard from './module-card';

interface Section {
  id: number;
  language: string;
  difficulty: string;
  order: number;
  title: string;
  description?: string;
  isFree: boolean;
  canAccess: boolean;
  modules: Module[];
}

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

interface SectionCardProps {
  section: Section;
  index: number;
}

export default function SectionCard({ section, index }: SectionCardProps) {
  // Calculate section progress
  const totalLessons = section.modules.reduce((total, module) => total + module.lessons.length, 0);
  const completedLessons = section.modules.reduce(
    (total, module) => total + module.lessons.filter(lesson => lesson.isCompleted).length, 
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  const isCompleted = progressPercent === 100;
  const hasStarted = completedLessons > 0;
  
  return (
    <>
      {/* Compact Section Divider - Duolingo Style */}
      <div className="relative flex items-center py-4 mb-4">
        <div className="flex-1 border-t border-spotify-border"></div>
        <div className={cn(
          "mx-4 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-3 shadow-lg",
          isCompleted 
            ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
            : hasStarted
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            : "bg-gradient-to-r from-spotify-green to-emerald-500 text-white"
        )}>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            {isCompleted ? (
              <BookOpen className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
          </div>
          
          <span className="uppercase tracking-wider">{section.title}</span>
          
          {hasStarted && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {progressPercent}%
            </span>
          )}
        </div>
        <div className="flex-1 border-t border-spotify-border"></div>
      </div>

      {/* Modules - Flat Layout */}
      <div className="space-y-6 my-2">
        {section.modules.map((module, moduleIndex) => (
          <ModuleCard
            key={module.id}
            module={module}
            index={moduleIndex}
          />
        ))}
      </div>
    </>
  );
}