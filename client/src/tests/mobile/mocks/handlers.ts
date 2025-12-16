import { http, HttpResponse } from 'msw'

export const mobileHandlers = [
  // Mobile-specific API endpoints
  http.get('/api/profiles/*', () => {
    return HttpResponse.json({
      display_name: 'Mobile Test User',
      avatar_url: 'mobile-avatar.jpg',
      role: 'user',
      mobile_verified: true
    })
  }),
  
  http.get('/api/posts', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Mobile Test Post',
        content: 'This is a mobile test post',
        userId: 'mobile-test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['mobile', 'test'],
        media_urls: ['mobile-image.jpg']
      }
    ])
  }),

  http.get('/api/prayer-requests', () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          title: 'Mobile Prayer Request',
          details: 'Please pray for mobile testing',
          author_id: 'mobile-test-user-id',
          created_at: new Date().toISOString(),
          tags: ['mobile', 'testing'],
          is_anonymous: false
        }
      ]
    })
  }),

  http.get('/api/comments/*', () => {
    return HttpResponse.json([
      {
        id: 'mobile-comment-1',
        content: 'Mobile test comment',
        post_id: 'mobile-post-1',
        author_id: 'mobile-test-user-id',
        created_at: new Date().toISOString(),
        deleted_at: null
      }
    ])
  }),

  http.get('/api/media-permission/*', () => {
    return HttpResponse.json({
      hasPermission: true,
      mobile_optimized: true
    })
  }),

  http.get('/api/daily-verse', () => {
    return HttpResponse.json({
      reference: 'Mobile John 3:16',
      text: 'For God so loved the mobile world...'
    })
  }),

  http.get('/api/user-settings', () => {
    return HttpResponse.json({
      theme: 'light',
      notifications_enabled: true,
      mobile_push_enabled: true,
      mobile_data_saver: false
    })
  }),

  // Mobile-specific endpoints
  http.post('/api/mobile/posts', () => {
    return HttpResponse.json({
      id: 'mobile-post-1',
      title: 'Mobile Created Post',
      content: 'Created from mobile app',
      mobile_created: true
    })
  }),

  http.post('/api/mobile/comments', () => {
    return HttpResponse.json({
      id: 'mobile-comment-1',
      content: 'Mobile comment',
      mobile_created: true
    })
  }),

  http.post('/api/mobile/prayer-requests', () => {
    return HttpResponse.json({
      id: 'mobile-prayer-1',
      title: 'Mobile Prayer',
      mobile_created: true
    })
  }),

  // Mobile error handling
  http.get('/api/mobile/error-test', () => {
    return HttpResponse.json(
      { error: 'Mobile network error' },
      { status: 500 }
    )
  })
]