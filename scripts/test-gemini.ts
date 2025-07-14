import { translateLyrics } from '../server/services/gemini.js';

async function testGemini() {
  console.log("Testing Gemini translation with simple lyrics...");
  
  const simpleLyrics = JSON.stringify([
    {
      "startMs": 6440,
      "durMs": 2130,
      "text": "Hello"
    },
    {
      "startMs": 8570,
      "durMs": 4090,
      "text": "How are you today?"
    }
  ]);

  try {
    const result = await translateLyrics(simpleLyrics, "Spanish");
    console.log("Translation successful:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Translation failed:", error);
  }
}

testGemini().catch(console.error);