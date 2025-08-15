# Overview

This is a full-stack web application built with React (frontend) and Express.js (backend), utilizing modern TypeScript development practices. The application appears to be a starter template with authentication capabilities, featuring a clean, responsive UI built with shadcn/ui components and Tailwind CSS. The backend is configured to use PostgreSQL with Drizzle ORM for database operations, though it currently includes a memory storage implementation as a fallback.

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