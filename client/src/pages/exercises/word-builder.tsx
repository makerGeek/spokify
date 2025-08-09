import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import AuthenticatedOnly from "@/components/authenticated-only";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { WordBuilderExercise } from "@/components/exercises/word-builder-exercise";
import { type Vocabulary } from "@shared/schema";

export default function ExerciseWordBuilder() {
  const [, setLocation] = useLocation();
  const { user, databaseUser } = useAuth();

  // Get user's target language from preferences
  const userPreferences = JSON.parse(
    localStorage.getItem("userPreferences") || "{}"
  );
  const { targetLanguage = "es" } = userPreferences;

  const { data: allVocabulary, isLoading } = useQuery<Vocabulary[]>({
    queryKey: databaseUser?.id ? ["/api/users", databaseUser.id, "vocabulary"] : [],
    queryFn: async () => {
      if (!databaseUser?.id) return [];
      return api.users.getVocabulary(databaseUser.id);
    },
    retry: false,
    enabled: !!databaseUser?.id && !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter vocabulary by selected language and ensure we have context for sentence building
  const vocabulary = useMemo(() => {
    if (!allVocabulary) return [];
    return allVocabulary.filter(word => 
      word.language === targetLanguage && 
      word.context && 
      word.context.length > 10 // Ensure we have meaningful context
    );
  }, [allVocabulary, targetLanguage]);

  if (isLoading) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="spotify-loading mb-4"></div>
            <p className="spotify-text-muted">Loading vocabulary...</p>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  if (!vocabulary || vocabulary.length < 3) {
    return (
      <AuthenticatedOnly>
        <div className="min-h-screen spotify-bg pb-20">
          <div className="p-6">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                
              </button>
            </div>

            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔨</div>
              <h2 className="spotify-heading-md mb-2">Need More Context</h2>
              <p className="spotify-text-muted mb-6">
                You need vocabulary words with context (from song lyrics) to play the sentence builder game. Learn more songs to unlock this exercise!
              </p>
              <button
                onClick={() => window.history.back()}
                className="spotify-btn-primary"
              >
                Discover Songs
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedOnly>
    );
  }

  return (
    <AuthenticatedOnly>
      <div className="min-h-screen spotify-bg pb-20">
        <div className="p-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="spotify-heading-lg">Phrase Builder</h1>
            </div>
            <div className="w-8"></div>
          </div>

          <WordBuilderExercise 
            vocabulary={vocabulary} 
            targetLanguage={targetLanguage} 
            maxSentences={5} 
            hideHeader
          />
        </div>
      </div>
    </AuthenticatedOnly>
  );
}