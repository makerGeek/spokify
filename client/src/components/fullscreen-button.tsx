import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWADetection } from "@/hooks/use-pwa-detection";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function FullscreenButton() {
  const { isInstalled, requestFullscreen } = usePWADetection();
  const { toast } = useToast();
  const [isCurrentlyFullscreen, setIsCurrentlyFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Only show if PWA is not installed (running in mobile browser)
  if (isInstalled) {
    return null;
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsCurrentlyFullscreen(isFullscreen);
    };

    // Add event listeners for all fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Check initial state
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = async () => {
    setIsLoading(true);
    
    try {
      if (isCurrentlyFullscreen) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } else {
        // Enter fullscreen
        const success = await requestFullscreen();
        if (!success) {
          toast({
            title: "Fullscreen Not Available",
            description: "Your browser doesn't support fullscreen or it's been disabled.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode. This may be due to browser restrictions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-8 h-8 bg-gradient-to-br from-spotify-green to-spotify-accent rounded-full p-0 border-0 text-black hover:text-gray-800 disabled:opacity-50"
      onClick={handleFullscreenToggle}
      disabled={isLoading}
      title={isCurrentlyFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
    >
      {isCurrentlyFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </Button>
  );
}