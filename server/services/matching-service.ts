import { SpotifyTrackResult, YouTubeVideoResult, UnifiedResult } from './search-service.js';

/**
 * Text normalization and cleaning utilities
 */

const NOISE_WORDS = [
  'official', 'video', 'lyrics', 'lyric', 'hd', 'remastered', 'remaster',
  'radio', 'edit', 'version', 'audio', 'music', 'song', 'track', 'vevo',
  'live', 'performance', 'acoustic', 'instrumental', 'cover', 'remix',
  'extended', 'explicit', 'clean', 'album', 'single', 'ep', 'deluxe'
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function removeNoiseWords(text: string): string {
  const words = normalizeText(text).split(' ');
  return words
    .filter(word => !NOISE_WORDS.includes(word) && word.length > 0)
    .join(' ');
}

export function extractArtistFromTitle(title: string): string[] {
  // Common patterns: "Artist - Title", "Title by Artist", "Artist: Title"
  const patterns = [
    /^(.+?)\s*[-–]\s*(.+)$/,  // Artist - Title
    /^(.+?)\s*:\s*(.+)$/,     // Artist: Title  
    /^(.+?)\s+by\s+(.+)$/i,   // Title by Artist
    /\((.+?)\)$/,             // Artist in parentheses
    /\[(.+?)\]$/,             // Artist in brackets
  ];

  const artists: string[] = [];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      artists.push(normalizeText(match[1]));
      artists.push(normalizeText(match[2]));
    }
  }
  
  return artists;
}

/**
 * Similarity calculation functions
 */

export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function calculateTitleSimilarity(title1: string, title2: string): number {
  const clean1 = removeNoiseWords(title1);
  const clean2 = removeNoiseWords(title2);
  
  console.log(`        🧹 [TITLE] Cleaned: "${title1}" -> "${clean1}"`);
  console.log(`        🧹 [TITLE] Cleaned: "${title2}" -> "${clean2}"`);
  
  // Exact match
  if (clean1 === clean2) {
    console.log(`        ✅ [TITLE] Exact match!`);
    return 100;
  }
  
  // Check if one contains all words of the other
  const words1 = clean1.split(' ').filter(w => w.length > 0);
  const words2 = clean2.split(' ').filter(w => w.length > 0);
  
  console.log(`        📝 [TITLE] Words1: [${words1.join(', ')}]`);
  console.log(`        📝 [TITLE] Words2: [${words2.join(', ')}]`);
  
  const words1InWords2 = words1.every(word => clean2.includes(word));
  const words2InWords1 = words2.every(word => clean1.includes(word));
  
  if (words1InWords2 || words2InWords1) {
    console.log(`        ✅ [TITLE] Word containment match! (${words1InWords2 ? '1 in 2' : '2 in 1'})`);
    return 80;
  }
  
  // Levenshtein distance based similarity
  const distance = levenshteinDistance(clean1, clean2);
  const maxLength = Math.max(clean1.length, clean2.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  console.log(`        📏 [TITLE] Levenshtein: distance=${distance}, maxLength=${maxLength}, similarity=${similarity.toFixed(1)}%`);
  
  return Math.max(0, similarity);
}

export function calculateArtistSimilarity(spotifyArtist: string, youtubeChannel: string): number {
  const cleanSpotify = normalizeText(spotifyArtist);
  const cleanYoutube = normalizeText(youtubeChannel);
  
  // Exact match
  if (cleanSpotify === cleanYoutube) return 100;
  
  // Check if artist name is contained in channel name
  if (cleanYoutube.includes(cleanSpotify)) return 85;
  if (cleanSpotify.includes(cleanYoutube)) return 85;
  
  // Check common variations (VEVO channels, etc.)
  const youtubeWithoutVevo = cleanYoutube.replace(/vevo$/, '').trim();
  if (cleanSpotify === youtubeWithoutVevo) return 90;
  
  // Extract potential artist from YouTube title
  const titleArtists = extractArtistFromTitle(youtubeChannel);
  for (const artist of titleArtists) {
    if (cleanSpotify === artist) return 75;
  }
  
  // Levenshtein distance
  const distance = levenshteinDistance(cleanSpotify, cleanYoutube);
  const maxLength = Math.max(cleanSpotify.length, cleanYoutube.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.max(0, similarity);
}

export function calculateDurationSimilarity(duration1: number, duration2: number): number {
  const diff = Math.abs(duration1 - duration2);
  
  if (diff <= 5) return 100;
  if (diff <= 15) return 80;
  if (diff <= 30) return 60;
  if (diff <= 60) return 40;
  
  return 0;
}

export function calculateQualityScore(youtubeResult: YouTubeVideoResult): number {
  let score = 0;
  
  // Official channels get bonus
  if (youtubeResult.badges?.includes('Official Artist Channel')) score += 20;
  if (youtubeResult.badges?.includes('Verified')) score += 10;
  
  // High view count gets slight bonus
  if (youtubeResult.views > 10000000) score += 10;
  else if (youtubeResult.views > 1000000) score += 5;
  
  // Penalties for likely covers/remixes/live versions
  const title = normalizeText(youtubeResult.title);
  const penaltyWords = ['cover', 'remix', 'live', 'acoustic', 'instrumental', 'karaoke'];
  
  for (const word of penaltyWords) {
    if (title.includes(word)) {
      score -= 15;
      break; // Only apply penalty once
    }
  }
  
  return Math.max(0, score);
}

/**
 * Main matching functions
 */

export function calculateMatchScore(
  spotifyTrack: SpotifyTrackResult, 
  youtubeVideo: YouTubeVideoResult
): number {
  const titleScore = calculateTitleSimilarity(spotifyTrack.title, youtubeVideo.title);
  const artistScore = calculateArtistSimilarity(spotifyTrack.artist, youtubeVideo.channel);
  const durationScore = calculateDurationSimilarity(spotifyTrack.duration, youtubeVideo.duration);
  const qualityScore = calculateQualityScore(youtubeVideo);
  
  console.log(`      🔍 [SCORE] Title: "${spotifyTrack.title}" vs "${youtubeVideo.title}" = ${titleScore.toFixed(1)}%`);
  console.log(`      👤 [SCORE] Artist: "${spotifyTrack.artist}" vs "${youtubeVideo.channel}" = ${artistScore.toFixed(1)}%`);
  console.log(`      ⏱️  [SCORE] Duration: ${spotifyTrack.duration}s vs ${youtubeVideo.duration}s = ${durationScore.toFixed(1)}%`);
  console.log(`      ⭐ [SCORE] Quality: ${qualityScore.toFixed(1)}%`);
  
  // Apply penalty if BOTH title and artist scores are low
  // This ensures we need a reasonable match on both title AND artist
  const combinedTitleArtistScore = (titleScore + artistScore) / 2;
  let titleArtistMultiplier = 1.0;
  
  if (combinedTitleArtistScore < 30) {
    // If both title and artist are poor matches, heavily penalize
    titleArtistMultiplier = 0.3;
    console.log(`      ⚠️ [SCORE] Low title+artist combined score (${combinedTitleArtistScore.toFixed(1)}%), applying penalty`);
  } else if (titleScore < 20 || artistScore < 20) {
    // If either title OR artist is very poor, moderately penalize  
    titleArtistMultiplier = 0.7;
    console.log(`      ⚠️ [SCORE] Either title or artist very low, applying moderate penalty`);
  }
  
  // Weighted average with penalty applied
  const baseScore = (
    titleScore * 0.4 +      // 40% weight
    artistScore * 0.3 +     // 30% weight
    durationScore * 0.2 +   // 20% weight
    qualityScore * 0.1      // 10% weight
  );
  
  const finalScore = Math.min(100, Math.max(0, baseScore * titleArtistMultiplier));
  console.log(`      📊 [SCORE] Final: ${finalScore.toFixed(1)}% (base:${baseScore.toFixed(1)} × multiplier:${titleArtistMultiplier})`);
  
  return finalScore;
}

export function findBestMatches(
  spotifyTracks: SpotifyTrackResult[],
  youtubeVideos: YouTubeVideoResult[]
): UnifiedResult[] {
  console.log('🔍 [MATCHING] Starting findBestMatches...');
  console.log(`📊 [MATCHING] Input: ${spotifyTracks.length} Spotify tracks, ${youtubeVideos.length} YouTube videos`);
  
  const results: UnifiedResult[] = [];
  const usedSpotifyIds = new Set<string>();
  const usedYoutubeIds = new Set<string>();
  
  // Log input data
  console.log('🎵 [MATCHING] Spotify tracks:');
  spotifyTracks.forEach((track, i) => {
    console.log(`  ${i+1}. "${track.title}" by "${track.artist}" (${track.duration}s)`);
  });
  
  console.log('📺 [MATCHING] YouTube videos:');
  youtubeVideos.forEach((video, i) => {
    console.log(`  ${i+1}. "${video.title}" by "${video.channel}" (${video.duration}s)`);
  });
  
  // First pass: Find high-confidence matches (25%+)
  console.log('🎯 [MATCHING] Starting matching process (threshold: 25%)...');
  
  for (const spotify of spotifyTracks) {
    if (usedSpotifyIds.has(spotify.id)) continue;
    
    console.log(`\n🎵 [MATCHING] Processing Spotify: "${spotify.title}" by "${spotify.artist}"`);
    
    let bestMatch: YouTubeVideoResult | null = null;
    let bestScore = 0;
    const allScores: Array<{youtube: YouTubeVideoResult, score: number}> = [];
    
    for (const youtube of youtubeVideos) {
      if (usedYoutubeIds.has(youtube.id)) continue;
      
      console.log(`  📺 [MATCHING] Comparing with YouTube: "${youtube.title}" by "${youtube.channel}"`);
      
      const score = calculateMatchScore(spotify, youtube);
      allScores.push({youtube, score});
      
      console.log(`    💯 [MATCHING] Score: ${score.toFixed(2)}%`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = youtube;
        console.log(`    ✅ [MATCHING] New best match! Score: ${score.toFixed(2)}%`);
      }
    }
    
    // Log all scores for this Spotify track
    console.log(`  📈 [MATCHING] All scores for "${spotify.title}":`);
    allScores
      .sort((a, b) => b.score - a.score)
      .forEach((item, i) => {
        console.log(`    ${i+1}. ${item.score.toFixed(2)}% - "${item.youtube.title}" by "${item.youtube.channel}"`);
      });
    
    if (bestMatch && bestScore >= 25) {
      console.log(`  ✅ [MATCHING] MATCH FOUND! "${spotify.title}" <-> "${bestMatch.title}" (${bestScore.toFixed(2)}%)`);
      
      // Create unified result
      results.push({
        title: spotify.title,
        artist: spotify.artist,
        album: spotify.album,
        duration: spotify.duration,
        spotifyId: spotify.id,
        youtubeId: bestMatch.id,
        albumCover: spotify.albumCover,
        thumbnail: bestMatch.thumbnail,
        explicit: spotify.explicit,
        shareUrl: spotify.shareUrl,
        channel: bestMatch.channel,
        views: bestMatch.views,
        publishedTime: bestMatch.publishedTime,
        badges: bestMatch.badges,
        isLive: bestMatch.isLive,
        confidence: bestScore,
        primarySource: 'spotify'
      });
      
      usedSpotifyIds.add(spotify.id);
      usedYoutubeIds.add(bestMatch.id);
    } else {
      console.log(`  ❌ [MATCHING] No match found for "${spotify.title}" (best score: ${bestScore.toFixed(2)}%)`);
    }
  }
  
  console.log(`\n🏁 [MATCHING] Matching complete! Found ${results.length} matches`);
  
  // Sort by confidence (highest first)
  results.sort((a, b) => {
    return b.confidence - a.confidence;
  });
  
  console.log('📋 [MATCHING] Final results:');
  results.forEach((result, i) => {
    console.log(`  ${i+1}. "${result.title}" by "${result.artist}" (${result.confidence.toFixed(2)}% confidence)`);
  });
  
  return results;
}