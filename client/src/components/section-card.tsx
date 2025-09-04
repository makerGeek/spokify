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
      {/* Section Header - Bold and Vivid */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg",
          isCompleted 
            ? "bg-gradient-to-br from-green-500 to-green-600 text-white" 
            : hasStarted
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : !section.canAccess
            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
            : "bg-gradient-to-br from-spotify-green to-emerald-500 text-white"
        )}>
          {isCompleted ? (
            <BookOpen className="w-7 h-7" />
          ) : !section.canAccess ? (
            <Lock className="w-6 h-6" />
          ) : (
            <Layers className="w-7 h-7" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-spotify-text">{section.title}</h2>
            
            {!section.isFree && (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Premium
              </Badge>
            )}
          </div>
          
          {section.description && (
            <p className="text-spotify-muted mt-1">{section.description}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm text-spotify-muted">
            <span className="font-medium">{section.modules.length} modules</span>
            <span>•</span>
            <span className="font-medium">{totalLessons} lessons</span>
            {hasStarted && (
              <>
                <span>•</span>
                <span className="text-spotify-green font-medium">{progressPercent}% complete</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Divider Line */}
      <hr className="border-spotify-border mb-8" />

      {/* Modules - Flat Layout */}
      <div className="space-y-6 mb-12">
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