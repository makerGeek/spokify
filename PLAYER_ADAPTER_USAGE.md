# Player Adapter System Usage Guide

The Spokify app now supports multiple audio player backends through an adapter pattern. This allows seamless switching between YouTube and MP3 players based on URL parameters.

## Architecture Overview

### Core Components

1. **PlayerAdapter Interface** (`client/src/lib/player-adapter.ts`)
   - Defines the common interface all players must implement
   - Includes state management and callback definitions

2. **Player Implementations**
   - **YouTubePlayerAdapter** (`client/src/lib/players/youtube-player-adapter.ts`) 
   - **MP3PlayerAdapter** (`client/src/lib/players/mp3-player-adapter.ts`)

3. **PlayerFactory** (`client/src/lib/player-factory.ts`)
   - Creates appropriate player instances based on URL parameters
   - Simple logic: `?try=true` uses MP3 player, otherwise YouTube player

## Usage Examples

### Page URL Parameter Based Selection

The system checks the current browser page URL to determine which player to use:

```typescript
// Current page URL determines player type:
// /home → YouTube Player (uses song's audioUrl from database)
// /lyrics/123 → YouTube Player (uses song's audioUrl from database)  
// /lyrics/123?try=true → MP3 Player (uses sample MP3 file)
```

## Page URL Logic

### Simple Parameter-Based Detection
- **If current page URL contains `?try=true`**: Use MP3PlayerAdapter with sample MP3 file
- **Otherwise**: Use YouTubePlayerAdapter with original song audioUrl

### Examples:
```
Current Page URL                    Player Type     Audio Source
/home                          →    YouTube         Song's audioUrl from DB
/lyrics/123                    →    YouTube         Song's audioUrl from DB
/lyrics/123?try=true           →    MP3             Sample MP3 file
/home?try=true                 →    MP3             Sample MP3 file
/any-page?other=param&try=true →    MP3             Sample MP3 file
```

### Sample MP3 File
When `?try=true` is in the page URL, the system uses this sample MP3:
```
https://scd.dlod.link/?expire=1753399119171&p=Mr_84tbkaADhIblI8rfcgSrQGA5uMTLhwvVNc0DwTTDTPEt7aBq9u0LemAaoZ7zbEI4I8l9q1IhbjbKbQ_vxWJs30G1YVZUf4eF4zb4Lk6iA1wIoh6iZVtnZF34rVxRBPfGiqgGI-J9XcZGzGNqF4w&s=zhqc9PY5p6DOHmgQlQ6mEnOGLA-SArH3rmr0x4NUZ_U
```

## Player State Management

Both players implement the same state interface:

```typescript
interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean; 
  currentTime: number;
  duration: number;
  hasError: boolean;
}
```

## Error Handling

Each player handles errors specific to its backend:

### YouTube Player Errors
- Invalid video ID
- Embedding disabled
- Video not found/private
- HTML5 player errors

### MP3 Player Errors  
- Network errors
- Unsupported format
- Decoding errors
- Source not available

## Integration with Existing Code

The new system is backward compatible. The existing `useAudio()` hook has been updated to use the adapter pattern internally, so no changes are needed in components that consume audio functionality.

## UI Controls

Users can switch player backends through the **Profile page**:

1. Navigate to Profile 
2. Find "Audio Player Settings" section
3. Choose from:
   - YouTube Player
   - MP3 Player  
   - Auto-detect from URL

Changes require a page reload to take effect.

## Benefits

1. **Flexibility**: Easy to add new player backends
2. **Runtime Selection**: Users can choose their preferred player
3. **URL-based Detection**: Automatic player selection based on content type
4. **Fallback Support**: Graceful handling when one player type fails
5. **Consistent API**: Same interface regardless of backend
6. **Environment Control**: DevOps can control player behavior via env vars

## Future Extensions

The adapter pattern makes it easy to add support for:
- Spotify Web Playback SDK
- SoundCloud player
- Local device audio files
- Streaming service APIs
- Custom audio processing pipelines