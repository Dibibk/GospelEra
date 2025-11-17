# Overview

**Project Name: Gospel Era**

This is a full-stack web application built with React (frontend) and Express.js (backend), utilizing modern TypeScript development practices. The application is a social platform for Gospel Community engagement, featuring Instagram-like media upload functionality, user authentication, and community interaction features. It includes a clean, responsive UI built with shadcn/ui components and Tailwind CSS. The backend uses PostgreSQL with Drizzle ORM for database operations and Replit Object Storage for media files.

## Completed Features

**Core Platform Features:**
✅ User authentication with Supabase
✅ Post creation with Instagram-style media upload (images & videos)
✅ Comment system with soft-delete functionality
✅ Report system for posts and comments
✅ User engagement (Amen reactions, bookmarks)
✅ Search with debouncing, pagination, and tag filtering
✅ Profile management with avatar upload
✅ Settings page (dedicated profile management)

**Polish Features (Completed August 2025):**
✅ Comments + Reports polish: Soft-delete system with RPC security, modal interfaces, admin stub implemented
✅ Search polish: 400ms debouncing, cursor-based pagination (20 items/page), popular topics filtering with toggle functionality
✅ Profiles polish: Separate Settings page for profile management, view-only Profile page, avatar upload with ObjectUploader component
✅ Admin flagged indicators: Red "Flagged" badges on posts/comments with open reports (admin-only view)
✅ Role-based restrictions: useRole() hook with banned user restrictions - non-blocking banner, disabled forms with tooltips

**Banned User Features:**
✅ Non-blocking orange banner: "Account limited. You can read but cannot post or comment."
✅ Disabled post creation form (title, content, tags, media upload) with tooltips
✅ Disabled comment forms with tooltips showing restriction message
✅ All read actions remain fully functional (viewing posts, comments, profiles)

**PWA Features (Added August 2025):**
✅ Web app manifest with proper theme colors and icons
✅ Generated app icon (192px, 512px) with Gospel Era branding
✅ iOS meta tags for native app-like behavior
✅ Apple touch icon and mobile web app configuration
✅ SEO meta tags including Open Graph and Twitter cards
✅ Proper PWA installability with standalone display mode
✅ Service Worker with smart caching strategies:
  - Static files (JS/CSS/images): Stale-While-Revalidate
  - HTML navigation: Network-First with offline.html fallback
  - Cache versioning (app-v1) with automatic cleanup of old caches
  - Production-only registration for optimal development experience

**Prayer Request System (Completed August 2025):**
✅ Comprehensive prayer API library with 8 functions (TypeScript)
✅ Three-table database schema with RLS policies
✅ Complete routing system with 4 protected routes:
  - /prayer/new - Prayer request creation form
  - /prayer/browse - Browse and search open requests
  - /prayer/:id - Detailed view with commitment tracking
  - /prayer/my - Personal dashboard for requests and commitments
✅ Prayer commitment workflow (commit → confirm prayed)
✅ Anonymous requests and tagging system
✅ Role-based restrictions for banned users
✅ Removed old /prayer-requests page, updated navigation
✅ Prayer leaderboard system with weekly/monthly/all-time rankings
✅ Streak tracking with animated counters and real-time updates
✅ Supabase realtime subscriptions for live leaderboard updates
✅ **AI-Powered Spam Detection for Prayer Commitments:**
  - Multi-factor behavioral analysis combining 4 detection methods
  - Account age check: 30 points if account < 1 day old
  - Rate limiting: 40 points if 5+ commitments in 5 minutes
  - Rapid-fire detection: 60 points if 3+ commitments in 10 seconds
  - Prayer confirmation ratio: 50 points if <20% confirmation rate (requires 5+ commitments)
  - Smart scoring thresholds: Block at ≥80 points, warn at ≥50 points
  - User-friendly error messages explaining why commitment was blocked
  - Non-blocking warnings to encourage genuine prayer confirmation
  - Fail-open error handling to avoid false positives
  - Integrated toast notifications for blocks, warnings, and success states

**Theme System (Added August 2025):**
✅ Simple theme switching with 2 clean themes:
  - Light: Clean and bright default theme
  - Dark: Easy on the eyes night mode
✅ ThemeProvider with React Context API
✅ Theme switcher in user dropdown menu with toggle functionality
✅ CSS variables system for seamless theme switching
✅ LocalStorage persistence for user preferences
✅ Smooth transitions and responsive design

**Faith-Centered UI Design (Added August 2025):**
✅ Professional faith-centered color palette: Royal purple (#5A31F4), soft gold (#FFD97D), warm beige to ivory gradient background
✅ Enhanced typography: Playfair Display serif for headings, Inter sans-serif for body text
✅ Spiritual elements: Daily Scripture card with Bible watermark, glowing cross icon in navigation
✅ Modern animations: Fade-in cards, glow effects, subtle light rays in header
✅ Field icons: 📝 for Post Title, ❤️ equivalent for message fields
✅ Faith-inspired gradient backgrounds and rounded card styling with soft shadows
✅ Inspiring footer with scripture quote and blessing message
✅ Professional, modern design clearly gospel-inspired while maintaining clean aesthetics

**Faith Alignment Moderation System (Completed August 2025):**
✅ Comprehensive content moderation system to enforce Christ-centered community standards
✅ Configurable blocked terms list preventing non-Christian religious content (other deities, occult practices)
✅ Christian terms detection that boosts content confidence for Jesus/Christ/God references
✅ Contextual allowances for educational/testimonial content about faith transitions
✅ Client-side draft preservation - rejected content maintains user input for revision
✅ Inline error messages with Christ-centered guidance and community purpose explanation
✅ Integration across all content creation: posts, comments, and prayer requests
✅ Real-time moderation with immediate feedback before submission
✅ Professional messaging that welcomes all while maintaining Christian focus

**Production-Ready Cloud Storage (Completed August 2025):**
✅ AWS S3 integration with hybrid storage system for production scalability
✅ Automatic fallback to Replit Object Storage for development environments
✅ Seamless storage service switching based on environment configuration
✅ Production-grade media handling for images, videos, and user avatars
✅ Cost-effective cloud storage solution with industry-standard security
✅ Comprehensive S3 setup documentation with cost estimates and migration guide
✅ Storage status API endpoint for monitoring and debugging
✅ Ready for production deployment with enterprise-grade file storage

**Testing Infrastructure (Completed August 2025):**
✅ Complete vitest testing framework setup with jsdom environment
✅ Mock Service Worker (MSW) integration for API testing
✅ Comprehensive Supabase authentication mocking system
✅ Component testing infrastructure with React Testing Library
✅ Login component test suite (5 tests passing) - form rendering, validation, authentication flow, error handling
✅ ProtectedRoute component test suite (2 tests passing) - loading states, session management
✅ Mock AuthProvider for isolated component testing
✅ Test setup with proper environment configuration and cleanup

**Mobile App Testing Suite (Completed August 2025):**
✅ Complete mobile-specific test infrastructure with dedicated mobile configuration
✅ Mobile app component testing: MobileApp.test.tsx with 15 comprehensive test cases
✅ Mobile-optimized Login component tests with touch interactions and mobile validation
✅ Mobile ProtectedRoute testing with mobile-specific authentication flows
✅ Mobile useAuth hook testing with mobile session management and transitions
✅ Mobile-specific library testing: posts, prayer, comments, profiles, donations
✅ Mobile API mocking with mobile-optimized handlers and responses
✅ Mobile-specific features testing: gestures, offline capabilities, push notifications, biometric auth
✅ Mobile performance testing: bandwidth optimization, media loading, caching strategies
✅ Complete test coverage parity: all web app tests replicated for mobile with mobile-specific adaptations
✅ Mobile test configuration: vitest.mobile.config.ts with mobile-specific setup and environment

The web application is now feature-complete with PWA capabilities, customizable themes, professional faith-centered UI design, comprehensive prayer system with real-time leaderboards and streak tracking, faith alignment content moderation, production-ready cloud storage, robust testing infrastructure for both web and mobile platforms, and fully prepared for live deployment with comprehensive mobile app testing coverage.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool and development server
- **UI Library**: shadcn/ui components built on top of Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with a comprehensive design system including CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: React Router for client-side navigation with protected routes
- **Authentication**: Supabase Auth integration for user authentication flows
- **Form Handling**: React Hook Form with Zod validation through @hookform/resolvers

## Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API
- **Database ORM**: Drizzle ORM configured for PostgreSQL with migration support
- **Storage Pattern**: Interface-based storage abstraction with both memory and database implementations
- **Development Setup**: Hot reload development server with Vite integration for seamless full-stack development
- **Build Process**: ESBuild for production bundling with proper ES modules support

## Authentication System
- **Primary**: Supabase Auth for managed authentication with email/password support
- **Fallback**: Basic user schema in PostgreSQL for custom authentication if needed
- **Security**: Password hashing with bcryptjs, session management, and protected route patterns
- **Frontend Integration**: Context-based auth state management with loading states and error handling

## Database Design
- **Database**: PostgreSQL with connection via Neon Database serverless driver
- **Schema Management**: Drizzle migrations with schema definition in shared directory
- **User Model**: Simple user table with id, username, and password fields using UUID primary keys
- **Development**: Memory storage implementation for rapid prototyping and testing

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL via Neon Database (@neondatabase/serverless)
- **Authentication Service**: Supabase Auth (@supabase/auth-js)
- **ORM**: Drizzle ORM with drizzle-kit for migrations and schema management

## UI and Styling
- **Component Library**: Radix UI primitives for accessible component foundations
- **Styling Framework**: Tailwind CSS with PostCSS for processing
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration (Architects Daughter, DM Sans, Fira Code, Geist Mono)

## Development Tools
- **Build System**: Vite with React plugin and runtime error overlay
- **Replit Integration**: Cartographer plugin and dev banner for Replit environment
- **Type Safety**: Full TypeScript setup with path aliases and strict configuration
- **Code Quality**: Class Variance Authority for component variant management

## Utility Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod for schema validation and type inference
- **State Management**: TanStack React Query for server state
- **Utility Functions**: clsx and tailwind-merge for className management