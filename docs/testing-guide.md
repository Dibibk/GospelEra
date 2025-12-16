# Gospel Era Web - Testing Guide

## Quick Start

### Running Tests
```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npx vitest

# Run tests in watch mode during development
npx vitest --watch

# Run tests with coverage report
npx vitest --coverage

# Run specific test file
npx vitest prayer.test.ts
```

### Test Structure
```
client/src/tests/
├── setup.ts                    # Test environment setup
├── __mocks__/                 # Global mocks
│   └── supabaseClient.ts      # Supabase mocking
├── components/                # Component tests
│   └── ProtectedRoute.test.tsx
├── hooks/                     # Hook tests  
│   └── useAuth.test.tsx
└── lib/                       # Library function tests
    ├── posts.test.ts
    ├── comments.test.ts  
    ├── prayer.test.ts
    ├── profiles.test.ts
    └── donations.test.ts
```

## Test Categories

### 1. Unit Tests (`lib/`)
Test individual library functions in isolation.

**Example: Prayer Request Creation**
```typescript
import { createPrayerRequest } from '../../lib/prayer'

it('should create prayer request successfully', async () => {
  const request = {
    title: 'Please pray for healing',
    details: 'Going through health challenges', 
    tags: ['healing'],
    is_anonymous: false
  }
  
  const result = await createPrayerRequest(request)
  expect(result.data).toBeTruthy()
  expect(result.error).toBeNull()
})
```

### 2. Component Tests (`components/`)
Test React components with user interactions.

**Example: Protected Route**
```typescript
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '../../components/ProtectedRoute'

it('should show loading state while checking auth', () => {
  mockUseAuth.mockReturnValue({ loading: true, user: null })
  
  render(<ProtectedRoute><TestContent /></ProtectedRoute>)
  
  expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
})
```

### 3. Hook Tests (`hooks/`)
Test custom React hooks with state management.

**Example: Authentication Hook**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'

it('should handle sign in flow', async () => {
  const { result } = renderHook(() => useAuth())
  
  await act(async () => {
    await result.current.signIn('test@example.com', 'password')
  })
  
  expect(result.current.user).toBeTruthy()
})
```

## Mocking Strategy

### Supabase Client
All Supabase operations are mocked using a comprehensive mock object:

```typescript
// In __mocks__/supabaseClient.ts
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(), 
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  }
}
```

### Authentication States
Mock different authentication scenarios:

```typescript
// Authenticated user
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: { id: 'user-1', email: 'test@example.com' }},
  error: null
})

// Unauthenticated 
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: null },
  error: null  
})

// Authentication error
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: null },
  error: { message: 'Session expired' }
})
```

### Database Operations
Mock database responses for different scenarios:

```typescript
// Successful data fetch
global.mockSupabase.from.mockImplementation(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({
    data: [{ id: 1, title: 'Test Post' }],
    error: null
  })
}))

// Database error
global.mockSupabase.from.mockImplementation(() => ({
  select: vi.fn().mockReturnThis(), 
  eq: vi.fn().mockResolvedValue({
    data: null,
    error: { message: 'Database connection failed' }
  })
}))
```

## Testing Patterns

### 1. Setup and Teardown
```typescript
describe('Prayer Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
  })
})
```

### 2. Error Handling Tests
```typescript
it('should handle network errors gracefully', async () => {
  mockSupabase.from.mockImplementation(() => ({
    select: vi.fn().mockRejectedValue(new Error('Network error'))
  }))
  
  const result = await getPrayerRequests()
  expect(result.error).toBeTruthy()
})
```

### 3. Loading State Tests
```typescript
it('should show loading during data fetch', async () => {
  let resolvePromise
  const promise = new Promise(resolve => { resolvePromise = resolve })
  
  mockSupabase.from.mockReturnValue(promise)
  
  render(<PrayerList />)
  expect(screen.getByTestId('loading')).toBeInTheDocument()
  
  resolvePromise({ data: [], error: null })
  await waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })
})
```

### 4. User Interaction Tests
```typescript
import userEvent from '@testing-library/user-event'

it('should submit prayer request on form submit', async () => {
  const user = userEvent.setup()
  
  render(<CreatePrayerForm />)
  
  await user.type(screen.getByLabelText(/title/i), 'Prayer title')
  await user.type(screen.getByLabelText(/details/i), 'Prayer details')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(mockSupabase.from).toHaveBeenCalledWith('prayer_requests')
})
```

## Specific Test Scenarios

### Authentication Flow
- ✅ Login with valid credentials
- ✅ Login with invalid credentials  
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Password reset flow
- ✅ Authentication state transitions

### Prayer System
- ✅ Create prayer request (public/anonymous)
- ✅ Browse prayer requests with filtering
- ✅ Commit to pray for someone
- ✅ Confirm prayer completion
- ✅ Prayer streak calculations
- ✅ Leaderboard rankings

### Content Management  
- ✅ Create posts with media upload
- ✅ Comment on posts
- ✅ React with Amen/bookmarks
- ✅ Content moderation (faith alignment)
- ✅ Soft-delete functionality
- ✅ Search and filtering

### User Profiles
- ✅ View user profiles
- ✅ Update profile information
- ✅ Avatar upload and management
- ✅ Profile privacy settings

### Donations
- ✅ Create donation pledges
- ✅ Payment integration (mocked)
- ✅ Recurring donation setup
- ✅ Donation statistics

## Coverage Requirements

### Minimum Coverage Targets
- **Unit Tests**: 80% line coverage for lib/ functions
- **Component Tests**: 70% coverage for UI components
- **Integration**: Critical user workflows must be tested
- **Error Scenarios**: All error states should be covered

### Priority Testing Areas
1. **Authentication** - Critical security functionality
2. **Prayer System** - Core business logic
3. **Content Creation** - Primary user interactions  
4. **Content Moderation** - Community safety
5. **Payment Processing** - Financial transactions

## Continuous Integration

### Pre-commit Tests
```bash
# Run before committing code
npm run test:run    # All tests must pass
npm run lint        # Code quality checks
npm run type-check  # TypeScript validation
```

### Automated Testing
- All tests run on every pull request
- Coverage reports generated automatically
- Failed tests block deployment
- Performance regression testing

## Debugging Tests

### Common Issues
1. **Mock not resetting**: Use `vi.clearAllMocks()` in `beforeEach`
2. **Async timing**: Use `waitFor()` for async operations
3. **Component not rendering**: Check provider wrappers
4. **Supabase errors**: Verify mock setup matches actual API

### Debug Commands
```bash
# Run single test with verbose output
npx vitest prayer.test.ts --reporter=verbose

# Run tests in debug mode
npx vitest --inspect-brk

# Generate coverage report
npx vitest --coverage --reporter=html
```

This comprehensive testing strategy ensures the Gospel Era Web platform maintains high quality and reliability across all features.