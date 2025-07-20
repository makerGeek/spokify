import { useState } from "react";
import { useLocation } from "wouter";
import { Music } from "lucide-react";

const targetLanguages = [
  { code: "es", name: "Spanish", flagImage: "/flags/es.png" },
  { code: "fr", name: "French", flagImage: "/flags/fr.png" },
  { code: "de", name: "German", flagImage: "/flags/de.png" },
  { code: "it", name: "Italian", flagImage: "/flags/it.png" },
];

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const handleLanguageSelect = (languageCode: string) => {
    // Store language preferences in localStorage (both individual keys and userPreferences for compatibility)
    localStorage.setItem("nativeLanguage", "en");
    localStorage.setItem("targetLanguage", languageCode);
    localStorage.setItem("userPreferences", JSON.stringify({
      nativeLanguage: "en", // Default to English
      targetLanguage: languageCode,
      level: "A1" // Default level
    }));
    setLocation("/home");
  };

  return (
    <div className="min-h-screen bg-spotify-bg p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-12">
          <Music className="text-spotify-green mx-auto mb-6" size={80} />
          <h1 className="text-4xl font-bold text-spotify-text mb-4">Spokify</h1>
          <p className="text-spotify-muted text-lg">Learn languages through music</p>
        </div>

        {/* Language Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-spotify-text text-center mb-8">
            What language would you like to learn?
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {targetLanguages.map((lang) => (
              <button
                key={lang.code}
                className="cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex flex-col items-center justify-center space-y-3 p-2"
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <div className="w-28 h-20 rounded-md overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-green-500/20">
                  <img 
                    src={lang.flagImage} 
                    alt={`${lang.name} flag`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-spotify-text font-semibold text-xl hover:text-spotify-green transition-colors duration-300">
                  {lang.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
