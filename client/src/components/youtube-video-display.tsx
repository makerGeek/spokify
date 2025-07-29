import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubeVideoDisplayProps {
  containerId: string;
  isVisible: boolean;
  onClose: () => void;
  songTitle?: string;
}

export function YouTubeVideoDisplay({ containerId, isVisible, onClose, songTitle }: YouTubeVideoDisplayProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Move the YouTube player container into our component
      const container = document.getElementById(containerId);
      const displayContainer = document.getElementById('youtube-video-display');
      
      if (container && displayContainer) {
        // Move the YouTube iframe to our display component
        displayContainer.appendChild(container);
        container.style.display = 'block';
        setIsReady(true);
      }
    }
  }, [containerId, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-spotify-card rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-spotify-text">Now Playing</h3>
            {songTitle && (
              <p className="text-sm text-spotify-muted">{songTitle}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-spotify-muted hover:text-spotify-text"
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Video Container */}
        <div 
          id="youtube-video-display"
          className="relative w-full bg-black rounded-lg overflow-hidden"
          style={{ aspectRatio: '16/9' }}
        >
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center text-spotify-muted">
              Loading video...
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="mt-4 text-center">
          <p className="text-xs text-spotify-muted">
            Use the video controls above or the mini-player below to control playback
          </p>
        </div>
      </div>
    </div>
  );
}