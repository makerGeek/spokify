import { useContext } from "react";
import { AudioContext } from "@/hooks/use-audio";
import { AudioIOSContext } from "@/hooks/use-audio-ios";
import { isIOS } from "@/lib/device-utils";

// Create the iOS context (need to export it from use-audio-ios)
const useAudioUnified = () => {
  // Try iOS context first if on iOS
  if (isIOS()) {
    try {
      const iosContext = useContext(AudioIOSContext);
      if (iosContext !== undefined) {
        return iosContext;
      }
    } catch (error) {
      console.warn("iOS audio context not available, falling back to standard");
    }
  }
  
  // Fall back to standard audio context
  const standardContext = useContext(AudioContext);
  if (standardContext === undefined) {
    throw new Error("useAudio must be used within an AudioProvider or AudioIOSProvider");
  }
  
  return standardContext;
};

export default useAudioUnified;