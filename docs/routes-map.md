# Routes Map - Gospel Era Web

## Router Configuration
- **Router Type**: React Router v6
- **Location**: `client/src/App.tsx`
- **Protection**: `ProtectedRoute` component wrapping authenticated routes

## Route Definitions

### Authentication Routes (Public)
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/login` | `Login` | None | User sign-in |
| `/register` | `Register` | None | User registration |
| `/forgot-password` | `ForgotPassword` | None | Password reset request |
| `/reset-password` | `ResetPassword` | None | Password reset confirmation |

### Main Application Routes (Protected)
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/` | `Dashboard` | `ProtectedRoute` | Main feed, posts, interactions |
| `/profile` | `Profile` | `ProtectedRoute` | Current user profile view |
| `/profile/:id` | `PublicProfile` | `ProtectedRoute` | Other user profile view |
| `/settings` | `Settings` | `ProtectedRoute` | Profile management, preferences |
| `/saved` | `SavedPosts` | `ProtectedRoute` | Bookmarked posts |
| `/guidelines` | `Guidelines` | `ProtectedRoute` | Community guidelines |

### Prayer System Routes (Protected)
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/prayer/new` | `PrayerNew` | `ProtectedRoute` | Create prayer request |
| `/prayer/browse` | `PrayerBrowse` | `ProtectedRoute` | Browse open requests |
| `/prayer/:id` | `PrayerDetail` | `ProtectedRoute` | Prayer request details |
| `/prayer/my` | `PrayerMy` | `ProtectedRoute` | User's requests & commitments |
| `/prayer/leaderboard` | `PrayerLeaderboard` | `ProtectedRoute` | Prayer statistics & rankings |

### Donations Routes (Protected)
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/donate` | `Donate` | `ProtectedRoute` | Donation form & pledges |
| `/donate/thanks` | `DonateThanks` | `ProtectedRoute` | Post-donation confirmation |

### Admin Routes (Protected + Role Check)
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/admin/donations` | `AdminDonations` | `ProtectedRoute` + `AdminRole` | Donation management |
| `/admin/reports` | `AdminReports` | `ProtectedRoute` + `AdminRole` | Content moderation |

### Error Routes
| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `*` | `NotFound` | None | 404 error page |

## Route Guards & Middleware

### ProtectedRoute Component
- **Location**: `client/src/routes/ProtectedRoute.tsx`
- **Function**: Validates user session, redirects to `/login` if unauthenticated
- **Loading State**: Shows spinner during session validation
- **Error Handling**: Graceful fallback for auth errors

### Admin Role Check (Implicit)
- **Implementation**: Role-based access within components
- **Method**: `useRole()` hook checking user permissions
- **Fallback**: Shows access denied or redirects to main dashboard

## Navigation Patterns

### Primary Navigation
- **Location**: Header navigation bar
- **Links**:
  - Dashboard (/)
  - Prayer (/prayer/browse)
  - Leaderboard (/prayer/leaderboard)
  - Profile (/profile)
  - Settings (/settings)

### Prayer Section Navigation
- **Context**: Prayer system sub-navigation
- **Links**:
  - Browse Requests (/prayer/browse)
  - My Prayers (/prayer/my)
  - New Request (/prayer/new)
  - Leaderboard (/prayer/leaderboard)

### User Actions Navigation
- **Trigger**: User dropdown menu
- **Links**:
  - Profile (/profile)
  - Settings (/settings)
  - Saved Posts (/saved)
  - Admin Panel (/admin/reports) [admin only]
  - Donate (/donate)
  - Guidelines (/guidelines)
  - Logout (action)

## Route Parameters & Query Strings

### Dynamic Routes
- `/prayer/:id` - Prayer request ID
- `/profile/:id` - User profile ID

### Query Parameters
- `/prayer/browse?tag=healing&status=open` - Filter prayer requests
- `/?cursor=abc123&limit=20` - Pagination for posts
- `/admin/reports?status=pending` - Filter admin reports

## Route Transitions & Loading

### Loading States
- **Global**: Top-level loading spinner during route changes
- **Component**: Individual loading states within components
- **Suspense**: React Suspense for code splitting (if implemented)

### Error Boundaries
- **Route Level**: Catch errors during route rendering
- **Component Level**: Isolate errors within components
- **Fallback UI**: User-friendly error messages

## Inter-Route Communication

### State Persistence
- **React Query**: Server state cached across routes
- **Local Storage**: Theme, user preferences
- **URL State**: Search filters, pagination

### Cross-Route Actions
- **Post Creation**: From Dashboard to individual post
- **Prayer Commitment**: From browse to detail to my prayers
- **Profile Navigation**: From posts to user profiles
- **Admin Actions**: From reports to content management

## Route-Specific Data Loading

### Data Dependencies by Route
- **Dashboard**: Posts, user engagement, prayer commitments
- **Prayer Detail**: Specific request, comments, commitment status
- **Profile**: User profile, posts by user, prayer statistics
- **Admin Reports**: Flagged content, user reports, moderation history

### Loading Strategies
- **Eager Loading**: Critical data loaded on route entry
- **Lazy Loading**: Secondary data loaded on demand
- **Background Refresh**: Stale-while-revalidate for better UX
