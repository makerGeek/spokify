# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spokify** is a language learning platform that combines music streaming with AI-powered translations and vocabulary building. It's a Progressive Web App (PWA) built with React/TypeScript frontend and Express.js backend, featuring real-time translation, spaced repetition vocabulary learning, and premium subscription features.

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

## Architecture Overview

### Frontend (`client/`)
- **Framework**: React 18 + TypeScript with Vite build system
- **Styling**: Tailwind CSS with Spotify-inspired design system (`client/src/styles/spotify.css`)
- **State Management**: TanStack Query for server state, React Context for global state
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Audio**: YouTube IFrame API for music playback

### Backend (`server/`)
- **Framework**: Express.js with TypeScript (ESM modules)
- **Database**: PostgreSQL via Neon Database with Drizzle ORM
- **Authentication**: Supabase Auth with JWT validation middleware
- **AI Services**: Google Gemini 2.5 Flash for translations (in `server/services/`)
- **Payments**: Stripe integration for premium subscriptions

### Mobile (`android/`)
- **Capacitor**: Native Android APK compilation
- **Build**: Android Studio, Gradle, Java 21 required

## Key Technical Details

### Database Setup
- Uses Neon Database (PostgreSQL) with connection pooling
- Drizzle ORM with schema defined in `shared/schema.ts`
- Migration files managed via `drizzle-kit push`

### Authentication Flow
- Supabase handles OAuth (Google, Facebook) and email auth
- JWT tokens validated server-side via middleware
- User sessions stored in Express sessions with memory store

### AI Translation System
- Primary: Google Gemini 2.5 Flash API (`server/services/gemini.ts`)
- Fallback: OpenAI API for complex translations
- Caching implemented to reduce API costs
- CEFR difficulty assessment integrated

### PWA Features
- Service worker in `client/public/sw.js` for offline caching
- Web app manifest for native installation
- Responsive design optimized for mobile-first experience

### Premium Content System
- Stripe webhooks handle subscription state changes
- Server-side validation prevents unauthorized access to premium songs
- Content gating implemented in both frontend and backend

## Development Patterns

### Component Structure
- Components in `client/src/components/` follow shadcn/ui patterns
- Contexts in `client/src/contexts/` for global state (auth, subscription, app)
- Custom hooks in `client/src/hooks/` for reusable logic
- Page components in `client/src/pages/` correspond to routes

### API Routes (`server/routes/`)
- RESTful endpoints with TypeScript validation via Zod schemas
- Middleware stack: authentication → validation → business logic
- Error handling centralized in main server file

### Database Patterns
- Data access layer in `server/storage.ts`
- Shared types between client/server in `shared/` directory
- User ownership validation for all data operations

## Environment Setup

### Required Environment Variables
```bash
DATABASE_URL=                    # Neon Database connection string
SUPABASE_URL=                   # Supabase project URL
SUPABASE_ANON_KEY=              # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key
STRIPE_SECRET_KEY=              # Stripe secret key
STRIPE_WEBHOOK_SECRET=          # Stripe webhook secret
GEMINI_API_KEY=                 # Google AI Studio API key
VITE_GA_MEASUREMENT_ID=         # Google Analytics tracking ID

# Konnect Payment Provider (Optional)
KONNECT_API_KEY=                # Konnect API key from dashboard
KONNECT_BASE_URL=               # Konnect API base URL (defaults to https://api.konnect.network)
KONNECT_RECEIVER_WALLET_ID=     # Your Konnect wallet ID for receiving payments
```

### Development Dependencies
- Node.js with ESM support
- TypeScript 5.6+
- For Android builds: Android Studio, Java 21, Gradle

## Common Tasks

### Adding New API Endpoints
1. Define Zod schema in `shared/schema.ts`
2. Create route handler in `server/routes/`
3. Add route to `server/routes/index.ts`
4. Update client-side queries in relevant components

### Database Schema Changes
1. Modify schema in `shared/schema.ts`
2. Run `npm run db:push` to deploy changes
3. Update TypeScript types as needed

### Adding New Pages
1. Create page component in `client/src/pages/`
2. Add route to `client/src/App.tsx`
3. Update navigation components if needed

### Premium Content Integration
1. Add premium flag to content in database
2. Update server-side validation in relevant API routes
3. Implement frontend gating in components
4. Test with both free and premium user accounts

## Testing Notes

- No formal testing framework currently implemented
- Manual testing procedures should verify:
  - Authentication flows (login/logout/registration)
  - Music playback and translation features
  - Premium subscription and content access
  - PWA installation and offline functionality
  - Android APK build and installation

## Data Migration Between Environments

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

## Build Deployment

### Production Build Process
1. `npm run build` creates optimized client bundle in `dist/public/`
2. Server code bundled to `dist/index.js` via esbuild
3. Static assets served from build directory
4. Environment variables must be set on production server

### Mobile Deployment
1. Build web assets with `npm run build`
2. Sync to Android with `npx cap sync`
3. Build APK in Android Studio or via Gradle
4. Test installation and core features on device