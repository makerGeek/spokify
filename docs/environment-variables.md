# Environment Variables Setup

This document describes all environment variables needed for production deployment.

## Required for Production

### Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

### Authentication (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### AI Services
```bash
GOOGLE_GENAI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key  # Optional fallback
```

### Payment Processing (Stripe)
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Music/Lyrics Data
```bash
RAPIDAPI_KEY=your-rapidapi-key
```

### Error Tracking & Analytics
```bash
# Backend error tracking
SENTRY_DSN=https://...@sentry.io/project-id

# Frontend error tracking
VITE_SENTRY_DSN=https://...@sentry.io/project-id

# User behavior analytics
VITE_CLARITY_PROJECT_ID=your-clarity-project-id
```

## Optional Configuration

### Security
```bash
SESSION_SECRET=your-secure-session-secret  # Default provided for development
```

### Development
```bash
NODE_ENV=development  # or production
```

## How to Set Environment Variables

### In Replit
1. Go to your project settings
2. Navigate to "Environment variables" 
3. Add each variable with its value

### Local Development
Create a `.env` file in your project root:
```bash
# Copy this template and fill in your values
DATABASE_URL=postgresql://localhost:5432/spokify
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
GOOGLE_GENAI_API_KEY=your-key
STRIPE_SECRET_KEY=sk_test_...
RAPIDAPI_KEY=your-key
SENTRY_DSN=https://...@sentry.io/project-id
VITE_SENTRY_DSN=https://...@sentry.io/project-id
VITE_CLARITY_PROJECT_ID=your-clarity-id
```

## Security Notes

- Never commit API keys to source control
- Use test/development keys for local development
- Rotate production keys regularly
- Monitor API usage for unusual activity
- Set up API key restrictions where possible

## Getting API Keys

### Supabase
1. Create account at supabase.com
2. Create new project
3. Get URL and anon key from project settings

### Google Gemini
1. Visit ai.google.dev
2. Get API key from Google AI Studio
3. Enable the Generative AI API

### Stripe
1. Create account at stripe.com
2. Get API keys from dashboard
3. Set up webhook endpoints for production

### Microsoft Clarity
1. Create account at clarity.microsoft.com
2. Create new project
3. Get project ID from setup instructions

### Sentry
1. Create account at sentry.io
2. Create new project for React/Node.js
3. Get DSN from project settings