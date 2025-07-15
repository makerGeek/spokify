import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.0-flash"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TranslatedLyric {
  text: string;
  timestamp: number;
  translation: string;
}

export interface DifficultyAssessment {
  difficulty: string;
  key_words: Record<string, string>;
  language?: string;
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
    console.log("Gemini response:", result);

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

export async function assessDifficulty(
  lyricsData: Array<{ startMs: number; durMs: number; text: string }>,
): Promise<DifficultyAssessment> {
  try {
    // Concatenate all text from the lyrics
    const concatenatedText = lyricsData.map((line) => line.text).join(" ");

    const prompt = `You are a language learning expert. Assess the difficulty level of the given text according to CEFR levels (A1, A2, B1, B2, C1, C2). Consider vocabulary complexity, grammar structures, and sentence length. 

Also detect the language of the text and return it using the standard 2-letter ISO 639-1 language code (e.g., "en" for English, "es" for Spanish, "fr" for French, "de" for German, "it" for Italian, "pt" for Portuguese, etc.).

Respond with JSON in this format: { "difficulty": "A1|A2|B1|B2|C1|C2", "language": "2-letter-code", "key_words":{"hallo" : "hello", "machen" : "make", "wie geht es ?" : "how is it going ?"} }

Text to analyze: ${concatenatedText}`;

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
        '{"difficulty": "A1", "language": "en", "key_words": {}}',
    );
    console.log("Gemini difficulty assessment:", result);

    return {
      difficulty: result.difficulty || "A1",
      language: result.language || "en",
      key_words: result.key_words || {},
    };
  } catch (error) {
    console.error("Difficulty assessment error:", error);
    throw new Error("Failed to assess difficulty: " + (error as Error).message);
  }
}
