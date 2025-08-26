// API service layer to connect with existing Gospel Era backend
import { API_BASE_URL } from '../config/supabase';
import { Post, Comment, PrayerRequest, ApiResponse, User } from '../types';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic API request method
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API Request Error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Posts API
  async getPosts(): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>('/api/posts');
  }

  async createPost(postData: {
    title: string;
    content: string;
    tags: string[];
    youtube_url?: string;
  }): Promise<ApiResponse<Post>> {
    return this.request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async getPost(id: number): Promise<ApiResponse<Post>> {
    return this.request<Post>(`/api/posts/${id}`);
  }

  async amenPost(postId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/posts/${postId}/amen`, {
      method: 'POST',
    });
  }

  async bookmarkPost(postId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/posts/${postId}/bookmark`, {
      method: 'POST',
    });
  }

  // Comments API
  async getComments(postId: number): Promise<ApiResponse<Comment[]>> {
    return this.request<Comment[]>(`/api/posts/${postId}/comments`);
  }

  async createComment(postId: number, content: string): Promise<ApiResponse<Comment>> {
    return this.request<Comment>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Prayer Requests API
  async getPrayerRequests(): Promise<ApiResponse<PrayerRequest[]>> {
    return this.request<PrayerRequest[]>('/api/prayer-requests');
  }

  async createPrayerRequest(data: {
    title: string;
    details: string;
    tags: string[];
    is_anonymous: boolean;
    is_urgent: boolean;
  }): Promise<ApiResponse<PrayerRequest>> {
    return this.request<PrayerRequest>('/api/prayer-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async prayForRequest(requestId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/prayer-requests/${requestId}/pray`, {
      method: 'POST',
    });
  }

  // Profile API
  async getProfile(userId: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/profiles/${userId}`);
  }

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Search API
  async searchPosts(query: string): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>(`/api/search?q=${encodeURIComponent(query)}`);
  }
}

export const apiService = new ApiService();