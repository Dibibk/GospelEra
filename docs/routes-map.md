# Gospel Era Web - Routes Map

## Router Configuration
- **Type**: React Router v6
- **Animation**: Framer Motion page transitions
- **Guards**: ProtectedRoute component for authentication

## Route Inventory

| Path | Component | Guard | Loader | Notes |
|------|-----------|-------|--------|-------|
| /login | /PageTransition | None | None | - |
| /forgot-password | /PageTransition | None | None | - |
| /reset-password | /PageTransition | None | None | - |
| / | /ProtectedRoute | ProtectedRoute | None | - |
| /dashboard | /ProtectedRoute | ProtectedRoute | None | - |
| /profile | /ProtectedRoute | ProtectedRoute | None | - |
| /profile/:id | /ProtectedRoute | ProtectedRoute | None | - |
| /settings | /ProtectedRoute | ProtectedRoute | None | - |
| /saved | /ProtectedRoute | ProtectedRoute | None | - |
| /admin/reports | /ProtectedRoute | ProtectedRoute | None | - |
| /guidelines | /ProtectedRoute | ProtectedRoute | None | - |
| /donate | /ProtectedRoute | ProtectedRoute | None | - |
| /donate/thanks | /ProtectedRoute | ProtectedRoute | None | - |
| /admin/donations | /ProtectedRoute | ProtectedRoute | None | - |
| /prayer/new | /ProtectedRoute | ProtectedRoute | None | - |
| /prayer/browse | /ProtectedRoute | ProtectedRoute | None | - |
| /prayer/:id | /ProtectedRoute | ProtectedRoute | None | - |
| /prayer/my | /ProtectedRoute | ProtectedRoute | None | - |
| /prayer/leaderboard | /ProtectedRoute | ProtectedRoute | None | - |

## Route Groups

### Authentication Routes
- `/login` - Login page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form

### Main Application
- `/` - Dashboard (home feed)
- `/profile` - User profile view
- `/settings` - Account settings

### Prayer System
- `/prayer/new` - Create prayer request
- `/prayer/browse` - Browse prayer requests
- `/prayer/:id` - Prayer request details
- `/prayer/my` - User's prayer dashboard
- `/prayer/leaderboard` - Prayer leaderboard

### Admin & Moderation
- `/admin/reports` - Content moderation
- `/admin/donations` - Donation management

### Other Features
- `/donate` - Donation page
- `/guidelines` - Community guidelines
- `/saved` - Saved posts
