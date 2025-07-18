import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(spawn);

interface ImportResult {
  song: string;
  success: boolean;
  error?: string;
}

async function importSong(songQuery: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    console.log(`🎵 Starting import for: "${songQuery}"`);
    
    const child = spawn('npx', ['tsx', 'scripts/import_song.ts', songQuery], {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Successfully imported: "${songQuery}"`);
        resolve({ song: songQuery, success: true });
      } else {
        console.error(`❌ Failed to import: "${songQuery}"`);
        console.error(`Error output: ${stderr}`);
        resolve({ song: songQuery, success: false, error: stderr });
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error importing "${songQuery}": ${error.message}`);
      resolve({ song: songQuery, success: false, error: error.message });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/import_bulk.ts "song1,song2,song3"');
    console.error('Example: npx tsx scripts/import_bulk.ts "Despacito Luis Fonsi,Shape of You Ed Sheeran,Blinding Lights The Weeknd"');
    process.exit(1);
  }

  // Parse comma-separated songs
  const songsInput = args.join(' ');
  const songs = songsInput.split(',').map(song => song.trim()).filter(song => song.length > 0);

  if (songs.length === 0) {
    console.error('No songs provided. Please provide comma-separated song queries.');
    process.exit(1);
  }

  console.log(`🚀 Starting bulk import for ${songs.length} songs:`);
  songs.forEach((song, index) => {
    console.log(`  ${index + 1}. "${song}"`);
  });
  console.log('');

  const startTime = Date.now();

  try {
    // Import all songs in parallel
    const results = await Promise.all(
      songs.map(song => importSong(song))
    );

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // Summary
    console.log('\n📊 Import Summary:');
    console.log('==================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful imports: ${successful.length}`);
    successful.forEach(result => {
      console.log(`   - "${result.song}"`);
    });

    if (failed.length > 0) {
      console.log(`❌ Failed imports: ${failed.length}`);
      failed.forEach(result => {
        console.log(`   - "${result.song}"`);
        if (result.error) {
          console.log(`     Error: ${result.error.split('\n')[0]}`);
        }
      });
    }

    console.log(`⏱️  Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`🎯 Success rate: ${Math.round((successful.length / results.length) * 100)}%`);

    // Exit with error code if any imports failed
    if (failed.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    process.exit(1);
  }
}

main();