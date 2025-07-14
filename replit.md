# LyricLingo - Language Learning Through Music

## Overview

LyricLingo is a modern web application that helps users learn languages through interactive song lyrics. The application combines music streaming with AI-powered translations and vocabulary building to create an engaging language learning experience. Built with React on the frontend and Express on the backend, it features a Spotify-inspired interface with real-time translation capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom Spotify-inspired design system
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query for server state, React Context for audio playback
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database**: PostgreSQL with Drizzle ORM (migrated from in-memory storage on July 9, 2025)
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **AI Integration**: OpenAI API for translations and difficulty assessment
- **Session Management**: PostgreSQL session store with connect-pg-simple

### Progressive Web App (PWA)
- **Service Worker**: Offline caching and background sync
- **Manifest**: Full PWA configuration with installation prompts
- **Mobile-First**: Responsive design optimized for mobile devices

## Key Components

### Database Schema
- **Users**: Authentication, language preferences, learning progress
- **Songs**: Music metadata, lyrics with timestamps, difficulty ratings
- **User Progress**: Individual song completion tracking
- **Vocabulary**: Personal vocabulary lists with context and learning timestamps

### AI Services
- **Translation Service**: Real-time text translation using OpenAI GPT-4o
- **Difficulty Assessment**: Automatic content difficulty rating
- **Vocabulary Extraction**: Smart vocabulary word identification and explanations

### Audio System
- **Audio Context**: Centralized audio playback state management
- **Mini Player**: Persistent bottom player component
- **Lyrics Synchronization**: Time-synced lyrics display

### User Interface
- **Language Selection**: Onboarding flow for language preferences
- **Home Dashboard**: Song discovery with genre filtering
- **Lyrics Player**: Full-screen lyrics with translation overlay
- **Progress Tracking**: Learning statistics and vocabulary management

## Data Flow

1. **User Onboarding**: Language preferences stored in localStorage, then persisted to database
2. **Song Discovery**: Songs filtered by user's target language and difficulty level
3. **Lyrics Interaction**: Click-to-translate functionality with vocabulary extraction
4. **Progress Tracking**: Learning metrics updated in real-time
5. **Offline Support**: Critical data cached for offline vocabulary review

## External Dependencies

### Core Dependencies
- **Database**: Drizzle ORM with PostgreSQL dialect
- **AI Service**: OpenAI API for language processing
- **UI Framework**: Radix UI primitives for accessibility
- **Styling**: Tailwind CSS for responsive design
- **Forms**: React Hook Form with Zod validation

### Development Tools
- **Build System**: Vite with TypeScript support
- **Code Quality**: ESLint and TypeScript strict mode
- **Development**: Hot module replacement and error overlays

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Assets**: Static files served from build directory

### Environment Configuration
- **Development**: Local development with Vite dev server
- **Production**: Express serves static files and API routes
- **Database**: PostgreSQL connection via environment variables

### Scaling Considerations
- **Database**: Drizzle ORM supports connection pooling
- **AI Services**: OpenAI API calls with error handling and rate limiting
- **Caching**: Service worker provides offline functionality
- **Mobile**: PWA installation for native-like experience

## Recent Changes

### July 14, 2025 - Supabase Authentication Integration & Centralized Design System
- Implemented comprehensive Supabase authentication system with email, Facebook, and Google login options
- Created protected profile page that requires authentication (only profile page is protected)
- Merged progress and profile pages following authentic Spotify design guidelines
- Added AuthProvider context for centralized authentication state management
- Created login page with social auth buttons and email signup/signin functionality
- Updated navigation to remove separate progress tab, integrating progress stats into profile
- Profile page now displays learning stats, vocabulary progress, weekly goals, and recent vocabulary
- **Centralized Design System**: Created `client/src/styles/spotify.css` with authentic Spotify design tokens
  - Exact Spotify color palette (#121212, #181818, #1db954, etc.)
  - Consistent typography with proper font weights and sizing
  - Reusable button styles (spotify-btn-primary, spotify-btn-secondary)
  - Form components with proper Spotify styling
  - Hover effects and transitions matching Spotify's interaction patterns
  - Responsive design optimized for mobile and desktop
- Redesigned login page with authentic Spotify look and feel
- Updated profile page to use centralized CSS classes for consistency
- All design elements now follow Spotify's minimalist, dark theme aesthetic with proper spacing and typography
- **Library Page Implementation**: Created comprehensive library page with three main tabs
  - Saved Songs: Displays user's liked/saved songs with play functionality
  - History: Shows recently played songs with progress indicators
  - Vocabulary: Lists learned words with translations and difficulty levels
  - Spotify-inspired tabbed navigation with proper active states
  - Integrated with existing audio system for seamless song playback
  - Empty states with appropriate icons and messaging for each tab
- **AuthenticatedOnly Component**: Created reusable authentication wrapper component
  - Provides slot-based content protection with children prop pattern
  - Shows loading state while checking authentication status
  - Automatically displays login page for unauthenticated users
  - Supports custom fallback component via fallback prop
  - Uses centralized Spotify design system for consistent loading states
  - Applied to /library and /profile routes for seamless authentication protection
  - Replaced ProtectedRoute with AuthenticatedOnly for consistent inline login experience
- **Bottom Navigation Centralization**: Moved bottom navigation to main App.tsx layout
  - Bottom navigation now appears consistently across all main app pages
  - Removed individual bottom navigation components from each page component
  - Intelligent page detection based on current route with proper active states
  - Hidden on language selection and admin pages for cleaner user experience
- **Spotify-style Lyrics Player**: Redesigned lyrics player to match authentic Spotify layout
  - Gradient background with song title and artist at top (matching Spotify's red theme example)
  - Current lyric line highlighted in white and scaled up, positioned vertically centered
  - Non-active lines shown in reduced opacity white text
  - Smooth auto-scrolling to keep current line centered in viewport
  - Clean typography with proper spacing and responsive text sizing
  - Translation mode shows translations inline with active lyrics only

### July 14, 2025 - Language Detection and Database Integration
- Enhanced Gemini AI service to detect song language using ISO 639-1 standard (2-letter codes: es, en, fr, etc.)
- Updated difficulty assessment to return detected language alongside CEFR level and vocabulary
- Modified import script to use AI-detected language instead of hardcoded values
- Successfully tested with Spanish songs showing "es" language detection and A2 difficulty classification
- Extended songs table schema with spotify_id, youtube_id, and key_words columns
- Integrated complete song data saving to PostgreSQL database in import script
- Created comprehensive song data pipeline: Spotify search → YouTube lookup → lyrics fetch → AI translation → language detection → difficulty assessment → database storage

### July 14, 2025 - Gemini AI Integration and Translation Improvements
- Created new Gemini translation service (`server/services/gemini.ts`) as alternative to OpenAI
- Implemented same API interface as OpenAI service for seamless switching between providers
- Added proper timeout handling with 2-minute timeout wrapper for long translation requests
- Updated import script to use Gemini instead of OpenAI for lyrics translation
- Successfully tested Gemini translation with Spanish output validation
- Enhanced error handling and response format validation for AI translation services
- Added GEMINI_API_KEY environment variable support for Google AI Studio integration

### July 14, 2025 - Admin Authentication and Real Data
- Changed admin route from `/admin` to `/song-offset` for clearer naming
- Implemented router-level authentication protection for admin routes
- Added `isAdmin` boolean field to users database table
- Replaced mock user data with real database queries in `/api/user` endpoint
- Created ProtectedAdminRoute component with proper loading states and redirects
- Only admin users can access timestamp offset tool, others redirected appropriately
- Removed component-level AdminGuard wrapper for cleaner architecture

### July 13, 2025 - UI and Audio Improvements
- Fixed YouTube player error handling with detailed error messages and visual feedback
- Updated backend storage to support multiple filter conditions simultaneously
- Implemented automatic language filtering on home page (shows only target language songs)
- Redesigned lyrics player with compact album cover in header and maximized lyrics view
- Refactored audio controls to use centralized audio system (DRY principle)
- Added proper bottom navigation to lyrics player for consistent user experience
- Fixed time synchronization and controls functionality in expanded lyrics view

### July 9, 2025 - Database Migration
- Migrated from in-memory storage to PostgreSQL database for data persistence
- Updated storage layer from MemStorage to DatabaseStorage class
- Populated database with 12 multilingual songs across 7 genres
- All song data now persists between application restarts
- YouTube video IDs verified and working for audio playbook

The application architecture prioritizes user experience with offline support, real-time translations, and a mobile-first design that makes language learning through music both engaging and accessible.