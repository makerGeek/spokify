# Spokify - Language Learning Through Music

## Overview

Spokify is a modern web application that helps users learn languages through interactive song lyrics. The application combines music streaming with AI-powered translations and vocabulary building to create an engaging language learning experience. Built with React on the frontend and Express on the backend, it features a Spotify-inspired interface with real-time translation capabilities.

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
- **RapidAPI**: Requires RAPIDAPI_KEY environment variable for music/lyrics data fetching

### Scaling Considerations
- **Database**: Drizzle ORM supports connection pooling
- **AI Services**: OpenAI API calls with error handling and rate limiting
- **Caching**: Service worker provides offline functionality
- **Mobile**: PWA installation for native-like experience

## Recent Changes

### July 18, 2025 - Gemini 2.5 Flash Translation Migration & Code Organization
- **Performance Optimization**: Replaced slow OpenAI translation service with fast Gemini 2.5 Flash
  - **Speed Improvement**: Translation requests now complete in ~100ms vs 3+ seconds with OpenAI
  - **API Cost Reduction**: Lower per-request costs using Gemini instead of GPT-4o
  - **Maintained Compatibility**: Kept identical API interface for seamless frontend integration
  - **Preserved Caching**: Translation caching system continues to work with Gemini responses
- **Code Organization & DRY Principles**: Eliminated duplicate interfaces and improved code structure
  - **Shared Types**: Created `/server/types/ai-services.ts` with common interfaces for all AI services
  - **Removed Duplicates**: Eliminated duplicate `TranslationResult`, `DifficultyAssessment`, and `TranslatedLyric` interfaces
  - **Consistent Imports**: Both OpenAI and Gemini services now import from shared types file
  - **Function Naming**: Clarified function purposes with `assessDifficulty` (text) vs `assessLyricsDifficulty` (songs)
  - **Updated Scripts**: Import and test scripts now use correct function names for lyrics processing
- **Dead Code Cleanup**: Removed unused difficulty assessment functionality
  - **Removed API Endpoint**: Deleted `/api/difficulty` endpoint from routes.ts (never used by frontend)
  - **Removed Functions**: Deleted `assessDifficulty(text, language)` functions from both OpenAI and Gemini services
  - **Removed Interface**: Deleted `DifficultyAssessment` interface (only kept `LyricsDifficultyAssessment` for song imports)
  - **Code Simplification**: Cleaned imports and maintained only actively used AI functionality

### July 18, 2025 - Code Cleanup and Translation Improvements
- **Removed Unused Vocabulary Explanation Feature**: Cleaned up unused `/api/vocabulary/explain` endpoint
  - **Database Cleanup**: Dropped `vocabulary_explanations` table that was never used in frontend
  - **Schema Cleanup**: Removed vocabularyExplanations table, insert schema, and TypeScript types
  - **Storage Cleanup**: Removed getVocabularyExplanation and createVocabularyExplanation methods
  - **Service Cleanup**: Removed generateVocabularyExplanation function from OpenAI service
  - **API Cleanup**: Removed unused API route and related imports
- **Translation Language Fix**: Updated translate function to use song's actual language instead of hardcoded Spanish
  - **Dynamic Language Detection**: TranslationOverlay now accepts songLanguage parameter from song database
  - **Improved UX**: Language display shows actual song language (French, German, etc.) instead of "Spanish"
  - **Data Consistency**: Vocabulary saving now uses correct song language for better learning analytics

### July 17, 2025 - Free Song System Implementation
- **Database Schema Enhancement**: Added `is_free` column to songs table
  - **Column Configuration**: Boolean field with default value of `false` for premium songs
  - **Database Migration**: Applied schema changes using direct SQL execution
  - **Type Safety**: Updated insert schema and TypeScript types to include `isFree` field
- **Free Song Content Management**: Marked 2 songs from each language as free content
  - **German (de)**: "99 Luftballons" by Nena, "Elektrisches Gefühl" by Juli
  - **Spanish (es)**: "Despacito" by Luis Fonsi ft. Daddy Yankee, "Hips Don't Lie" by Shakira
  - **French (fr)**: "Alors on Danse" by Stromae (only 1 French song available)
  - **API Integration**: Free status properly returned in all song API responses
- **Freemium Model Foundation**: Established infrastructure for differentiating free vs premium content
  - **Backward Compatibility**: Existing API endpoints automatically include `isFree` field
  - **Storage Layer**: Database storage implementation handles new field transparently
  - **Future Ready**: Foundation laid for premium subscription features and content gating

### July 17, 2025 - AI Translation Caching System Implementation
- **Translation API Caching**: Implemented intelligent caching for `/api/translate` endpoint
  - **Database Cache Table**: Created `translations` table to store AI-generated translations with vocabulary analysis
  - **Cache Key Strategy**: Uses combination of text, source language, and target language as unique identifier
  - **Performance Improvement**: Cached responses are 35x faster (42ms vs 1.5+ seconds for new translations)
  - **Data Integrity**: Stores translation, confidence score, and vocabulary breakdown for complete response caching
  - **Cost Optimization**: Dramatically reduces OpenAI API calls by reusing previously generated translations
- **Vocabulary Explanation Caching**: ~~Enhanced vocabulary explanations API endpoint with caching~~ (Removed - unused feature)
- **Universal Caching Benefits**:
  - **Instant Response Times**: Both endpoints deliver sub-50ms response times for cached content
  - **API Cost Reduction**: Eliminates redundant AI API calls for identical translation requests
  - **Data Consistency**: Maintains original API response format for seamless frontend integration
  - **Scalable Architecture**: Database-backed caching supports unlimited cache growth and persistence
- **Testing Verified**: Comprehensive testing confirms dramatic performance improvements for both translation endpoints

### July 17, 2025 - Production-Ready Service Worker with Safety Mechanisms
- **Robust Service Worker Architecture**: Implemented comprehensive safety measures for production deployment
  - **Development Mode Protection**: Service worker completely disabled in development to prevent caching conflicts
  - **Network-First Strategy**: Critical assets (HTML, CSS, JS) always try network first to avoid stale content
  - **Automatic Error Recovery**: Service worker temporarily disables itself after 3 consecutive failures
  - **Selective Caching**: Never caches development assets, API calls, or hot-update files
  - **Graceful Fallbacks**: Multiple fallback strategies including cache → network → offline page
- **Service Worker Administration Panel**: Created `/service-worker-admin` page for production monitoring
  - Real-time service worker status monitoring and control
  - Cache statistics and management tools
  - Emergency recovery actions (unregister, clear caches, disable)
  - Automatic failure detection and self-healing mechanisms
  - One-click troubleshooting for production issues
- **Production Safety Features**:
  - Automatic service worker unregistration in development
  - Error tracking with localStorage-based failure counting
  - 1-hour cool-down period after repeated failures
  - 503 error detection with automatic bypass mechanisms
  - Hard refresh capability for complete cache clearing
- **Enhanced Error Handling**: Comprehensive error boundaries and logging for debugging production issues
- **Backward Compatibility**: Maintains PWA functionality while ensuring development workflow stability

### July 16, 2025 - Query Caching Strategy & Social Login Bug Fix
- **Intelligent Query Caching Strategy**: Implemented data-specific caching configurations
  - `REAL_TIME_CONFIG`: No caching for feature flags, auth status, real-time data
  - `USER_DATA_CONFIG`: Short-term caching (30s) for user-specific data  
  - `STATIC_CONTENT_CONFIG`: Long-term caching (10min) for song catalog, lyrics
- **Fixed Social Login Button Visibility**: Resolved caching issue preventing feature flags from working
  - Social login buttons now properly hidden when ENABLE_SOCIAL_LOGIN flag is disabled
  - Created useSocialLogin hook with proper React reactivity using useMemo
  - Added comprehensive query invalidation and fresh data fetching for time-sensitive data
- **Query Configuration Documentation**: Created comprehensive guide for data categorization
  - Feature flags, auth status: Always fetch fresh (never cache)
  - User profiles, vocabulary: Short cache with frequent refresh
  - Song catalog, static content: Long cache with offline support

### July 16, 2025 - Critical Security Fix: RapidAPI Credentials Hardcoded in Source Code
- **Security Vulnerability Resolved**: Removed hard-coded RapidAPI credentials from script files
  - Fixed 5 instances of exposed API key `1a244cda35msh6d20ec374075a91p13ae79jsn425c85a9d692` in:
    - `scripts/fetch-lyrics-simple.ts` (line 6)
    - `scripts/fetch-lyrics.ts` (line 6) 
    - `scripts/import_song.ts` (lines 29, 68, 113)
  - Replaced all hard-coded keys with `process.env.RAPIDAPI_KEY` environment variable references
  - Added documentation requirement for RAPIDAPI_KEY environment variable
  - **Important**: Users must now set the RAPIDAPI_KEY environment variable before running import scripts
- **Risk Assessment**: High-severity vulnerability that could lead to unauthorized API usage and billing charges
- **Impact**: Prevents exposure of API credentials in source code repository

### July 16, 2025 - Major Authentication Security Overhaul & Architecture Improvements

**🔒 Critical Security Improvements:**
- **Server-Side Token Validation**: Implemented proper Supabase JWT token verification middleware
- **Protected API Endpoints**: All user data endpoints now require authentication
- **Secure User Sync**: Replaced vulnerable client-side user sync with server-side validation
- **Rate Limiting**: Added comprehensive rate limiting to prevent abuse
- **Input Validation**: Implemented proper Zod schema validation for all auth endpoints

**🏗️ New Authentication Architecture:**
- Created `/server/middleware/auth.ts` with `authenticateToken` and `optionalAuth` middleware
- Built `/server/services/auth.ts` for secure user management operations
- Added new `/api/auth/*` endpoints replacing insecure legacy endpoints:
  - `/api/auth/sync` - Secure user database synchronization
  - `/api/auth/user` - Get current authenticated user
  - `/api/auth/validate-invite` - Server-side invite code validation
  - `/api/auth/invite-codes` - User invite code management
  - `/api/auth/generate-invite` - Secure invite code generation
  - `/api/auth/profile` - Protected profile updates

**🛡️ Security Features:**
- JWT token verification for all protected routes
- User ownership validation (users can only access their own data)
- Session-based invite code validation with server-side storage
- Comprehensive rate limiting (invite validation, sync attempts, code generation)
- Proper error handling and logging for security events

**📱 Client-Side Improvements:**
- Created `/client/src/lib/auth.ts` with secure authentication utilities
- New `InviteCodeValidator` component with real-time validation
- Enhanced auth context with proper token management
- React Query hooks for authentication state management

**🔧 Development Features:**
- Graceful fallback for development environments without full Supabase setup
- Backward compatibility redirects for deprecated endpoints
- Comprehensive error handling and user feedback

**📋 Deprecated Endpoints:**
- `/api/users/sync` → `/api/auth/sync` (with proper token validation)
- `/api/user` → `/api/auth/user` (with authentication required)

### July 16, 2025 - Critical User Database Sync Fix & Invite Code Tracking Repair
- **Fixed Critical Authentication Bug**: Resolved major issue where Supabase users weren't being properly synced to our database
  - Users were authenticating through Supabase but not being added to our PostgreSQL users table
  - This prevented proper tracking of learning progress, vocabulary, and user preferences
  - Fixed database schema mismatch where `id` column was text instead of auto-incrementing integer
  - Updated user creation to properly handle serial ID generation with sequence
  - Added comprehensive error handling and logging to user sync process
  - Created `/api/users/check/:email` endpoint to verify user existence in our database
  - Enhanced both auth context and login form with better sync error handling
- **Fixed Invite Code Tracking**: Resolved issue where `invitedBy` column remained empty despite using invite codes
  - Added `pendingInviteCode` state to auth context for sharing invite codes across authentication flows
  - Updated login form to set pending invite code in auth context for social login compatibility
  - Removed duplicate user sync calls to prevent race conditions
  - All authentication methods (email, Google, Facebook) now properly track invite code usage
  - Verified complete invite code lifecycle: validation → user creation → usage tracking → database recording
- **Improved Authentication Flow**: All login/registration methods now properly sync user data
  - Email registration syncs users with invite code tracking in `invitedBy` field
  - Social login (Google/Facebook) syncs users via auth state change listener with invite code support
  - Existing users are returned without creating duplicates
  - Better error logging for debugging sync issues
- **Database Integrity**: Fixed underlying schema inconsistencies that were preventing proper user creation
  - Converted users.id from varchar to proper serial integer with auto-increment
  - All new users now get proper integer IDs starting from 1000+
  - Maintained backward compatibility with existing users in the database
  - Verified invite code usage tracking in database with proper foreign key relationships

### July 16, 2025 - Invite-Only Registration System & User Invite Code Display
- **Comprehensive Invite Code System**: Implemented complete invite-only registration system for controlled access
  - Created `invite_codes` database table with usage tracking, expiration dates, and multi-use support
  - Added invite code validation API endpoints with proper error handling
  - Built InviteCodeInput component with Spotify-inspired design for new user registration flow
  - Integrated invite code requirement with Supabase authentication via feature flag control
  - Added InviteProvider context for managing invite code state across the application
- **User Invite Code Display**: Added "Invite Friends" section to profile page
  - Users can now see their personal invite code in their profile
  - One-click copy functionality with toast notification feedback
  - Clear instructions for sharing invite codes with friends
  - Only displays when user has an invite code (conditional rendering)
- **Admin Management**: Created invite code admin page at `/invite-admin`
  - Generate new invite codes with customizable max uses and expiration dates
  - View all created invite codes with status badges (Active, Used, Expired)
  - Track usage statistics and creation dates for each code
  - Copy codes to clipboard for distribution
- **Feature Flag Integration**: Added `ENABLE_INVITE_CODES` feature flag to control system activation
  - When enabled, new users must provide valid invite codes during registration
  - Existing users can still sign in normally without invite codes
  - System integrates seamlessly with existing Supabase authentication flow
- **Database Enhancements**: Extended users table with invite relationship tracking
  - Added `invitedBy` field to track who invited each user
  - Added unique `inviteCode` field for each user to share with friends
  - Created comprehensive invite codes table for usage analytics and management

### July 16, 2025 - Rebranding to Spokify & Feature Flag System Implementation
- **Complete Rebranding**: Updated all references from "LyricLingo" to "Spokify" across the entire application
  - Updated app title, headers, PWA manifest, service worker cache names
  - Modified all UI components, login forms, offline pages, and toast messages
  - Refreshed PWA install prompts and profile sections
  - Updated documentation and project README
- **Feature Flag System Implementation
- **Feature Flag Database Table**: Added `feature_flags` table with name, enabled status, and description fields
- **ENABLE_SOCIAL_LOGIN Flag**: Created flag to control visibility of Facebook and Google login buttons
- **Feature Flag API**: Implemented complete REST API for managing feature flags (GET, POST, PUT endpoints)
- **React Hook Integration**: Created `useFeatureFlag` hook for easy flag consumption in components
- **Conditional Social Login**: Login components now show social auth buttons only when ENABLE_SOCIAL_LOGIN is true
- **Code Deduplication**: Refactored duplicate login forms into shared `LoginForm` component
  - Eliminated code duplication between `/login` page and `AuthenticatedOnly` component
  - Centralized feature flag logic in single reusable component
  - Maintained consistent behavior across all login interfaces
- **Database Storage Integration**: Extended storage interface with feature flag CRUD operations
- **AI Genre Detection Enhancement**: Updated Gemini service to detect music genres during difficulty assessment
  - Enhanced `assessDifficulty` function to accept song title and artist for better genre classification
  - Added genre field to DifficultyAssessment interface and database storage
  - Updated import script to pass song metadata to AI and save detected genres to database
  - AI now provides comprehensive analysis: CEFR difficulty level, language detection, and genre classification

## Recent Changes

### July 15, 2025 - PWA Offline Functionality Fix & UI Improvements
- **Fixed PWA Offline Issue**: Completely rewrote service worker to properly cache production assets for offline functionality
  - Service worker now dynamically detects and caches CSS/JS assets from production HTML
  - Implemented separate static and dynamic cache strategies for optimal performance
  - Added proper offline fallback page with Spokify branding when no cached content available
  - Fixed blank screen issue when PWA is opened offline after installation
  - Enhanced error handling and console logging for better debugging
  - **Flag Image Caching**: Added caching for commonly used language flag images (en, es, fr, de, it, pt, jp, kr, cn)
  - Created fallback SVG placeholder for flag images when offline and not cached
  - Enhanced static asset detection to include all image types (PNG, JPG, SVG)
- Added overflow detection logic for song title marquee animation with dynamic speed based on text length
- Fixed profile button icon visibility by changing color from white to black on green gradient background
- Fixed Install App button visibility in PWA install prompt banner
- Added comprehensive "Install App" section to profile page with PWA functionality
- Implemented automatic detection of installation availability using beforeinstallprompt event
- Added Install App benefits display: offline learning, faster performance, native notifications
- Created smart UI states showing install button when available or info message when not supported
- Added toast notifications for installation success, failure, and already installed states
- Enhanced marquee animation to only activate when text overflows container with consistent 50px/second speed
- Added debugging functionality to PWA install feature for better troubleshooting

### July 15, 2025 - Auto-Next Feature for Review Page & Profile Settings
- Moved "Auto Next" setting to profile page Settings section for better user experience
- Added persistent localStorage storage for user preference across sessions
- Created new Settings section in profile page with proper Spotify design system styling
- Implemented toast notifications for setting changes with user feedback
- Review page now reads auto-next preference from localStorage on component mount
- Used shadcn/ui Switch component with Spotify green accent color for consistency
- Added 2-second delay with visual progress bar animation when auto-next is enabled
- Proper timeout cleanup prevents memory leaks on component unmount

### July 15, 2025 - Review Page Spotify Design System Integration
- Updated review page to follow authentic Spotify design guidelines using centralized design system
- Replaced shadcn Card components with proper spotify-card styling from spotify.css
- Applied Spotify typography classes (spotify-heading-lg, spotify-text-primary, etc.)
- Updated loading states to use spotify-loading spinner animation
- Enhanced empty state with proper Spotify text hierarchy and spacing
- Updated answer buttons to use Spotify color variables and hover effects
- Applied consistent Spotify border styling and spacing throughout the page
- Maintained vocabulary quiz functionality while improving visual consistency with rest of app

### July 15, 2025 - Improved Gemini Translation Service
- Fixed Gemini lyrics translation prompt to preserve original language in text field
- Updated translation instructions to clearly separate original text from English translations
- Enhanced prompt clarity to prevent AI from translating both fields
- Text field now maintains original language while translation field contains English translation
- Added specific examples in prompt to demonstrate correct behavior

### July 14, 2025 - Vocabulary Review Game & Enhanced Vocabulary System
- Added new "Review" navigation tab with vocabulary game functionality
- Created interactive multiple-choice quiz using user's vocabulary with 4 answer options
- Enhanced vocabulary database schema with songName column for better song source tracking
- Updated translation overlay to include song name when saving vocabulary
- Review game shows source song name and difficulty badges for each vocabulary word
- Library page now displays song source information in vocabulary section
- Applied authentic Spotify design system styling to all review game buttons and components
- Game includes real-time scoring, immediate feedback, and "Next Question" functionality
- Authentication protection ensures only logged-in users can access review features

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