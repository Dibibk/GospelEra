# Overview

**Project Name: Gospel Era Web**

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

**Theme System (Added August 2025):**
✅ Simple theme switching with 2 clean themes:
  - Light: Clean and bright default theme
  - Dark: Easy on the eyes night mode
✅ ThemeProvider with React Context API
✅ Theme switcher in user dropdown menu with toggle functionality
✅ CSS variables system for seamless theme switching
✅ LocalStorage persistence for user preferences
✅ Smooth transitions and responsive design

**Spiritual/Gospel Imagery (Added August 2025):**
✅ Generated spiritual imagery: Golden cross, Holy Spirit dove, praying hands
✅ SpiritualDecorations component with subtle visual elements
✅ FloatingSpiritual and SidebarSpiritual components for ambient decoration
✅ Integrated spiritual imagery throughout the Gospel Community interface

The web application is now feature-complete with PWA capabilities, customizable themes, spiritual imagery, and ready for mobile app development.

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