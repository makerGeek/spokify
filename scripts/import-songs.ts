// Load environment variables from .env file FIRST, before any other imports
import 'dotenv/config';

import { db } from '../server/db.js';
import { songs } from '../shared/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  dryRun?: boolean;
  skipValidation?: boolean;
}

interface ImportStats {
  totalSongs: number;
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}

interface ExportedSong {
  [key: string]: any; // Schema-agnostic
}

interface ExportData {
  exportMetadata?: {
    exportedAt: string;
    totalSongs: number;
    version: string;
    schemaVersion?: string;
  };
  songs: ExportedSong[];
}

// Main function to import songs
async function importSongs(filePath: string, options: ImportOptions = {}) {
  const {
    skipDuplicates = true,
    updateExisting = false,
    dryRun = false,
    skipValidation = false
  } = options;
  
  const stats: ImportStats = {
    totalSongs: 0,
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    console.log('🎵 Starting songs import...\n');
    
    // Check if file exists
    const fullPath = resolve(filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    
    // Read and parse the export file
    console.log(`📁 Reading file: ${fullPath}`);
    const fileContent = readFileSync(fullPath, 'utf-8');
    let exportData: ExportData;
    
    try {
      exportData = JSON.parse(fileContent);
    } catch (parseError) {
      throw new Error(`Invalid JSON format: ${parseError}`);
    }
    
    // Validate export data structure
    if (!exportData.songs || !Array.isArray(exportData.songs)) {
      throw new Error('Invalid export format: missing songs array');
    }
    
    stats.totalSongs = exportData.songs.length;
    
    if (exportData.exportMetadata) {
      console.log('📋 Export metadata:');
      console.log(`  Exported at: ${exportData.exportMetadata.exportedAt}`);
      console.log(`  Total songs: ${exportData.exportMetadata.totalSongs}`);
      console.log(`  Version: ${exportData.exportMetadata.version || 'unknown'}`);
      console.log(`  Schema: ${exportData.exportMetadata.schemaVersion || 'legacy'}`);
    }
    
    console.log(`\n🎯 Import options:`);
    console.log(`  Skip duplicates: ${skipDuplicates}`);
    console.log(`  Update existing: ${updateExisting}`);
    console.log(`  Dry run: ${dryRun}`);
    console.log(`  Skip validation: ${skipValidation}`);
    
    if (dryRun) {
      console.log(`\n⚠️  DRY RUN MODE - No changes will be made\n`);
    }
    
    console.log(`\n🔄 Processing ${stats.totalSongs} songs...\n`);
    
    // Process each song
    for (let i = 0; i < exportData.songs.length; i++) {
      const songData = exportData.songs[i];
      const songNumber = i + 1;
      
      try {
        console.log(`[${songNumber}/${stats.totalSongs}] Processing: ${songData.title || 'Unknown'} - ${songData.artist || 'Unknown'}`);
        
        // Basic validation if not skipped
        if (!skipValidation) {
          if (!songData.title || !songData.artist) {
            throw new Error('Missing required fields: title or artist');
          }
          
          // Validate that song has at least Spotify ID OR YouTube ID
          if (!songData.spotifyId && !songData.youtubeId) {
            throw new Error('Faulty song: missing both Spotify ID and YouTube ID');
          }
        }
        
        // Check for existing songs using proper duplicate detection
        // A song is considered duplicate if it has BOTH the same Spotify ID AND YouTube ID
        let existingSongs: any[] = [];
        
        // Since we now require songs to have at least one ID, we can use more precise matching
        if (songData.spotifyId && songData.youtubeId && 'spotifyId' in songs && 'youtubeId' in songs) {
          // Both IDs present - check for exact match
          existingSongs = await db
            .select()
            .from(songs)
            .where(
              and(
                eq(songs.spotifyId, songData.spotifyId),
                eq(songs.youtubeId, songData.youtubeId)
              )
            );
        } else if (songData.spotifyId && !songData.youtubeId && 'spotifyId' in songs && 'youtubeId' in songs) {
          // Only Spotify ID - check for songs with same Spotify ID and no YouTube ID
          existingSongs = await db
            .select()
            .from(songs)
            .where(
              and(
                eq(songs.spotifyId, songData.spotifyId),
                songs.youtubeId === null
              )
            );
        } else if (!songData.spotifyId && songData.youtubeId && 'spotifyId' in songs && 'youtubeId' in songs) {
          // Only YouTube ID - check for songs with same YouTube ID and no Spotify ID
          existingSongs = await db
            .select()
            .from(songs)
            .where(
              and(
                songs.spotifyId === null,
                eq(songs.youtubeId, songData.youtubeId)
              )
            );
        }
        
        // Check for potential conflicts - same title+artist but different ID combination
        if (existingSongs.length === 0 && songData.title && songData.artist) {
          const conflictingSongs = await db
            .select()
            .from(songs)
            .where(
              and(
                eq(songs.title, songData.title),
                eq(songs.artist, songData.artist)
              )
            );
          
          if (conflictingSongs.length > 0) {
            console.log(`  ⚠️  Warning: Same title+artist exists with different ID combination:`);
            conflictingSongs.forEach(existing => {
              console.log(`     Existing: Spotify:${existing.spotifyId || 'null'} YouTube:${existing.youtubeId || 'null'}`);
            });
            console.log(`     Importing: Spotify:${songData.spotifyId || 'null'} YouTube:${songData.youtubeId || 'null'}`);
            console.log(`     This might be different versions of the same song.`);
          }
        }
        
        // Handle duplicates
        if (existingSongs.length > 0) {
          if (skipDuplicates && !updateExisting) {
            console.log(`  ⏭️  Skipped (duplicate found)`);
            stats.skipped++;
            continue;
          } else if (updateExisting) {
            if (!dryRun) {
              // Update existing song - schema agnostic approach
              const existingSong = existingSongs[0];
              const updateData: any = {};
              
              // Only include fields that exist in the current schema
              Object.keys(songData).forEach(key => {
                if (key in songs && key !== 'id') {
                  updateData[key] = songData[key];
                }
              });
              
              if (Object.keys(updateData).length > 0) {
                await db
                  .update(songs)
                  .set(updateData)
                  .where(eq(songs.id, existingSong.id));
                
                console.log(`  🔄 Updated existing song (ID: ${existingSong.id})`);
                stats.updated++;
              } else {
                console.log(`  ⏭️  Skipped (no compatible fields to update)`);
                stats.skipped++;
              }
            } else {
              console.log(`  🔄 Would update existing song`);
              stats.updated++;
            }
            continue;
          }
        }
        
        // Insert new song
        if (!dryRun) {
          // Schema-agnostic insert - only include fields that exist in current schema
          const insertData: any = {};
          
          Object.keys(songData).forEach(key => {
            if (key in songs && key !== 'id') {
              insertData[key] = songData[key];
            }
          });
          
          if (Object.keys(insertData).length === 0) {
            throw new Error('No compatible fields found for insertion');
          }
          
          await db.insert(songs).values(insertData);
          console.log(`  ✅ Imported successfully`);
          stats.imported++;
        } else {
          console.log(`  ✅ Would import successfully`);
          stats.imported++;
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Error: ${errorMsg}`);
        stats.errors++;
        stats.errorDetails.push(`Song ${songNumber}: ${errorMsg}`);
      }
    }
    
    // Final summary
    console.log('\n📈 Import Summary:');
    console.log(`  Total songs processed: ${stats.totalSongs}`);
    console.log(`  Successfully imported: ${stats.imported}`);
    console.log(`  Updated: ${stats.updated}`);
    console.log(`  Skipped (duplicates): ${stats.skipped}`);
    console.log(`  Errors: ${stats.errors}`);
    
    if (stats.errors > 0 && stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errorDetails.forEach(error => console.log(`  - ${error}`));
    }
    
    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
    } else {
      console.log('\n🎉 Import completed!');
    }
    
    return {
      success: stats.errors === 0 || (stats.imported + stats.updated) > 0,
      stats
    };
    
  } catch (error) {
    console.error('\n❌ Import failed:');
    console.error(error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: ImportOptions = {};
  let filePath: string | undefined;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--skip-duplicates':
        options.skipDuplicates = true;
        break;
      case '--update-existing':
        options.updateExisting = true;
        options.skipDuplicates = false; // Override skip duplicates if update is enabled
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🎵 Spokify Songs Import Tool

Usage: npx tsx scripts/import-songs.ts <file-path> [options]

Arguments:
  <file-path>              Path to the exported songs JSON file

Options:
  --skip-duplicates        Skip songs that already exist (default: true)
  --update-existing        Update existing songs instead of skipping them
  --dry-run                Preview changes without making them
  --skip-validation        Skip basic validation checks
  --help, -h               Show this help message

Examples:
  # Import songs from export file
  npx tsx scripts/import-songs.ts songs-export-2024-01-15.json
  
  # Preview import without making changes
  npx tsx scripts/import-songs.ts songs-export.json --dry-run
  
  # Update existing songs instead of skipping
  npx tsx scripts/import-songs.ts songs-export.json --update-existing
  
  # Import with minimal validation
  npx tsx scripts/import-songs.ts songs-export.json --skip-validation

Notes:
  - Songs without Spotify ID OR YouTube ID are rejected as faulty
  - Duplicate detection logic:
    * Both IDs: Must match exactly (Spotify ID AND YouTube ID)
    * Only Spotify ID: Must match and both songs have no YouTube ID
    * Only YouTube ID: Must match and both songs have no Spotify ID
    * Warns about title+artist matches with different ID combinations
  - Schema-agnostic: Only fields that exist in current schema will be imported
  - Timestamp fields (createdAt, updatedAt) are handled automatically
  - Use --dry-run first to preview changes before actual import
        `);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          filePath = arg;
        } else {
          console.log(`❌ Unknown option: ${arg}`);
          console.log('Use --help to see available options.');
          process.exit(1);
        }
        break;
    }
  }
  
  if (!filePath) {
    console.log('❌ Missing required argument: file-path');
    console.log('Usage: npx tsx scripts/import-songs.ts <file-path> [options]');
    console.log('Use --help for more information.');
    process.exit(1);
  }
  
  try {
    const result = await importSongs(filePath, options);
    
    if (!result.success) {
      console.log('\n❌ Import completed with errors');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
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

export { importSongs };