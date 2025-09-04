import 'dotenv/config';
import { db } from "../server/db.js";
import { sections, modules, lessons } from "../shared/schema.js";

interface ExampleData {
  sections: Array<{
    language: string;
    difficulty: string;
    order: number;
    title: string;
    description: string;
    isFree: boolean;
    modules: Array<{
      order: number;
      title: string;
      description: string;
      isFree: boolean;
      lessons: Array<{
        language: string;
        difficulty: string;
        order: number;
        isFree: boolean;
        title: string;
        vocabulary: Array<{ word: string; translation: string; exampleSentence?: string }>;
      }>;
    }>;
  }>;
}

const exampleData: ExampleData = {
  sections: [
    {
      language: 'de',
      difficulty: 'A1',
      order: 1,
      title: 'Basics',
      description: 'Essential German words and phrases for beginners',
      isFree: true,
      modules: [
        {
          order: 1,
          title: 'Greetings & Introductions',
          description: 'Learn how to say hello and introduce yourself',
          isFree: true,
          lessons: [
            {
              language: 'de',
              difficulty: 'A1',
              order: 1,
              isFree: true,
              title: 'Basic Greetings',
              vocabulary: [
                { word: 'Hallo', translation: 'Hello', exampleSentence: 'Hallo, wie geht es dir?' },
                { word: 'Tschüss', translation: 'Bye', exampleSentence: 'Tschüss, bis morgen!' },
                { word: 'Guten Morgen', translation: 'Good morning', exampleSentence: 'Guten Morgen, haben Sie gut geschlafen?' },
                { word: 'Guten Tag', translation: 'Good day', exampleSentence: 'Guten Tag, schönes Wetter heute!' },
                { word: 'Gute Nacht', translation: 'Good night', exampleSentence: 'Gute Nacht, träum süß!' }
              ]
            },
            {
              language: 'de',
              difficulty: 'A1',
              order: 2,
              isFree: true,
              title: 'Introducing Yourself',
              vocabulary: [
                { word: 'ich bin', translation: 'I am', exampleSentence: 'Ich bin Maria aus Spanien.' },
                { word: 'mein Name ist', translation: 'my name is', exampleSentence: 'Mein Name ist Thomas.' },
                { word: 'wie heißt du', translation: 'what is your name', exampleSentence: 'Wie heißt du denn?' },
                { word: 'woher kommst du', translation: 'where are you from', exampleSentence: 'Woher kommst du ursprünglich?' },
                { word: 'ich komme aus', translation: 'I come from', exampleSentence: 'Ich komme aus Deutschland.' }
              ]
            }
          ]
        },
        {
          order: 2,
          title: 'Numbers & Colors',
          description: 'Learn basic numbers and common colors',
          isFree: true,
          lessons: [
            {
              language: 'de',
              difficulty: 'A1',
              order: 1,
              isFree: true,
              title: 'Numbers 1-10',
              vocabulary: [
                { word: 'eins', translation: 'one', exampleSentence: 'Ich habe eins Buch.' },
                { word: 'zwei', translation: 'two', exampleSentence: 'Zwei Kaffee, bitte.' },
                { word: 'drei', translation: 'three', exampleSentence: 'Es sind drei Uhr.' },
                { word: 'vier', translation: 'four', exampleSentence: 'Ich habe vier Geschwister.' },
                { word: 'fünf', translation: 'five', exampleSentence: 'Das kostet fünf Euro.' }
              ]
            },
            {
              language: 'de',
              difficulty: 'A1',
              order: 2,
              isFree: false,
              title: 'Basic Colors',
              vocabulary: [
                { word: 'rot', translation: 'red', exampleSentence: 'Das Auto ist rot.' },
                { word: 'blau', translation: 'blue', exampleSentence: 'Der Himmel ist blau.' },
                { word: 'grün', translation: 'green', exampleSentence: 'Die Bäume sind grün.' },
                { word: 'gelb', translation: 'yellow', exampleSentence: 'Die Sonne ist gelb.' },
                { word: 'schwarz', translation: 'black', exampleSentence: 'Meine Katze ist schwarz.' }
              ]
            }
          ]
        }
      ]
    },
    {
      language: 'de',
      difficulty: 'A1',
      order: 2,
      title: 'Daily Life',
      description: 'Vocabulary for everyday situations and activities',
      isFree: false,
      modules: [
        {
          order: 1,
          title: 'Food & Drinks',
          description: 'Essential vocabulary for restaurants and shopping',
          isFree: false,
          lessons: [
            {
              language: 'de',
              difficulty: 'A1',
              order: 1,
              isFree: false,
              title: 'At the Restaurant',
              vocabulary: [
                { word: 'das Restaurant', translation: 'restaurant', exampleSentence: 'Wir gehen ins Restaurant.' },
                { word: 'die Speisekarte', translation: 'menu', exampleSentence: 'Können wir die Speisekarte haben?' },
                { word: 'bestellen', translation: 'to order', exampleSentence: 'Ich möchte bestellen.' },
                { word: 'das Essen', translation: 'food', exampleSentence: 'Das Essen schmeckt gut.' },
                { word: 'trinken', translation: 'to drink', exampleSentence: 'Was möchten Sie trinken?' }
              ]
            },
            {
              language: 'de',
              difficulty: 'A1',
              order: 2,
              isFree: false,
              title: 'Common Foods',
              vocabulary: [
                { word: 'das Brot', translation: 'bread', exampleSentence: 'Ich esse Brot zum Frühstück.' },
                { word: 'die Milch', translation: 'milk', exampleSentence: 'Die Milch ist frisch.' },
                { word: 'der Käse', translation: 'cheese', exampleSentence: 'Dieser Käse schmeckt lecker.' },
                { word: 'das Fleisch', translation: 'meat', exampleSentence: 'Ich esse kein Fleisch.' },
                { word: 'das Gemüse', translation: 'vegetables', exampleSentence: 'Gemüse ist gesund.' }
              ]
            }
          ]
        },
        {
          order: 2,
          title: 'Family & Friends',
          description: 'Talk about your family and relationships',
          isFree: false,
          lessons: [
            {
              language: 'de',
              difficulty: 'A1',
              order: 1,
              isFree: false,
              title: 'Family Members',
              vocabulary: [
                { word: 'die Familie', translation: 'family', exampleSentence: 'Meine Familie ist groß.' },
                { word: 'die Mutter', translation: 'mother', exampleSentence: 'Meine Mutter ist Ärztin.' },
                { word: 'der Vater', translation: 'father', exampleSentence: 'Mein Vater arbeitet im Büro.' },
                { word: 'der Bruder', translation: 'brother', exampleSentence: 'Mein Bruder ist älter als ich.' },
                { word: 'die Schwester', translation: 'sister', exampleSentence: 'Ich habe eine Schwester.' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

async function seedHierarchicalLessons() {
  try {
    console.log('🌱 Starting hierarchical lessons seed...');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing hierarchical data...');
    await db.delete(lessons);
    await db.delete(modules);  
    await db.delete(sections);
    
    let totalSections = 0;
    let totalModules = 0;
    let totalLessons = 0;
    
    for (const sectionData of exampleData.sections) {
      console.log(`📚 Creating section: ${sectionData.title}`);
      
      // Create section
      const [section] = await db
        .insert(sections)
        .values({
          language: sectionData.language,
          difficulty: sectionData.difficulty,
          order: sectionData.order,
          title: sectionData.title,
          description: sectionData.description,
          isFree: sectionData.isFree
        })
        .returning();
        
      totalSections++;
      
      for (const moduleData of sectionData.modules) {
        console.log(`  📖 Creating module: ${moduleData.title}`);
        
        // Create module
        const [module] = await db
          .insert(modules)
          .values({
            sectionId: section.id,
            order: moduleData.order,
            title: moduleData.title,
            description: moduleData.description,
            isFree: moduleData.isFree
          })
          .returning();
          
        totalModules++;
        
        for (const lessonData of moduleData.lessons) {
          console.log(`    📝 Creating lesson: ${lessonData.title}`);
          
          // Create lesson
          await db
            .insert(lessons)
            .values({
              moduleId: module.id,
              language: lessonData.language,
              difficulty: lessonData.difficulty,
              order: lessonData.order,
              isFree: lessonData.isFree,
              title: lessonData.title,
              vocabulary: lessonData.vocabulary
            });
            
          totalLessons++;
        }
      }
    }
    
    console.log('\n🎉 Hierarchical lessons seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • ${totalSections} sections created`);
    console.log(`   • ${totalModules} modules created`);
    console.log(`   • ${totalLessons} lessons created`);
    console.log(`\n🚀 You can now view the hierarchical structure at /lessons`);
    
  } catch (error) {
    console.error('❌ Error seeding hierarchical lessons:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHierarchicalLessons()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedHierarchicalLessons };