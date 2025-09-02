import 'dotenv/config';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { db } from '../server/db';
import { lessons } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface VocabularyItem {
  word: string;
  translation: string;
}

interface LessonData {
  order: number;
  isFree: boolean;
  title: string;
  description?: string;
  vocabulary: VocabularyItem[];
  songId?: number;
}

interface CourseData {
  course: {
    language: string;
    difficulty: string;
    title: string;
    description: string;
  };
  lessons: LessonData[];
}

async function loadLessonsFromFile(filePath: string) {
  console.log(`📖 Loading lessons from: ${filePath}`);
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const courseData: CourseData = JSON.parse(fileContent);
    
    console.log(`📚 Found course: ${courseData.course.title} (${courseData.course.language} ${courseData.course.difficulty})`);
    console.log(`📝 Lessons to import: ${courseData.lessons.length}`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const lessonData of courseData.lessons) {
      try {
        // Check if lesson already exists
        const [existingLesson] = await db
          .select()
          .from(lessons)
          .where(and(
            eq(lessons.language, courseData.course.language),
            eq(lessons.difficulty, courseData.course.difficulty),
            eq(lessons.order, lessonData.order)
          ));
        
        if (existingLesson) {
          console.log(`⏭️  Skipping lesson ${lessonData.order}: "${lessonData.title}" (already exists)`);
          skippedCount++;
          continue;
        }
        
        // Create the lesson
        const [newLesson] = await db
          .insert(lessons)
          .values({
            language: courseData.course.language,
            difficulty: courseData.course.difficulty,
            order: lessonData.order,
            isFree: lessonData.isFree,
            title: lessonData.title,
            songId: lessonData.songId || null,
            vocabulary: lessonData.vocabulary,
          })
          .returning();
        
        console.log(`✅ Created lesson ${newLesson.order}: "${newLesson.title}" (${lessonData.vocabulary.length} vocabulary words, ${lessonData.isFree ? 'FREE' : 'PREMIUM'})`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Error importing lesson "${lessonData.title}":`, error);
      }
    }
    
    console.log(`\n📊 Import Summary for ${courseData.course.title}:`);
    console.log(`   ✅ Imported: ${importedCount} lessons`);
    console.log(`   ⏭️  Skipped: ${skippedCount} lessons`);
    console.log(`   📖 Total vocabulary words: ${courseData.lessons.reduce((sum, lesson) => sum + lesson.vocabulary.length, 0)}`);
    
    return { imported: importedCount, skipped: skippedCount };
    
  } catch (error) {
    console.error(`❌ Error loading file ${filePath}:`, error);
    return { imported: 0, skipped: 0 };
  }
}

async function loadAllLessons() {
  console.log('🚀 Starting lesson import process...\n');
  
  const lessonsDir = join(process.cwd(), 'lessons');
  let totalImported = 0;
  let totalSkipped = 0;
  
  try {
    // Get all language directories
    const languageDirs = readdirSync(lessonsDir).filter(item => {
      const itemPath = join(lessonsDir, item);
      return statSync(itemPath).isDirectory();
    });
    
    console.log(`🔍 Found language directories: ${languageDirs.join(', ')}\n`);
    
    for (const langDir of languageDirs) {
      const langPath = join(lessonsDir, langDir);
      
      // Get all JSON files in the language directory
      const jsonFiles = readdirSync(langPath)
        .filter(file => extname(file).toLowerCase() === '.json')
        .map(file => join(langPath, file));
      
      console.log(`📁 Processing ${langDir} lessons: ${jsonFiles.length} file(s)`);
      
      for (const jsonFile of jsonFiles) {
        const result = await loadLessonsFromFile(jsonFile);
        totalImported += result.imported;
        totalSkipped += result.skipped;
      }
      
      console.log(''); // Empty line between languages
    }
    
    console.log('🎉 Lesson import completed!');
    console.log(`\n📊 Overall Summary:`);
    console.log(`   ✅ Total imported: ${totalImported} lessons`);
    console.log(`   ⏭️  Total skipped: ${totalSkipped} lessons`);
    
  } catch (error) {
    console.error('❌ Error during lesson import process:', error);
  }
}

// Simple direct execution check for Node.js
if (process.argv[1] && process.argv[1].endsWith('load-lessons.ts')) {
  loadAllLessons()
    .then(() => {
      console.log('\n✨ Import process finished. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { loadAllLessons, loadLessonsFromFile };