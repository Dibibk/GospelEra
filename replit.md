# Overview

**Project Name: Gospel Era**

Gospel Era is a full-stack web application designed as a social platform for the Gospel Community. It features Instagram-like media uploads, user authentication, and community interaction. Built with React (frontend) and Express.js (backend), it leverages TypeScript, shadcn/ui, Tailwind CSS, PostgreSQL with Drizzle ORM, and Replit Object Storage (with AWS S3 for production). The platform emphasizes a faith-centered UI, comprehensive prayer request system with AI-powered spam detection, real-time leaderboards, and robust content moderation to ensure a Christ-centered environment. It is designed to be production-ready with PWA capabilities, extensive testing, and strong security measures.

# Recent Changes

**December 11, 2025 - Notification Navigation & Account Deletion**
- Fixed comment notification clicks: Now navigates to the correct post and opens its comments section
- Added `pendingPostNavigation` state to scroll to post after closing notifications view
- Each post now has an id attribute (`post-{id}`) for smooth scrolling navigation
- Account deletion now fully removes user from both Neon database AND Supabase Auth (using service role key)
- Created server/supabaseAdmin.ts with admin client for privileged Supabase operations

**December 11, 2025 - Settings Page Fixes (Native App Compatibility)**
- Fixed push notification and daily verse toggles to use proper API URLs (getApiBaseUrl) for native apps
- Added native app detection: Push notifications and daily verse reminders are not supported in iOS/Android native apps (Web Push limitation)
- Settings toggles now show informative alerts when users try to enable push features on native apps
- Fixed account deletion to use proper API URL with getApiBaseUrl() for native app compatibility
- Note: Web Push (Service Workers) is not available in Capacitor/native apps - users should use the web version for push notification features

**December 11, 2025 - Comments & Profile API (Dual-Database Architecture Fix)**
- Unified comments API: Created GET `/api/comments` and DELETE `/api/comments/:id` endpoints (server/routes.ts)
- Comments now read/write to Neon database via Drizzle instead of direct Supabase queries (fixes iOS native app issues)
- Updated client/src/lib/comments.ts: listComments and softDeleteComment now use API endpoints
- Profile upsert fix: PATCH `/api/profile` now creates profile if not exists (fixes profile save failing for new users)
- Root cause: Comments/profiles stored in Neon, but client was querying non-existent Supabase tables

**December 11, 2025 - Prayer Requests Backend API (Dual-Database Architecture Fix)**
- Identified dual-database architecture: Supabase holds prayer_* tables, Neon/Replit holds posts tables
- Created `/api/prayer-requests` backend endpoint (server/routes.ts) to proxy prayer requests from Supabase
- Fixed iOS native app RLS issue: Backend API uses user's JWT token to query Supabase, inheriting their permissions
- Backend creates server-side Supabase client with user's Authorization header for authenticated queries
- Prayer requests now load correctly on both web and native apps via unified API endpoint
- Updated prayer.ts to use API endpoint exclusively instead of direct Supabase queries (works across all platforms)

**December 8, 2025 - Real-Time Updates, Push Notifications & Daily Verse Reminders**
- Implemented Supabase Realtime for live updates across the app (client/src/lib/realtime.ts)
- Real-time feed updates: new posts appear automatically without refresh
- Real-time notifications: new notifications update badge count instantly
- Real-time comments: comment counts and lists update live
- Added push notification system using web-push with VAPID authentication
- Created push_tokens table for storing device tokens (shared/schema.ts)
- Backend push notification sending integrated with comments and notifications (server/pushNotifications.ts)
- Service worker updated with push event handlers (public/sw.js)
- Settings toggle connected to subscribe/unsubscribe from push notifications
- Daily verse reminder system: users can opt-in to receive daily Bible verse push notifications
- Added daily_verse_enabled column to push_tokens table
- Created API endpoints: GET/PATCH /api/push/daily-verse (user preference), POST /api/push/send-daily-verse (cron trigger)
- Settings toggle for daily verse reminders connected to API

**December 7, 2025 - Enhanced Signup Form**
- Added first_name and last_name columns to profiles table (shared/schema.ts)
- Updated signup form in LoginMobile.tsx to require: First Name, Last Name, Display Name, and Email
- Modified useAuth.tsx signUp function to accept and store profile data during registration
- Added getDisplayName helper function in MobileApp.tsx for consistent name display with email username fallback
- All name fields are mandatory during signup with validation

**December 7, 2025 - In-App Notification System**
- Added notifications table to database schema (shared/schema.ts) with event_type, actor_id, recipient_id, post_id, etc.
- Created backend API routes: GET /api/notifications, GET /api/notifications/unread-count, PATCH /api/notifications/:id/read, POST /api/notifications/mark-all-read, POST /api/notifications
- Integrated notification creation when users comment on posts (server/routes.ts)
- Added notification creation for prayer commitments and prayer confirmations (client/src/lib/prayer.ts)
- Added notification bell icon with unread count badge in mobile header (MobileApp.tsx)
- Built NotificationsMobile component for viewing and managing notifications
- Fixed unread count calculation to use proper SQL COUNT aggregate instead of row length
- Fixed markAsRead to calculate unread count from updated state (not stale state)
- Exported getApiBaseUrl from posts.ts for reuse in prayer.ts

**November 25, 2025 - Performance Optimization & Scalability**
- Created optimized `/api/feed` endpoint (server/routes.ts) that combines posts + author profiles + engagement counts in ONE query instead of 3 sequential API calls
- Added database indexes on posts table (hidden, created_at DESC) for fast pagination with thousands of posts
- Implemented proper keyset pagination using (created_at, id) to avoid duplicates/skips
- Created `fetchFeed()` function in client/src/lib/posts.ts for calling optimized endpoint
- Performance improvement: Reduced initial feed load from 3 sequential API calls to 1 batched query
- Scalability: Instagram-style keyset pagination supports millions of posts without performance degradation

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