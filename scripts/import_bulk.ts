import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(spawn);

// ============================================================================
// CONFIGURATION: Change this boolean to control execution mode
// ============================================================================
// true:  Sequential execution - Shows full output from each import_song script
//        Slower but provides detailed logs for debugging
// false: Parallel execution - Minimal output, faster processing
//        Better for bulk imports when you trust the process works
const SEQUENTIAL_EXECUTION = true;

interface ImportResult {
  song: string;
  success: boolean;
  error?: string;
}

async function importSong(songQuery: string, showOutput: boolean = false): Promise<ImportResult> {
  return new Promise((resolve) => {
    console.log(`🎵 Starting import for: "${songQuery}"`);
    
    const child = spawn('npx', ['tsx', 'scripts/import_song.ts', songQuery], {
      stdio: showOutput ? 'inherit' : 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    if (!showOutput) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        if (!showOutput) {
          console.log(`✅ Successfully imported: "${songQuery}"`);
        } else {
          console.log(`\n✅ Successfully completed import for: "${songQuery}"\n`);
        }
        resolve({ song: songQuery, success: true });
      } else {
        if (!showOutput) {
          console.error(`❌ Failed to import: "${songQuery}"`);
          console.error(`Error output: ${stderr}`);
        } else {
          console.error(`\n❌ Failed to import: "${songQuery}"\n`);
        }
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
    console.error('');
    console.error('Configuration:');
    console.error('  - Edit SEQUENTIAL_EXECUTION at the top of this file to control execution mode');
    console.error('  - true: Sequential execution with full output from import_song script');
    console.error('  - false: Parallel execution with minimal output (faster but less detailed)');
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
  
  console.log(`📋 Execution mode: ${SEQUENTIAL_EXECUTION ? 'Sequential (with full output)' : 'Parallel (minimal output)'}`);
  console.log('');

  const startTime = Date.now();

  try {
    let results: ImportResult[];
    
    if (SEQUENTIAL_EXECUTION) {
      // Import songs sequentially with full output
      console.log('🔄 Processing songs sequentially...\n');
      results = [];
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        console.log(`\n================== Song ${i + 1}/${songs.length} ==================`);
        console.log(`Processing: "${song}"`);
        console.log('============================================\n');
        
        const result = await importSong(song, true);
        results.push(result);
        
        if (i < songs.length - 1) {
          console.log('\n' + '='.repeat(50) + '\n');
        }
      }
    } else {
      // Import all songs in parallel
      console.log('⚡ Processing songs in parallel...\n');
      results = await Promise.all(
        songs.map(song => importSong(song, false))
      );
    }

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