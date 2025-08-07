import { useState, useCallback, useEffect } from "react";
import { Search as SearchIcon, Music, Loader2, Download, Play, AlertCircle, User, Disc3 } from "lucide-react";
import BottomNavigation from "../components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api-client";
import { useDebounce } from "../hooks/use-debounce";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  songId?: number; // Database song ID if exists
  available?: boolean; // True if song exists in our database
}

interface SpotifyArtist {
  type: 'artist';
  id: string;
  name: string;
  verified: boolean;
  avatar: string | null;
  shareUrl: string;
}

interface SpotifyAlbum {
  type: 'album';
  id: string;
  name: string;
  artist: string;
  date: string;
  cover: string | null;
  shareUrl: string;
  artists: any[];
}

interface ComprehensiveSearchResults {
  tracks: UnifiedResult[];
  albums: SpotifyAlbum[];
  artists: SpotifyArtist[];
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
}

type TabType = 'all' | 'tracks' | 'artists' | 'albums';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ComprehensiveSearchResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingItems, setImportingItems] = useState<Set<string>>(new Set());
  const [importedItems, setImportedItems] = useState<Map<string, number>>(new Map()); // Store item key -> song ID
  const [importErrors, setImportErrors] = useState<Map<string, string>>(new Map());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const debouncedQuery = useDebounce(query, 500);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.search.comprehensive(searchQuery.trim());
      if (response.success) {
        // Debug logging
        console.log('Search results:', response);
        console.log('Artists with verification status:', response.artists?.map((a: any) => ({ name: a.name, verified: a.verified })));
        
        setSearchResults({
          tracks: response.tracks || [],
          albums: response.albums || [],
          artists: response.artists || [],
          totalTracks: response.totalTracks || 0,
          totalAlbums: response.totalAlbums || 0,
          totalArtists: response.totalArtists || 0
        });
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults(null);
    }
  }, [debouncedQuery, performSearch]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(0)}K views`;
    }
    return `${views} views`;
  };

  const getYearFromDate = (dateString: string): string => {
    try {
      const year = new Date(dateString).getFullYear();
      return year.toString();
    } catch {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const handleImportSong = async (item: UnifiedResult) => {
    // Create a unique key for this result
    const itemKey = item.spotifyId || item.youtubeId || `${item.title}-${item.artist}`;
    
    // Don't import if already importing or imported
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
      // Use Spotify data - the service will find the best YouTube match
      const response = await api.import.spotifySong({
        spotifyId: item.spotifyId!,
        title: item.title,
        artist: item.artist,
        albumCover: item.albumCover
      });
      
      if (response.success && response.song) {
        setImportedItems(prev => new Map(prev).set(itemKey, response.song.id));
        console.log('Song imported successfully:', response.song);
      } else {
        const errorMessage = response.error || 'Import failed';
        setImportErrors(prev => new Map(prev).set(itemKey, errorMessage));
        
        // Show toast for specific "No lyrics found" error
        if (errorMessage === 'No lyrics found for this track') {
          toast({
            title: "No Lyrics Available",
            description: `"${item.title}" by ${item.artist} doesn't have lyrics available on Spokify.`,
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.error || 'Import failed';
      setImportErrors(prev => new Map(prev).set(itemKey, errorMessage));
      
      // Show toast for specific "No lyrics found" error from API
      if (errorMessage === 'No lyrics found for this track') {
        toast({
          title: "No Lyrics Available",
          description: `"${item.title}" by ${item.artist} doesn't have lyrics available on Spokify.`,
          variant: "destructive"
        });
      }
    } finally {
      setImportingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const renderTrackCard = (item: UnifiedResult, isLarge: boolean = false) => {
    const itemKey = item.spotifyId || item.youtubeId || `${item.title}-${item.artist}`;
    const isImporting = importingItems.has(itemKey);
    const isImported = importedItems.has(itemKey);
    const songId = importedItems.get(itemKey);
    const hasError = importErrors.has(itemKey);

    return (
      <Card 
        className={`song-card bg-spotify-card border-spotify-card cursor-pointer hover:bg-spotify-light-gray transition-colors ${isLarge ? 'p-6' : 'p-3'}`}
        onClick={() => {
          if (item.available && item.songId) {
            setLocation(`/lyrics/${item.songId}`);
          } else if (isImported && songId) {
            setLocation(`/lyrics/${songId}`);
          } else {
            handleImportSong(item);
          }
        }}
      >
        <CardContent className={`p-0 flex items-center space-x-4 ${isLarge ? 'flex-col space-x-0 space-y-4 text-center' : ''}`}>
          <img
            src={
              item.albumCover || 
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"
            }
            alt={item.album || item.title}
            className={`rounded-lg object-cover ${isLarge ? 'w-20 h-20' : 'w-12 h-12'}`}
          />
          
          <div className={`flex-1 min-w-0 ${isLarge ? 'text-center' : ''}`}>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-spotify-text truncate ${isLarge ? 'text-xl' : 'text-base'}`}>
                {item.title}
              </h3>
              {item.explicit && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white bg-spotify-light-gray">
                  E
                </span>
              )}
            </div>
            <p className="text-spotify-muted text-sm truncate">
              {item.artist}
              {item.album && ` • ${item.album}`}
            </p>
            
            {!isLarge && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-spotify-muted">
                  {item.duration > 0 ? formatDuration(item.duration) : 'Duration unknown'}
                </span>
              </div>
            )}
            
            {isLarge && (
              <div className="flex items-center justify-center mt-4">
                {renderActionButton(item, itemKey, isImporting, isImported, hasError, songId)}
              </div>
            )}
          </div>
          
          {!isLarge && (
            <div className="flex items-center">
              {renderActionButton(item, itemKey, isImporting, isImported, hasError, songId)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderArtistCard = (artist: SpotifyArtist) => (
    <Card 
      className="bg-spotify-card border-spotify-card hover:bg-spotify-light-gray transition-colors cursor-pointer p-4"
      onClick={() => setLocation(`/artist/${artist.id}`, { state: { artist } })}
    >
      <CardContent className="p-0 text-center">
        <div className="mb-3">
          <img
            src={artist.avatar || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
            alt={artist.name}
            className="w-20 h-20 rounded-full object-cover mx-auto shadow-lg"
          />
        </div>
        <h3 className="font-semibold text-spotify-text truncate mb-1">{artist.name}</h3>
        <p className="text-xs text-spotify-muted">Artist</p>
      </CardContent>
    </Card>
  );

  const renderAlbumCard = (album: SpotifyAlbum) => (
    <Card 
      className="bg-spotify-card border-spotify-card hover:bg-spotify-light-gray transition-colors cursor-pointer p-4"
      onClick={() => setLocation(`/album/${album.id}`, { state: { album } })}
    >
      <CardContent className="p-0">
        <img
          src={album.cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
          alt={album.name}
          className="w-full aspect-square rounded-lg object-cover mb-3 shadow-lg"
        />
        <h3 className="font-semibold text-spotify-text truncate mb-1">{album.name}</h3>
        <p className="text-xs text-spotify-muted truncate">{getYearFromDate(album.date)} • {album.artist}</p>
      </CardContent>
    </Card>
  );

  const renderActionButton = (item: UnifiedResult, itemKey: string, isImporting: boolean, isImported: boolean, hasError: boolean, songId?: number) => {
    // Check if song is available in database (from search results)
    if (item.available && item.songId) {
      return (
        <Button
          size="sm"
          className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
          onClick={(e) => {
            e.stopPropagation();
            setLocation(`/lyrics/${item.songId}`);
          }}
          title="Play song in Spokify"
        >
          <Play size={16} />
        </Button>
      );
    }
    
    // Check if song was just imported
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
            handleImportSong(item);
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
          handleImportSong(item);
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

  return (
    <div className="min-h-screen spotify-bg">
      {/* Header */}
      <div className="sticky top-0 spotify-bg/95 backdrop-blur-sm border-b z-50" style={{ borderColor: 'var(--spotify-border)' }}>
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="spotify-heading-lg mb-4">Search</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 spotify-text-secondary" size={20} />
            <input
              type="text"
              placeholder="What do you want to learn?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full pl-10 pr-4 py-3 spotify-text-primary focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ 
                backgroundColor: 'var(--spotify-light-gray)',
                border: '1px solid var(--spotify-border)',
                color: 'var(--spotify-text-primary)',
                focusRing: '2px solid var(--spotify-green)'
              }}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="animate-spin spotify-text-secondary" size={20} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-32">
        {error && (
          <div className="spotify-card p-4 mb-6 border border-red-500/20 bg-red-500/10">
            <p className="spotify-text-primary">❌ {error}</p>
          </div>
        )}

        {query && !isLoading && searchResults && (
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex space-x-6 mb-6 border-b border-spotify-border overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: searchResults.totalTracks + searchResults.totalAlbums + searchResults.totalArtists },
                { key: 'tracks', label: 'Songs', count: searchResults.totalTracks },
                { key: 'artists', label: 'Artists', count: searchResults.totalArtists },
                { key: 'albums', label: 'Albums', count: searchResults.totalAlbums }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`pb-3 px-1 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'text-spotify-text border-spotify-green'
                      : 'text-spotify-muted border-transparent hover:text-spotify-text'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 text-xs opacity-60">({tab.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* All Tab - Show everything in sections */}
            {activeTab === 'all' && (
              <div className="space-y-8">
                {/* Songs Section */}
                {searchResults.tracks.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4 text-spotify-text">Songs</h3>
                    <div className="space-y-2">
                      {searchResults.tracks.slice(0, 6).map((track, index) => (
                        <div key={track.spotifyId + '-' + index}>
                          {renderTrackCard(track, false)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                
                {/* Artists Section */}
                {searchResults.artists.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4 text-spotify-text">Artists</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {searchResults.artists.slice(0, 6).map(artist => (
                        <div key={artist.id} className="text-center">
                          {renderArtistCard(artist)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                
                {/* Albums Section */}
                {searchResults.albums.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4 text-spotify-text">Albums</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {searchResults.albums.slice(0, 6).map(album => (
                        <div key={album.id}>
                          {renderAlbumCard(album)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Tracks Tab */}
            {activeTab === 'tracks' && (
              <div className="space-y-2">
                {searchResults.tracks.map((item, index) => (
                  <div key={item.spotifyId + '-' + index}>
                    {renderTrackCard(item)}
                  </div>
                ))}
              </div>
            )}

            {/* Artists Tab */}
            {activeTab === 'artists' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {searchResults.artists.map(artist => (
                  <div key={artist.id} className="text-center">
                    {renderArtistCard(artist)}
                  </div>
                ))}
              </div>
            )}

            {/* Albums Tab */}
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {searchResults.albums.map(album => (
                  <div key={album.id}>
                    {renderAlbumCard(album)}
                  </div>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {searchResults.tracks.length === 0 && searchResults.artists.length === 0 && searchResults.albums.length === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="mx-auto mb-4 text-spotify-muted" size={48} />
                <h3 className="text-2xl font-bold mb-2 text-spotify-text">No results found</h3>
                <p className="text-spotify-muted">Try searching with different keywords</p>
              </div>
            )}
          </div>
        )}

        {/* Initial State - Browse Categories */}
        {!query && (
          <div className="space-y-12">
            <div className="text-center py-8">
              <SearchIcon className="mx-auto mb-4" style={{ color: 'var(--spotify-green)' }} size={48} />
              <h2 className="spotify-heading-lg mb-2">Find your next favorite song</h2>
              <p className="spotify-text-secondary">Search for music from Spotify and YouTube</p>
            </div>
            
            {/* Browse Categories */}
            <div>
              <h3 className="spotify-heading-md mb-6">Browse all</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { name: "Pop", color: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)" },
                  { name: "Rock", color: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" },
                  { name: "Hip-Hop", color: "linear-gradient(135deg, #eab308 0%, #ef4444 100%)" },
                  { name: "Electronic", color: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" },
                  { name: "Jazz", color: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)" },
                  { name: "Classical", color: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" },
                  { name: "R&B", color: "linear-gradient(135deg, #ec4899 0%, #ef4444 100%)" },
                  { name: "Country", color: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" },
                ].map((category) => (
                  <div
                    key={category.name}
                    onClick={() => setQuery(category.name)}
                    className="rounded-lg aspect-square flex items-end p-4 cursor-pointer relative overflow-hidden transition-all hover:scale-105"
                    style={{ background: category.color }}
                  >
                    <h4 className="spotify-heading-sm font-bold drop-shadow-lg" style={{ color: 'var(--spotify-white)' }}>
                      {category.name}
                    </h4>
                    <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}