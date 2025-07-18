import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWADetection } from "@/hooks/use-pwa-detection";

export default function FullscreenButton() {
  const { isInstalled, requestFullscreen } = usePWADetection();

  // Only show if PWA is not installed (running in mobile browser)
  if (isInstalled) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-8 h-8 bg-gradient-to-br from-spotify-green to-spotify-accent rounded-full p-0 border-0 text-black hover:text-gray-800"
      onClick={requestFullscreen}
      title="Go Fullscreen"
    >
      <Maximize2 size={14} />
    </Button>
  );
}