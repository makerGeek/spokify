import axios from 'axios';

interface TrackInfo {
  spotifyId: string | null;
  youtubeId: string | null;
  title: string;
  artist: string;
  lyrics: any[] | null;
}

interface LyricsLine {
  startMs: number;
  durMs: number;
  text: string;
}

async function findSpotifyTrackId(songName: string): Promise<{ spotifyId: string; title: string; artist: string } | null> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/search',
    params: {
      term: songName,
      type: 'track'
    },
    headers: {
      'x-rapidapi-key': '1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const tracks = response.data?.tracks?.items;
    
    if (tracks && tracks.length > 0) {
      const firstTrack = tracks[0];
      const spotifyId = firstTrack.id;
      const title = firstTrack.name;
      const artist = firstTrack.artists?.[0]?.name || 'Unknown Artist';
      
      console.log(`Found Spotify track: ${title} by ${artist}`);
      console.log(`Spotify ID: ${spotifyId}`);
      
      return { spotifyId, title, artist };
    } else {
      console.log(`No Spotify tracks found for: ${songName}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}

async function findYouTubeVideoId(searchQuery: string): Promise<string | null> {
  const options = {
    method: 'GET',
    url: 'https://youtube138.p.rapidapi.com/search/',
    params: {
      q: searchQuery,
      hl: 'en',
      gl: 'US'
    },
    headers: {
      'x-rapidapi-key': '1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692',
      'x-rapidapi-host': 'youtube138.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const contents = response.data?.contents;
    
    if (contents && contents.length > 0) {
      // Find the first video in the results
      const firstVideo = contents.find((item: any) => item.type === 'video');
      
      if (firstVideo && firstVideo.video) {
        const youtubeId = firstVideo.video.videoId;
        const title = firstVideo.video.title;
        const channel = firstVideo.video.author?.title;
        
        console.log(`Found YouTube video: ${title} by ${channel}`);
        console.log(`YouTube ID: ${youtubeId}`);
        
        return youtubeId;
      } else {
        console.log(`No YouTube videos found for: ${searchQuery}`);
        return null;
      }
    } else {
      console.log(`No YouTube results found for: ${searchQuery}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

async function fetchSpotifyLyrics(trackId: string): Promise<LyricsLine[] | null> {
  const options = {
    method: 'GET',
    url: 'https://spotify-scraper.p.rapidapi.com/v1/track/lyrics',
    params: {
      trackId: trackId,
      format: 'json'
    },
    headers: {
      'x-rapidapi-key': '1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692',
      'x-rapidapi-host': 'spotify-scraper.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const lyrics = response.data;
    
    if (lyrics && Array.isArray(lyrics) && lyrics.length > 0) {
      console.log(`Found ${lyrics.length} lyric lines`);
      console.log('Lyrics preview:');
      console.log(JSON.stringify(lyrics.slice(0, 3), null, 2)); // Show first 3 lines as preview
      
      return lyrics;
    } else {
      console.log('No lyrics found for this track');
      return null;
    }
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
}

// Main function to run the script
async function main() {
  const songName = process.argv[2];
  
  if (!songName) {
    console.log('Usage: npx tsx scripts/import_song.ts "Song Name"');
    console.log('Example: npx tsx scripts/import_song.ts "Despacito"');
    process.exit(1);
  }
  
  console.log(`Searching for: "${songName}"\n`);
  
  // Search Spotify first
  const spotifyResult = await findSpotifyTrackId(songName);
  
  if (!spotifyResult) {
    console.log('No Spotify track found, skipping YouTube search');
    process.exit(1);
  }
  
  // Use Spotify track info for YouTube search to get better results
  const youtubeSearchQuery = `${spotifyResult.title} ${spotifyResult.artist}`;
  console.log(`\nSearching YouTube for: "${youtubeSearchQuery}"`);
  
  const youtubeId = await findYouTubeVideoId(youtubeSearchQuery);
  
  // Fetch lyrics using Spotify track ID
  console.log(`\nFetching lyrics for Spotify track: ${spotifyResult.spotifyId}`);
  const lyrics = await fetchSpotifyLyrics(spotifyResult.spotifyId);
  
  // Display final results
  console.log('\n=== RESULTS ===');
  console.log(`Song: ${spotifyResult.title}`);
  console.log(`Artist: ${spotifyResult.artist}`);
  console.log(`Spotify ID: ${spotifyResult.spotifyId}`);
  console.log(`YouTube ID: ${youtubeId || 'Not found'}`);
  console.log(`Lyrics Found: ${lyrics ? 'Yes (' + lyrics.length + ' lines)' : 'No'}`);
  
  if (!youtubeId) {
    console.log('\nWarning: No YouTube video found');
  }
  
  if (!lyrics) {
    console.log('Warning: No lyrics found');
  } else {
    console.log('\n=== LYRICS SAMPLE ===');
    console.log('Full lyrics response:');
    console.log(JSON.stringify(lyrics, null, 2));
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { findSpotifyTrackId, findYouTubeVideoId, fetchSpotifyLyrics };