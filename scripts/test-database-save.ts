import { db } from '../server/db.js';
import { songs } from '../shared/schema.js';

async function testDatabaseSave() {
  console.log("Testing database save functionality...");
  
  const testSong = {
    title: "Test Song",
    artist: "Test Artist",
    genre: "Pop",
    language: "English",
    difficulty: "A1",
    rating: 0,
    albumCover: null,
    audioUrl: "https://www.youtube.com/watch?v=test123",
    duration: 180,
    lyrics: [
      {
        text: "This is a test line",
        timestamp: 0,
        translation: "This is a test line"
      },
      {
        text: "Another test line",
        timestamp: 5,
        translation: "Another test line"
      }
    ],
    spotifyId: "test_spotify_123",
    youtubeId: "test_youtube_456",
    keyWords: {
      "test": "test",
      "song": "song"
    }
  };

  try {
    const [savedSong] = await db.insert(songs).values(testSong).returning();
    console.log("✓ Song saved successfully to database!");
    console.log(`Song ID: ${savedSong.id}`);
    console.log(`Title: ${savedSong.title}`);
    console.log(`Artist: ${savedSong.artist}`);
    console.log(`Spotify ID: ${savedSong.spotifyId}`);
    console.log(`YouTube ID: ${savedSong.youtubeId}`);
    console.log(`Difficulty: ${savedSong.difficulty}`);
    console.log(`Key Words: ${JSON.stringify(savedSong.keyWords)}`);
    
    return savedSong;
  } catch (error) {
    console.error("✗ Failed to save song to database:", error);
    throw error;
  }
}

testDatabaseSave().catch(console.error);