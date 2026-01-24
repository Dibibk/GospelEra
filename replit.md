# Overview

Gospel Era is a full-stack web application designed as a social platform for the Gospel Community. It provides media sharing, robust user authentication, and rich community interaction features. The platform is built using React for the frontend and Express.js for the backend, leveraging technologies like TypeScript, shadcn/ui, Tailwind CSS, PostgreSQL with Drizzle ORM, and Replit Object Storage (with AWS S3 for production). Key features include a faith-centered UI, a comprehensive prayer request system with AI-powered spam detection, real-time leaderboards, and strong content moderation to maintain a Christ-centered environment. It is designed to be production-ready with PWA capabilities, extensive testing, and strong security measures.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, utilizing Vite.
- **UI/UX**: shadcn/ui components (Radix UI) and Tailwind CSS, featuring a faith-centered color palette, enhanced typography (Playfair Display, Inter), spiritual elements (Bible watermark, glowing cross icon), and modern animations.
- **State Management**: TanStack React Query for server state.
- **Routing**: React Router with protected routes.
- **Authentication**: Supabase Auth integration.
- **Form Handling**: React Hook Form with Zod validation.
- **PWA**: Web app manifest, SEO meta tags, and Service Worker for caching.
- **Theming**: Simple theme switching (Light/Dark).
- **Moderation**: Client-side content moderation with configurable blocked terms.

## Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL.
- **Storage Pattern**: Interface-based abstraction for media storage.
- **Security**: JWT-based authentication via Supabase, secure middleware, protected API endpoints, file upload validation, and banned user restrictions.
- **Content Moderation**: Server-side AI moderation (hard-blocked terms + GPT-4o-mini) for posts and comments, server-side faith validation for prayer requests.
- **Error Handling**: Sanitized API error responses.

## Database Design
- **Database**: PostgreSQL via Supabase (unified architecture).
- **Schema Management**: Supabase migrations.
- **Key Tables**: profiles, posts, comments, prayer_requests, prayer_commitments, prayer_activity, bookmarks, reactions, reports, donations, media_requests, notifications, push_tokens.
- **Security**: Row-Level Security (RLS) policies for all critical tables, service role key for admin operations.
- **Server-Side Access**: `server/supabaseClient.ts` provides authenticated Supabase clients for API routes.

## Testing Infrastructure
- **Framework**: Vitest with jsdom environment.
- **API Testing**: Mock Service Worker (MSW).
- **Authentication Mocking**: Comprehensive Supabase authentication mocking.
- **Component Testing**: React Testing Library for web and mobile components.
- **Mobile Specifics**: Dedicated mobile configuration and component testing for mobile-optimized elements.

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL via Supabase.
- **Authentication Service**: Supabase Auth.
- **ORM**: Drizzle ORM.
- **Cloud Storage**: AWS S3 (production), Replit Object Storage (development).

## UI and Styling
- **Component Library**: Radix UI.
- **Styling Framework**: Tailwind CSS.
- **Icons**: Lucide React.
- **Fonts**: Google Fonts (Playfair Display, Inter).

## Development Tools
- **Build System**: Vite.
- **Type Safety**: TypeScript.

## Utility Libraries
- **Date Handling**: date-fns.
- **Validation**: Zod.
- **State Management**: TanStack React Query.
- **CSS Utilities**: clsx, tailwind-merge.