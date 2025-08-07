import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { importSong, importSpotifySong } from '../services/song-import.js';

const router = Router();

const ImportSongSchema = z.object({
  songName: z.string().min(1).max(200).optional(),
  spotifyId: z.string().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
  albumCover: z.string().optional(),
}).refine((data) => {
  // Either songName is provided OR all Spotify data is provided
  return data.songName || (data.spotifyId && data.title && data.artist);
}, {
  message: "Either songName or (spotifyId + title + artist) must be provided"
});

// POST /api/import/song - Import a song by search query or IDs
router.post('/song', authenticateToken, async (req, res) => {
  try {
    const data = ImportSongSchema.parse(req.body);
    
    let result;
    
    if (data.songName) {
      console.log(`User ${req.user?.id} importing song by name: "${data.songName}"`);
      result = await importSong(data.songName);
    } else {
      console.log(`User ${req.user?.id} importing Spotify song: "${data.title}" by "${data.artist}"`);
      result = await importSpotifySong({
        spotifyId: data.spotifyId!,
        title: data.title!,
        artist: data.artist!,
        albumCover: data.albumCover || null
      });
    }
    
    if (result.success) {
      console.log(`Song imported successfully: ${result.song.title} by ${result.song.artist}`);
      res.json({
        success: true,
        song: {
          id: result.song.id,
          title: result.song.title,
          artist: result.song.artist,
          genre: result.song.genre,
          language: result.song.language,
          difficulty: result.song.difficulty,
          duration: result.song.duration,
          albumCover: result.song.albumCover,
          spotifyId: result.song.spotifyId,
          youtubeId: result.song.youtubeId,
          isDuplicate: result.song.isDuplicate,
          lyricsCount: result.song.lyrics?.length || 0,
          keyWordsCount: result.song.keyWords ? Object.keys(result.song.keyWords).length : 0
        },
        warnings: result.warnings
      });
    } else {
      console.log(`Song import failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.log(`Song import error: ${error}`);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;