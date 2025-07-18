// Shared types for AI services (OpenAI and Gemini)

export interface TranslationResult {
  translation: string;
  confidence: number;
  vocabulary: Array<{
    word: string;
    translation: string;
    difficulty: string;
  }>;
}

export interface LyricsDifficultyAssessment {
  difficulty: string;
  language?: string;
  genre?: string;
  key_words: Record<string, string>;
}

export interface TranslatedLyric {
  text: string;
  timestamp: number;
  translation: string;
}