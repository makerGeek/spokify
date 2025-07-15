import { useEffect, useRef } from 'react';

interface UseMarqueeOptions {
  text: string;
  enabled?: boolean;
}

/**
 * Custom hook to handle marquee animation for overflowing text
 * Reused across song cards and vocabulary items
 */
export function useMarquee({ text, enabled = true }: UseMarqueeOptions) {
  const textRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const checkOverflow = () => {
      if (textRef.current && containerRef.current) {
        const isOverflowing = textRef.current.scrollWidth > containerRef.current.clientWidth;
        if (isOverflowing) {
          // Calculate animation duration based on text length
          // Base speed: ~50 pixels per second for consistent movement
          const textWidth = textRef.current.scrollWidth;
          const containerWidth = containerRef.current.clientWidth;
          const overflowDistance = textWidth - containerWidth;
          const scrollDuration = Math.max(3, overflowDistance / 50); // Minimum 3 seconds
          const totalDuration = scrollDuration + 4; // Add 4 seconds for pauses (2s start + 2s end)
          
          textRef.current.style.animationDuration = `${totalDuration}s`;
          textRef.current.classList.add('animate-marquee');
        } else {
          textRef.current.classList.remove('animate-marquee');
          textRef.current.style.animationDuration = '';
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, enabled]);

  return { textRef, containerRef };
}