import { cn } from "@/lib/utils";

interface MatchingCardProps {
  id: number;
  text: string;
  isSelected: boolean;
  isMatched: boolean;
  isWrongMatch: boolean;
  side: 'left' | 'right';
  onClick: () => void;
}

export function MatchingCard({
  id,
  text,
  isSelected,
  isMatched,
  isWrongMatch,
  side,
  onClick
}: MatchingCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMatched}
      className={cn(
        "w-full p-4 rounded-lg border-2 transition-all duration-200 text-left font-medium",
        "min-h-[60px] flex items-center justify-center text-center",
        // Base styles
        !isMatched && !isSelected && !isWrongMatch && "bg-[var(--spotify-gray)] border-[var(--spotify-border)] spotify-text-primary hover:bg-[var(--spotify-border)] hover:border-[var(--spotify-light-gray)]",
        // Selected state (normal green)
        !isMatched && isSelected && !isWrongMatch && "bg-[var(--spotify-green)]/20 border-[var(--spotify-green)] text-[var(--spotify-green)] scale-105 shadow-lg",
        // Wrong match state (red animation)
        !isMatched && isWrongMatch && "bg-red-600/20 border-red-500 text-red-400 scale-105 shadow-lg animate-pulse",
        // Matched state (permanent green)
        isMatched && "bg-green-600/20 border-green-500 text-green-400 opacity-80 cursor-default",
        // Hover effects
        !isMatched && !isWrongMatch && "transform hover:scale-102 hover:shadow-md",
        // Side-specific styling (optional)
        side === 'left' && "text-lg",
        side === 'right' && "text-lg"
      )}
    >
      <span className="leading-tight break-words">
        {text}
      </span>
    </button>
  );
}