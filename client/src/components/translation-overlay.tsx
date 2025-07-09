import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TranslationOverlayProps {
  line: {
    text: string;
    translation: string;
  };
  onClose: () => void;
  songId: number;
}

export default function TranslationOverlay({ line, onClose, songId }: TranslationOverlayProps) {
  const [vocabulary, setVocabulary] = useState<Array<{
    word: string;
    translation: string;
  }>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const translateMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/translate", {
        text,
        fromLanguage: "es", // This should come from user preferences
        toLanguage: "en"
      });
      return response.json();
    },
    onSuccess: (data) => {
      setVocabulary(data.vocabulary || []);
    },
    onError: () => {
      toast({
        title: "Translation failed",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  });

  const addVocabularyMutation = useMutation({
    mutationFn: async (word: { word: string; translation: string }) => {
      const response = await apiRequest("POST", "/api/vocabulary", {
        userId: 1, // Mock user ID
        word: word.word,
        translation: word.translation,
        language: "es",
        difficulty: "A2",
        songId,
        context: line.text
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", 1, "vocabulary"] });
      toast({
        title: "Added to vocabulary!",
        description: "Word saved for review",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save word",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Auto-translate when component mounts
  useState(() => {
    if (line.text) {
      translateMutation.mutate(line.text);
    }
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
      <Card className="bg-spotify-card border-spotify-card max-w-sm w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-spotify-text">
            <span>Translation</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-spotify-muted hover:text-spotify-text"
            >
              <X size={20} />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-spotify-bg rounded-lg p-4">
            <p className="text-spotify-muted text-sm mb-2">Spanish</p>
            <p className="text-spotify-text font-medium">{line.text}</p>
          </div>
          
          <div className="bg-spotify-bg rounded-lg p-4">
            <p className="text-spotify-muted text-sm mb-2">English</p>
            <p className="text-spotify-text font-medium">{line.translation}</p>
          </div>
          
          {vocabulary.length > 0 && (
            <div className="bg-spotify-bg rounded-lg p-4">
              <p className="text-spotify-muted text-sm mb-2">Key Vocabulary</p>
              <div className="flex flex-wrap gap-2">
                {vocabulary.map((word, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="bg-spotify-green text-white hover:bg-spotify-accent px-2 py-1 rounded-full text-xs"
                    onClick={() => addVocabularyMutation.mutate(word)}
                  >
                    {word.word} ({word.translation})
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button
              className="flex-1 bg-spotify-green text-white hover:bg-spotify-accent"
              onClick={() => {
                // Mark as learned
                toast({
                  title: "Marked as learned!",
                  description: "Great job learning this phrase",
                });
                onClose();
              }}
            >
              <Check size={16} className="mr-2" />
              Mark as Learned
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-spotify-bg border-spotify-muted text-spotify-text hover:border-spotify-green"
              onClick={() => {
                // Add to review
                toast({
                  title: "Added to review!",
                  description: "We'll help you practice this later",
                });
                onClose();
              }}
            >
              <Plus size={16} className="mr-2" />
              Review Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
