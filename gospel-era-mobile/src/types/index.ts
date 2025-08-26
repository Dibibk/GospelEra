// Shared types for Gospel Era Mobile App
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'banned';
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  tags: string[];
  youtube_url?: string;
  media_url?: string;
  author_id: string;
  author: User;
  created_at: string;
  updated_at: string;
  amen_count: number;
  bookmark_count: number;
  comment_count: number;
  has_amened?: boolean;
  has_bookmarked?: boolean;
  flagged?: boolean;
}

export interface Comment {
  id: number;
  content: string;
  post_id: number;
  author_id: string;
  author: User;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  flagged?: boolean;
}

export interface PrayerRequest {
  id: number;
  title: string;
  details: string;
  tags: string[];
  is_anonymous: boolean;
  is_urgent: boolean;
  status: 'open' | 'answered' | 'closed';
  author_id: string;
  author?: User;
  created_at: string;
  updated_at: string;
  prayer_count: number;
  commitment_count: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  PostDetails: { postId: number };
  PrayerDetails: { prayerId: number };
  Profile: { userId?: string };
  CreatePost: undefined;
  CreatePrayer: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Prayer: undefined;
  Profile: undefined;
  Search: undefined;
};