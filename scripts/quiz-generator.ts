import 'dotenv/config';
import { db } from '../server/db';
import { vocabulary, songs, type Vocabulary, type Song } from '../shared/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

// Language code to full name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'tr': 'Turkish',
  'pl': 'Polish',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'uk': 'Ukrainian',
  'be': 'Belarusian',
  'ka': 'Georgian',
  'am': 'Amharic',
  'sw': 'Swahili',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'is': 'Icelandic',
  'ga': 'Irish',
  'cy': 'Welsh',
  'mt': 'Maltese',
  'eu': 'Basque',
  'ca': 'Catalan',
  'gl': 'Galician'
};

/**
 * Converts language code to full language name
 * @param languageCode - ISO language code (e.g., 'fr', 'es', 'de')
 * @returns Full language name (e.g., 'French', 'Spanish', 'German')
 */
function getLanguageName(languageCode: string | null): string {
  if (!languageCode) return 'Unknown';
  
  const fullName = LANGUAGE_NAMES[languageCode.toLowerCase()];
  return fullName || languageCode.charAt(0).toUpperCase() + languageCode.slice(1);
}

export interface QuizQuestion {
  language: string;
  song: string;
  artist: string;
  level: string;
  question: string;
  context: string | null;
  options: string[];
  correct: number;
}

/**
 * Generates a quiz question for a specific vocabulary item
 * @param vocabId - The vocabulary ID to generate a question for
 * @returns Quiz question object
 */
export async function generateQuizQuestion(vocabId: number): Promise<QuizQuestion> {
  try {
    // Get the target vocabulary item with song details
    const vocabQuery = await db
      .select({
        vocab: vocabulary,
        song: songs
      })
      .from(vocabulary)
      .leftJoin(songs, eq(vocabulary.songId, songs.id))
      .where(eq(vocabulary.id, vocabId))
      .limit(1);

    if (!vocabQuery || vocabQuery.length === 0) {
      throw new Error(`Vocabulary item with ID ${vocabId} not found`);
    }

    const { vocab, song } = vocabQuery[0];

    if (!vocab) {
      throw new Error(`No vocabulary data found for ID ${vocabId}`);
    }

    // Get other vocabulary items for wrong answers (same language, same user)
    const otherVocabQuery = await db
      .select({
        translation: vocabulary.translation
      })
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, vocab.userId),
          eq(vocabulary.language, vocab.language),
          ne(vocabulary.id, vocabId),
          ne(vocabulary.translation, vocab.translation)
        )
      )
      .limit(20); // Get more than we need for better randomization

    // Extract translations from other vocabulary
    const otherTranslations = otherVocabQuery
      .map(item => item.translation)
      .filter((translation): translation is string => 
        translation !== null && translation !== undefined && translation.trim() !== ''
      );

    // Fallback generic wrong answers (language-agnostic common translations)
    const genericWrongAnswers = [
      "to sing", "to dance", "to walk", "to eat", "to drink", "to sleep",
      "to run", "to talk", "to play", "to work", "to study", "to read",
      "happy", "sad", "beautiful", "fast", "slow", "big", "small",
      "good", "bad", "hot", "cold", "new", "old", "young",
      "house", "car", "book", "music", "love", "friend", "family",
      "time", "day", "night", "water", "food", "money", "life",
      "something", "nothing", "everything", "somewhere", "anywhere",
      "someone", "everyone", "nobody", "always", "never", "sometimes"
    ];

    // Combine available wrong answers
    const availableWrongAnswers = [
      ...otherTranslations,
      ...genericWrongAnswers
    ].filter(answer => answer !== vocab.translation);

    // Shuffle and select 3 wrong answers
    const shuffledWrongAnswers = availableWrongAnswers
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // If we don't have enough wrong answers, pad with remaining generic ones
    while (shuffledWrongAnswers.length < 3) {
      const remaining = genericWrongAnswers.filter(
        answer => !shuffledWrongAnswers.includes(answer) && answer !== vocab.translation
      );
      if (remaining.length === 0) break;
      shuffledWrongAnswers.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    // Ensure we have a valid translation
    if (!vocab.translation) {
      throw new Error(`Vocabulary item ${vocabId} has no translation`);
    }

    // Create options array with correct answer
    const allOptions = [vocab.translation, ...shuffledWrongAnswers];
    
    // Shuffle all options to randomize correct answer position
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
    
    // Find the correct answer index
    const correctIndex = shuffledOptions.findIndex(option => option === vocab.translation);

    // Build the quiz question object
    const quizQuestion: QuizQuestion = {
      language: getLanguageName(vocab.language),
      song: song?.title || vocab.songName || 'Unknown Song',
      artist: song?.artist || 'Unknown Artist',
      level: vocab.difficulty || 'A1',
      question: `What does "${vocab.word}" mean?`,
      context: vocab.context ? `Context: "${vocab.context}"` : null,
      options: shuffledOptions,
      correct: correctIndex
    };

    return quizQuestion;

  } catch (error) {
    console.error('Error generating quiz question:', error);
    throw error;
  }
}

/**
 * Generates multiple quiz questions for an array of vocabulary IDs
 * @param vocabIds - Array of vocabulary IDs
 * @returns Array of quiz question objects
 */
export async function generateQuizQuestions(vocabIds: number[]): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];
  
  for (const vocabId of vocabIds) {
    try {
      const question = await generateQuizQuestion(vocabId);
      questions.push(question);
    } catch (error) {
      console.error(`Failed to generate question for vocab ID ${vocabId}:`, error);
      // Continue with other questions even if one fails
    }
  }
  
  return questions;
}

/**
 * Gets vocabulary IDs that are due for review for a specific user
 * @param userId - The user ID
 * @param limit - Maximum number of vocabulary items to return
 * @returns Array of vocabulary IDs due for review
 */
export async function getDueVocabularyIds(userId: number, limit: number = 10): Promise<number[]> {
  try {
    const dueVocab = await db
      .select({
        id: vocabulary.id
      })
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.userId, userId),
          sql`${vocabulary.nextReviewDate} <= NOW()`
        )
      )
      .orderBy(vocabulary.nextReviewDate)
      .limit(limit);

    return dueVocab.map(item => item.id);
  } catch (error) {
    console.error('Error getting due vocabulary IDs:', error);
    throw error;
  }
}

/**
 * Gets all vocabulary IDs for a specific user (for testing)
 * @param userId - The user ID
 * @param limit - Maximum number of vocabulary items to return
 * @returns Array of vocabulary IDs
 */
export async function getUserVocabularyIds(userId: number, limit: number = 10): Promise<number[]> {
  try {
    const userVocab = await db
      .select({
        id: vocabulary.id
      })
      .from(vocabulary)
      .where(eq(vocabulary.userId, userId))
      .limit(limit);

    return userVocab.map(item => item.id);
  } catch (error) {
    console.error('Error getting user vocabulary IDs:', error);
    throw error;
  }
}

/**
 * Gets all vocabulary IDs for a specific language
 * @param languageCode - The language code (e.g., 'fr', 'es', 'de')
 * @param limit - Maximum number of vocabulary items to return (optional)
 * @returns Array of vocabulary IDs
 */
export async function getVocabularyIdsByLanguage(languageCode: string, limit?: number): Promise<number[]> {
  try {
    let query = db
      .select({
        id: vocabulary.id
      })
      .from(vocabulary)
      .where(eq(vocabulary.language, languageCode))
      .orderBy(vocabulary.id);

    if (limit) {
      query = query.limit(limit);
    }

    const vocabItems = await query;
    return vocabItems.map(item => item.id);
  } catch (error) {
    console.error('Error getting vocabulary IDs by language:', error);
    throw error;
  }
}

/**
 * Exports all vocabulary for a specific language as quiz questions to JSON file
 * @param languageCode - The language code (e.g., 'fr', 'es', 'de')
 * @param outputFile - Optional output filename (defaults to language-quiz-export.json)
 * @returns Path to the exported file
 */
export async function exportLanguageQuiz(languageCode: string, outputFile?: string): Promise<string> {
  try {
    console.log(`Exporting quiz questions for language: ${languageCode}`);
    
    // Get all vocabulary IDs for this language
    const vocabIds = await getVocabularyIdsByLanguage(languageCode);
    
    if (vocabIds.length === 0) {
      console.log(`No vocabulary found for language: ${languageCode}`);
      return '';
    }

    console.log(`Found ${vocabIds.length} vocabulary items for ${languageCode}`);
    
    // Generate quiz questions for all vocabulary
    const quizQuestions = await generateQuizQuestions(vocabIds);
    
    console.log(`Generated ${quizQuestions.length} quiz questions`);
    
    // Create export data
    const exportData = {
      language: getLanguageName(languageCode),
      languageCode: languageCode,
      totalQuestions: quizQuestions.length,
      exportedAt: new Date().toISOString(),
      questions: quizQuestions
    };

    // Create output filename
    const filename = outputFile || `${languageCode}-quiz-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`Quiz questions exported to: ${filename}`);
    return filename;
    
  } catch (error) {
    console.error('Error exporting language quiz:', error);
    throw error;
  }
}

// Example usage function
async function example(): Promise<void> {
  try {
    // First, let's see what users exist
    const allUsers = await db.select({ userId: vocabulary.userId }).from(vocabulary).groupBy(vocabulary.userId).limit(5);
    console.log('Users with vocabulary:', allUsers.map(u => u.userId));
    
    if (allUsers.length === 0) {
      console.log('No users found with vocabulary');
      return;
    }
    
    // Use the first user that has vocabulary
    const testUserId = allUsers[0].userId;
    console.log(`\nTesting with user ID: ${testUserId}`);
    
    // Get vocabulary for this user
    const userVocabIds = await getUserVocabularyIds(testUserId, 3);
    console.log('User vocabulary IDs:', userVocabIds);
    
    if (userVocabIds.length > 0) {
      // Generate a quiz question for the first vocabulary item
      const question = await generateQuizQuestion(userVocabIds[0]);
      console.log('\nGenerated Quiz Question:');
      console.log(JSON.stringify(question, null, 2));

      // Generate multiple questions
      const questions = await generateQuizQuestions(userVocabIds);
      console.log('\nAll generated quiz questions:');
      questions.forEach((q, index) => {
        console.log(`\nQuestion ${index + 1}:`);
        console.log(JSON.stringify(q, null, 2));
      });
    } else {
      console.log('No vocabulary found for this user');
    }

    // Example: Get due vocabulary
    const dueVocabIds = await getDueVocabularyIds(testUserId, 5);
    console.log('\nDue vocabulary IDs:', dueVocabIds);

  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/quiz-generator.ts <language-code> [output-file]');
    console.log('Example: npx tsx scripts/quiz-generator.ts fr');
    console.log('Example: npx tsx scripts/quiz-generator.ts es spanish-quiz.json');
    process.exit(1);
  }

  const languageCode = args[0];
  const outputFile = args[1];

  try {
    const exportedFile = await exportLanguageQuiz(languageCode, outputFile);
    if (exportedFile) {
      console.log('✅ Export completed successfully!');
    } else {
      console.log('❌ No data to export');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run main function if this script is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('quiz-generator.ts');
if (isMainModule) {
  main();
}

// Uncomment to run example
// example();