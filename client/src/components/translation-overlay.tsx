import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { AuthModal } from "@/components/auth-modal";

// Helper function to get language display name
const getLanguageName = (languageCode: string) => {
  const languages: Record<string, string> = {
    'es': 'Spanish',
    'en': 'English', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese'
  };
  return languages[languageCode] || languageCode.toUpperCase();
};

interface TranslationOverlayProps {
  line: {
    text: string;
    translation: string;
  };
  onClose: () => void;
  songId: number;
  songName?: string;
  songLanguage?: string;
}

export default function TranslationOverlay({ line, onClose, songId, songName, songLanguage = "es" }: TranslationOverlayProps) {
  const [vocabulary, setVocabulary] = useState<Array<{
    word: string;
    translation: string;
  }>>([]);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { databaseUser } = useAuth();

  const translateMutation = useMutation({
    mutationFn: async (text: string) => {
      return api.translate(text, "en", songLanguage, songId);
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
      if (!databaseUser?.id) throw new Error('User not authenticated');
      
      return api.vocabulary.save({
        userId: databaseUser.id,
        word: word.word,
        translation: word.translation,
        language: songLanguage,
        difficulty: "A2",
        songId,
        songName,
        context: line.text
      });
    },
    onSuccess: (_, word) => {
      if (databaseUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", databaseUser.id, "vocabulary"] });
      }
      // Add word to the set of added words
      setAddedWords(prev => new Set([...prev, word.word]));
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
            <p className="text-spotify-muted text-sm mb-2">{getLanguageName(songLanguage)}</p>
            <p className="text-spotify-text font-medium">{line.text}</p>
          </div>
          
          <div className="bg-spotify-bg rounded-lg p-4">
            <p className="text-spotify-muted text-sm mb-2">English</p>
            <p className="text-spotify-text font-medium">{line.translation}</p>
          </div>
          
          {(translateMutation.isPending || vocabulary.length > 0) && (
            <div className="bg-spotify-bg rounded-lg p-4">
              <p className="text-spotify-muted text-sm mb-2">Key Vocabulary</p>
              {translateMutation.isPending ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-spotify-green mr-2" />
                  <span className="text-spotify-muted text-sm">Loading vocabulary...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {vocabulary.map((word, index) => {
                    const isAdded = addedWords.has(word.word);
                    const isLoading = addVocabularyMutation.isPending && addVocabularyMutation.variables?.word === word.word;
                    
                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className={`${
                          isAdded 
                            ? 'bg-spotify-accent text-white' 
                            : 'bg-spotify-green text-white hover:bg-spotify-accent'
                        } px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all duration-300 disabled:opacity-100`}
                        onClick={() => {
                          if (isAdded) return; // Don't allow clicking already added words
                          if (!databaseUser?.id) {
                            setShowAuthModal(true);
                          } else {
                            addVocabularyMutation.mutate(word);
                          }
                        }}
                        disabled={isAdded || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isAdded ? (
                          <Check 
                            size={12} 
                            className="animate-in zoom-in-50 duration-300" 
                          />
                        ) : (
                          <Plus size={12} />
                        )}
                        {word.word} ({word.translation})
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          
        </CardContent>
      </Card>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)}>
          {/* This content won't be shown since we're in auth modal mode, but required for component structure */}
          <div></div>
        </AuthModal>
      )}
    </div>
  );
}
