import { useQuery } from "@tanstack/react-query";
import { Music, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/bottom-navigation";
import GenreFilters from "@/components/genre-filters";
import SongCard from "@/components/song-card";
import MiniPlayer from "@/components/mini-player";
import { useAudio } from "@/hooks/use-audio";
import { type Song } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { currentSong } = useAudio();
  const [selectedGenre, setSelectedGenre] = useState("all");

  // Get user preferences from localStorage
  const userPreferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const { nativeLanguage = "en", targetLanguage = "es", level = "A1" } = userPreferences;

  const { data: songs = [], isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs", selectedGenre, targetLanguage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedGenre !== "all") {
        params.append("genre", selectedGenre);
      }
      // Always filter by target language
      if (targetLanguage) {
        params.append("language", targetLanguage);
      }
      const response = await fetch(`/api/songs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch songs");
      return response.json();
    }
  });

  const handleProfileClick = () => {
    setLocation("/");
  };

  const handleSongClick = (songId: number) => {
    setLocation(`/lyrics/${songId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <Music className="text-spotify-green text-6xl mb-4 mx-auto animate-pulse" size={96} />
          <p className="text-spotify-muted">Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-bg pb-24">
      {/* Header */}
      <header className="bg-spotify-bg border-b border-spotify-card p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <Music className="text-spotify-green" size={24} />
            <h1 className="text-xl font-bold circular-font">LyricLingo</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Card className="bg-spotify-card border-spotify-card">
              <CardContent className="px-3 py-2 flex items-center space-x-2">
                <span className="text-xs text-spotify-muted">
                  {nativeLanguage.toUpperCase()} → {targetLanguage.toUpperCase()}
                </span>
                <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{level}</span>
                </div>
              </CardContent>
            </Card>
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-8 bg-gradient-to-br from-spotify-green to-spotify-accent rounded-full p-0 border-0"
              onClick={handleProfileClick}
            >
              <User size={14} />
            </Button>
          </div>
        </div>
      </header>

      {/* Genre Filters */}
      <GenreFilters selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />

      {/* Songs List */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4 circular-font">
            {selectedGenre === "all" ? "All Songs" : `${selectedGenre} Songs`}
          </h2>
          
          <div className="space-y-4">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => handleSongClick(song.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mini Player */}
      {currentSong && <MiniPlayer />}

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="home" />
    </div>
  );
}
