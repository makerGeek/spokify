import { assessLyricsDifficulty } from '../server/services/gemini.js';

async function testDifficultyAssessment() {
  console.log("Testing Gemini difficulty assessment...");
  
  const spanishLyrics = [
    {
      "startMs": 70,
      "durMs": 3930,
      "text": "¿Qué horas son, mi corazón?"
    },
    {
      "startMs": 4000,
      "durMs": 2170,
      "text": "Te lo dije bien clarito"
    },
    {
      "startMs": 6170,
      "durMs": 3240,
      "text": "Que no me gustas tanto"
    },
    {
      "startMs": 9410,
      "durMs": 2890,
      "text": "Como tú crees"
    }
  ];

  try {
    const result = await assessLyricsDifficulty(spanishLyrics);
    console.log("Difficulty assessment successful:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Difficulty assessment failed:", error);
  }
}

testDifficultyAssessment().catch(console.error);