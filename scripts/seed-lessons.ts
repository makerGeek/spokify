import { db } from '../server/db.ts';
import { lessons } from '../shared/schema.ts';

async function seedLessons() {
  console.log('🌱 Seeding lessons...');

  const sampleLessons = [
    {
      language: 'es',
      difficulty: 'A1',
      order: 1,
      isFree: true,
      title: 'Basic Greetings',
      vocabulary: [
        { word: 'hola', translation: 'hello' },
        { word: 'adiós', translation: 'goodbye' },
        { word: 'gracias', translation: 'thank you' },
        { word: 'por favor', translation: 'please' },
        { word: 'buenos días', translation: 'good morning' },
      ],
    },
    {
      language: 'es',
      difficulty: 'A1',
      order: 2,
      isFree: true,
      title: 'Family Members',
      vocabulary: [
        { word: 'familia', translation: 'family' },
        { word: 'madre', translation: 'mother' },
        { word: 'padre', translation: 'father' },
        { word: 'hermano', translation: 'brother' },
        { word: 'hermana', translation: 'sister' },
        { word: 'abuelo', translation: 'grandfather' },
      ],
    },
    {
      language: 'es',
      difficulty: 'A1',
      order: 3,
      isFree: false,
      title: 'Colors and Objects',
      vocabulary: [
        { word: 'rojo', translation: 'red' },
        { word: 'azul', translation: 'blue' },
        { word: 'verde', translation: 'green' },
        { word: 'mesa', translation: 'table' },
        { word: 'silla', translation: 'chair' },
        { word: 'libro', translation: 'book' },
      ],
    },
    {
      language: 'es',
      difficulty: 'A1',
      order: 4,
      isFree: false,
      title: 'Food and Drinks',
      vocabulary: [
        { word: 'comida', translation: 'food' },
        { word: 'agua', translation: 'water' },
        { word: 'pan', translation: 'bread' },
        { word: 'fruta', translation: 'fruit' },
        { word: 'leche', translation: 'milk' },
        { word: 'café', translation: 'coffee' },
      ],
    },
    {
      language: 'fr',
      difficulty: 'A1',
      order: 1,
      isFree: true,
      title: 'Salutations de Base',
      vocabulary: [
        { word: 'bonjour', translation: 'hello' },
        { word: 'au revoir', translation: 'goodbye' },
        { word: 'merci', translation: 'thank you' },
        { word: 's\'il vous plaît', translation: 'please' },
        { word: 'bonsoir', translation: 'good evening' },
      ],
    },
    {
      language: 'fr',
      difficulty: 'A1',
      order: 2,
      isFree: true,
      title: 'Membres de la Famille',
      vocabulary: [
        { word: 'famille', translation: 'family' },
        { word: 'mère', translation: 'mother' },
        { word: 'père', translation: 'father' },
        { word: 'frère', translation: 'brother' },
        { word: 'sœur', translation: 'sister' },
        { word: 'grand-père', translation: 'grandfather' },
      ],
    },
  ];

  try {
    for (const lesson of sampleLessons) {
      const [inserted] = await db
        .insert(lessons)
        .values(lesson)
        .returning();
      
      console.log(`✅ Created lesson: ${inserted.title} (${inserted.language} ${inserted.difficulty})`);
    }

    console.log('🎉 Lesson seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding lessons:', error);
  }
}

// Run the seeding function
seedLessons().then(() => process.exit(0));