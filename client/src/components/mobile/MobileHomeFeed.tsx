import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMobileContext } from '@/contexts/MobileContext';
import { listPosts } from '@/lib/posts';
import { listComments, createComment, softDeleteComment } from '@/lib/comments';
import { toggleAmen, toggleBookmark, isBookmarked, getAmenInfo } from '@/lib/engagement';
import { createReport } from '@/lib/reports';
import { useRole } from '@/hooks/useRole';
import { getDailyVerse } from '@/lib/scripture';

interface MobileHomeFeedProps {
  onOpenCreatePost: () => void;
  onOpenProfile: (userId: string) => void;
}

export const MobileHomeFeed: React.FC<MobileHomeFeedProps> = ({ 
  onOpenCreatePost, 
  onOpenProfile 
}) => {
  const { user } = useAuth();
  const { role } = useRole();
  const { profiles, setProfiles, engagementData, setEngagementData } = useMobileContext();
  
  // Local state for home feed
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Comments state
  const [postComments, setPostComments] = useState<{ [key: string]: any[] }>({});
  const [commentForms, setCommentForms] = useState<{ [key: string]: boolean }>({});
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  
  // UI state
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);
  
  // Daily verse state
  const [dailyVerse, setDailyVerse] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    fetchData();
    loadDailyVerse();
  }, []);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Load posts
      const postsResult = await listPosts({ limit: 20 });
      if (postsResult.error) {
        setError(postsResult.error);
        return;
      }

      const postsData = Array.isArray(postsResult.data) ? postsResult.data : [];
      setPosts(postsData);
      setNextCursor(postsResult.nextCursor || null);

      // Load profiles for post authors
      if (postsData.length > 0) {
        const authorIds = Array.from(
          new Set(postsData.map((p: any) => p.author_id || p.author).filter(Boolean))
        );
        
        if (authorIds.length > 0) {
          const { getProfilesByIds } = await import('@/lib/profiles');
          const profilesResult = await getProfilesByIds(authorIds);
          if (profilesResult?.data && Array.isArray(profilesResult.data)) {
            setProfiles(prev => {
              const next = new Map(prev);
              profilesResult.data.forEach((profile: any) => {
                next.set(profile.id, profile);
              });
              return next;
            });
          }
        }
      }

      // Load engagement data
      await loadEngagementData(postsData);
      
    } catch (err: any) {
      setError(err?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadEngagementData = async (postsToLoad: any[]) => {
    if (!user || postsToLoad.length === 0) return;

    try {
      // Load amen info and bookmark status for each post
      for (const post of postsToLoad) {
        if (!engagementData.has(post.id)) {
          try {
            const [amenInfo, bookmarkStatus] = await Promise.all([
              getAmenInfo(post.id),
              isBookmarked(post.id)
            ]);
            
            setEngagementData(prev => {
              const next = new Map(prev);
              next.set(post.id, {
                amenCount: amenInfo.data?.count || 0,
                userHasAmened: amenInfo.data?.userHasAmened || false,
                isBookmarked: bookmarkStatus.data || false
              });
              return next;
            });
          } catch (error) {
            console.error(`Failed to load engagement for post ${post.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load engagement data:', error);
    }
  };

  const loadDailyVerse = async () => {
    try {
      const verse = await getDailyVerse();
      setDailyVerse(verse);
    } catch (error) {
      console.error('Failed to load daily verse:', error);
    }
  };

  const handleAmenToggle = async (postId: number) => {
    if (!user) return;

    try {
      const result = await toggleAmen(postId);
      if (result.error) {
        console.error('Failed to toggle amen:', result.error);
        return;
      }

      // Update engagement data
      setEngagementData(prev => {
        const next = new Map(prev);
        const current = next.get(postId) || {};
        next.set(postId, {
          ...current,
          amenCount: result.data?.count || 0,
          userHasAmened: result.data?.userHasAmened || false
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to toggle amen:', error);
    }
  };

  const handleBookmarkToggle = async (postId: number) => {
    if (!user) return;

    try {
      const result = await toggleBookmark(postId);
      if (result.error) {
        console.error('Failed to toggle bookmark:', result.error);
        return;
      }

      // Update engagement data
      setEngagementData(prev => {
        const next = new Map(prev);
        const current = next.get(postId) || {};
        next.set(postId, {
          ...current,
          isBookmarked: result.data || false
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '200px' 
      }}>
        <div style={{ fontSize: '20px', color: '#8e8e8e' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Welcome to Gospel Era
        </div>
        <div style={{ color: '#8e8e8e' }}>
          Please sign in to view posts and join the community
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Daily Verse Card */}
      {dailyVerse && (
        <div style={{
          margin: '16px 12px',
          background: 'linear-gradient(135deg, #f8f4ff 0%, #fff8f0 100%)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e8e8e8',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#8B4513', marginBottom: '8px' }}>
            📖 Daily Scripture
          </div>
          <div style={{ fontSize: '16px', lineHeight: '1.5', color: '#2c3e50', marginBottom: '8px', fontStyle: 'italic' }}>
            "{dailyVerse.text}"
          </div>
          <div style={{ fontSize: '14px', color: '#7B68EE', fontWeight: '500' }}>
            — {dailyVerse.reference}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          margin: '16px 12px',
          padding: '12px',
          background: '#fee',
          color: '#c33',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            No posts yet
          </div>
          <div style={{ color: '#8e8e8e', marginBottom: '20px' }}>
            Be the first to share something inspiring!
          </div>
          <button
            onClick={onOpenCreatePost}
            style={{
              background: '#5A31F4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create Post
          </button>
        </div>
      ) : (
        posts.map((post) => {
          const author = profiles.get(post.author_id || post.author);
          const engagement = engagementData.get(post.id) || {};
          
          return (
            <div key={post.id} style={{
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 12px'
            }}>
              {/* Post Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div
                  onClick={() => author && onOpenProfile(author.id)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: author?.avatar_url ? 'none' : '#dbdbdb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                >
                  {author?.avatar_url ? (
                    <img
                      src={author.avatar_url.startsWith('/') ? author.avatar_url : `/public-objects/${author.avatar_url}`}
                      alt="Profile"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '18px', color: '#8e8e8e' }}>
                      {author?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    onClick={() => author && onOpenProfile(author.id)}
                    style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {author?.username || 'Unknown User'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div style={{ marginBottom: '12px' }}>
                {post.title && (
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 8px 0',
                    color: '#262626'
                  }}>
                    {post.title}
                  </h3>
                )}
                {post.content && (
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.4',
                    color: '#262626',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {post.content}
                  </div>
                )}
              </div>

              {/* Engagement Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                paddingTop: '8px'
              }}>
                <button
                  onClick={() => handleAmenToggle(post.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: engagement.userHasAmened ? '#ff6b6b' : '#8e8e8e'
                  }}
                  data-testid={`button-amen-${post.id}`}
                >
                  <span style={{ fontSize: '16px' }}>
                    {engagement.userHasAmened ? '❤️' : '🤍'}
                  </span>
                  <span>{engagement.amenCount || 0}</span>
                </button>

                <button
                  onClick={() => handleBookmarkToggle(post.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: engagement.isBookmarked ? '#5A31F4' : '#8e8e8e'
                  }}
                  data-testid={`button-bookmark-${post.id}`}
                >
                  {engagement.isBookmarked ? '🔖' : '📋'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};