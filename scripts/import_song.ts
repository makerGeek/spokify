import axios from 'axios';

async function findSpotifyTrackId(songName: string): Promise<string | null> {
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
      
      console.log(`Found track: ${firstTrack.name} by ${firstTrack.artists?.[0]?.name}`);
      console.log(`Spotify ID: ${spotifyId}`);
      
      return spotifyId;
    } else {
      console.log(`No tracks found for: ${songName}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching for track:', error);
    return null;
  }
}

// Main function to run the script
async function main() {
  const songName = process.argv[2];
  
  if (!songName) {
    console.log('Usage: npm run import-song "Song Name"');
    console.log('Example: npm run import-song "Despacito"');
    process.exit(1);
  }
  
  const spotifyId = await findSpotifyTrackId(songName);
  
  if (spotifyId) {
    console.log(`\nSpotify Track ID: ${spotifyId}`);
  } else {
    console.log('No track found or error occurred');
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { findSpotifyTrackId };