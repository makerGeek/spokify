// Load environment variables from .env file FIRST, before any other imports
import 'dotenv/config';

import { importSong } from '../server/services/song-import.js';

// Main function to run the script
async function main() {
  // Join all arguments after the script name to handle song names with spaces
  const songName = process.argv.slice(2).join(' ');
  
  if (!songName) {
    console.log('Usage: npx tsx scripts/import_song.ts "Song Name"');
    console.log('Example: npx tsx scripts/import_song.ts "Despacito"');
    process.exit(1);
  }
  
  console.log(`Searching for: "${songName}"\n`);
  
  try {
    const result = await importSong(songName);
    
    if (result.success) {
      console.log('\n=== IMPORT SUCCESSFUL ===');
      console.log(`Song: ${result.song.title}`);
      console.log(`Artist: ${result.song.artist}`);
      console.log(`Spotify ID: ${result.song.spotifyId}`);
      console.log(`YouTube ID: ${result.song.youtubeId || 'Not found'}`);
      console.log(`Language: ${result.song.language}`);
      console.log(`Genre: ${result.song.genre}`);
      console.log(`Difficulty: ${result.song.difficulty}`);
      console.log(`Duration: ${result.song.duration ? Math.floor(result.song.duration / 60) + ':' + String(result.song.duration % 60).padStart(2, '0') : 'Unknown'}`);
      console.log(`Lyrics: ${result.song.lyrics ? result.song.lyrics.length + ' lines' : 'No lyrics'}`);
      console.log(`Album Cover: ${result.song.albumCover ? 'Yes' : 'No'}`);
      console.log(`Audio URL: ${result.song.audioUrl ? 'Yes' : 'No'}`);
      console.log(`Key Words: ${result.song.keyWords ? Object.keys(result.song.keyWords).length : 0} found`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('\n=== WARNINGS ===');
        result.warnings.forEach(warning => console.log(`⚠️  ${warning}`));
      }
      
      if (result.song.lyrics && result.song.lyrics.length > 0) {
        console.log('\n=== LYRICS SAMPLE ===');
        console.log('First 3 lines:');
        result.song.lyrics.slice(0, 3).forEach((line: any, index: number) => {
          console.log(`${index + 1}. [${line.timestamp}s] ${line.text}`);
          if (line.translation && line.translation !== line.text) {
            console.log(`   → ${line.translation}`);
          }
        });
      }
      
      if (result.song.keyWords && Object.keys(result.song.keyWords).length > 0) {
        console.log('\n=== KEY VOCABULARY SAMPLE ===');
        const keyWordsSample = Object.entries(result.song.keyWords).slice(0, 5);
        keyWordsSample.forEach(([word, translation]) => {
          console.log(`  ${word} → ${translation}`);
        });
      }
      
    } else {
      console.log('\n=== IMPORT FAILED ===');
      console.log(`Error: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n=== UNEXPECTED ERROR ===');
    console.error(error);
    process.exit(1);
  }
  
  // Force exit to close database connection pool
  process.exit(0);
}

// Run the script if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const currentFile = resolve(process.argv[1]);

if (__filename === currentFile) {
  main().catch(console.error);
}