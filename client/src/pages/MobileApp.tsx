import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listPosts, createPost } from '@/lib/posts';
import { listPrayerRequests, createPrayerRequest, commitToPray } from '@/lib/prayer';
import { getProfilesByIds } from '@/lib/profiles';
import { toggleAmen, toggleBookmark, isBookmarked } from '@/lib/engagement';
import { listComments, createComment } from '@/lib/comments';

// Complete Instagram-style Gospel Era Mobile App with Real API Integration
const MobileApp = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [engagementData, setEngagementData] = useState<Map<string, any>>(new Map());
  const [postComments, setPostComments] = useState<{[key: string]: any[]}>({});
  const [commentForms, setCommentForms] = useState<{[key: string]: boolean}>({});
  const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
  const [searchText, setSearchText] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerDetails, setPrayerDetails] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch real posts from API
      const postsResult = await listPosts({ limit: 20 });
      if (postsResult.data) {
        setPosts(postsResult.data);
        
        // Load author profiles
        const authorIds = postsResult.data.map(post => post.author_id);
        await loadProfiles(authorIds);
        
        // Load engagement data  
        const postIds = postsResult.data.map(post => post.id);
        await loadEngagementData(postIds);
      }

      // Fetch real prayer requests from API
      const prayerResult = await listPrayerRequests({ limit: 10 });
      if (prayerResult.data) {
        setPrayerRequests(prayerResult.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async (authorIds: string[]) => {
    try {
      const { data: profileMap } = await getProfilesByIds(authorIds);
      if (profileMap) {
        setProfiles(prev => new Map([...Array.from(prev), ...Array.from(profileMap)]));
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadEngagementData = async (postIds: number[]) => {
    try {
      const engagementMap = new Map();
      for (const postId of postIds) {
        const { isBookmarked: bookmarked } = await isBookmarked(postId);
        engagementMap.set(postId, { isBookmarked: bookmarked });
      }
      setEngagementData(prev => new Map([...Array.from(prev), ...Array.from(engagementMap)]));
    } catch (error) {
      console.error('Error loading engagement data:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!createTitle.trim() || !createContent.trim()) return;
    
    try {
      const result = await createPost({
        title: createTitle.trim(),
        content: createContent.trim(),
        tags: [],
        media_urls: [],
        embed_url: ''
      });
      
      if (result.data) {
        setCreateTitle('');
        setCreateContent('');
        fetchData();
        setActiveTab(0); // Go back to home
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCreatePrayerRequest = async () => {
    if (!prayerTitle.trim() || !prayerDetails.trim()) return;
    
    try {
      const result = await createPrayerRequest({
        title: prayerTitle.trim(),
        details: prayerDetails.trim(),
        tags: [],
        is_anonymous: false
      });
      
      if (result.data) {
        setPrayerTitle('');
        setPrayerDetails('');
        fetchData();
        setActiveTab(3); // Go to prayer tab
      }
    } catch (error) {
      console.error('Error creating prayer request:', error);
    }
  };

  const handleCommitToPray = async (requestId: number) => {
    try {
      await commitToPray(requestId);
      fetchData(); // Refresh to show updated stats
    } catch (error) {
      console.error('Error committing to pray:', error);
    }
  };

  const handleToggleAmen = async (postId: number) => {
    try {
      await toggleAmen(postId);
      // Refresh engagement data for this post
      await loadEngagementData([postId]);
    } catch (error) {
      console.error('Error toggling amen:', error);
    }
  };

  const handleToggleBookmark = async (postId: number) => {
    try {
      await toggleBookmark(postId);
      // Refresh engagement data for this post
      await loadEngagementData([postId]);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const toggleCommentForm = (postId: number) => {
    setCommentForms(prev => ({...prev, [postId]: !prev[postId]}));
    
    // Load comments when opening the form for the first time
    if (!commentForms[postId] && !postComments[postId]) {
      loadComments(postId);
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const { data, error } = await listComments({ postId, limit: 3 });
      if (error) {
        console.error('Failed to load comments:', error);
      } else {
        const comments = data || [];
        setPostComments(prev => ({ ...prev, [postId]: comments }));
        
        // Load comment author profiles
        if (comments.length > 0) {
          const authorIds = comments.map(comment => comment.author_id);
          await loadProfiles(authorIds);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleCreateComment = async (postId: number) => {
    const content = commentTexts[postId]?.trim();
    if (!content) return;
    
    try {
      const { data, error } = await createComment({ postId, content });
      if (error) {
        console.error('Failed to create comment:', error);
      } else {
        // Clear the input and reload comments
        setCommentTexts(prev => ({...prev, [postId]: ''}));
        await loadComments(postId);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    
    setLoginError('');
    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);
    
    if (error) {
      setLoginError(error.message);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  // Component styles
  const styles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      background: '#ffffff',
      color: '#262626',
      height: '100vh',
      maxWidth: '414px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
      fontSize: '14px',
      position: 'relative' as const
    },
    header: {
      background: '#ffffff',
      borderBottom: '1px solid #dbdbdb',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      background: '#ffffff',
      paddingBottom: '60px'
    },
    bottomNav: {
      position: 'fixed' as const,
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '414px',
      height: '50px',
      background: '#ffffff',
      borderTop: '1px solid #dbdbdb',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0 16px'
    }
  };

  // Login Component
  const LoginPage = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#262626', marginBottom: '8px' }}>
          Gospel Era
        </div>
        <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
          Connect with believers worldwide
        </div>
      </div>

      {loginError && (
        <div style={{
          background: '#fee', border: '1px solid #fcc', color: '#c00',
          padding: '12px', borderRadius: '8px', marginBottom: '16px',
          fontSize: '14px', textAlign: 'center'
        }}>
          {loginError}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', outline: 'none'
          }}
        />
      </div>

      <button
        onClick={handleLogin}
        disabled={!email.trim() || !password.trim()}
        style={{
          width: '100%', background: email.trim() && password.trim() ? '#262626' : '#dbdbdb',
          color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px',
          fontSize: '16px', fontWeight: 600, marginBottom: '16px',
          cursor: email.trim() && password.trim() ? 'pointer' : 'not-allowed'
        }}
      >
        {isSignUp ? 'Sign Up' : 'Log In'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'none', border: 'none', color: '#262626',
            fontSize: '14px', cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );

  // Home Feed Component
  const HomeFeed = () => (
    <>
      {/* Search bar */}
      <div style={{ padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #dbdbdb' }}>
        <input 
          type="text" 
          placeholder="Search Gospel Era"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%', height: '36px', background: '#f2f2f2', border: 'none',
            borderRadius: '18px', padding: '0 16px', fontSize: '14px',
            color: '#262626', outline: 'none'
          }}
        />
      </div>

      {/* Daily scripture */}
      <div style={{
        background: '#ffffff', padding: '8px 16px', borderBottom: '1px solid #dbdbdb',
        fontSize: '12px', color: '#8e8e8e', textAlign: 'center'
      }}>
        "For I know the plans I have for you" - Jeremiah 29:11
      </div>

      {/* Posts feed */}
      {loading ? (
        Array(3).fill(0).map((_, index) => (
          <div key={index} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '8px', width: '80px' }} />
                <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', width: '60px' }} />
              </div>
            </div>
            <div style={{ width: '100%', height: '200px', background: '#f0f0f0' }} />
          </div>
        ))
      ) : posts.length > 0 ? (
        posts.filter((post) => 
          !searchText || 
          post.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          post.content?.toLowerCase().includes(searchText.toLowerCase())
        ).map((post, index) => (
          <div key={post.id} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb' }}>
            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', marginRight: '12px', border: '1px solid #dbdbdb', color: '#8e8e8e'
              }}>
                {profiles.get(post.author_id)?.avatar_url ? (
                  <img 
                    src={profiles.get(post.author_id).avatar_url} 
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#262626' }}>
                  {profiles.get(post.author_id)?.display_name || 'Gospel User'}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                  {formatTimeAgo(post.created_at)}
                </div>
              </div>
              <div style={{ fontSize: '16px', color: '#262626', cursor: 'pointer', padding: '8px' }}>⋯</div>
            </div>

            {/* Post content */}
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>
                {post.title}
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.4, color: '#262626', marginBottom: '8px' }}>
                {post.content}
              </div>
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {post.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} style={{
                      background: '#f2f2f2', color: '#7c3aed', 
                      padding: '2px 8px', borderRadius: '12px', 
                      fontSize: '12px', fontWeight: 500
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Media */}
              {post.media_urls && post.media_urls.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <img 
                    src={post.media_urls[0]} 
                    alt="Post media"
                    style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'cover', 
                      borderRadius: '8px' 
                    }}
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* YouTube embed */}
              {post.embed_url && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    paddingBottom: '56.25%', 
                    background: '#f2f2f2', 
                    borderRadius: '8px', 
                    overflow: 'hidden' 
                  }}>
                    <iframe
                      src={post.embed_url.replace('watch?v=', 'embed/')}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%' 
                      }}
                      frameBorder="0"
                      allowFullScreen
                      title="YouTube video"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Post actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => handleToggleAmen(post.id)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}
                >
                  🙏
                </button>
                <button 
                  onClick={() => toggleCommentForm(post.id)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}
                >
                  💬
                </button>
                <button style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>↗</button>
              </div>
              <button 
                onClick={() => handleToggleBookmark(post.id)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: engagementData.get(post.id)?.isBookmarked ? '#262626' : '#8e8e8e', cursor: 'pointer', padding: '8px' }}
              >
                {engagementData.get(post.id)?.isBookmarked ? '🔖' : '⋄'}
              </button>
            </div>

            {/* Comments section */}
            {commentForms[post.id] && (
              <div style={{ borderTop: '1px solid #dbdbdb', padding: '12px 16px' }}>
                {/* Comment input */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentTexts[post.id] || ''}
                    onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                    style={{
                      flex: 1, padding: '8px 12px', border: '1px solid #dbdbdb',
                      borderRadius: '20px', fontSize: '14px', outline: 'none', marginRight: '8px'
                    }}
                  />
                  <button
                    onClick={() => handleCreateComment(post.id)}
                    disabled={!commentTexts[post.id]?.trim()}
                    style={{
                      background: commentTexts[post.id]?.trim() ? '#262626' : '#dbdbdb',
                      color: '#ffffff', border: 'none', padding: '8px 16px',
                      borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      cursor: commentTexts[post.id]?.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Post
                  </button>
                </div>

                {/* Comments list */}
                {postComments[post.id] && postComments[post.id].length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {postComments[post.id].map((comment, commentIndex) => (
                      <div key={comment.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: '#dbdbdb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', marginRight: '8px', flexShrink: 0, color: '#8e8e8e'
                        }}>
                          {profiles.get(comment.author_id)?.avatar_url ? (
                            <img 
                              src={profiles.get(comment.author_id).avatar_url} 
                              alt="Avatar"
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : '👤'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: 600, color: '#262626', marginRight: '6px' }}>
                              {profiles.get(comment.author_id)?.display_name || 'Gospel User'}
                            </span>
                            <span style={{ color: '#262626' }}>{comment.content}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#8e8e8e', marginTop: '2px' }}>
                            {formatTimeAgo(comment.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Post timestamp */}
            <div style={{ padding: '0 16px 12px', fontSize: '10px', color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {formatTimeAgo(post.created_at).toUpperCase()}
            </div>
          </div>
        ))
      ) : (
        <div style={{ background: '#ffffff', padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>Welcome to Gospel Era</div>
          <div style={{ color: '#8e8e8e', fontSize: '14px' }}>Share your faith and grow together</div>
        </div>
      )}
    </>
  );

  // Search Component
  const SearchPage = () => (
    <div style={{ padding: '16px' }}>
      <input 
        type="text" 
        placeholder="Search users, posts, topics..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        autoFocus
        style={{
          width: '100%', height: '40px', background: '#f2f2f2', border: 'none',
          borderRadius: '20px', padding: '0 16px', fontSize: '16px', outline: 'none'
        }}
      />

      <div style={{ marginTop: '16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', color: '#262626' }}>Recent Posts</div>
        {posts.slice(0, 5).map((post, index) => (
          <div key={post.id} style={{ borderBottom: '1px solid #f2f2f2', padding: '12px 0' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#262626', marginBottom: '4px' }}>
              {post.title}
            </div>
            <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
              {post.content?.substring(0, 100)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Create Post Component
  const CreatePage = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: '12px', color: '#8e8e8e'
          }}>
            •
          </div>
          <div style={{ fontWeight: 600, color: '#262626' }}>Create Post</div>
        </div>

        <input
          type="text"
          placeholder="Post title..."
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none'
          }}
        />

        <textarea
          placeholder="Share your faith, testimony, or encouragement..."
          value={createContent}
          onChange={(e) => setCreateContent(e.target.value)}
          rows={6}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', marginBottom: '16px'
          }}
        />

        <button
          onClick={handleCreatePost}
          disabled={!createTitle.trim() || !createContent.trim()}
          style={{
            width: '100%', background: createTitle.trim() && createContent.trim() ? '#262626' : '#dbdbdb',
            color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px',
            fontSize: '16px', fontWeight: 600, cursor: createTitle.trim() && createContent.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          Share Post
        </button>
      </div>
    </div>
  );

  // Prayer Page Component
  const PrayerPage = () => (
    <>
      {/* Prayer Stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '16px',
        background: '#ffffff', borderBottom: '1px solid #dbdbdb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>{prayerRequests.length}</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Requests</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>
            {prayerRequests.reduce((sum, req) => sum + (req.prayer_stats?.committed_count || 0), 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Committed</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>
            {prayerRequests.reduce((sum, req) => sum + (req.prayer_stats?.prayed_count || 0), 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Prayed</div>
        </div>
      </div>

      {/* Create Prayer Request */}
      <div style={{ padding: '16px', borderBottom: '1px solid #dbdbdb' }}>
        <input
          type="text"
          placeholder="Prayer request title..."
          value={prayerTitle}
          onChange={(e) => setPrayerTitle(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #dbdbdb',
            borderRadius: '6px', fontSize: '14px', marginBottom: '8px', outline: 'none'
          }}
        />
        <textarea
          placeholder="Share your prayer need..."
          value={prayerDetails}
          onChange={(e) => setPrayerDetails(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #dbdbdb',
            borderRadius: '6px', fontSize: '14px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', marginBottom: '8px'
          }}
        />
        <button
          onClick={handleCreatePrayerRequest}
          disabled={!prayerTitle.trim() || !prayerDetails.trim()}
          style={{
            background: prayerTitle.trim() && prayerDetails.trim() ? '#7c3aed' : '#dbdbdb',
            color: '#ffffff', border: 'none', padding: '8px 16px',
            borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            cursor: prayerTitle.trim() && prayerDetails.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          Submit Request
        </button>
      </div>

      {/* Prayer Requests Feed */}
      {prayerRequests.length > 0 ? (
        prayerRequests.map((request) => (
          <div key={request.id} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: '12px', color: '#8e8e8e'
              }}>
                {request.is_anonymous ? '?' : '•'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#262626' }}>
                  {request.is_anonymous ? 'Anonymous' : (request.profiles?.display_name || 'Prayer Warrior')}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e8e' }}>{formatTimeAgo(request.created_at)}</div>
              </div>
              {request.is_anonymous && (
                <div style={{
                  background: '#f2f2f2', padding: '4px 8px', borderRadius: '12px',
                  fontSize: '10px', color: '#8e8e8e'
                }}>
                  Anonymous
                </div>
              )}
            </div>

            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>
              {request.title}
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '16px', color: '#262626' }}>
              {request.details}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => handleCommitToPray(request.id)}
                style={{
                  background: '#7c3aed', color: '#ffffff', border: 'none',
                  padding: '8px 16px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px'
                }}
              >
                Pray
              </button>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                {request.prayer_stats?.committed_count || 0} committed · {request.prayer_stats?.prayed_count || 0} prayed
              </div>
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🙏</div>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>Prayer Community</div>
          <div style={{ color: '#8e8e8e', fontSize: '14px' }}>Share your prayer needs and pray for others</div>
        </div>
      )}
    </>
  );

  // Profile Component
  const ProfilePage = () => (
    <div style={{ padding: '16px' }}>
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%', background: '#dbdbdb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', marginRight: '16px', color: '#8e8e8e'
        }}>
          •
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
            {user?.email?.split('@')[0] || 'Gospel User'}
          </div>
          <div style={{ fontSize: '14px', color: '#8e8e8e' }}>@{user?.email?.split('@')[0] || 'gospeluser'}</div>
        </div>
        <button 
          onClick={signOut}
          style={{
            background: 'none', border: 'none', fontSize: '24px',
            color: '#262626', cursor: 'pointer', padding: '8px'
          }}
        >
          ⚙
        </button>
      </div>

      {/* Bio */}
      <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '16px', color: '#262626' }}>
        Sharing faith, hope, and love through Christ<br />
        Prayer warrior | Bible study enthusiast
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>{posts.length}</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Posts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>{prayerRequests.length}</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Prayers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>0</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Following</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>0</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Followers</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button style={{
          flex: 1, background: '#f2f2f2', border: 'none', padding: '10px',
          borderRadius: '6px', fontSize: '14px', fontWeight: 600, color: '#262626'
        }}>
          Edit Profile
        </button>
        <button style={{
          background: '#f2f2f2', border: 'none', padding: '10px 16px',
          borderRadius: '6px', fontSize: '16px', color: '#262626'
        }}>
          ↗
        </button>
      </div>

      {/* Logout button */}
      <button
        onClick={signOut}
        style={{
          width: '100%', background: '#dc2626', color: '#ffffff',
          border: 'none', padding: '12px', borderRadius: '8px',
          fontSize: '16px', fontWeight: 600, cursor: 'pointer'
        }}
      >
        Sign Out
      </button>
    </div>
  );

  // Loading state
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ fontSize: '20px', color: '#8e8e8e' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Render main component
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#262626', letterSpacing: '-0.5px' }}>
          {!user ? 'Gospel Era' :
           activeTab === 0 ? 'Gospel Era' :
           activeTab === 1 ? 'Search' :
           activeTab === 2 ? 'Create' :
           activeTab === 3 ? 'Prayer' :
           'Profile'}
        </div>
        {user && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>♡</div>
            <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>✉</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {!user ? (
          <LoginPage />
        ) : (
          <>
            {activeTab === 0 && <HomeFeed />}
            {activeTab === 1 && <SearchPage />}
            {activeTab === 2 && <CreatePage />}
            {activeTab === 3 && <PrayerPage />}
            {activeTab === 4 && <ProfilePage />}
          </>
        )}
      </div>

      {/* Bottom Navigation - Only show when logged in */}
      {user && (
        <nav style={styles.bottomNav}>
          <div onClick={() => setActiveTab(0)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: activeTab === 0 ? '#7c3aed' : '#8e8e8e', fontSize: '20px',
            padding: '8px 12px', cursor: 'pointer'
          }}>
            🏠
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Home</span>
          </div>
          <div onClick={() => setActiveTab(1)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: activeTab === 1 ? '#7c3aed' : '#8e8e8e', fontSize: '20px',
            padding: '8px 12px', cursor: 'pointer'
          }}>
            🔍
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Search</span>
          </div>
          <div onClick={() => setActiveTab(2)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: activeTab === 2 ? '#7c3aed' : '#8e8e8e', fontSize: '20px',
            padding: '8px 12px', cursor: 'pointer'
          }}>
            ➕
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Post</span>
          </div>
          <div onClick={() => setActiveTab(3)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: activeTab === 3 ? '#7c3aed' : '#8e8e8e', fontSize: '20px',
            padding: '8px 12px', cursor: 'pointer'
          }}>
            🙏
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Prayer</span>
          </div>
          <div onClick={() => setActiveTab(4)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: activeTab === 4 ? '#7c3aed' : '#8e8e8e', fontSize: '20px',
            padding: '8px 12px', cursor: 'pointer'
          }}>
            👤
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Profile</span>
          </div>
        </nav>
      )}
    </div>
  );
};

export default MobileApp;