import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { ArrowLeft, Play, Disc3 } from "lucide-react";
import { useLocation } from "wouter";
import BottomNavigation from "../components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api-client";

interface SpotifyAlbum {
  type: 'album';
  id: string;
  name: string;
  artist: string;
  date: string;
  cover: string | null;
  shareUrl: string;
  artists: any[];
  totalTracks: number;
}

interface ArtistData {
  id: string;
  name: string;
  verified: boolean;
  avatar: string | null;
}

type AlbumType = 'album' | 'single';

export function ArtistPage() {
  const [, params] = useRoute("/artist/:artistId");
  const [, setLocation] = useLocation();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [activeAlbumType, setActiveAlbumType] = useState<AlbumType>('album');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const artistId = params?.artistId;

  useEffect(() => {
    if (artistId) {
      // Extract artist data from search state if available
      const searchResults = history.state?.artist;
      if (searchResults) {
        setArtist(searchResults);
      }
      
      fetchArtistAlbums(activeAlbumType);
    }
  }, [artistId, activeAlbumType]);

  const getYearFromDate = (dateString: string): string => {
    try {
      const year = new Date(dateString).getFullYear();
      return year.toString();
    } catch {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const fetchArtistAlbums = async (type: AlbumType) => {
    if (!artistId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.search.artistAlbums(artistId, type);
      if (response.success) {
        setAlbums(response.albums || []);
      } else {
        setError(response.error || 'Failed to fetch albums');
      }
    } catch (err: any) {
      console.error('Error fetching artist albums:', err);
      setError(err.response?.data?.error || 'Failed to fetch albums');
    } finally {
      setIsLoading(false);
    }
  };

  const albumTypes = [
    { key: 'album', label: 'Albums' },
    { key: 'single', label: 'Singles' }
  ] as const;

  if (!artistId) {
    return <div>Artist not found</div>;
  }

  return (
    <div className="min-h-screen spotify-bg">
      {/* Header */}
      <div className="sticky top-0 spotify-bg/95 backdrop-blur-sm border-b" style={{ borderColor: 'var(--spotify-border)' }}>
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="spotify-text-primary hover:spotify-text-secondary"
            >
              <ArrowLeft size={20} />
            </Button>
            
            {artist && (
              <div className="flex items-center space-x-3">
                <img
                  src={artist.avatar || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                  alt={artist.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h1 className="spotify-heading-sm">
                    {artist.name}
                  </h1>
                  <p className="text-xs spotify-text-muted">Artist</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Artist Hero Section */}
          {artist && (
            <div className="text-center mb-8 py-6">
              <img
                src={artist.avatar || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                alt={artist.name}
                className="w-48 h-48 rounded-full object-cover mx-auto mb-6 shadow-lg"
              />
              <h1 className="spotify-heading-xl mb-3">
                {artist.name}
              </h1>
              <p className="spotify-text-secondary">Artist</p>
            </div>
          )}

          {/* Album Type Tabs */}
          <div className="flex space-x-6 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--spotify-border)' }}>
            {albumTypes.map(type => (
              <button
                key={type.key}
                onClick={() => setActiveAlbumType(type.key)}
                className={`pb-3 px-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeAlbumType === type.key
                    ? 'spotify-text-primary' 
                    : 'spotify-text-muted hover:spotify-text-secondary'
                }`}
                style={{
                  borderBottomColor: activeAlbumType === type.key ? 'var(--spotify-green)' : 'transparent'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

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
              <p className="spotify-text-muted">Loading {activeAlbumType}s...</p>
            </div>
          )}

          {/* Albums Grid */}
          {!isLoading && albums.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {albums.map(album => (
                <Card 
                  key={album.id}
                  className="spotify-card spotify-hover-lift cursor-pointer p-4"
                  onClick={() => setLocation(`/album/${album.id}`, { 
                    state: { album } 
                  })}
                >
                  <CardContent className="p-0">
                    <img
                      src={album.cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                      alt={album.name}
                      className="w-full aspect-square rounded-lg object-cover mb-3 shadow-lg"
                    />
                    <h3 className="spotify-text-primary font-semibold truncate mb-1 text-sm">{album.name}</h3>
                    <p className="spotify-text-muted text-xs truncate mb-1">{getYearFromDate(album.date)}</p>
                    <p className="spotify-text-muted text-xs">
                      {album.totalTracks} {album.totalTracks === 1 ? 'track' : 'tracks'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && albums.length === 0 && !error && (
            <div className="text-center py-12">
              <Disc3 className="mx-auto mb-4 spotify-text-muted" size={48} />
              <h3 className="spotify-heading-md mb-2">No {activeAlbumType}s found</h3>
              <p className="spotify-text-muted">This artist doesn't have any {activeAlbumType}s available</p>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}