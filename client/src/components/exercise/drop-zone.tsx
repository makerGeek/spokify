import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DropZoneProps {
  words: string[];
  onRemoveWord: (index: number) => void;
  isCorrect: boolean | null;
}

export function DropZone({
  words,
  onRemoveWord,
  isCorrect
}: DropZoneProps) {

  return (
    <div
      className={cn(
        "min-h-[80px] p-4 rounded-lg border-2 border-dashed transition-all duration-200",
        "flex flex-wrap items-center gap-2",
        // Default state
        words.length === 0 && !isCorrect && "border-[var(--spotify-border)] bg-[var(--spotify-light-gray)]/50",
        // Has words but not checked
        words.length > 0 && isCorrect === null && "border-[var(--spotify-green)] bg-[var(--spotify-green)]/5",
        // Correct answer
        isCorrect === true && "border-green-500 bg-green-500/10",
        // Wrong answer
        isCorrect === false && "border-red-500 bg-red-500/10"
      )}
    >
      {words.length === 0 ? (
        <div className="w-full text-center spotify-text-muted text-sm">
          Tap words to build your sentence
        </div>
      ) : (
        words.map((word, index) => (
          <div
            key={`${word}-${index}`}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all",
              "bg-[var(--spotify-green)]/20 border border-[var(--spotify-green)] text-[var(--spotify-green)]",
              "hover:bg-[var(--spotify-green)]/30",
              // Correct/incorrect styling
              isCorrect === true && "bg-green-500/20 border-green-500 text-green-400",
              isCorrect === false && "bg-red-500/20 border-red-500 text-red-400"
            )}
          >
            <span className="text-sm sm:text-base">{word}</span>
            {isCorrect === null && (
              <button
                onClick={() => onRemoveWord(index)}
                className="ml-1 p-1 rounded-full hover:bg-current hover:bg-opacity-20 transition-colors"
                aria-label={`Remove ${word}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}