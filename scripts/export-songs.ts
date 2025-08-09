// Load environment variables from .env file FIRST, before any other imports
import 'dotenv/config';

import { db } from '../server/db.js';
import { songs } from '../shared/schema.js';
import { eq, isNotNull, or, and } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface ExportFilters {
  genre?: string;
  language?: string;
  difficulty?: string;
  isFree?: boolean;
  includeDuplicates?: boolean;
}

// Main function to export songs
async function exportSongs(filters: ExportFilters = {}, outputPath?: string) {
  try {
    console.log('🎵 Starting songs export...\n');
    
    // Build query conditions
    let query = db.select().from(songs);
    const conditions: any[] = [];
    
    // Apply filters (dynamically check if fields exist)
    if (filters.genre && 'genre' in songs) {
      conditions.push(eq(songs.genre, filters.genre));
      console.log(`📁 Filter: Genre = "${filters.genre}"`);
    }
    
    if (filters.language && 'language' in songs) {
      conditions.push(eq(songs.language, filters.language));
      console.log(`🌍 Filter: Language = "${filters.language}"`);
    }
    
    if (filters.difficulty && 'difficulty' in songs) {
      conditions.push(eq(songs.difficulty, filters.difficulty));
      console.log(`📊 Filter: Difficulty = "${filters.difficulty}"`);
    }
    
    if (filters.isFree !== undefined && 'isFree' in songs) {
      conditions.push(eq(songs.isFree, filters.isFree));
      console.log(`💰 Filter: Free songs only = ${filters.isFree}`);
    }
    
    if (!filters.includeDuplicates && 'isDuplicate' in songs) {
      conditions.push(eq(songs.isDuplicate, false));
      console.log(`🔄 Filter: Excluding duplicates`);
    }
    
    // Always exclude songs without Spotify ID OR YouTube ID (faulty songs)
    if ('spotifyId' in songs && 'youtubeId' in songs) {
      conditions.push(
        or(
          isNotNull(songs.spotifyId),
          isNotNull(songs.youtubeId)
        )
      );
      console.log(`🚫 Filter: Excluding songs without Spotify ID OR YouTube ID`);
    }
    
    // Execute query with conditions
    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)
      );
    }
    
    const exportedSongs = await query;
    
    if (exportedSongs.length === 0) {
      console.log('❌ No songs found matching the specified criteria.');
      return;
    }
    
    console.log(`\n✅ Found ${exportedSongs.length} songs to export`);
    
    // Prepare export data with metadata - export all fields dynamically
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        totalSongs: exportedSongs.length,
        filters: filters,
        version: '1.0',
        schemaVersion: 'dynamic' // Indicates this is a schema-agnostic export
      },
      songs: exportedSongs.map(song => {
        // Create a clean copy of the song object, excluding only the auto-increment ID
        const { id, ...songData } = song;
        return songData;
      })
    };
    
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `songs-export-${timestamp}.json`;
    const filename = outputPath || defaultFilename;
    const fullPath = resolve(filename);
    
    // Write to file
    writeFileSync(fullPath, JSON.stringify(exportData, null, 2), 'utf-8');
    
    console.log(`\n📦 Export completed successfully!`);
    console.log(`📁 File saved to: ${fullPath}`);
    console.log(`📊 Total songs exported: ${exportedSongs.length}`);
    
    // Show breakdown by category (schema-agnostic)
    const summary: Record<string, any> = {};
    
    // Generate summary for common fields if they exist
    const summarizeField = (fieldName: string, displayName: string) => {
      if (exportedSongs.length > 0 && fieldName in exportedSongs[0]) {
        const count = exportedSongs.reduce((acc, song) => {
          const value = (song as any)[fieldName];
          if (value !== null && value !== undefined) {
            acc[String(value)] = (acc[String(value)] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        if (Object.keys(count).length > 0) {
          summary[fieldName] = count;
          console.log(`  ${displayName}:`, Object.entries(count).map(([k, v]) => `${k}: ${v}`).join(', '));
        }
      }
    };
    
    console.log('\n📈 Export Summary:');
    summarizeField('genre', 'Genres');
    summarizeField('language', 'Languages');
    summarizeField('difficulty', 'Difficulty');
    
    // Handle boolean fields specially
    if (exportedSongs.length > 0 && 'isFree' in exportedSongs[0]) {
      const freeCount = exportedSongs.filter((song: any) => song.isFree === true).length;
      const premiumCount = exportedSongs.length - freeCount;
      console.log(`  Free: ${freeCount}, Premium: ${premiumCount}`);
      summary.freeVsPremium = { free: freeCount, premium: premiumCount };
    }
    
    return {
      success: true,
      filename: fullPath,
      songsExported: exportedSongs.length,
      summary
    };
    
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const filters: ExportFilters = {};
  let outputPath: string | undefined;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--genre':
        filters.genre = value;
        break;
      case '--language':
        filters.language = value;
        break;
      case '--difficulty':
        filters.difficulty = value;
        break;
      case '--free':
        filters.isFree = value === 'true';
        break;
      case '--include-duplicates':
        filters.includeDuplicates = value === 'true';
        break;
      case '--output':
      case '-o':
        outputPath = value;
        break;
      case '--help':
      case '-h':
        console.log(`
🎵 Spokify Songs Export Tool

Usage: npx tsx scripts/export-songs.ts [options]

Options:
  --genre <genre>           Export only songs of specific genre
  --language <language>     Export only songs in specific language
  --difficulty <difficulty> Export only songs with specific difficulty (A1, A2, B1, B2, C1, C2)
  --free <true|false>       Export only free songs (true) or premium songs (false)
  --include-duplicates <true|false> Include duplicate songs (default: false)
  --output, -o <path>       Output file path (default: songs-export-TIMESTAMP.json)
  --help, -h                Show this help message

Note: Songs without Spotify ID OR YouTube ID are automatically excluded as faulty.

Examples:
  # Export all songs (excluding duplicates)
  npx tsx scripts/export-songs.ts
  
  # Export only Spanish songs
  npx tsx scripts/export-songs.ts --language es
  
  # Export only free Pop songs
  npx tsx scripts/export-songs.ts --genre Pop --free true
  
  # Export to specific file
  npx tsx scripts/export-songs.ts --output my-songs.json
  
  # Export beginner Spanish songs
  npx tsx scripts/export-songs.ts --language es --difficulty A1 --difficulty A2
        `);
        process.exit(0);
        break;
      default:
        if (flag.startsWith('--')) {
          console.log(`❌ Unknown option: ${flag}`);
          console.log('Use --help to see available options.');
          process.exit(1);
        }
        break;
    }
  }
  
  try {
    await exportSongs(filters, outputPath);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
  
  // Force exit to close database connection pool
  process.exit(0);
}

// Run the script if called directly
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const currentFile = resolve(process.argv[1]);

if (__filename === currentFile) {
  main().catch(console.error);
}

export { exportSongs };