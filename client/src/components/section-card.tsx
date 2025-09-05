import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Star, Lock, Layers, ChevronDown, ChevronUp } from 'lucide-react';
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
  // State for collapsible functionality
  const [isExpanded, setIsExpanded] = useState(true);
  
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
      {/* Clickable Section Header - Duolingo Style */}
      <div className="relative flex items-center py-4 mb-4">
        <div className="flex-1 border-t border-spotify-border"></div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mx-4 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-3 shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer",
            isCompleted 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500" 
              : hasStarted
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500"
              : "bg-gradient-to-r from-spotify-green to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400"
          )}
        >
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
          
          {/* Collapse/Expand Icon */}
          <div className="ml-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            )}
          </div>
        </button>
        <div className="flex-1 border-t border-spotify-border"></div>
      </div>

      {/* Collapsible Modules with Animation */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-6 my-2">
          {section.modules.map((module, moduleIndex) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={moduleIndex}
            />
          ))}
        </div>
      </div>
    </>
  );
}