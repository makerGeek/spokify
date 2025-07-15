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
    // Store simplified user preferences in localStorage
    localStorage.setItem("userPreferences", JSON.stringify({
      nativeLanguage: "en", // Default to English
      targetLanguage: languageCode,
      level: "A1" // Default level
    }));
    setLocation("/home");
  };

  return (
    <div className="min-h-screen spotify-bg p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-12">
          <Music className="text-spotify-green mx-auto mb-6" size={80} />
          <h1 className="spotify-heading-xl mb-4">LyricLingo</h1>
          <p className="spotify-text-secondary text-lg">Learn languages through music</p>
        </div>

        {/* Language Selection */}
        <div className="mb-8">
          <h2 className="spotify-heading-lg text-center mb-8">
            What language would you like to learn?
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {targetLanguages.map((lang) => (
              <button
                key={lang.code}
                className="spotify-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex flex-col items-center justify-center space-y-4"
                onClick={() => handleLanguageSelect(lang.code)}
                style={{
                  background: 'linear-gradient(145deg, var(--spotify-gray), var(--spotify-light-gray))',
                  border: '2px solid transparent',
                  minHeight: '140px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--spotify-green)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(29, 185, 84, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={lang.flagImage} 
                    alt={`${lang.name} flag`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="spotify-text-primary font-semibold text-lg">
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
