import { MatchExercise } from "./match-exercise";
import { PreGeneratedReview } from "./pre-generated-review";
import { PreGeneratedWordBuilder } from "./pre-generated-word-builder";
import { PreGeneratedFillBlanks } from "./pre-generated-fill-blanks";
import { type PreGeneratedExercise, type ExerciseType } from "@/hooks/use-mix-session";

interface MixExerciseProps {
  exercise: PreGeneratedExercise;
  targetLanguage: string;
  onComplete: () => void;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export function MixExerciseComponent({ exercise, targetLanguage, onComplete, progress }: MixExerciseProps) {
  // Handle completion immediately without delay since exercises are pre-generated
  const handleExerciseComplete = () => {
    console.log('🎯 MIX EXERCISE: Exercise completed', {
      exerciseId: exercise.id,
      exerciseType: exercise.type,
      progress: progress
    });
    
    // Immediate completion for smooth experience
    onComplete();
  };

  const renderProgressBar = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm spotify-text-muted">Mixed Exercise Session</span>
        <span className="text-sm spotify-text-muted">{progress.current + 1}/{progress.total}</span>
      </div>
      <div className="w-full bg-[var(--spotify-light-gray)] rounded-full h-2">
        <div 
          className="bg-[var(--spotify-green)] h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
    </div>
  );

  const renderExercise = () => {
    switch (exercise.type) {
      case 'review':
        return (
          <div className="max-w-4xl mx-auto">
            {renderProgressBar()}
            <PreGeneratedReview 
              key={exercise.id} // Force new component instance for each exercise
              exerciseData={exercise.data}
              onComplete={handleExerciseComplete}
            />
          </div>
        );

      case 'match':
        return (
          <div className="max-w-4xl mx-auto">
            {renderProgressBar()}
            <PreGeneratedMatchExercise 
              key={exercise.id} // Force new component instance for each exercise
              exerciseData={exercise.data}
              targetLanguage={targetLanguage}
              onComplete={handleExerciseComplete}
            />
          </div>
        );

      case 'word-builder':
        return (
          <div className="max-w-4xl mx-auto">
            {renderProgressBar()}
            <PreGeneratedWordBuilder 
              key={exercise.id} // Force new component instance for each exercise
              exerciseData={exercise.data}
              targetLanguage={targetLanguage}
              onComplete={handleExerciseComplete}
            />
          </div>
        );

      case 'fill-blanks':
        return (
          <div className="max-w-4xl mx-auto">
            {renderProgressBar()}
            <PreGeneratedFillBlanks 
              key={exercise.id} // Force new component instance for each exercise
              exerciseData={exercise.data}
              targetLanguage={targetLanguage}
              onComplete={handleExerciseComplete}
            />
          </div>
        );

      default:
        return (
          <div className="max-w-4xl mx-auto text-center py-8">
            <div className="spotify-card p-8">
              <p className="spotify-text-muted">Unknown exercise type: {exercise.type}</p>
              <button 
                onClick={handleExerciseComplete}
                className="spotify-btn-primary mt-4"
              >
                Skip
              </button>
            </div>
          </div>
        );
    }
  };

  return renderExercise();
}

// Simplified pre-generated exercise components that work with pre-computed data

function PreGeneratedMatchExercise({ exerciseData, targetLanguage, onComplete }: any) {
  // Use the original match exercise but it will be much faster since vocabulary is pre-selected
  const vocabulary = exerciseData.leftColumn.map((left: any) => ({
    id: left.vocabId,
    word: left.word,
    translation: exerciseData.rightColumn.find((right: any) => right.vocabId === left.vocabId)?.translation
  }));
  
  return (
    <MatchExercise 
      vocabulary={vocabulary}
      targetLanguage={targetLanguage}
      mixMode={true}
      onMixComplete={onComplete}
    />
  );
}