import { db } from '../db.js';
import { vocabulary, translations } from '../../shared/schema.js';
import { eq, and, like } from 'drizzle-orm';
import { generateExampleSentence } from './gemini.js';

/**
 * Gets or generates an example sentence for a word
 * Priority: vocabulary context -> translations table -> AI generation
 */
export async function getExampleSentenceForWord(
  word: string, 
  language: string = 'de', 
  translation: string
): Promise<string> {
  try {
    // First, search in existing vocabulary database
    const existingVocab = await db
      .select()
      .from(vocabulary)
      .where(and(
        eq(vocabulary.word, word),
        eq(vocabulary.language, language)
      ))
      .limit(1);

    // If found in database and has context, use it as example
    if (existingVocab.length > 0 && existingVocab[0].context) {
      return existingVocab[0].context;
    }

    // Second, search in translations table for sentences containing the word
    const existingTranslations = await db
      .select()
      .from(translations)
      .where(and(
        eq(translations.fromLanguage, language),
        like(translations.text, `%${word}%`)
      ))
      .limit(1);

    // If found a translation containing the word, use the original text
    if (existingTranslations.length > 0) {
      return existingTranslations[0].text;
    }

    // Third, generate using AI - NO FALLBACKS, force proper generation
    const aiResponse = await generateExampleSentence(word, translation, language);
    
    if (!aiResponse.success || !aiResponse.translation) {
      console.error(`❌ AI generation FAILED for word: "${word}" (${translation}) in ${language}`);
      console.error(`   Success: ${aiResponse.success}, Translation: "${aiResponse.translation}"`);
      throw new Error(`Failed to generate example sentence for "${word}" in ${language}. AI must work properly.`);
    }

    console.log(`✅ AI generated sentence for "${word}": "${aiResponse.translation.trim()}"`);
    return aiResponse.translation.trim();
    
  } catch (error) {
    console.error(`💥 CRITICAL ERROR generating example sentence for "${word}" (${translation}) in ${language}:`, error);
    throw error; // Re-throw to force proper error handling
  }
}

/**
 * Gets or generates example sentences for multiple words
 */
export async function getExampleSentencesForWords(
  words: Array<{ word: string; translation: string; exampleSentence?: string }>,
  language: string = 'de'
): Promise<Array<{ word: string; translation: string; exampleSentence: string }>> {
  const results = [];
  
  for (const vocab of words) {
    // If example sentence already exists, keep it
    if (vocab.exampleSentence) {
      results.push({
        word: vocab.word,
        translation: vocab.translation,
        exampleSentence: vocab.exampleSentence
      });
    } else {
      try {
        // Generate new example sentence - will throw error if AI fails
        const exampleSentence = await getExampleSentenceForWord(vocab.word, language, vocab.translation);
        results.push({
          word: vocab.word,
          translation: vocab.translation,
          exampleSentence
        });
      } catch (error) {
        console.error(`⚠️  AI failed for word "${vocab.word}", keeping word without example sentence:`, error.message);
        // Keep the word but without example sentence to preserve vocabulary
        results.push({
          word: vocab.word,
          translation: vocab.translation,
          exampleSentence: "" // Empty string indicates no example sentence generated
        });
      }
    }
  }
  
  return results;
}