import { useState, useEffect } from "react";
import { SearchIcon, Ear, FileText, Globe, Disc3, Save, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ImportStage = 'fetching' | 'listening' | 'transcribing' | 'translating' | 'finishing' | 'saving' | 'complete';

export interface ImportProgress {
  stage: ImportStage;
  startTime: number;
}

interface ImportProgressProps {
  itemKey: string;
  isImporting: boolean;
  onComplete?: () => void;
}

const getStageIcon = (stage: ImportStage) => {
  switch (stage) {
    case 'fetching':
      return <SearchIcon size={12} />;
    case 'listening':
      return <Ear size={12} />;
    case 'transcribing':
      return <FileText size={12} />;
    case 'translating':
      return <Globe size={12} />;
    case 'finishing':
      return <Disc3 size={12} />;
    case 'saving':
      return <Save size={12} />;
    case 'complete':
      return <CheckCircle size={12} />;
    default:
      return <Loader2 size={12} />;
  }
};

const getStageColor = (stage: ImportStage) => {
  switch (stage) {
    case 'fetching':
      return 'bg-blue-400 text-white';
    case 'listening':
      return 'bg-purple-400 text-white';
    case 'transcribing':
      return 'bg-orange-400 text-white';
    case 'translating':
      return 'bg-green-400 text-white';
    case 'finishing':
      return 'bg-indigo-400 text-white';
    case 'saving':
      return 'bg-spotify-green text-white';
    case 'complete':
      return 'bg-spotify-green text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

const getStageText = (stage: ImportStage) => {
  switch (stage) {
    case 'fetching':
      return 'Fetching...';
    case 'listening':
      return 'Listening...';
    case 'transcribing':
      return 'Transcribing...';
    case 'translating':
      return 'Translating...';
    case 'finishing':
      return 'Finishing...';
    case 'saving':
      return 'Saving...';
    case 'complete':
      return 'Complete!';
    default:
      return 'Processing...';
  }
};

export function ImportProgressBadge({ itemKey, isImporting, onComplete }: ImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  useEffect(() => {
    if (!isImporting) {
      setProgress(null);
      return;
    }

    const stages: ImportStage[] = ['fetching', 'listening', 'transcribing', 'translating', 'finishing', 'saving'];
    let currentStageIndex = 0;

    const progressInterval = setInterval(() => {
      if (currentStageIndex < stages.length) {
        setProgress({
          stage: stages[currentStageIndex],
          startTime: Date.now()
        });
        currentStageIndex++;
      } else {
        clearInterval(progressInterval);
      }
    }, 5000); // Change stage every 5 seconds

    return () => clearInterval(progressInterval);
  }, [isImporting]);

  const completeProgress = () => {
    setProgress({
      stage: 'complete',
      startTime: Date.now()
    });
    
    // Remove progress after a delay
    setTimeout(() => {
      setProgress(null);
      onComplete?.();
    }, 3000);
  };

  useEffect(() => {
    if (!isImporting && progress && progress.stage !== 'complete') {
      completeProgress();
    }
  }, [isImporting, progress]);

  if (!progress) return null;

  const isComplete = progress.stage === 'complete';
  const isGlowing = progress.stage === 'saving' || progress.stage === 'complete';
  const stageIndex = ['fetching', 'listening', 'transcribing', 'translating', 'finishing', 'saving', 'complete'].indexOf(progress.stage);
  const progressPercentage = isComplete ? 100 : (stageIndex / 6) * 100;

  return (
    <div className="space-y-2">
      <Badge 
        className={`${getStageColor(progress.stage)} progress-badge ${isGlowing ? 'glow' : ''} flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-300`}
      >
        {getStageIcon(progress.stage)}
        {getStageText(progress.stage)}
      </Badge>
      
      {/* Progress Bar */}
      <div className="w-full spotify-progress rounded-full h-1 overflow-hidden">
        <div 
          className={`h-full spotify-progress-fill transition-all duration-1000 ease-out relative ${isComplete ? 'progress-complete' : ''}`}
          style={{ width: `${progressPercentage}%` }}
        >
          {!isComplete && (
            <div className="absolute inset-0 progress-bar-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
} 