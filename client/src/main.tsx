import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/spotify.css";

// Initialize YouTube Player API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    youTubeAPIReady: boolean;
  }
}

// Load YouTube IFrame API
function initializeYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    console.log('YouTube API already loaded');
    window.youTubeAPIReady = true;
    return;
  }

  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    console.log('YouTube API script already present, waiting for load...');
    return;
  }

  console.log('Loading YouTube API...');
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.async = true;
  document.head.appendChild(script);

  window.onYouTubeIframeAPIReady = () => {
    console.log('YouTube API ready - main.tsx');
    window.youTubeAPIReady = true;
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('youtubeAPIReady'));
    console.log('YouTube API ready event dispatched');
  };
}

// Initialize YouTube API immediately
initializeYouTubeAPI();

// Ensure root element has proper styling to prevent black screen
const rootElement = document.getElementById("root")!;
rootElement.style.backgroundColor = '#121212';
rootElement.style.minHeight = '100vh';

createRoot(rootElement).render(<App />);
