import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Save, Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { type Song } from "@shared/schema";

export default function Admin() {
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [offsetValue, setOffsetValue] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [originalLyrics, setOriginalLyrics] = useState<any[]>([]);
  const [modifiedLyrics, setModifiedLyrics] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all songs
  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    queryFn: () => api.songs.getAll()
  });

  // Fetch selected song details
  const { data: selectedSong, isLoading: songLoading } = useQuery<Song>({
    queryKey: ["/api/songs", selectedSongId],
    queryFn: async () => {
      if (!selectedSongId) throw new Error("No song ID provided");
      return api.songs.getById(parseInt(selectedSongId));
    },
    enabled: !!selectedSongId
  });

  // Update song lyrics mutation
  const updateLyricsMutation = useMutation({
    mutationFn: async ({ songId, lyrics }: { songId: string, lyrics: any[] }) => {
      const response = await fetch(`/api/admin/songs/${songId}/lyrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics })
      });
      if (!response.ok) throw new Error("Failed to update lyrics");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Lyrics timestamps updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/songs", selectedSongId] });
      setPreviewMode(false);
      setOffsetValue(0);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lyrics timestamps", variant: "destructive" });
    }
  });

  // Update modified lyrics when offset changes
  useEffect(() => {
    if (selectedSong?.lyrics && Array.isArray(selectedSong.lyrics)) {
      setOriginalLyrics(selectedSong.lyrics);
      const modified = selectedSong.lyrics.map((line: any) => ({
        ...line,
        timestamp: Math.max(0, line.timestamp + offsetValue)
      }));
      setModifiedLyrics(modified);
    }
  }, [selectedSong, offsetValue]);

  const handleSongSelect = (songId: string) => {
    setSelectedSongId(songId);
    setOffsetValue(0);
    setPreviewMode(false);
  };

  const handleOffsetChange = (value: number[]) => {
    setOffsetValue(value[0]);
    setPreviewMode(true);
  };

  const handleSave = () => {
    if (!selectedSongId || modifiedLyrics.length === 0) return;
    updateLyricsMutation.mutate({ songId: selectedSongId, lyrics: modifiedLyrics });
  };

  const handleReset = () => {
    setOffsetValue(0);
    setPreviewMode(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-spotify-bg p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-spotify-card border-spotify-card mb-6">
          <CardHeader>
            <CardTitle className="text-spotify-text text-2xl">
              🛠️ Song Offset - Lyrics Timestamp Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Song Selection */}
            <div className="space-y-2">
              <Label className="text-spotify-text">Select Song</Label>
              <Select value={selectedSongId} onValueChange={handleSongSelect}>
                <SelectTrigger className="bg-spotify-bg border-spotify-muted text-spotify-text">
                  <SelectValue placeholder="Choose a song to edit..." />
                </SelectTrigger>
                <SelectContent className="bg-spotify-card border-spotify-muted">
                  {songs?.map((song) => (
                    <SelectItem key={song.id} value={song.id.toString()}>
                      {song.title} - {song.artist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSong && (
              <>
                {/* Offset Controls */}
                <div className="space-y-4">
                  <Label className="text-spotify-text text-lg">Timestamp Offset (seconds)</Label>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-spotify-muted text-sm w-12">-30s</span>
                      <Slider
                        value={[offsetValue]}
                        onValueChange={handleOffsetChange}
                        min={-30}
                        max={30}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-spotify-muted text-sm w-12">+30s</span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Input
                        type="number"
                        value={offsetValue}
                        onChange={(e) => handleOffsetChange([parseFloat(e.target.value) || 0])}
                        step="0.1"
                        className="w-32 bg-spotify-bg border-spotify-muted text-spotify-text"
                        placeholder="0.0"
                      />
                      <span className="text-spotify-muted">seconds</span>
                      
                      <div className="flex space-x-2 ml-auto">
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="bg-spotify-bg border-spotify-muted text-spotify-text hover:bg-spotify-card"
                        >
                          <RotateCcw size={16} className="mr-2" />
                          Reset
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={!previewMode || updateLyricsMutation.isPending}
                          className="bg-spotify-green hover:bg-spotify-green/80 text-black"
                        >
                          <Save size={16} className="mr-2" />
                          {updateLyricsMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {previewMode && (
                    <div className="bg-spotify-bg p-4 rounded-lg border border-spotify-muted">
                      <p className="text-spotify-green font-medium mb-2">
                        Preview Mode: All timestamps {offsetValue >= 0 ? 'increased' : 'decreased'} by {Math.abs(offsetValue).toFixed(1)}s
                      </p>
                      <p className="text-spotify-muted text-sm">
                        Review the changes below and click "Save Changes" to apply them.
                      </p>
                    </div>
                  )}
                </div>

                {/* Lyrics Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Lyrics */}
                  <Card className="bg-spotify-bg border-spotify-muted">
                    <CardHeader>
                      <CardTitle className="text-spotify-text text-lg">Original Timestamps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {originalLyrics.slice(0, 10).map((line: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-spotify-card rounded">
                            <span className="text-spotify-text text-sm flex-1 mr-2">{line.text}</span>
                            <span className="text-spotify-muted text-xs font-mono">
                              {formatTime(line.timestamp)}
                            </span>
                          </div>
                        ))}
                        {originalLyrics.length > 10 && (
                          <p className="text-spotify-muted text-center text-sm">
                            ... and {originalLyrics.length - 10} more lines
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Modified Lyrics */}
                  <Card className="bg-spotify-bg border-spotify-muted">
                    <CardHeader>
                      <CardTitle className="text-spotify-text text-lg">
                        Modified Timestamps {previewMode && <span className="text-spotify-green">(Preview)</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {modifiedLyrics.slice(0, 10).map((line: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-spotify-card rounded">
                            <span className="text-spotify-text text-sm flex-1 mr-2">{line.text}</span>
                            <span className={`text-xs font-mono ${previewMode ? 'text-spotify-green' : 'text-spotify-muted'}`}>
                              {formatTime(line.timestamp)}
                            </span>
                          </div>
                        ))}
                        {modifiedLyrics.length > 10 && (
                          <p className="text-spotify-muted text-center text-sm">
                            ... and {modifiedLyrics.length - 10} more lines
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}