import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface TranslationResult {
  translation: string;
  confidence: number;
  vocabulary: Array<{
    word: string;
    translation: string;
    difficulty: string;
  }>;
}

export interface DifficultyAssessment {
  difficulty: string;
  confidence: number;
  reasoning: string;
  vocabulary_complexity: number;
  grammar_complexity: number;
}

export interface TranslatedLyric {
  text: string;
  timestamp: number;
  translation: string;
}

export async function translateText(
  text: string,
  fromLanguage: string,
  toLanguage: string
): Promise<TranslationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a language learning expert translator. Translate the text from ${fromLanguage} to ${toLanguage} and provide vocabulary analysis. Respond with JSON in this format: { "translation": "translated text", "confidence": 0.95, "vocabulary": [{ "word": "original word", "translation": "translated word", "difficulty": "A1|A2|B1|B2|C1|C2" }] }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      translation: result.translation || "",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      vocabulary: result.vocabulary || []
    };
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text: " + (error as Error).message);
  }
}

export async function assessDifficulty(
  text: string,
  language: string
): Promise<DifficultyAssessment> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a language learning expert. Assess the difficulty level of the given ${language} text according to CEFR levels (A1, A2, B1, B2, C1, C2). Consider vocabulary complexity, grammar structures, and sentence length. Respond with JSON in this format: { "difficulty": "A1|A2|B1|B2|C1|C2", "confidence": 0.85, "reasoning": "explanation", "vocabulary_complexity": 3, "grammar_complexity": 2 }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      difficulty: result.difficulty || "A1",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      reasoning: result.reasoning || "",
      vocabulary_complexity: Math.max(1, Math.min(5, result.vocabulary_complexity || 3)),
      grammar_complexity: Math.max(1, Math.min(5, result.grammar_complexity || 3))
    };
  } catch (error) {
    console.error("Difficulty assessment error:", error);
    throw new Error("Failed to assess difficulty: " + (error as Error).message);
  }
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
    const prompt = `reformat and translate these lyrics ${songLyrics} to this format [
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
] and in the following language: ${language}`;

    const apiCall = openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a language learning expert translator. Reformat and translate song lyrics to the specified format and language. Respond with JSON object containing 'lyrics' array with the translated data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    // Apply 2 minute timeout wrapper
    const response = await withTimeout(apiCall, 120000);

    const result = JSON.parse(response.choices[0].message.content || '{"lyrics": []}');
    console.log("OpenAI response:", result);
    
    // Handle both direct array response and wrapped object response
    const lyricsArray = Array.isArray(result) ? result : (result.lyrics || result.data || []);
    
    if (!Array.isArray(lyricsArray)) {
      console.error("Invalid response format from OpenAI:", result);
      return [];
    }
    
    return lyricsArray.map((lyric: any) => ({
      text: lyric.text || "",
      timestamp: Number(lyric.timestamp) || 0,
      translation: lyric.translation || ""
    }));
  } catch (error) {
    console.error("Lyrics translation error:", error);
    throw new Error("Failed to translate lyrics: " + (error as Error).message);
  }
}
