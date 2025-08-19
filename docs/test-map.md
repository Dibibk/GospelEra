# Gospel Era Web - Test Map

## Project Overview
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Router**: React Router
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest + React Testing Library
- **State Management**: TanStack React Query

## Testing Infrastructure Status
✅ **Vitest Configuration**: Complete with jsdom environment
✅ **Mock Service Worker**: Configured for API mocking
✅ **Supabase Mocking**: Comprehensive authentication mocking
✅ **Component Testing**: React Testing Library setup
✅ **Current Coverage**: 7/7 tests passing (Login + ProtectedRoute)

---

## Domain: Authentication

### Module: client/src/lib/supabaseClient.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| supabase | const | SupabaseClient | SupabaseClient | Network calls to Supabase | Auth errors |

**Used by**: All authentication flows, data fetching
**Notes for testing**: Mock with `vi.mock('@supabase/supabase-js')`, test auth state changes
```typescript
// RTL snippet: Mock supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient
}))
```

### Module: client/src/pages/Login.tsx
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| Login | component | () => JSX.Element | JSX.Element | Navigation, auth calls | Form validation |

**Used by**: App router
**Notes for testing**: ✅ **TESTED** - 5 passing tests covering form rendering, validation, auth flow, error handling
```typescript
// RTL snippet: Test login form
render(<Login />)
expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
```

---

## Domain: Posts & Content

### Module: client/src/lib/posts.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| getPosts | function | (filters?) => Promise<Post[]> | Promise<Post[]> | Supabase query | RLS errors |
| createPost | function | (data: CreatePost) => Promise<Post> | Promise<Post> | Supabase insert, toast | Validation errors |
| deletePost | function | (id: string) => Promise<void> | Promise<void> | Supabase delete | Permission errors |
| toggleAmen | function | (postId: string) => Promise<void> | Promise<void> | Supabase upsert | Auth errors |
| toggleBookmark | function | (postId: string) => Promise<void> | Promise<void> | Supabase upsert | Auth errors |

**Used by**: Dashboard, post components
**Notes for testing**: Mock Supabase responses, test error states, pagination
```typescript
// RTL snippet: Test post creation
const mockCreate = vi.fn()
await user.type(screen.getByLabelText(/title/i), 'Test Post')
```

### Module: client/src/lib/comments.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| getComments | function | (postId: string) => Promise<Comment[]> | Promise<Comment[]> | Supabase query | RLS errors |
| createComment | function | (data: CreateComment) => Promise<Comment> | Promise<Comment> | Supabase insert, toast | Validation errors |
| deleteComment | function | (id: string) => Promise<void> | Promise<void> | Supabase soft delete | Permission errors |

**Used by**: Post detail pages, comment components
**Notes for testing**: Mock comment threads, test soft delete behavior
```typescript
// RTL snippet: Test comment creation
await user.type(screen.getByPlaceholderText(/add comment/i), 'Test comment')
```

---

## Domain: Prayer System

### Module: client/src/lib/prayer.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| createPrayerRequest | function | (data: CreatePrayerRequest) => Promise<PrayerRequest> | Promise<PrayerRequest> | Supabase insert, toast | Validation errors |
| getPrayerRequests | function | (filters?) => Promise<PrayerRequest[]> | Promise<PrayerRequest[]> | Supabase query | RLS errors |
| commitToPrayer | function | (requestId: string) => Promise<void> | Promise<void> | Supabase insert | Auth errors |
| confirmPrayed | function | (commitmentId: string) => Promise<void> | Promise<void> | Supabase update | Permission errors |
| getPrayerLeaderboard | function | (timeframe: string) => Promise<LeaderboardEntry[]> | Promise<LeaderboardEntry[]> | Supabase query | None |
| getUserPrayerStats | function | (userId: string) => Promise<PrayerStats> | Promise<PrayerStats> | Supabase query | RLS errors |

**Used by**: Prayer pages, leaderboard, dashboard
**Notes for testing**: Mock prayer commitment flow, test leaderboard calculations, real-time updates
```typescript
// RTL snippet: Test prayer commitment
await user.click(screen.getByText(/commit to pray/i))
expect(mockCommitToPrayer).toHaveBeenCalled()
```

---

## Domain: User Management

### Module: client/src/lib/profiles.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| getProfile | function | (userId: string) => Promise<Profile> | Promise<Profile> | Supabase query | Not found errors |
| updateProfile | function | (data: UpdateProfile) => Promise<Profile> | Promise<Profile> | Supabase update, toast | Validation errors |
| uploadAvatar | function | (file: File) => Promise<string> | Promise<string> | Object storage, Supabase update | Upload errors |

**Used by**: Profile pages, settings, user display components
**Notes for testing**: Mock file uploads, test profile validation, avatar handling
```typescript
// RTL snippet: Test profile update
await user.type(screen.getByLabelText(/display name/i), 'New Name')
```

---

## Domain: Admin & Moderation

### Module: client/src/lib/reports.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| createReport | function | (data: CreateReport) => Promise<Report> | Promise<Report> | Supabase insert, toast | Validation errors |
| getReports | function | (filters?) => Promise<Report[]> | Promise<Report[]> | Supabase query | Admin only errors |
| resolveReport | function | (id: string, action: string) => Promise<void> | Promise<void> | Supabase update | Permission errors |

**Used by**: Admin pages, report modals
**Notes for testing**: Mock admin permissions, test report workflow
```typescript
// RTL snippet: Test report creation
await user.click(screen.getByText(/report/i))
expect(screen.getByText(/report submitted/i)).toBeInTheDocument()
```

### Module: shared/moderation.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| moderateContent | function | (content: string) => Promise<ModerationResult> | Promise<ModerationResult> | Content analysis | None |
| isContentAppropriate | function | (content: string) => boolean | boolean | None | None |

**Used by**: Post creation, comment creation, prayer requests
**Notes for testing**: Test blocked terms, Christian content detection, edge cases
```typescript
// RTL snippet: Test content moderation
const result = await moderateContent('inappropriate content')
expect(result.approved).toBe(false)
```

---

## Domain: Storage & Media

### Module: server/objectStorage.ts
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| ObjectStorageService | class | constructor() | ObjectStorageService | GCS client init | Config errors |
| getObjectEntityUploadURL | method | () => Promise<string> | Promise<string> | Signed URL generation | Auth errors |
| downloadObject | method | (file: File, res: Response) => Promise<void> | Promise<void> | File streaming | Not found errors |

**Used by**: Media upload, file serving
**Notes for testing**: Mock GCS client, test upload flow, file streaming
```typescript
// RTL snippet: Test file upload
const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
await user.upload(screen.getByLabelText(/upload/i), file)
```

---

## Domain: Routing & Navigation

### Module: client/src/routes/ProtectedRoute.tsx
**Exports**:
| Name | Kind | Signature | Returns | Side-effects | Errors |
|------|------|-----------|---------|--------------|--------|
| ProtectedRoute | component | ({ children }: Props) => JSX.Element | JSX.Element | Navigation to login | None |

**Used by**: App router for protected pages
**Notes for testing**: ✅ **TESTED** - 2 passing tests covering loading states, session management
```typescript
// RTL snippet: Test protected route
render(<ProtectedRoute><TestComponent /></ProtectedRoute>)
expect(screen.getByTestId('loading')).toBeInTheDocument()
```

---

## Next Testing Priorities

### Immediate (High Priority)
1. **Dashboard Component** - Main user interface, post listing, interactions
2. **Post Creation Flow** - Form validation, media upload, moderation
3. **Prayer System** - Request creation, commitment flow, leaderboard
4. **Comment System** - Thread display, creation, soft delete

### Medium Priority
5. **Profile Management** - Avatar upload, settings, display
6. **Admin Features** - Report handling, user management
7. **Search & Filtering** - Post search, tag filtering, pagination
8. **Theme System** - Theme switching, persistence

### Low Priority
9. **Storage Integration** - File upload, serving, S3 fallback
10. **PWA Features** - Service worker, offline functionality

---

## Testing Utilities Needed

### Mock Providers
- **AuthProvider Mock**: ✅ Already implemented
- **QueryClient Mock**: Needed for React Query
- **Router Mock**: Needed for navigation testing
- **Supabase Mock**: ✅ Partially implemented, needs expansion

### Test Helpers
- **Component Wrapper**: Combine all providers
- **User Factory**: Generate test user data
- **Post Factory**: Generate test post data
- **Prayer Factory**: Generate test prayer data

### Integration Test Scenarios
- **Full Authentication Flow**: Login → Dashboard → Logout
- **Post Lifecycle**: Create → View → Comment → React
- **Prayer Workflow**: Request → Commit → Pray → Confirm
- **Admin Workflow**: View Reports → Moderate → Resolve
