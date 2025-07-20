import { useQuery } from "@tanstack/react-query";
import { Music, User, Crown } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import GenreFilters from "@/components/genre-filters";
import SongCard from "@/components/song-card";
import MiniPlayer from "@/components/mini-player";
import LyricsOverlay from "@/components/lyrics-overlay";
import { AuthModal } from "@/components/auth-modal";
import ActivationModal from "@/components/activation-modal";
import { PremiumModal } from "@/components/premium-modal";
import FullscreenButton from "@/components/fullscreen-button";
import { useAudio } from "@/hooks/use-audio";
import { useAuth } from "@/contexts/auth-context";
import { useSongAccess } from "@/hooks/use-song-access";
import { usePremium } from "@/hooks/use-premium";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

const languageFlags = {
  es: "/flags/es.png",
  fr: "/flags/fr.png",
  de: "/flags/de.png",
  it: "/flags/it.png",
};

export default function Home() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const { currentSong } = useAudio();
  const { user, databaseUser } = useAuth();
  const { checkSongAccess } = useSongAccess();
  const { isPremium } = usePremium();
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricsId, setCurrentLyricsId] = useState<number>(0);

  // Query for specific song when accessing via URL
  const { data: urlSong } = useQuery<Song>({
    queryKey: ["/api/songs", params.id],
    queryFn: async () => {
      if (!params.id) throw new Error("No song ID provided");
      return api.songs.getById(parseInt(params.id));
    },
    enabled: !!params.id && location.startsWith("/lyrics/"),
  });

  // Check if we're on a lyrics route
  useEffect(() => {
    const isLyricsRoute = location.startsWith("/lyrics/");
    if (isLyricsRoute && params.id) {
      const songId = parseInt(params.id);
      setCurrentLyricsId(songId);

      // Check authentication for direct URL access
      if (urlSong) {
        const accessResult = checkSongAccess(urlSong);
        
        if (!accessResult.canAccess) {
          setSelectedSong(urlSong);
          
          if (accessResult.requiresAuth) {
            setShowAuthModal(true);
          } else if (accessResult.requiresActivation) {
            setShowActivationModal(true);
          } else if (accessResult.requiresPremium) {
            setShowPremiumModal(true);
          }
          
          // Redirect to home after a short delay
          setTimeout(() => {
            setLocation("/home");
          }, 100);
          return;
        }

        // Delay showing lyrics to ensure smooth animation from bottom
        setTimeout(() => {
          setShowLyrics(true);
        }, 50);
      }
    } else {
      setShowLyrics(false);
      setCurrentLyricsId(0);
    }
  }, [location, params.id, urlSong, checkSongAccess, setLocation]);

  // Get user preferences from localStorage
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}",
  );
  const {
    nativeLanguage = "en",
    targetLanguage = "es",
    level = "A1",
  } = userPreferences;

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
      return api.get(`/songs?${params}`);
    },
  });

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  const handleLanguageLevelClick = () => {
    console.log("🚩 Language flag clicked - navigating to language selection");
    setLocation("/language-selection");
  };

  const handleSongClick = (song: Song) => {
    const accessResult = checkSongAccess(song);
    
    if (!accessResult.canAccess) {
      setSelectedSong(song);
      
      if (accessResult.requiresAuth) {
        setShowAuthModal(true);
      } else if (accessResult.requiresActivation) {
        setShowActivationModal(true);
      } else if (accessResult.requiresPremium) {
        setShowPremiumModal(true);
      }
      return;
    }

    // User has access - navigate to lyrics
    setLocation(`/lyrics/${song.id}`);
  };

  const handleCloseLyrics = () => {
    setShowLyrics(false);
    // Delay clearing the lyrics ID to allow animation to complete
    setTimeout(() => {
      setCurrentLyricsId(0);
      setLocation("/home");
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg flex items-center justify-center">
        <div className="text-center">
          <Music
            className="text-spotify-green text-6xl mb-4 mx-auto animate-pulse"
            size={96}
          />
          <p className="text-spotify-muted">Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-spotify-bg ${currentSong ? "pb-32" : "pb-16"}`}
    >
      {/* Header */}
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

      {/* Genre Filters */}
      <GenreFilters
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />

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
                onClick={() => handleSongClick(song)}
                onPremiumRequested={(song) => {
                  setSelectedSong(song);
                  if (user) {
                    // User is authenticated but needs premium
                    setShowPremiumModal(true);
                  } else {
                    // User needs to authenticate first
                    setShowAuthModal(true);
                  }
                }}
                onActivationRequired={(song) => {
                  setSelectedSong(song);
                  setShowActivationModal(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mini Player */}
      {currentSong && <MiniPlayer />}

      {/* Auth Modal for Premium Songs */}
      {showAuthModal && selectedSong && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            setSelectedSong(null);
          }}
          customMessage={`Login to play "${selectedSong.title}"`}
        >
          <div></div>
        </AuthModal>
      )}

      {/* Activation Modal for Inactive Users */}
      {showActivationModal && selectedSong && (
        <ActivationModal
          isOpen={showActivationModal}
          onClose={() => {
            setShowActivationModal(false);
            setSelectedSong(null);
          }}
          onActivated={() => {
            // Refresh the page to reload user data
            window.location.reload();
          }}
          contextMessage={`To play "${selectedSong.title}", you need to activate your account with an invite code.`}
        />
      )}

      {/* Premium Modal for Premium Songs */}
      {showPremiumModal && selectedSong && (
        <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => {
            setShowPremiumModal(false);
            setSelectedSong(null);
          }}
          song={selectedSong}
        />
      )}

      {/* Lyrics Overlay */}
      {showLyrics && currentLyricsId > 0 && (
        <LyricsOverlay
          songId={currentLyricsId}
          onClose={handleCloseLyrics}
          isVisible={showLyrics}
        />
      )}
    </div>
  );
}
