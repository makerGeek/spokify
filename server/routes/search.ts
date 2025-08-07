import { Router } from 'express';
import { z } from 'zod';
import { simpleSpotifySearch, comprehensiveSpotifySearch, getArtistAlbums, getAlbumTracks } from '../services/search-service.js';

const router = Router();

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  type: z.enum(['tracks', 'comprehensive']).optional().default('tracks')
});

// GET /api/search?query=songname&limit=20&type=comprehensive
router.get('/', async (req, res) => {
  try {
    const { query, limit, type } = SearchSchema.parse(req.query);
    
    console.log(`Spotify search request: "${query}" (type: ${type}, limit: ${limit})`);
    
    if (type === 'comprehensive') {
      const results = await comprehensiveSpotifySearch(query, limit);
      
      res.json({
        success: true,
        query,
        tracks: results.tracks,
        albums: results.albums,
        artists: results.artists,
        totalTracks: results.tracks.length,
        totalAlbums: results.albums.length,
        totalArtists: results.artists.length
      });
    } else {
      const results = await simpleSpotifySearch(query, limit);
      const limitedResults = results.results;
      
      res.json({
        success: true,
        query,
        results: limitedResults,
        totalResults: results.results.length
      });
    }
    
  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Search service unavailable'
    });
  }
});

const ArtistAlbumsSchema = z.object({
  artistId: z.string().min(1),
  type: z.enum(['album', 'single']).optional().default('album')
});

// GET /api/search/artist/:artistId/albums?type=album
router.get('/artist/:artistId/albums', async (req, res) => {
  try {
    const { artistId } = req.params;
    const { type } = ArtistAlbumsSchema.parse({ artistId, ...req.query });
    
    console.log(`Artist albums request: ${artistId} (type: ${type})`);
    
    const albums = await getArtistAlbums(artistId, type);
    
    res.json({
      success: true,
      artistId,
      type,
      albums,
      totalAlbums: albums.length
    });
    
  } catch (error) {
    console.error('Artist albums error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artist albums'
    });
  }
});

const AlbumTracksSchema = z.object({
  albumId: z.string().min(1)
});

// GET /api/search/album/:albumId/tracks
router.get('/album/:albumId/tracks', async (req, res) => {
  try {
    const { albumId } = req.params;
    AlbumTracksSchema.parse({ albumId });
    
    console.log(`Album tracks request: ${albumId}`);
    
    const tracks = await getAlbumTracks(albumId);
    
    res.json({
      success: true,
      albumId,
      tracks,
      totalTracks: tracks.length
    });
    
  } catch (error) {
    console.error('Album tracks error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch album tracks'
    });
  }
});

export default router;