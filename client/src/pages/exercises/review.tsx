import { useQuery } from "@tanstack/react-query";
import { Music, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";
import AuthenticatedOnly from "@/components/authenticated-only";
import { ReviewExercise } from "@/components/exercises/review-exercise";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { type Vocabulary } from "@shared/schema";

export default function Review() {
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

  // Filter vocabulary by selected language
  const vocabulary = useMemo(() => {
    if (!allVocabulary) return [];
    return allVocabulary.filter(word => word.language === targetLanguage);
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

  if (!vocabulary || vocabulary.length === 0) {
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
              <Music className="mx-auto spotify-text-muted mb-4" size={64} />
              <h2 className="spotify-heading-md mb-2">No Vocabulary Yet</h2>
              <p className="spotify-text-muted mb-6">
                Start learning by tapping on words in song lyrics to build your vocabulary!
              </p>
              <button
                onClick={() => setLocation("/home")}
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 spotify-text-muted hover:spotify-text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="spotify-heading-lg">Vocabulary Review</h1>
            </div>
            <div className="w-8"></div> {/* Spacer for centering */}
          </div>

          <ReviewExercise vocabulary={vocabulary} maxQuestions={10} hideHeader />
        </div>
      </div>
    </AuthenticatedOnly>
  );
}