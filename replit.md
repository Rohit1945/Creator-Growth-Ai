# replit.md

## Overview

This is a video content analysis and optimization tool that uses AI to generate titles, descriptions, hashtags, tags, and performance predictions for social media videos. Users can input video ideas, fetch YouTube video metadata, or upload videos directly for analysis. The application supports YouTube, Instagram, and TikTok platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **Styling**: Tailwind CSS with custom dark theme (deep blue/black base with purple/blue accents)
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for UI transitions
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **Build Tool**: Custom build script using esbuild for server and Vite for client
- **Development**: tsx for running TypeScript directly, Vite dev server with HMR

### API Structure
- RESTful endpoints defined in `shared/routes.ts` with Zod schemas
- Main endpoints:
  - `POST /api/analyze` - Analyze video content and generate optimization suggestions
  - `POST /api/fetchYoutubeVideo` - Fetch metadata from YouTube URLs
  - `POST /api/uploadVideo` - Upload video files for transcription
- Audio/voice chat integration routes available for conversation-based AI interactions

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: Defined in `shared/schema.ts` with Zod integration via drizzle-zod
- **Migrations**: Managed via Drizzle Kit (`npm run db:push`)
- Database connection requires `DATABASE_URL` environment variable

### AI Integrations
- OpenAI API integration via Replit AI Integrations
- Supports text-to-speech, speech-to-text, image generation, and chat completions
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- FFmpeg used for audio/video processing (extracting audio from video files)

### Replit Integrations Structure
Located in `server/replit_integrations/` and `client/replit_integrations/`:
- **audio**: Voice chat with streaming, audio playback worklets
- **chat**: Conversation storage and OpenAI chat routes
- **image**: Image generation endpoints
- **batch**: Batch processing utilities with rate limiting

## External Dependencies

### Third-Party Services
- **YouTube Data API v3**: Fetching video metadata (requires `YOUTUBE_API_KEY`)
- **OpenAI API**: AI completions, transcription, text-to-speech (via Replit AI Integrations)
- **PostgreSQL**: Primary database

### Key NPM Dependencies
- Express 5 for HTTP server
- Drizzle ORM + drizzle-zod for database operations
- TanStack React Query for data fetching
- Radix UI + shadcn/ui for UI components
- Framer Motion for animations
- Multer for file uploads
- FFmpeg (system dependency) for audio extraction

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `YOUTUBE_API_KEY` - YouTube Data API key
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (via Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (via Replit)