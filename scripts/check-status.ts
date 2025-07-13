import { db } from '../server/db';
import { songs } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkStatus() {
  try {
    const songData = await db.select().from(songs).where(eq(songs.id, 7)).limit(1);
    if (!songData.length) {
      console.log('Song not found');
      return;
    }

    const song = songData[0];
    const lyrics = JSON.parse(song.lyrics);
    
    console.log(`99 Luftballons status:`);
    console.log(`- Total lines: ${lyrics.length}`);
    console.log(`- Data size: ${song.lyrics.length} characters`);
    
    // Check translation status
    const hasTranslations = lyrics.some((line: any) => 
      line.translation && 
      line.translation.length > 5 && 
      !line.translation.includes('[Translation')
    );
    
    console.log(`- Has AI translations: ${hasTranslations}`);
    
    if (lyrics.length > 0) {
      console.log('\nFirst 3 examples:');
      lyrics.slice(0, 3).forEach((line: any, i: number) => {
        console.log(`${i+1}. Original: "${line.text}"`);
        console.log(`   Translation: "${line.translation}"`);
        console.log(`   Timestamp: ${line.timestamp}s\n`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStatus();