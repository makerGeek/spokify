import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { ArrowLeft, Play, Download, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import BottomNavigation from "../components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMarquee } from "@/hooks/use-marquee";
import { api } from "../lib/api-client";

interface SpotifyTrackResult {
  type: 'spotify';
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationText: string;
  albumCover: string | null;
  explicit: boolean;
  shareUrl: string;
  artists: any[];
}

interface AlbumData {
  id: string;
  name: string;
  artist: string;
  date: string;
  cover: string | null;
  totalTracks: number;
}

interface UnifiedResult {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  spotifyId?: string;
  youtubeId?: string;
  albumCover?: string | null;
  thumbnail?: string;
  explicit?: boolean;
  shareUrl?: string;
  channel?: string;
  views?: number;
  publishedTime?: string;
  badges?: string[];
  isLive?: boolean;
  confidence: number;
  primarySource: 'spotify' | 'youtube';
}

export function AlbumPage() {
  const [, params] = useRoute("/album/:albumId");
  const [, setLocation] = useLocation();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingItems, setImportingItems] = useState<Set<string>>(new Set());
  const [importedItems, setImportedItems] = useState<Map<string, number>>(new Map());
  const [importErrors, setImportErrors] = useState<Map<string, string>>(new Map());

  const albumId = params?.albumId;

  useEffect(() => {
    if (albumId) {
      // Extract album data from navigation state if available
      const albumData = history.state?.album;
      if (albumData) {
        setAlbum(albumData);
      }
      
      fetchAlbumTracks();
    }
  }, [albumId]);

  const getYearFromDate = (dateString: string): string => {
    try {
      const year = new Date(dateString).getFullYear();
      return year.toString();
    } catch {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const fetchAlbumTracks = async () => {
    if (!albumId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.search.albumTracks(albumId);
      if (response.success) {
        setTracks(response.tracks || []);
      } else {
        setError(response.error || 'Failed to fetch tracks');
      }
    } catch (err: any) {
      console.error('Error fetching album tracks:', err);
      setError(err.response?.data?.error || 'Failed to fetch tracks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSong = async (track: SpotifyTrackResult) => {
    const itemKey = track.id;
    
    if (importingItems.has(itemKey) || importedItems.has(itemKey)) {
      return;
    }

    setImportingItems(prev => new Set(prev).add(itemKey));
    setImportErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemKey);
      return newMap;
    });

    try {
      // Convert SpotifyTrackResult to format expected by import API
      const response = await api.import.spotifySong({
        spotifyId: track.id,
        title: track.title,
        artist: track.artist,
        albumCover: album?.cover || track.albumCover
      });
      
      if (response.success && response.song) {
        setImportedItems(prev => new Map(prev).set(itemKey, response.song.id));
        console.log('Song imported successfully:', response.song);
      } else {
        setImportErrors(prev => new Map(prev).set(itemKey, response.error || 'Import failed'));
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.error || 'Import failed';
      setImportErrors(prev => new Map(prev).set(itemKey, errorMessage));
    } finally {
      setImportingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const TrackCard = ({ track }: { track: SpotifyTrackResult }) => {
    const itemKey = track.id;
    const isImporting = importingItems.has(itemKey);
    const isImported = importedItems.has(itemKey);
    const songId = importedItems.get(itemKey);
    const hasError = importErrors.has(itemKey);
    const { textRef: titleRef, containerRef } = useMarquee({ text: track.title });

    return (
      <Card 
        className="song-card bg-spotify-card border-spotify-card cursor-pointer hover:bg-spotify-light-gray transition-colors p-3"
        onClick={() => {
          if (isImported && songId) {
            setLocation(`/lyrics/${songId}`);
          } else {
            handleImportSong(track);
          }
        }}
      >
        <CardContent className="p-0 flex items-center space-x-3 sm:space-x-4">
          <img
            src={album?.cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
            alt={track.title}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div ref={containerRef} className="overflow-hidden whitespace-nowrap relative flex items-center gap-2 flex-1 min-w-0">
                <h3 ref={titleRef} className="font-semibold text-spotify-text inline-block marquee-text text-sm sm:text-base">
                  {track.title}
                </h3>
                {track.explicit && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white bg-spotify-light-gray flex-shrink-0">
                    E
                  </span>
                )}
              </div>
            </div>
            <p className="text-spotify-muted text-xs sm:text-sm truncate">
              {track.artist}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-spotify-muted">
                {track.duration > 0 ? formatDuration(track.duration) : 'Duration unknown'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center flex-shrink-0">
            {renderActionButton(track, itemKey, isImporting, isImported, hasError, songId)}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderActionButton = (track: SpotifyTrackResult, itemKey: string, isImporting: boolean, isImported: boolean, hasError: boolean, songId?: number) => {
    if (isImported && songId) {
      return (
        <Button
          size="sm"
          className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
          onClick={(e) => {
            e.stopPropagation();
            setLocation(`/lyrics/${songId}`);
          }}
          title="Play song in Spokify"
        >
          <Play size={16} />
        </Button>
      );
    }
    
    if (hasError) {
      return (
        <Button
          size="sm"
          className="w-10 h-10 bg-red-500 rounded-full hover:bg-red-600 transition-colors p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleImportSong(track);
          }}
          title={`Error: ${importErrors.get(itemKey)}. Click to retry.`}
        >
          <AlertCircle size={16} />
        </Button>
      );
    }
    
    return (
      <Button
        size="sm"
        className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
        onClick={(e) => {
          e.stopPropagation();
          handleImportSong(track);
        }}
        disabled={isImporting}
        title={isImporting ? "Importing song..." : "Import to Spokify"}
      >
        {isImporting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
      </Button>
    );
  };

  if (!albumId) {
    return <div>Album not found</div>;
  }

  return (
    <div className="min-h-screen spotify-bg">
      {/* Header */}
      <div className="sticky top-0 spotify-bg/95 backdrop-blur-sm border-b z-10" style={{ borderColor: 'var(--spotify-border)' }}>
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="spotify-text-primary hover:spotify-text-secondary flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
            
            {album && (
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <img
                  src={album.cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                  alt={album.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="spotify-heading-sm truncate">{album.name}</h1>
                  <p className="text-xs spotify-text-muted truncate">{album.artist}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Album Hero Section */}
          {album && (
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 mb-8 p-4 md:p-6 spotify-card rounded-lg">
              <img
                src={album.cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                alt={album.name}
                className="w-32 h-32 md:w-48 md:h-48 rounded-lg object-cover shadow-lg spotify-hover-lift"
              />
              <div className="flex-1 text-center md:text-left md:pt-4">
                <p className="text-xs spotify-text-muted mb-2 uppercase tracking-wider">ALBUM</p>
                <h1 className="spotify-heading-md md:spotify-heading-xl mb-4 break-words">{album.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm spotify-text-muted">
                  <span className="font-medium spotify-text-primary">{album.artist}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{getYearFromDate(album.date)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{album.totalTracks} {album.totalTracks === 1 ? 'song' : 'songs'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="spotify-card p-4 mb-6" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <p className="spotify-text-primary">❌ {error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="spotify-loading mb-4"></div>
              <p className="spotify-text-muted">Loading tracks...</p>
            </div>
          )}

          {/* Tracks List */}
          {!isLoading && tracks.length > 0 && (
            <div className="space-y-2">
              {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && tracks.length === 0 && !error && (
            <div className="text-center py-12">
              <h3 className="spotify-heading-md mb-2">No tracks found</h3>
              <p className="spotify-text-muted">This album doesn't have any tracks available</p>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}