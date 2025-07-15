import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen bg-spotify-bg p-6 flex flex-col justify-center max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mb-6">
          <Music className="text-spotify-green text-6xl mb-4 mx-auto" size={96} />
          <h1 className="text-4xl font-bold circular-font spotify-green mb-2">LyricLingo</h1>
          <p className="text-spotify-muted text-lg">Learn languages through music</p>
        </div>
      </div>

      <Card className="bg-spotify-card border-spotify-card">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-center mb-6 text-spotify-text">
            What language would you like to learn?
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {targetLanguages.map((lang) => (
              <Button
                key={lang.code}
                className="h-20 bg-spotify-bg border-spotify-muted text-spotify-text hover:border-spotify-green hover:bg-spotify-card transition-all duration-200 flex flex-col items-center justify-center space-y-2"
                variant="outline"
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <img 
                  src={lang.flagImage} 
                  alt={`${lang.name} flag`}
                  className="w-8 h-6 object-cover rounded-sm"
                />
                <span className="text-sm font-medium">{lang.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
