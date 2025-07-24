interface ReviewProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function ReviewProgress({ current, total, className = "" }: ReviewProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm spotify-text-muted">Progress</span>
        <span className="text-sm spotify-text-muted">{current}/{total}</span>
      </div>
      <div className="w-full bg-[var(--spotify-light-gray)] rounded-full h-2">
        <div 
          className="bg-[var(--spotify-green)] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}