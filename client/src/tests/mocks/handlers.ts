import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock API endpoints here if needed
  http.get('/api/profiles/*', () => {
    return HttpResponse.json({
      display_name: 'Test User',
      avatar_url: null,
      role: 'user'
    })
  }),
  
  http.get('/api/posts', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Post',
        content: 'This is a test post',
        author_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['test'],
        media_urls: []
      }
    ])
  })
]