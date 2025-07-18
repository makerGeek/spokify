import { GoogleGenAI } from "@google/genai";
import { 
  TranslationResult, 
  LyricsDifficultyAssessment, 
  TranslatedLyric 
} from "../types/ai-services";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.0-flash"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateText(
  text: string,
  fromLanguage: string,
  toLanguage: string
): Promise<TranslationResult> {
  try {
    const prompt = `You are a language learning expert translator. Translate the text from ${fromLanguage} to ${toLanguage} and provide vocabulary analysis.

Text to translate: "${text}"

Respond with JSON in this exact format:
{
  "translation": "translated text",
  "confidence": 0.95,
  "vocabulary": [
    {
      "word": "original word",
      "translation": "translated word", 
      "difficulty": "A1"
    }
  ]
}

Guidelines:
- Provide accurate translation from ${fromLanguage} to ${toLanguage}
- Confidence should be between 0.1 and 1.0 based on translation quality
- Include 3-6 key vocabulary words from the original text
- Difficulty levels: A1 (beginner), A2, B1, B2, C1, C2 (advanced)
- Return only valid JSON, no additional text`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            translation: { type: "string" },
            confidence: { type: "number" },
            vocabulary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  translation: { type: "string" },
                  difficulty: { type: "string" }
                },
                required: ["word", "translation", "difficulty"]
              }
            }
          },
          required: ["translation", "confidence", "vocabulary"]
        }
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      translation: result.translation || "",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      vocabulary: result.vocabulary || []
    };
  } catch (error) {
    console.error("Gemini translation error:", error);
    throw new Error("Failed to translate text: " + (error as Error).message);
  }
}



async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

export async function translateLyrics(
  songLyrics: string,
  language: string,
): Promise<TranslatedLyric[]> {
  try {
    const prompt = `Parse and translate these lyrics: ${songLyrics}

IMPORTANT INSTRUCTIONS:
1. Keep the "text" field in the ORIGINAL language exactly as provided
2. Only translate the content for the "translation" field to ${language}
3. Extract timestamps from the lyrics and convert them to seconds
4. If a line doesn't need translation (like "Ay", "Oh no"), keep both text and translation the same

Return in this JSON format:
[
  {
    "text": "[ORIGINAL LANGUAGE LINE]",
    "timestamp": [NUMBER IN SECONDS],
    "translation": "[${language.toUpperCase()} TRANSLATION]"
  }
]

Example (if original is Spanish):
[
  {
    "text": "Quiero desnudarte a besos",
    "timestamp": 15,
    "translation": "I want to undress you with kisses"
  },
  {
    "text": "Ay",
    "timestamp": 6,
    "translation": "Ay"
  }
]

IMPORTANT: Return only valid JSON array format, no additional text or markdown formatting.`;

    const apiCall = ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              timestamp: { type: "number" },
              translation: { type: "string" },
            },
            required: ["text", "timestamp", "translation"],
          },
        },
      },
      contents: prompt,
    });

    // Apply 2 minute timeout wrapper
    const response = await withTimeout(apiCall, 120000);

    const result = JSON.parse(response.text || "[]");

    if (!Array.isArray(result)) {
      console.error("Invalid response format from Gemini:", result);
      return [];
    }

    return result.map((lyric: any) => ({
      text: lyric.text || "",
      timestamp: Number(lyric.timestamp) || 0,
      translation: lyric.translation || "",
    }));
  } catch (error) {
    console.error("Lyrics translation error:", error);
    throw new Error("Failed to translate lyrics: " + (error as Error).message);
  }
}


// Lyrics-based difficulty assessment (for song import scripts)
export async function assessLyricsDifficulty(
  lyricsData: Array<{ startMs: number; durMs: number; text: string }>,
  title?: string,
  artist?: string,
): Promise<LyricsDifficultyAssessment> {
  try {
    // Concatenate all text from the lyrics
    const concatenatedText = lyricsData.map((line) => line.text).join(" ");

    const songInfo = title && artist ? `Song: "${title}" by ${artist}\n\n` : "";
    
    const prompt = `You are a language learning expert and music genre classifier. Analyze the following song lyrics and provide:

1. Difficulty level according to CEFR levels (A1, A2, B1, B2, C1, C2) based on vocabulary complexity, grammar structures, and sentence length
2. Language detection using standard 2-letter ISO 639-1 codes (e.g., "en", "es", "fr", "de", "it", "pt", etc.)
3. Music genre classification (e.g., "Pop", "Rock", "Hip-Hop", "Jazz", "Classical", "Electronic", "Folk", "Country", "R&B", "Reggaeton", "Alternative", "Indie", etc.)

Consider the song title, artist, and lyrical content to determine the most appropriate genre.

${songInfo}Lyrics to analyze: ${concatenatedText}

Respond with JSON in this exact format: 
{
  "difficulty": "A1|A2|B1|B2|C1|C2", 
  "language": "2-letter-code", 
  "genre": "Genre Name",
  "key_words": {"word1": "translation1", "word2": "translation2"}
}`;

    const apiCall = ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    // Apply 2 minute timeout wrapper
    const response = await withTimeout(apiCall, 120000);

    const result = JSON.parse(
      response.text ||
        '{"difficulty": "A1", "language": "en", "genre": "Pop", "key_words": {}}',
    );

    return {
      difficulty: result.difficulty || "A1",
      language: result.language || "en",
      genre: result.genre || "Pop",
      key_words: result.key_words || {},
    };
  } catch (error) {
    console.error("Difficulty assessment error:", error);
    throw new Error("Failed to assess difficulty: " + (error as Error).message);
  }
}
