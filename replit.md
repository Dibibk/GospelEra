# Overview

**Project Name: Gospel Era**

Gospel Era is a full-stack web application designed as a social platform for the Gospel Community. It features Instagram-like media uploads, user authentication, and community interaction. Built with React (frontend) and Express.js (backend), it leverages TypeScript, shadcn/ui, Tailwind CSS, PostgreSQL with Drizzle ORM, and Replit Object Storage (with AWS S3 for production). The platform emphasizes a faith-centered UI, comprehensive prayer request system with AI-powered spam detection, real-time leaderboards, and robust content moderation to ensure a Christ-centered environment. It is designed to be production-ready with PWA capabilities, extensive testing, and strong security measures.

# Recent Changes

**November 25, 2025 - iOS Capacitor App Fixes**
- Added CORS middleware to backend (server/index.ts) to allow requests from Capacitor apps (capacitor://localhost, ionic://localhost)
- Fixed YouTube embeds in iOS app: Replaced iframe-based embeds with EmbedCard component that shows clickable thumbnails for native apps (opens in YouTube app/Safari) and iframe embeds for web
- Fixed status bar overlap issue: Moved safe-area-inset padding from container to sticky header (paddingTop and minHeight) to prevent content from scrolling under iOS status bar
- Root cause: iOS WebView blocks YouTube iframe embeds (Error 153), and sticky positioning requires safe-area padding on the sticky element itself, not its parent container

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite.
- **UI/UX**: shadcn/ui components (Radix UI) and Tailwind CSS with a faith-centered color palette, enhanced typography (Playfair Display, Inter), spiritual elements (Bible watermark, glowing cross icon), and modern animations.
- **State Management**: TanStack React Query for server state.
- **Routing**: React Router with protected routes.
- **Authentication**: Supabase Auth integration.
- **Form Handling**: React Hook Form with Zod validation.
- **PWA**: Web app manifest, SEO meta tags, and Service Worker with smart caching strategies.
- **Theming**: Simple theme switching (Light/Dark) with CSS variables and localStorage persistence.
- **Moderation**: Client-side content moderation with configurable blocked terms, Christian terms detection, and contextual allowances.

## Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL.
- **Storage Pattern**: Interface-based abstraction for media storage (Replit Object Storage for dev, AWS S3 for prod).
- **Security**: JWT-based authentication via Supabase, secure authentication middleware, protected API endpoints, file upload validation (type, size), and banned user restrictions.
- **Content Moderation**: Server-side AI moderation (hard-blocked terms + GPT-4o-mini) for posts and comments, server-side faith validation for prayer requests. See docs/SECURITY_AUDIT.md for complete security documentation.
- **Error Handling**: Sanitized API error responses.

## Database Design
- **Database**: PostgreSQL via Neon Database.
- **Schema Management**: Drizzle migrations.
- **Key Tables**: User, posts, comments, prayer requests, commitments, bookmarks, reactions, reports.
- **Security**: Row-Level Security (RLS) policies for all critical tables.

## Testing Infrastructure
- **Framework**: Vitest with jsdom environment.
- **API Testing**: Mock Service Worker (MSW).
- **Authentication Mocking**: Comprehensive Supabase authentication mocking.
- **Component Testing**: React Testing Library for web and mobile components.
- **Mobile Specifics**: Dedicated mobile configuration, component testing for mobile-optimized elements, and mobile-specific library testing.

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL via Neon Database (@neondatabase/serverless).
- **Authentication Service**: Supabase Auth (@supabase/auth-js).
- **ORM**: Drizzle ORM with drizzle-kit.
- **Cloud Storage**: AWS S3 (production), Replit Object Storage (development).

## UI and Styling
- **Component Library**: Radix UI.
- **Styling Framework**: Tailwind CSS with PostCSS.
- **Icons**: Lucide React.
- **Fonts**: Google Fonts (Playfair Display, Inter).

## Development Tools
- **Build System**: Vite.
- **Replit Integration**: Cartographer plugin.
- **Type Safety**: TypeScript.

## Utility Libraries
- **Date Handling**: date-fns.
- **Validation**: Zod.
- **State Management**: TanStack React Query.
- **CSS Utilities**: clsx, tailwind-merge.