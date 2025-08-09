import { cn } from "@/lib/utils";

interface WordTileProps {
  word: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

export function WordTile({
  word,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick
}: WordTileProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium",
        "bg-[var(--spotify-gray)] border-[var(--spotify-border)] spotify-text-primary",
        "hover:bg-[var(--spotify-border)] hover:border-[var(--spotify-light-gray)] hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-[var(--spotify-green)] focus:ring-opacity-50",
        "active:scale-95 cursor-grab",
        isDragging && "opacity-50 cursor-grabbing scale-110 shadow-lg",
        // Touch-friendly sizing
        "min-h-[44px] text-sm sm:text-base"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", word);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {word}
    </button>
  );
}