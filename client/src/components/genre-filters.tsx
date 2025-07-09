import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flame, Guitar, Drum, Mic, Heart, Zap, Globe, Music } from "lucide-react";

const genres = [
  { id: "all", label: "All", icon: Flame },
  { id: "Pop", label: "Pop", icon: Guitar },
  { id: "Rock", label: "Rock", icon: Drum },
  { id: "Hip-Hop", label: "Hip-Hop", icon: Mic },
  { id: "Electronic", label: "Electronic", icon: Zap },
  { id: "World", label: "World", icon: Globe },
  { id: "Latin", label: "Latin", icon: Music },
  { id: "Classic", label: "Classic", icon: Heart },
];

interface GenreFiltersProps {
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
}

export default function GenreFilters({ selectedGenre, onGenreChange }: GenreFiltersProps) {
  return (
    <div className="bg-spotify-bg p-4 border-b border-spotify-card">
      <div className="max-w-md mx-auto">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {genres.map((genre) => {
            const Icon = genre.icon;
            const isSelected = selectedGenre === genre.id;
            
            return (
              <Button
                key={genre.id}
                variant="ghost"
                size="sm"
                className={`${
                  isSelected 
                    ? "genre-chip text-spotify-green" 
                    : "bg-spotify-card text-spotify-muted hover:text-spotify-text"
                } whitespace-nowrap`}
                onClick={() => onGenreChange(genre.id)}
              >
                <Icon size={16} className="mr-1" />
                {genre.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
