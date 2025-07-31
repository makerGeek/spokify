import { Music, User, Crown } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/use-premium';
import FullscreenButton from '@/components/fullscreen-button';

const languageFlags = {
  es: "/flags/es.png",
  fr: "/flags/fr.png",
  de: "/flags/de.png",
  it: "/flags/it.png",
};

export default function AppHeader() {
  const [location, setLocation] = useLocation();
  const { isPremium } = usePremium();

  // Get user preferences for language flag
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}",
  );
  const {
    targetLanguage = "es",
  } = userPreferences;

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  const handleLanguageLevelClick = () => {
    console.log("🚩 Language flag clicked - navigating to language selection");
    setLocation("/language-selection");
  };

  return (
    <header className="bg-spotify-bg border-b border-spotify-card p-4 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          <Music className="text-spotify-green" size={24} />
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold circular-font">Spokify</h1>
            {isPremium && (
              <Crown 
                className="text-yellow-400" 
                size={20}
                fill="currentColor"
              />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-12 h-8 rounded-md overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("🚩 Flag div clicked", {
                targetLanguage,
                flagSrc:
                  languageFlags[targetLanguage as keyof typeof languageFlags],
              });
              handleLanguageLevelClick();
            }}
            onMouseDown={(e) => console.log("🚩 Flag mousedown")}
            onMouseUp={(e) => console.log("🚩 Flag mouseup")}
          >
            <img
              src={
                languageFlags[targetLanguage as keyof typeof languageFlags]
              }
              alt={`${targetLanguage} flag`}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
          <FullscreenButton />
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 bg-gradient-to-br from-spotify-green to-spotify-accent rounded-full p-0 border-0 text-black hover:text-gray-800"
            onClick={handleProfileClick}
          >
            <User size={14} />
          </Button>
        </div>
      </div>
    </header>
  );
}