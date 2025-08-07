import { Router } from 'express';
import { z } from 'zod';
import { simpleSpotifySearch } from '../services/search-service.js';

const router = Router();

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(50).optional().default(20)
});

// GET /api/search?query=songname&limit=20
router.get('/', async (req, res) => {
  try {
    const { query, limit } = SearchSchema.parse(req.query);
    
    console.log(`Spotify search request: "${query}" (limit: ${limit})`);
    
    const results = await simpleSpotifySearch(query, limit);
    
    // Results are already limited by the search function
    const limitedResults = results.results;
    
    res.json({
      success: true,
      query,
      results: limitedResults,
      totalResults: results.results.length
    });
    
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

export default router;