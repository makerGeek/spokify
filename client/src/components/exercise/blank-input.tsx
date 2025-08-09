import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface BlankInputProps {
  value: string;
  placeholder?: string;
  isCorrect: boolean | null;
  correctAnswer?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BlankInput({
  value,
  placeholder = "___",
  isCorrect,
  correctAnswer,
  onChange,
  disabled = false
}: BlankInputProps) {
  const [width, setWidth] = useState("60px");
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-resize input based on content
  useEffect(() => {
    if (measureRef.current) {
      const textToMeasure = value || placeholder || "____";
      measureRef.current.textContent = textToMeasure;
      const measuredWidth = measureRef.current.offsetWidth;
      setWidth(`${Math.max(60, measuredWidth + 20)}px`);
    }
  }, [value, placeholder]);

  return (
    <span className="relative inline-block mx-1">
      {/* Hidden span for measuring text width */}
      <span
        ref={measureRef}
        className="absolute invisible whitespace-nowrap text-lg font-medium"
        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
      />
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ width }}
        className={cn(
          "inline-block text-center text-lg font-medium rounded px-2 py-1",
          "border-2 border-dashed transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[var(--spotify-green)] focus:ring-opacity-50",
          "placeholder:text-[var(--spotify-light-gray)]",
          // Default state
          isCorrect === null && !disabled && "border-[var(--spotify-border)] bg-[var(--spotify-light-gray)] spotify-text-primary",
          isCorrect === null && !disabled && "hover:border-[var(--spotify-green)] hover:bg-[var(--spotify-green)]/5",
          // Correct state
          isCorrect === true && "border-green-500 bg-green-500/10 text-green-400",
          // Wrong state
          isCorrect === false && "border-red-500 bg-red-500/10 text-red-400",
          // Disabled state
          disabled && "cursor-not-allowed opacity-70"
        )}
      />
      
      {/* Show correct answer when wrong */}
      {isCorrect === false && correctAnswer && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10">
          <div className="px-2 py-1 bg-green-600 text-white text-sm rounded shadow-lg whitespace-nowrap">
            {correctAnswer}
          </div>
        </div>
      )}
    </span>
  );
}