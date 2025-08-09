# Spokify

A language learning platform that combines music streaming with AI-powered translations and vocabulary building.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Data Migration Scripts

The project includes scripts for transferring songs between different database environments (dev ↔ prod).

### Export Songs

Export songs from the current database environment:

```bash
# Export all songs (excluding duplicates and faulty songs)
npx tsx scripts/export-songs.ts

# Export with filters
npx tsx scripts/export-songs.ts --language es --genre Pop --free true

# Export to specific file
npx tsx scripts/export-songs.ts --output prod-songs-backup.json

# Include duplicates (not recommended)
npx tsx scripts/export-songs.ts --include-duplicates true
```

**Export Features:**
- ✅ Schema-agnostic: Works with future database schema changes
- ✅ Automatic filtering: Excludes faulty songs (no Spotify ID OR YouTube ID)  
- ✅ Flexible filters: genre, language, difficulty, free/premium status
- ✅ Rich metadata: export timestamp, song counts, statistics

### Import Songs

Import songs from an exported JSON file:

```bash
# Basic import (skip duplicates)
npx tsx scripts/import-songs.ts songs-export-2024-01-15.json

# Preview changes without importing (recommended first step)
npx tsx scripts/import-songs.ts songs-export.json --dry-run

# Update existing songs instead of skipping them
npx tsx scripts/import-songs.ts songs-export.json --update-existing

# Skip validation (not recommended)
npx tsx scripts/import-songs.ts songs-export.json --skip-validation
```

**Import Features:**
- ✅ Schema-agnostic: Only imports fields that exist in target schema
- ✅ Smart duplicate detection: Requires matching Spotify ID AND YouTube ID (or single ID match for single-ID songs)
- ✅ Data validation: Rejects songs without Spotify ID OR YouTube ID
- ✅ Dry-run mode: Preview changes before applying
- ✅ Conflict detection: Warns about title+artist matches with different IDs

### Typical Migration Workflow

1. **Export from dev environment:**
   ```bash
   # Set dev DATABASE_URL in .env
   npx tsx scripts/export-songs.ts --output dev-songs-$(date +%Y%m%d).json
   ```

2. **Preview import to prod:**
   ```bash
   # Set prod DATABASE_URL in .env
   npx tsx scripts/import-songs.ts dev-songs-20240115.json --dry-run
   ```

3. **Import to prod:**
   ```bash
   npx tsx scripts/import-songs.ts dev-songs-20240115.json
   ```

### Data Quality Assurance

Both scripts enforce data quality:
- **Faulty songs** (missing both Spotify ID and YouTube ID) are automatically excluded/rejected
- **Duplicates** are detected using precise ID matching logic
- **Schema compatibility** ensures only valid fields are transferred
- **Validation** checks for required fields (title, artist, IDs)

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (client + server bundle)
- `npm run start` - Run production server
- `npm run check` - TypeScript compilation check (run before commits)

### Database Management
- `npm run db:push` - Deploy database schema changes to Neon Database

### Data Migration Scripts
- `npx tsx scripts/export-songs.ts` - Export songs from current database
- `npx tsx scripts/import-songs.ts <file.json>` - Import songs from export file

### Mobile Development (Android APK)
- `npm run build && npx cap sync` - Build web assets and sync to Android
- `npx cap open android` - Open project in Android Studio
- `cd android && ./gradlew assembleDebug` - Build APK directly

## Environment Setup

Required environment variables:
```bash
DATABASE_URL=                    # Neon Database connection string
SUPABASE_URL=                   # Supabase project URL
SUPABASE_ANON_KEY=              # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key
STRIPE_SECRET_KEY=              # Stripe secret key
STRIPE_WEBHOOK_SECRET=          # Stripe webhook secret
GEMINI_API_KEY=                 # Google AI Studio API key
VITE_GA_MEASUREMENT_ID=         # Google Analytics tracking ID
```

## Architecture

- **Frontend**: React 18 + TypeScript with Vite
- **Backend**: Express.js + TypeScript (ESM)
- **Database**: PostgreSQL via Neon Database with Drizzle ORM
- **Authentication**: Supabase Auth
- **AI**: Google Gemini 2.5 Flash for translations
- **Payments**: Stripe integration
- **Mobile**: Capacitor for Android APK

## Documentation

For detailed technical documentation, see [CLAUDE.md](./CLAUDE.md).