import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
];

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const [nativeLanguage, setNativeLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [level, setLevel] = useState("A1");

  const handleStartApp = () => {
    // Store user preferences in localStorage
    localStorage.setItem("userPreferences", JSON.stringify({
      nativeLanguage,
      targetLanguage,
      level
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
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-spotify-muted">I speak</label>
            <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
              <SelectTrigger className="w-full bg-spotify-bg border-spotify-muted text-spotify-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-spotify-card border-spotify-muted">
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-spotify-text hover:bg-spotify-bg">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-spotify-muted">I want to learn</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-full bg-spotify-bg border-spotify-muted text-spotify-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-spotify-card border-spotify-muted">
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-spotify-text hover:bg-spotify-bg">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-spotify-muted">My level</label>
            <div className="grid grid-cols-3 gap-2">
              {levels.map((lvl) => (
                <Button
                  key={lvl}
                  variant={level === lvl ? "default" : "outline"}
                  className={`${
                    level === lvl 
                      ? "difficulty-badge text-white" 
                      : "bg-spotify-bg border-spotify-muted text-spotify-text hover:border-spotify-green"
                  }`}
                  onClick={() => setLevel(lvl)}
                >
                  {lvl}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full bg-spotify-green text-white hover:bg-spotify-accent transition-colors py-6 text-lg font-medium"
            onClick={handleStartApp}
          >
            Start Learning
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
