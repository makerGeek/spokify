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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function translateLyrics(
  songLyrics: string,
  language: string
): Promise<TranslatedLyric[]> {
  try {
    const prompt = `reformat and translate these lyrics ${songLyrics} to this format:

[
  {
    "text": "Ay",
    "timestamp": 6,
    "translation": "Ay"
  },
  {
    "text": "Fonsi, DY (oh-oh)",
    "timestamp": 8,
    "translation": "Fonsi, DY (oh-oh)"
  },
  {
    "text": "Oh no, oh no (oh)",
    "timestamp": 12,
    "translation": "Oh no, oh no (oh)"
  }
]

Return them in the following language: ${language}

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
              translation: { type: "string" }
            },
            required: ["text", "timestamp", "translation"]
          }
        }
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
      translation: lyric.translation || ""
    }));
  } catch (error) {
    console.error("Lyrics translation error:", error);
    throw new Error("Failed to translate lyrics: " + (error as Error).message);
  }
}