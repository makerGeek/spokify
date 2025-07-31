import { useQuery } from "@tanstack/react-query";
import { Music, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

import GenreFilters from "@/components/genre-filters";
import SongCard from "@/components/song-card";
import { AuthModal } from "@/components/auth-modal";
import { PremiumModal } from "@/components/premium-modal";
import AppHeader from "@/components/app-header";
import LyricsOverlay from "@/components/lyrics-overlay";
import LyricsOverlayIOS from "@/components/lyrics-overlay-ios";
import { isIOS } from "@/lib/device-utils";
import { useAudio } from "@/hooks/use-audio";
import { useAuth } from "@/contexts/auth-context";
import { useSongAccess } from "@/hooks/use-song-access";
import { useFeatureFlag } from "@/hooks/use-feature-flags";
import { useSongsInfinite } from "@/hooks/use-songs-infinite";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

export default function Home() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const { currentSong } = useAudio();
  const { user, databaseUser } = useAuth();
  const { checkSongAccess } = useSongAccess();
  const { isEnabled: showGenreFilters } = useFeatureFlag('SHOW_GENRES_FILTERS');
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [lyricsSongId, setLyricsSongId] = useState<number | null>(null);

  // Check for access denied redirects from lyrics pages
  const [isFromLyricsRedirect, setIsFromLyricsRedirect] = useState(false);
  useEffect(() => {
    const accessDeniedData = sessionStorage.getItem('accessDeniedSong');
    if (accessDeniedData) {
      try {
        const { song, requiresAuth, requiresPremium } = JSON.parse(accessDeniedData);
        setSelectedSong(song);
        setIsFromLyricsRedirect(true);
        
        if (requiresAuth) {
          setShowAuthModal(true);
        } else if (requiresPremium) {
          setShowPremiumModal(true);
        }
        
        // Clear the sessionStorage data
        sessionStorage.removeItem('accessDeniedSong');
      } catch (error) {
        console.error('Error parsing accessDeniedData:', error);
        sessionStorage.removeItem('accessDeniedSong');
      }
    }
  }, []);

  // Listen for navigation events from lyrics overlay
  useEffect(() => {
    const handleNavigateToHome = () => {
      setLocation('/home');
    };

    window.addEventListener('navigateToHome', handleNavigateToHome);
    
    return () => {
      window.removeEventListener('navigateToHome', handleNavigateToHome);
    };
  }, [setLocation]);

  // Handle lyrics overlay visibility based on URL
  useEffect(() => {
    if (location.startsWith('/lyrics/')) {
      const songIdMatch = location.match(/\/lyrics\/(\d+)/);
      if (songIdMatch) {
        const songId = parseInt(songIdMatch[1]);
        setLyricsSongId(songId);
        setShowLyricsOverlay(true);
      }
    } else {
      setShowLyricsOverlay(false);
      setLyricsSongId(null);
    }
  }, [location]);



  // Get user preferences from localStorage for song filtering
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}",
  );
  const {
    targetLanguage = "es",
  } = userPreferences;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSongsInfinite({
    genre: showGenreFilters ? selectedGenre : undefined,
    language: targetLanguage,
    limit: 15
  });

  // Flatten all pages into a single array of songs
  const songs = useMemo(() => {
    if (!data?.pages) {
      return [];
    }
    return data.pages.flatMap(page => {
      // Handle both old format (array) and new format (object with songs property)
      let songsArray;
      if (Array.isArray(page)) {
        // Old format: page is directly an array of songs
        songsArray = page;
      } else if (page?.songs && Array.isArray(page.songs)) {
        // New format: page has songs property
        songsArray = page.songs;
      } else {
        console.error('Invalid page data:', page);
        return [];
      }
      return songsArray.filter(song => song && typeof song.id !== 'undefined');
    });
  }, [data]);

  // Set up infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


  const handleSongClick = (song: Song) => {
    const accessResult = checkSongAccess(song);
    
    if (!accessResult.canAccess) {
      setSelectedSong(song);
      
      if (accessResult.requiresAuth) {
        setShowAuthModal(true);
      } else if (accessResult.requiresPremium) {
        setShowPremiumModal(true);
      }
      return;
    }

    // User has access - navigate to lyrics
    setLocation(`/lyrics/${song.id}`);
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
      <AppHeader />

      {/* Genre Filters - conditionally rendered based on feature flag */}
      {showGenreFilters && (
        <GenreFilters
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />
      )}

      {/* Songs List */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4 circular-font">
            {!showGenreFilters || selectedGenre === "all" ? "All Songs" : `${selectedGenre} Songs`}
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
                  // No longer needed - all users are active
                  console.log("Activation no longer required");
                }}
              />
            ))}
            
            {/* Loading indicator for infinite scroll */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <div className="flex items-center space-x-2 text-spotify-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more songs...</span>
                </div>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasNextPage && songs.length > 0 && (
              <div className="flex justify-center py-8">
                <div className="text-spotify-muted text-sm">
                  You've reached the end! No more songs to load.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Auth Modal for Premium Songs */}
      {showAuthModal && selectedSong && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            setSelectedSong(null);
            setIsFromLyricsRedirect(false);
          }}
          customMessage={`Login to play "${selectedSong.title}"`}
          undismissible={isFromLyricsRedirect}
        >
          <div></div>
        </AuthModal>
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
      {showLyricsOverlay && lyricsSongId && (
        isIOS() ? (
          <LyricsOverlayIOS
            songId={lyricsSongId}
            isVisible={showLyricsOverlay}
            onClose={() => {
              setShowLyricsOverlay(false);
              setLyricsSongId(null);
              setLocation("/home");
            }}
          />
        ) : (
          <LyricsOverlay
            songId={lyricsSongId}
            isVisible={showLyricsOverlay}
            onClose={() => {
              setShowLyricsOverlay(false);
              setLyricsSongId(null);
              setLocation("/home");
            }}
          />
        )
      )}
    </div>
  );
}
