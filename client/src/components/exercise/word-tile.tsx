import { cn } from "@/lib/utils";

interface WordTileProps {
  word: string;
  onClick: () => void;
  disabled?: boolean;
}

export function WordTile({
  word,
  onClick,
  disabled = false
}: WordTileProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium",
        "bg-[var(--spotify-gray)] border-[var(--spotify-border)] spotify-text-primary",
        "hover:bg-[var(--spotify-border)] hover:border-[var(--spotify-light-gray)] hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-[var(--spotify-green)] focus:ring-opacity-50",
        "active:scale-95 cursor-pointer",
        // Touch-friendly sizing
        "min-h-[44px] text-sm sm:text-base",
        // Disabled state
        disabled && "opacity-0 cursor-default pointer-events-none"
      )}
      draggable={false}
      onClick={onClick}
    >
      {word}
    </button>
  );
}