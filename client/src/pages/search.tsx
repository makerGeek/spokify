import { useState, useCallback, useEffect } from "react";
import { Search as SearchIcon, Music, Loader2, Download, Play, AlertCircle } from "lucide-react";
import BottomNavigation from "../components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api-client";
import { useDebounce } from "../hooks/use-debounce";
import { useLocation } from "wouter";

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

type SearchResults = UnifiedResult[];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingItems, setImportingItems] = useState<Set<string>>(new Set());
  const [importedItems, setImportedItems] = useState<Map<string, number>>(new Map()); // Store item key -> song ID
  const [importErrors, setImportErrors] = useState<Map<string, string>>(new Map());
  const [, setLocation] = useLocation();
  
  const debouncedQuery = useDebounce(query, 500);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.search.music(searchQuery.trim());
      if (response.success) {
        setSearchResults(response.results);
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

  return (
    <div className="min-h-screen spotify-bg">
      {/* Header */}
      <div className="sticky top-0 spotify-bg/95 backdrop-blur-sm border-b" style={{ borderColor: 'var(--spotify-border)' }}>
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
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin spotify-text-secondary" size={20} />
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
          <div className="max-w-md mx-auto">
            {/* Combined Results */}
            {searchResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 circular-font">
                  Search Results
                </h2>
                
                <div className="space-y-4">
                  {searchResults.map((item, index) => {
                    const itemKey = item.spotifyId || item.youtubeId || `${item.title}-${item.artist}`;
                    const isImporting = importingItems.has(itemKey);
                    const isImported = importedItems.has(itemKey);
                    const songId = importedItems.get(itemKey);
                    const hasError = importErrors.has(itemKey);
                    
                    return (
                      <Card 
                        key={itemKey + '-' + index} 
                        className="song-card bg-spotify-card border-spotify-card cursor-pointer"
                        onClick={() => {
                          if (isImported && songId) {
                            setLocation(`/lyrics/${songId}`);
                          } else {
                            handleImportSong(item);
                          }
                        }}
                      >
                        <CardContent className="p-4 flex items-center space-x-4">
                          {/* Thumbnail/Album Cover */}
                          <img
                            src={
                              item.albumCover || 
                              item.thumbnail || 
                              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"
                            }
                            alt={item.album || item.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="overflow-hidden whitespace-nowrap relative flex items-center gap-2">
                              <h3 className="font-semibold text-lg text-spotify-text inline-block truncate">
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
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-spotify-muted">
                                {item.duration > 0 ? formatDuration(item.duration) : 'Duration unknown'}
                              </span>
                              {item.views && item.views > 0 && (
                                <span className="text-xs text-spotify-muted">{formatViews(item.views)}</span>
                              )}
                              {item.confidence < 100 && (
                                <span className="text-xs text-spotify-muted">
                                  {Math.round(item.confidence)}% match
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex items-center">
                            {isImported && songId ? (
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
                            ) : hasError ? (
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
                            ) : (
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
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                
                {/* Result Stats */}
                <div className="mt-4 text-center">
                  <p className="text-spotify-muted text-sm">
                    Found {searchResults.length} results
                  </p>
                </div>
              </div>
            )}
            
            {searchResults.length === 0 && (
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