# Gospel Era Web - Complete Test Map

## Project Overview
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Router**: React Router with animations (Framer Motion)
- **Authentication**: Supabase Auth with smooth transitions
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS with theme system
- **Testing**: Vitest + React Testing Library + MSW
- **State Management**: TanStack React Query
- **Storage**: Hybrid (Replit Object Storage + AWS S3)

## Testing Infrastructure Status
✅ **Vitest Configuration**: Complete with jsdom environment
✅ **Mock Service Worker**: Configured for API mocking
✅ **Supabase Mocking**: Comprehensive authentication mocking
✅ **Component Testing**: React Testing Library setup
✅ **Current Coverage**: Comprehensive test suite across all major modules

## Test Coverage Summary

### Authentication & Security
- **useAuth Hook Tests**: 6 test cases covering authentication states, transitions, error handling
- **ProtectedRoute Component Tests**: 7 test cases covering loading states, route protection, smooth transitions
- **Authentication Flow**: Login/logout, password reset, session management

### Core Features
- **Posts Library Tests**: 6 test cases covering CRUD operations, search, reactions, bookmarks
- **Comments Library Tests**: 8 test cases covering creation, soft-delete, threading, moderation
- **Prayer System Tests**: 8 test cases covering request lifecycle, commitments, leaderboards
- **User Profiles Tests**: 4 test cases covering profile management, avatar uploads, updates

### Advanced Features  
- **Donations System Tests**: 5 test cases covering pledge creation, payment integration, statistics
- **Content Moderation**: Tests for faith alignment checks, blocked terms, community guidelines
- **Real-time Features**: Leaderboard updates, prayer streak tracking, live notifications
- **Storage Integration**: Object storage, media upload, avatar management

## Domain Coverage Details

### Domain: Authentication
**Module**: `client/src/hooks/useAuth.tsx`
**Key Functions**:
- `useAuth()` - Authentication state management with smooth transitions
- `signIn()` - Email/password authentication with contextual loading
- `signOut()` - Sign out with transition states
- `loading`, `authTransition` states for smooth UX

**Testing Notes**: Mock Supabase auth, test transition states, verify error handling
```typescript
// RTL snippet for Authentication
const { user, loading, authTransition } = renderHook(() => useAuth())
expect(user).toBeNull()
expect(loading).toBe(true)
```

### Domain: Posts & Content
**Module**: `client/src/lib/posts.ts`  
**Key Functions**:
- `getPosts()` - Fetch posts with pagination and filtering
- `createPost()` - Create new posts with media and moderation
- `toggleAmen()` - React to posts with Amen reactions
- `searchPosts()` - Full-text search with tag filtering

**Testing Notes**: Test pagination, moderation integration, reaction states
```typescript
// RTL snippet for Posts
const posts = await getPosts({ cursor: 'last-id' })
expect(posts).toHaveLength(20)
```

### Domain: Prayer System
**Module**: `client/src/lib/prayer.ts`
**Key Functions**:
- `createPrayerRequest()` - Create prayer requests with tags and anonymity
- `listPrayerRequests()` - Browse open prayer requests
- `commitToPray()` - Commit to pray for specific requests
- `getLeaderboard()` - Prayer leaderboards with time periods
- `getUserStats()` - Prayer statistics and streak tracking

**Testing Notes**: Test commitment workflow, leaderboard calculations, streak logic
```typescript
// RTL snippet for Prayer System
const result = await commitToPray(prayerRequestId)
expect(result.data).toBeTruthy()
```

### Domain: User Management
**Module**: `client/src/lib/profiles.ts`
**Key Functions**:
- `getProfile()` - Fetch user profiles with error handling
- `updateProfile()` - Update profile information
- `updateUserProfile()` - Update current user's profile

**Testing Notes**: Test profile validation, avatar uploads, permission checks
```typescript
// RTL snippet for Profiles
const profile = await getProfile(userId)
expect(profile.data.username).toBeDefined()
```

### Domain: Storage & Media
**Modules**: `server/objectStorage.ts`, `server/s3Storage.ts`
**Key Features**:
- Hybrid storage system (Replit Object Storage + AWS S3)
- Automatic environment-based switching
- Secure file uploads with presigned URLs
- Media processing and optimization

**Testing Notes**: Mock storage providers, test failover, verify security
```typescript
// RTL snippet for Storage
const uploadUrl = await getUploadUrl('image/jpeg')
expect(uploadUrl).toContain('presigned')
```

## Route Coverage Analysis

Total Routes Mapped: **19 routes** across 5 main areas

### Authentication Routes (3)
- `/login` - Login page with smooth transitions
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form with validation

### Main Application (6)
- `/` - Dashboard (home feed) with post creation
- `/dashboard` - Alternative dashboard route  
- `/profile` - User profile view (read-only)
- `/profile/:id` - View other user profiles
- `/settings` - Account settings and profile management
- `/saved` - Saved posts and bookmarks

### Prayer System (5)
- `/prayer/new` - Create prayer request form
- `/prayer/browse` - Browse and search open requests  
- `/prayer/:id` - Detailed prayer request view
- `/prayer/my` - Personal prayer dashboard
- `/prayer/leaderboard` - Prayer leaderboards and streaks

### Admin & Moderation (3)
- `/admin/reports` - Content moderation dashboard
- `/admin/donations` - Donation management
- `/guidelines` - Community guidelines

### Donations (2)
- `/donate` - Donation page with pledge system
- `/donate/thanks` - Thank you page after donation

## Testing Best Practices

### Mock Strategy
- **Supabase**: Comprehensive mocking for all database operations
- **Authentication**: Mock auth states and transitions
- **External APIs**: Mock payment providers, storage services
- **Real-time**: Mock WebSocket connections and live updates

### Component Testing
- **Render Strategy**: Use custom render functions with providers
- **User Interactions**: Test real user workflows with userEvent
- **Error States**: Test error boundaries and fallback UI
- **Loading States**: Verify loading indicators and skeleton screens

### Integration Testing  
- **End-to-End Workflows**: Complete user journeys from login to feature completion
- **Cross-Module**: Test interactions between posts, comments, prayers
- **Real-time Features**: Test live updates, notifications, leaderboards

## Test Execution Commands

```bash
# Run all tests
npx vitest

# Run tests in watch mode  
npx vitest --watch

# Run tests with coverage
npx vitest --coverage

# Run specific test files
npx vitest prayer.test.ts

# Generate fresh test map
tsx scripts/genTestMap.ts
```

## Coverage Goals
- **Unit Tests**: 80%+ coverage for core library functions
- **Component Tests**: 70%+ coverage for UI components  
- **Integration Tests**: Key user workflows covered
- **E2E Tests**: Critical paths tested (auth, post creation, prayer flow)

The comprehensive test suite ensures reliability across all major features including authentication, content management, prayer system, user profiles, donations, and real-time functionality.