# Deployment Guide: Separated Frontend & Backend

This guide explains how to deploy Spokify with the frontend on a CDN and backend on a PaaS.

## Architecture Overview

- **Frontend**: Static React app deployed to CDN (Netlify, Vercel, CloudFront, etc.)
- **Backend**: Express.js API server deployed to PaaS (Heroku, Railway, Render, etc.)

## Deployment Options

### Option 1: Monolith (Current)
```bash
npm run build
npm start
```

### Option 2: Separated Deployment

#### Backend Deployment (PaaS)

1. **Build backend only:**
   ```bash
   npm run build:server
   ```

2. **Set environment variables** (copy from `.env.backend.example`):
   - `DATABASE_URL`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` (your CDN domain)
   - `CDN_URL` (your CDN domain)
   - `SESSION_SECRET`
   - `PORT` (usually set by PaaS)
   - `NODE_ENV=production`

3. **Start backend:**
   ```bash
   npm run start:backend
   ```

#### Frontend Deployment (CDN)

1. **Set environment variables** (for build):
   ```bash
   export VITE_API_BASE_URL=https://your-backend.herokuapp.com/api
   ```

2. **Build frontend only:**
   ```bash
   npm run build:client
   ```

3. **Deploy `dist/public/` folder** to your CDN service

## Platform-Specific Instructions

### Backend on Heroku
```bash
# Set buildpacks
heroku buildpacks:set heroku/nodejs

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-cdn-domain.com
# ... (other env vars)

# Deploy
git push heroku main
```

### Frontend on Netlify
1. Build command: `VITE_API_BASE_URL=https://your-backend.herokuapp.com/api npm run build:client`
2. Publish directory: `dist/public`
3. Set environment variable: `VITE_API_BASE_URL=https://your-backend.herokuapp.com/api`

### Frontend on Vercel
1. Build command: `npm run build:client`
2. Output directory: `dist/public`
3. Set environment variable: `VITE_API_BASE_URL=https://your-backend.herokuapp.com/api`

## Development

### Local Development (Separated)
```bash
# Terminal 1: Backend only
npm run dev:backend

# Terminal 2: Frontend only (in client/)
cd client && npm run dev
```

### Local Development (Monolith)
```bash
npm run dev
```

## Benefits of Separation

1. **Better Performance**: Frontend served from CDN edge locations
2. **Independent Scaling**: Scale frontend and backend separately
3. **Cost Optimization**: Static hosting is cheaper than full server hosting
4. **Independent Deployments**: Deploy frontend and backend independently
5. **Geographic Distribution**: Frontend served globally, backend can be regional

## Migration Checklist

- [ ] Set up backend PaaS deployment
- [ ] Configure environment variables for backend
- [ ] Test backend API endpoints
- [ ] Set up CDN for frontend
- [ ] Configure frontend environment variables
- [ ] Test frontend → backend communication
- [ ] Update DNS/domain settings
- [ ] Monitor performance and errors