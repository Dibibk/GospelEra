import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listPosts, createPost, softDeletePost } from '@/lib/posts';
import { listPrayerRequests, createPrayerRequest, commitToPray, confirmPrayed, getMyCommitments, getPrayerRequest } from '@/lib/prayer';
import { getProfilesByIds } from '@/lib/profiles';
import { toggleAmen, toggleBookmark, isBookmarked } from '@/lib/engagement';
import { listComments, createComment } from '@/lib/comments';
import { createReport } from '@/lib/reports';
import { checkMediaPermission } from '@/lib/mediaRequests';
import { validateAndNormalizeYouTubeUrl } from '../../../shared/youtube';
import { validateFaithContent } from '../../../shared/moderation';
import { useRole } from '@/hooks/useRole';
import { getTopPrayerWarriors } from '@/lib/leaderboard';

// Complete Instagram-style Gospel Era Mobile App with Real API Integration
const MobileApp = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { isBanned } = useRole();
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
  const [prayerTags, setPrayerTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayerModerationError, setPrayerModerationError] = useState('');
  const [committingToId, setCommittingToId] = useState<number | null>(null);
  const [prayerTab, setPrayerTab] = useState(0); // 0: Browse, 1: My Prayers
  const [selectedPrayerId, setSelectedPrayerId] = useState<number | null>(null);
  const [selectedPrayerDetail, setSelectedPrayerDetail] = useState<any>(null);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [prayedJustNow, setPrayedJustNow] = useState<Set<number>>(new Set());
  const [myCommitments, setMyCommitments] = useState<any[]>([]);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [showDonationPage, setShowDonationPage] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{type: 'post' | 'comment', id: string} | null>(null);
  
  // Enhanced post creation states
  const [createTags, setCreateTags] = useState('');
  const [createYouTubeUrl, setCreateYouTubeUrl] = useState('');
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [moderationError, setModerationError] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
      checkUserMediaPermission();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Check media permission for current user
  const checkUserMediaPermission = async () => {
    if (!user) return;
    
    setIsCheckingPermission(true);
    try {
      const result = await checkMediaPermission(user.id);
      setHasMediaPermission(result.hasPermission);
    } catch (error) {
      console.error('Error checking media permission:', error);
      setHasMediaPermission(false);
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch real posts from API
      const postsResult = await listPosts({ limit: 20 });
      if (postsResult.data) {
        setPosts(postsResult.data);
        
        // Load author profiles
        const authorIds = postsResult.data.map((post: any) => post.author_id);
        await loadProfiles(authorIds);
        
        // Load engagement data  
        const postIds = postsResult.data.map((post: any) => post.id);
        await loadEngagementData(postIds);
      }

      // Fetch real prayer requests from API
      const prayerResult = await listPrayerRequests({ limit: 10 });
      if (prayerResult.data) {
        setPrayerRequests(prayerResult.data);
      }

      // Fetch user's prayer commitments if authenticated
      if (user?.id) {
        try {
          const commitmentsResult = await getMyCommitments();
          if (commitmentsResult.data) {
            setMyCommitments(commitmentsResult.data);
          }
        } catch (error) {
          console.error('Error fetching commitments:', error);
        }
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
    
    if (isBanned) {
      alert('Your account is limited. You cannot create posts.');
      return;
    }

    // Clear previous errors
    setYoutubeError('');
    setModerationError('');

    const titleText = createTitle.trim();
    const contentText = createContent.trim();

    // Enhanced Christ-centric validation for title and content
    const titleValidation = validateFaithContent(titleText);
    const contentValidation = validateFaithContent(contentText);
    
    if (!titleValidation.isValid && !contentValidation.isValid) {
      setModerationError(titleValidation.reason || 'Please keep your post centered on Jesus or Scripture.');
      return;
    }

    // Process tags
    const tagsArray = createTags.trim() ? createTags.split(',').map(tag => tag.trim()) : [];
    
    // Validate YouTube URL if provided
    let normalizedYouTubeUrl = '';
    if (createYouTubeUrl.trim()) {
      if (!hasMediaPermission) {
        setYoutubeError('You need link sharing permission to add YouTube videos.');
        return;
      }
      
      const validation = validateAndNormalizeYouTubeUrl(createYouTubeUrl.trim());
      if (!validation.isValid) {
        setYoutubeError(validation.error || 'Invalid YouTube URL');
        return;
      }
      normalizedYouTubeUrl = validation.normalizedUrl || '';
    }
    
    try {
      const result = await createPost({
        title: titleText,
        content: contentText,
        tags: tagsArray,
        media_urls: [],
        embed_url: normalizedYouTubeUrl
      });
      
      if (result.data) {
        // Clear form
        setCreateTitle('');
        setCreateContent('');
        setCreateTags('');
        setCreateYouTubeUrl('');
        setYoutubeError('');
        setModerationError('');
        fetchData();
        setActiveTab(0); // Go back to home
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const handleCreatePrayerRequest = async () => {
    if (!prayerTitle.trim() || !prayerDetails.trim()) return;
    
    if (isBanned) {
      alert('Your account is limited. You cannot create prayer requests.');
      return;
    }

    // Clear previous errors
    setPrayerModerationError('');

    const titleText = prayerTitle.trim();
    const detailsText = prayerDetails.trim();

    // Enhanced Christ-centric validation for title and details
    const titleValidation = validateFaithContent(titleText);
    const detailsValidation = validateFaithContent(detailsText);
    
    if (!titleValidation.isValid && !detailsValidation.isValid) {
      setPrayerModerationError(titleValidation.reason || 'Please keep your prayer request centered on Jesus or Scripture.');
      return;
    }

    // Process tags
    const tagsArray = prayerTags.trim() ? prayerTags.split(',').map(tag => tag.trim()) : [];
    
    try {
      const result = await createPrayerRequest({
        title: titleText,
        details: detailsText,
        tags: tagsArray,
        is_anonymous: isAnonymous
      });
      
      if (result.data) {
        // Clear form
        setPrayerTitle('');
        setPrayerDetails('');
        setPrayerTags('');
        setIsAnonymous(false);
        setPrayerModerationError('');
        fetchData();
      }
    } catch (error) {
      console.error('Error creating prayer request:', error);
      alert('Failed to create prayer request. Please try again.');
    }
  };

  const handleCommitToPray = async (requestId: number) => {
    if (!user || isBanned) return;
    
    setCommittingToId(requestId);
    
    try {
      const { error } = await commitToPray(requestId);
      if (error) {
        alert('Failed to commit to prayer. Please try again.');
      } else {
        // Refresh prayer requests to show updated counts
        fetchData();
      }
    } catch (error) {
      console.error('Error committing to prayer:', error);
      alert('Failed to commit to prayer. Please try again.');
    } finally {
      setCommittingToId(null);
    }
  };

  const handleConfirmPrayed = async (requestId: number) => {
    if (!user || isBanned) return;
    
    setConfirmingId(requestId);
    
    try {
      const { error } = await confirmPrayed(requestId);
      if (error) {
        alert('Failed to confirm prayer. Please try again.');
      } else {
        // Show "Prayed just now" state temporarily
        setPrayedJustNow(prev => new Set([...prev, requestId]));
        
        // Remove the "just now" state after 3 seconds
        setTimeout(() => {
          setPrayedJustNow(prev => {
            const newSet = new Set(prev);
            newSet.delete(requestId);
            return newSet;
          });
        }, 3000);
        
        // Refresh prayer requests and commitments to show updated counts
        fetchData();
      }
    } catch (error) {
      console.error('Error confirming prayer:', error);
      alert('Failed to confirm prayer. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePrayerClick = async (prayerId: number) => {
    try {
      const result = await getPrayerRequest(prayerId);
      if (result.data) {
        setSelectedPrayerId(prayerId);
        setSelectedPrayerDetail(result.data);
      }
    } catch (error) {
      console.error('Error fetching prayer details:', error);
    }
  };

  // Get real leaderboard data
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  // User profile and dropdown state
  const [userProfile, setUserProfile] = useState<{display_name?: string, avatar_url?: string} | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  // Mobile page states
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMobileSavedPosts, setShowMobileSavedPosts] = useState(false);
  const [showMobileCommunityGuidelines, setShowMobileCommunityGuidelines] = useState(false);

  // Fetch leaderboard data and user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leaderboard
        const leaderboardResult = await getTopPrayerWarriors({ timeframe: 'week', limit: 10 });
        if (leaderboardResult.data) {
          setLeaderboard(leaderboardResult.data);
        }

        // Fetch user profile
        if (user?.id) {
          const profileResult = await getProfilesByIds([user.id]);
          if (profileResult.data && profileResult.data.length > 0) {
            setUserProfile(profileResult.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showUserDropdown && !target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

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

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    setDeletingPostId(postId);
    const { error } = await softDeletePost(postId);
    
    if (error) {
      alert(`Failed to delete post: ${(error as any).message || 'Unknown error'}`);
    } else {
      alert('Post deleted successfully');
      fetchData(); // Reload posts
    }
    
    setDeletingPostId(null);
  };

  const handleEditPost = (postId: number) => {
    // For mobile, we'll just show an alert for now
    alert('Edit functionality coming soon! Please use the web app to edit posts.');
  };

  const handleReportPost = (postId: number) => {
    setReportTarget({ type: 'post', id: postId.toString() });
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!reportTarget) return;
    
    try {
      const result = await createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason
      });
      
      if (result.data) {
        alert('Report submitted successfully. Thank you for helping keep our community safe.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
    
    setReportModalOpen(false);
    setReportTarget(null);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    
    // Check faith affirmation for signup
    if (isSignUp && !faithAffirmed) {
      setLoginError('Please affirm your faith to create an account.');
      return;
    }
    
    setLoginError('');
    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);
    
    if (error) {
      setLoginError(error.message);
    } else {
      setEmail('');
      setPassword('');
      setFaithAffirmed(false);
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

      {/* Faith Affirmation for Signup */}
      {isSignUp && (
        <div style={{ 
          marginBottom: '16px', padding: '16px', 
          border: '1px solid #dbdbdb', borderRadius: '8px', background: '#f9f9f9' 
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={faithAffirmed}
              onChange={(e) => setFaithAffirmed(e.target.checked)}
              style={{ marginRight: '8px', marginTop: '2px' }}
            />
            <label style={{ fontSize: '14px', color: '#262626', lineHeight: '1.4' }}>
              <span style={{ color: '#dc2626' }}>*</span> I affirm that I am a follower of Jesus Christ and I believe in His saving blood. I agree that prayers in this app are directed to Jesus.
            </label>
          </div>
          {isSignUp && !faithAffirmed && (
            <div style={{ fontSize: '12px', color: '#dc2626', marginLeft: '20px' }}>
              This affirmation is required to join our Christian prayer community.
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={!email.trim() || !password.trim() || (isSignUp && !faithAffirmed)}
        style={{
          width: '100%', 
          background: (email.trim() && password.trim() && (!isSignUp || faithAffirmed)) ? '#262626' : '#dbdbdb',
          color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px',
          fontSize: '16px', fontWeight: 600, marginBottom: '16px',
          cursor: (email.trim() && password.trim() && (!isSignUp || faithAffirmed)) ? 'pointer' : 'not-allowed'
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
                  {post.tags.map((tag: string, tagIndex: number) => (
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

            {/* Post actions - All 6 icons matching webapp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid #efefef' }}>
              {/* Left side actions */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Heart/Amen button */}
                <button 
                  onClick={() => handleToggleAmen(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title="Amen"
                >
                  <span style={{ fontSize: '24px', color: '#262626' }}>♡</span>
                </button>
                
                {/* Comment button */}
                <button 
                  onClick={() => toggleCommentForm(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title="Comment"
                >
                  <span style={{ fontSize: '24px', color: '#262626' }}>💬</span>
                </button>
                
                {/* Share button */}
                <button 
                  onClick={() => alert('Share functionality coming soon!')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title="Share"
                >
                  <span style={{ fontSize: '24px', color: '#262626' }}>↗</span>
                </button>
              </div>
              
              {/* Right side actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Save/Bookmark button */}
                <button 
                  onClick={() => handleToggleBookmark(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title={engagementData.get(post.id)?.isBookmarked ? "Saved" : "Save"}
                >
                  <span style={{ 
                    fontSize: '24px', 
                    color: engagementData.get(post.id)?.isBookmarked ? '#262626' : '#8e8e8e'
                  }}>
                    {engagementData.get(post.id)?.isBookmarked ? '🔖' : '⋄'}
                  </span>
                </button>
                
                {/* Report button */}
                <button 
                  onClick={() => handleReportPost(post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title="Report"
                >
                  <span style={{ fontSize: '20px', color: '#8e8e8e' }}>⚠</span>
                </button>
                
                {/* Edit & Delete buttons (show for all user's posts) */}
                {post.author_id === user?.id && (
                  <>
                    <button 
                      onClick={() => handleEditPost(post.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                      title="Edit"
                    >
                      <span style={{ fontSize: '18px', color: '#0095f6' }}>✏️</span>
                    </button>
                    
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                      title="Delete"
                    >
                      {deletingPostId === post.id ? (
                        <div style={{ width: '18px', height: '18px', border: '2px solid #f3f4f6', borderTop: '2px solid #ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      ) : (
                        <span style={{ fontSize: '18px', color: '#ef4444' }}>🗑️</span>
                      )}
                    </button>
                  </>
                )}
              </div>
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
      {/* Simple header like before */}
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

      {/* Error messages - keep them compact */}
      {moderationError && (
        <div style={{
          background: '#fee', border: '1px solid #fcc', color: '#c00',
          padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
          fontSize: '13px', textAlign: 'center'
        }}>
          {moderationError}
        </div>
      )}

      {isBanned && (
        <div style={{
          background: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404',
          padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
          fontSize: '13px', textAlign: 'center'
        }}>
          Account limited. You can read but cannot post or comment.
        </div>
      )}

      {/* Title input - clean like before */}
      <input
        type="text"
        placeholder="Post title..."
        value={createTitle}
        onChange={(e) => setCreateTitle(e.target.value)}
        disabled={isBanned}
        style={{
          width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
          borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none',
          backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
          color: isBanned ? '#8e8e8e' : '#262626'
        }}
        title={isBanned ? 'Account limited - cannot create posts' : ''}
      />

      {/* Content textarea - clean like before */}
      <textarea
        placeholder="Share your faith, testimony, or encouragement..."
        value={createContent}
        onChange={(e) => setCreateContent(e.target.value)}
        rows={6}
        disabled={isBanned}
        style={{
          width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
          borderRadius: '8px', fontSize: '16px', resize: 'none', outline: 'none',
          fontFamily: 'inherit', marginBottom: '12px',
          backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
          color: isBanned ? '#8e8e8e' : '#262626'
        }}
        title={isBanned ? 'Account limited - cannot create posts' : ''}
      />

      {/* Tags input - clean style */}
      <input
        type="text"
        placeholder="Tags (prayer, testimony, scripture...)"
        value={createTags}
        onChange={(e) => setCreateTags(e.target.value)}
        disabled={isBanned}
        style={{
          width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
          borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none',
          backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
          color: isBanned ? '#8e8e8e' : '#262626'
        }}
        title={isBanned ? 'Account limited - cannot create posts' : ''}
      />

      {/* YouTube input or request - clean style */}
      {hasMediaPermission ? (
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="YouTube URL (optional)"
            value={createYouTubeUrl}
            onChange={(e) => setCreateYouTubeUrl(e.target.value)}
            disabled={isBanned}
            style={{
              width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
              borderRadius: '8px', fontSize: '16px', outline: 'none',
              backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
              color: isBanned ? '#8e8e8e' : '#262626'
            }}
            title={isBanned ? 'Account limited - cannot create posts' : ''}
          />
          {youtubeError && (
            <div style={{ color: '#c00', fontSize: '12px', marginTop: '4px', paddingLeft: '4px' }}>
              {youtubeError}
            </div>
          )}
        </div>
      ) : (
        !isBanned && (
          <div style={{ 
            padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', 
            borderRadius: '8px', textAlign: 'center', marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
              Want to share YouTube videos?
            </div>
            <button
              onClick={() => setShowMediaRequestModal(true)}
              style={{
                background: '#0095f6', color: '#ffffff', border: 'none',
                padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                cursor: 'pointer', fontWeight: 600
              }}
            >
              Request Access
            </button>
          </div>
        )
      )}

      {/* Share button - same as before */}
      <button
        onClick={handleCreatePost}
        disabled={!createTitle.trim() || !createContent.trim() || isBanned}
        style={{
          width: '100%', 
          background: (createTitle.trim() && createContent.trim() && !isBanned) ? '#4a4a4a' : '#dbdbdb',
          color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px',
          fontSize: '16px', fontWeight: 600, 
          cursor: (createTitle.trim() && createContent.trim() && !isBanned) ? 'pointer' : 'not-allowed'
        }}
        title={isBanned ? 'Account limited - cannot create posts' : ''}
      >
        Share Post
      </button>
    </div>
  );

  // Prayer Page Component
  const PrayerPage = () => (
    <>
      {/* Tab Navigation - sleek native style */}
      <div style={{
        display: 'flex', background: '#ffffff', borderBottom: '1px solid #dbdbdb'
      }}>
        <button
          onClick={() => setPrayerTab(0)}
          style={{
            flex: 1, padding: '16px', border: 'none', 
            background: prayerTab === 0 ? '#ffffff' : 'transparent',
            borderBottom: prayerTab === 0 ? '2px solid #262626' : '2px solid transparent',
            fontSize: '16px', fontWeight: prayerTab === 0 ? 600 : 400,
            color: prayerTab === 0 ? '#262626' : '#8e8e8e',
            cursor: 'pointer'
          }}
        >
          Browse
        </button>
        <button
          onClick={() => setPrayerTab(1)}
          style={{
            flex: 1, padding: '16px', border: 'none',
            background: prayerTab === 1 ? '#ffffff' : 'transparent',
            borderBottom: prayerTab === 1 ? '2px solid #262626' : '2px solid transparent',
            fontSize: '16px', fontWeight: prayerTab === 1 ? 600 : 400,
            color: prayerTab === 1 ? '#262626' : '#8e8e8e',
            cursor: 'pointer'
          }}
        >
          My Prayers
        </button>
      </div>

      {prayerTab === 0 ? (
        <>
          {/* Prayer Stats - clean mobile style */}
          <div style={{
            display: 'flex', justifyContent: 'space-around', padding: '12px',
            background: '#f8f9fa'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#262626' }}>{prayerRequests.length}</div>
              <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Requests</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#262626' }}>
                {prayerRequests.reduce((sum, req) => sum + (req.prayer_stats?.committed_count || 0), 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Committed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#262626' }}>
                {prayerRequests.reduce((sum, req) => sum + (req.prayer_stats?.prayed_count || 0), 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Prayed</div>
            </div>
          </div>


          {/* Create Prayer Request - enhanced with all features */}
      <div style={{ padding: '16px', borderBottom: '1px solid #dbdbdb' }}>
        {/* Simple header like create post */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: '12px', color: '#8e8e8e'
          }}>
            🙏
          </div>
          <div style={{ fontWeight: 600, color: '#262626' }}>Create Prayer Request</div>
        </div>

        {/* Error messages */}
        {prayerModerationError && (
          <div style={{
            background: '#fee', border: '1px solid #fcc', color: '#c00',
            padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
            fontSize: '13px', textAlign: 'center'
          }}>
            {prayerModerationError}
          </div>
        )}

        {isBanned && (
          <div style={{
            background: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404',
            padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
            fontSize: '13px', textAlign: 'center'
          }}>
            Account limited. You can read but cannot post or comment.
          </div>
        )}

        {/* Prayer Title */}
        <input
          type="text"
          placeholder="Prayer request title..."
          value={prayerTitle}
          onChange={(e) => setPrayerTitle(e.target.value)}
          disabled={isBanned}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none',
            backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
            color: isBanned ? '#8e8e8e' : '#262626'
          }}
          title={isBanned ? 'Account limited - cannot create prayer requests' : ''}
        />

        {/* Prayer Details */}
        <textarea
          placeholder="Share your prayer need..."
          value={prayerDetails}
          onChange={(e) => setPrayerDetails(e.target.value)}
          rows={4}
          disabled={isBanned}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', marginBottom: '12px',
            backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
            color: isBanned ? '#8e8e8e' : '#262626'
          }}
          title={isBanned ? 'Account limited - cannot create prayer requests' : ''}
        />

        {/* Tags Input */}
        <input
          type="text"
          placeholder="Tags (healing, family, guidance...)"
          value={prayerTags}
          onChange={(e) => setPrayerTags(e.target.value)}
          disabled={isBanned}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none',
            backgroundColor: isBanned ? '#f5f5f5' : '#ffffff',
            color: isBanned ? '#8e8e8e' : '#262626'
          }}
          title={isBanned ? 'Account limited - cannot create prayer requests' : ''}
        />

        {/* Anonymous Toggle */}
        {!isBanned && (
          <div style={{ 
            display: 'flex', alignItems: 'center', marginBottom: '12px', 
            padding: '8px', background: '#f8f9fa', borderRadius: '6px'
          }}>
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="anonymous" style={{ fontSize: '14px', color: '#262626' }}>
              Submit anonymously
            </label>
          </div>
        )}

        {/* Submit Button - Dark Grey */}
        <button
          onClick={handleCreatePrayerRequest}
          disabled={!prayerTitle.trim() || !prayerDetails.trim() || isBanned}
          style={{
            width: '100%',
            background: (prayerTitle.trim() && prayerDetails.trim() && !isBanned) ? '#4a4a4a' : '#dbdbdb',
            color: '#ffffff', border: 'none', padding: '12px',
            borderRadius: '8px', fontSize: '16px', fontWeight: 600,
            cursor: (prayerTitle.trim() && prayerDetails.trim() && !isBanned) ? 'pointer' : 'not-allowed'
          }}
          title={isBanned ? 'Account limited - cannot create prayer requests' : ''}
        >
          Submit Prayer Request
        </button>
      </div>

      {/* Top Prayer Warriors Section - Added after Submit Prayer button */}
      <div style={{ background: '#f8f9fa', padding: '16px', borderBottom: '1px solid #dbdbdb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#262626' }}>🏆 Top Prayer Warriors</div>
          <button 
            onClick={() => setPrayerTab(3)}
            style={{
              background: 'none', border: '1px solid #dbdbdb', borderRadius: '16px',
              padding: '4px 12px', fontSize: '12px', color: '#8e8e8e', cursor: 'pointer'
            }}
          >
            View All
          </button>
        </div>
        
        {leaderboard.length > 0 ? (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {leaderboard.slice(0, 5).map((warrior, index) => (
              <div key={warrior.user_id} style={{
                minWidth: '80px', textAlign: 'center', background: '#ffffff',
                padding: '12px 8px', borderRadius: '12px', border: '1px solid #e1e5e9'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', background: '#7c3aed',
                  margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', color: '#ffffff'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🙏'}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#262626', marginBottom: '2px' }}>
                  {warrior.display_name || `User ${warrior.user_id.slice(0, 8)}`}
                </div>
                <div style={{ fontSize: '9px', color: '#8e8e8e' }}>
                  {warrior.prayer_count} prayers
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '20px' }}>
            Loading prayer warriors...
          </div>
        )}
      </div>

      {/* Prayer Requests Feed */}
      {prayerRequests.length > 0 ? (
        prayerRequests.map((request) => (
          <div key={request.id} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb', padding: '16px' }}>
            {/* Request Header - Clickable */}
            <div 
              onClick={() => handlePrayerClick(request.id)}
              style={{ 
                display: 'flex', alignItems: 'center', marginBottom: '12px',
                cursor: 'pointer'
              }}
            >
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
              <div style={{ fontSize: '16px', color: '#8e8e8e' }}>→</div>
            </div>

            {request.is_anonymous && (
              <div style={{
                background: '#f2f2f2', padding: '4px 8px', borderRadius: '12px',
                fontSize: '10px', color: '#8e8e8e', marginBottom: '8px'
              }}>
                Anonymous
              </div>
            )}

            {/* Request Title */}
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>
              {request.title}
            </div>

            {/* Request Details */}
            <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '12px', color: '#262626' }}>
              {request.details}
            </div>

            {/* Tags if available */}
            {request.tags && request.tags.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {request.tags.map((tag, index) => (
                  <span key={index} style={{
                    background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px',
                    fontSize: '12px', color: '#666', marginRight: '6px'
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons - Dark Grey */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => {
                  const commitment = myCommitments.find(c => c.prayer_request_id === request.id);
                  if (commitment && !commitment.has_prayed) {
                    handleConfirmPrayed(request.id);
                  } else if (!commitment) {
                    handleCommitToPray(request.id);
                  }
                }}
                disabled={!user || isBanned || committingToId === request.id}
                style={{
                  background: (!user || isBanned) ? '#dbdbdb' : '#4a4a4a',
                  color: '#ffffff', border: 'none',
                  padding: '8px 16px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: 600, 
                  cursor: (!user || isBanned) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
                title={isBanned ? 'Account limited - cannot commit to pray' : ''}
              >
                {committingToId === request.id ? '...' : 
                 prayedJustNow.has(request.id) ? '✓ Prayed just now' :
                 myCommitments.some(c => c.prayer_request_id === request.id && !c.has_prayed) ? 'Confirm Prayed' :
                 myCommitments.some(c => c.prayer_request_id === request.id && c.has_prayed) ? '✓ Prayed' :
                 'I will pray'}
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
        </>) : (
        // My Prayers Tab Content
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '18px', color: '#262626', marginBottom: '8px' }}>
              My Prayer Commitments
            </div>
            <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
              Prayers I've committed to pray for
            </div>
          </div>

          {myCommitments.length > 0 ? (
            myCommitments.map((commitment: any) => (
              <div key={commitment.id} style={{
                background: '#ffffff', borderRadius: '12px', padding: '16px',
                marginBottom: '12px', border: '1px solid #dbdbdb'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#262626', marginBottom: '4px' }}>
                    {commitment.prayer_request?.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#8e8e8e', lineHeight: 1.4 }}>
                    {commitment.prayer_request?.content?.slice(0, 100)}...
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                    Status: {commitment.has_prayed ? '✅ Prayed' : '⏳ Committed'}
                  </div>
                  
                  {!commitment.has_prayed && (
                    <button
                      onClick={() => handleConfirmPrayed(commitment.prayer_request_id)}
                      disabled={confirmingId === commitment.prayer_request_id}
                      style={{
                        background: '#4a4a4a', color: '#ffffff', border: 'none',
                        padding: '6px 12px', borderRadius: '16px', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {confirmingId === commitment.prayer_request_id ? '...' : '✓ Confirm Prayed'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🙏</div>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>No Prayer Commitments</div>
              <div style={{ color: '#8e8e8e', fontSize: '14px' }}>
                Commit to pray for others to see them here
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Prayer Detail View Component
  const PrayerDetailView = ({ prayer, onBack }: { prayer: any; onBack: () => void }) => (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', borderBottom: '1px solid #dbdbdb',
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0,
        background: '#ffffff', zIndex: 100
      }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'none', border: 'none', fontSize: '18px', 
            cursor: 'pointer', marginRight: '12px', color: '#262626' 
          }}
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: '16px', color: '#262626' }}>
          Prayer Details
        </div>
      </div>

      {/* Prayer Content */}
      <div style={{ padding: '16px' }}>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#dbdbdb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: '12px', color: '#8e8e8e'
          }}>
            {prayer.is_anonymous ? '🙏' : '•'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#262626' }}>
              {prayer.is_anonymous ? 'Anonymous Prayer Request' : prayer.profiles?.display_name || 'Prayer Warrior'}
            </div>
            <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
              {formatTimeAgo(prayer.created_at)}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '12px', color: '#262626' }}>
          {prayer.title}
        </div>

        {/* Content */}
        <div style={{ fontSize: '16px', lineHeight: 1.5, marginBottom: '16px', color: '#262626' }}>
          {prayer.details}
        </div>

        {/* Tags */}
        {prayer.tags && prayer.tags.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {prayer.tags.map((tag: string, index: number) => (
              <span key={index} style={{
                background: '#f0f0f0', padding: '4px 12px', borderRadius: '16px',
                fontSize: '14px', color: '#666', marginRight: '8px', marginBottom: '8px',
                display: 'inline-block'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Prayer Stats */}
        <div style={{ 
          background: '#f8f9fa', borderRadius: '12px', padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>Prayer Impact</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
                {prayer.prayer_stats?.committed_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Committed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
                {prayer.prayer_stats?.prayed_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Prayed</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => {
            const commitment = myCommitments.find(c => c.prayer_request_id === prayer.id);
            if (commitment && !commitment.has_prayed) {
              handleConfirmPrayed(prayer.id);
            } else if (!commitment) {
              handleCommitToPray(prayer.id);
            }
          }}
          disabled={!user || isBanned}
          style={{
            width: '100%',
            background: (!user || isBanned) ? '#dbdbdb' : '#4a4a4a',
            color: '#ffffff', border: 'none',
            padding: '16px', borderRadius: '12px', fontSize: '16px',
            fontWeight: 600, cursor: (!user || isBanned) ? 'not-allowed' : 'pointer'
          }}
        >
          {!user ? 'Login to Pray' :
           isBanned ? 'Account Limited' :
           prayedJustNow.has(prayer.id) ? '✓ Prayed just now' :
           myCommitments.some(c => c.prayer_request_id === prayer.id && !c.has_prayed) ? 'Confirm Prayed' :
           myCommitments.some(c => c.prayer_request_id === prayer.id && c.has_prayed) ? '✓ Prayed' :
           'I will pray'}
        </button>
      </div>
    </div>
  );

  // Full Leaderboard View Component
  const FullLeaderboardView = ({ onBack }: { onBack: () => void }) => (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', borderBottom: '1px solid #dbdbdb',
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0,
        background: '#ffffff', zIndex: 100
      }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'none', border: 'none', fontSize: '18px', 
            cursor: 'pointer', marginRight: '12px', color: '#262626' 
          }}
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: '16px', color: '#262626' }}>
          🏆 Prayer Warriors Leaderboard
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ padding: '16px' }}>
        {leaderboard.map((warrior, index) => (
          <div key={warrior.warrior} style={{
            display: 'flex', alignItems: 'center', padding: '16px',
            background: '#ffffff', borderRadius: '12px', marginBottom: '8px',
            border: '1px solid #dbdbdb'
          }}>
            <div style={{ 
              fontSize: '24px', marginRight: '16px', minWidth: '40px',
              textAlign: 'center'
            }}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#262626', marginBottom: '4px' }}>
                {warrior.display_name}
              </div>
              <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
                {warrior.count_prayed} prayers completed • {warrior.current_streak || 0} day streak
              </div>
            </div>
            {(warrior.current_streak || 0) >= 7 && (
              <div style={{ 
                background: '#4a4a4a', color: '#ffffff', 
                padding: '4px 8px', borderRadius: '12px', fontSize: '12px' 
              }}>
                🔥 Hot Streak
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Mobile Settings Component
  const MobileSettingsPage = () => (
    <div style={{ padding: '16px', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', marginBottom: '24px',
        paddingBottom: '16px', borderBottom: '1px solid #dbdbdb'
      }}>
        <button 
          onClick={() => setShowMobileSettings(false)}
          style={{
            background: 'none', border: 'none', fontSize: '18px',
            color: '#262626', cursor: 'pointer', marginRight: '16px'
          }}
        >
          ←
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>Settings</div>
      </div>

      {/* Profile Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#262626', marginBottom: '16px' }}>
          Profile Settings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: userProfile?.avatar_url ? 'none' : '#dbdbdb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: '16px', overflow: 'hidden'
          }}>
            {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url.startsWith('/') ? userProfile.avatar_url : `/public-objects/${userProfile.avatar_url}`} 
                alt="Profile" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '24px', color: '#8e8e8e' }}>👤</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
              {userProfile?.display_name || user?.email?.split('@')[0] || 'Gospel User'}
            </div>
            <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
              {user?.email}
            </div>
          </div>
        </div>
        
        <button style={{
          width: '100%', background: '#f2f2f2', border: 'none', padding: '12px',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#262626',
          cursor: 'pointer', marginBottom: '8px'
        }}>
          Edit Profile Information
        </button>
        
        <button style={{
          width: '100%', background: '#f2f2f2', border: 'none', padding: '12px',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#262626',
          cursor: 'pointer'
        }}>
          Change Profile Picture
        </button>
      </div>

      {/* Account Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#262626', marginBottom: '16px' }}>
          Account
        </div>
        
        <button style={{
          width: '100%', background: '#f2f2f2', border: 'none', padding: '12px',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#262626',
          cursor: 'pointer', marginBottom: '8px', textAlign: 'left'
        }}>
          🔔 Notification Settings
        </button>
        
        <button style={{
          width: '100%', background: '#f2f2f2', border: 'none', padding: '12px',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#262626',
          cursor: 'pointer', marginBottom: '8px', textAlign: 'left'
        }}>
          🔒 Privacy Settings
        </button>
        
        <button style={{
          width: '100%', background: '#f2f2f2', border: 'none', padding: '12px',
          borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#262626',
          cursor: 'pointer', textAlign: 'left'
        }}>
          🛡️ Security Settings
        </button>
      </div>

      {/* Logout */}
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

  // Mobile Saved Posts Component
  const MobileSavedPostsPage = () => (
    <div style={{ padding: '16px', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', marginBottom: '24px',
        paddingBottom: '16px', borderBottom: '1px solid #dbdbdb'
      }}>
        <button 
          onClick={() => setShowMobileSavedPosts(false)}
          style={{
            background: 'none', border: 'none', fontSize: '18px',
            color: '#262626', cursor: 'pointer', marginRight: '16px'
          }}
        >
          ←
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>Saved Posts</div>
      </div>

      {/* Content */}
      <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '40px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
        <div style={{ marginBottom: '8px' }}>No saved posts yet</div>
        <div>Save posts you want to read later by tapping the bookmark icon</div>
      </div>
    </div>
  );

  // Mobile Community Guidelines Component
  const MobileCommunityGuidelinesPage = () => (
    <div style={{ padding: '16px', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', marginBottom: '24px',
        paddingBottom: '16px', borderBottom: '1px solid #dbdbdb'
      }}>
        <button 
          onClick={() => setShowMobileCommunityGuidelines(false)}
          style={{
            background: 'none', border: 'none', fontSize: '18px',
            color: '#262626', cursor: 'pointer', marginRight: '16px'
          }}
        >
          ←
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>Community Guidelines</div>
      </div>

      {/* Content */}
      <div style={{ lineHeight: 1.6, color: '#262626' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#7c3aed' }}>
          ✝️ Gospel Era Community Guidelines
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            🙏 Our Mission
          </div>
          <div style={{ fontSize: '14px', marginBottom: '16px' }}>
            Gospel Era is a Christ-centered community dedicated to sharing faith, hope, and love through prayer and Gospel messages.
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            📖 Content Guidelines
          </div>
          <ul style={{ fontSize: '14px', marginLeft: '16px' }}>
            <li style={{ marginBottom: '4px' }}>Share content that glorifies Jesus Christ</li>
            <li style={{ marginBottom: '4px' }}>Focus on faith, hope, love, and encouragement</li>
            <li style={{ marginBottom: '4px' }}>Be respectful and kind to all members</li>
            <li style={{ marginBottom: '4px' }}>Avoid controversial or divisive topics</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            🚫 What's Not Allowed
          </div>
          <ul style={{ fontSize: '14px', marginLeft: '16px' }}>
            <li style={{ marginBottom: '4px' }}>Hate speech or discrimination</li>
            <li style={{ marginBottom: '4px' }}>Inappropriate or offensive content</li>
            <li style={{ marginBottom: '4px' }}>Spam or promotional content</li>
            <li style={{ marginBottom: '4px' }}>Content promoting other religions</li>
          </ul>
        </div>

        <div style={{ 
          background: '#f8f9fa', padding: '16px', borderRadius: '8px',
          border: '1px solid #e1e5e9', marginTop: '24px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            💝 Remember
          </div>
          <div style={{ fontSize: '14px', fontStyle: 'italic' }}>
            "Let your conversation be always full of grace, seasoned with salt, so that you may know how to answer everyone." - Colossians 4:6
          </div>
        </div>
      </div>
    </div>
  );

  // Profile Component
  const ProfilePage = () => (
    <div style={{ padding: '16px' }}>
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%', 
          background: userProfile?.avatar_url ? 'none' : '#dbdbdb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', marginRight: '16px', color: '#8e8e8e',
          overflow: 'hidden'
        }}>
          {userProfile?.avatar_url ? (
            <img 
              src={userProfile.avatar_url.startsWith('/') ? userProfile.avatar_url : `/public-objects/${userProfile.avatar_url}`} 
              alt="Profile" 
              style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            '👤'
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
            {userProfile?.display_name || user?.email?.split('@')[0] || 'Gospel User'}
          </div>
          <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
            @{userProfile?.display_name?.toLowerCase().replace(/\s+/g, '') || user?.email?.split('@')[0] || 'gospeluser'}
          </div>
        </div>
        <button 
          onClick={() => setShowMobileSettings(true)}
          style={{
            background: 'none', border: 'none', fontSize: '20px',
            color: '#262626', cursor: 'pointer', padding: '8px'
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Bio */}
      <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '16px', color: '#262626' }}>
        {userProfile?.bio || 'Sharing faith, hope, and love through Christ ✝️'}
        <br />
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
            {userProfile?.followers_count || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Followers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
            {userProfile?.following_count || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Following</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => setShowMobileSettings(true)}
          style={{
            flex: 1, background: '#f2f2f2', border: 'none', padding: '10px',
            borderRadius: '6px', fontSize: '14px', fontWeight: 600, color: '#262626',
            cursor: 'pointer'
          }}
        >
          Edit Profile
        </button>
        <button 
          onClick={() => setShowMobileSavedPosts(true)}
          style={{
            background: '#f2f2f2', border: 'none', padding: '10px 16px',
            borderRadius: '6px', fontSize: '16px', color: '#262626', cursor: 'pointer'
          }}
          title="Saved Posts"
        >
          🔖
        </button>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 600, fontSize: '16px', color: '#262626', marginBottom: '12px' }}>
          Recent Activity
        </div>
        {posts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {posts.slice(0, 6).map((post) => (
              <div key={post.id} style={{
                aspectRatio: '1', background: '#f0f0f0', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px'
              }}>
                📖
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '20px' }}>
            No posts yet. Share your first Gospel message!
          </div>
        )}
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

  // Handle prayer detail view
  if (selectedPrayerId && selectedPrayerDetail) {
    return (
      <PrayerDetailView 
        prayer={selectedPrayerDetail} 
        onBack={() => {
          setSelectedPrayerId(null);
          setSelectedPrayerDetail(null);
        }} 
      />
    );
  }

  // Handle full leaderboard view
  if (showFullLeaderboard) {
    return (
      <FullLeaderboardView 
        onBack={() => setShowFullLeaderboard(false)} 
      />
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
          <div className="user-dropdown-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            {/* User Name and Avatar */}
            <button 
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '20px',
                ':hover': { background: '#f0f0f0' }
              }}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: userProfile?.avatar_url ? 'none' : '#dbdbdb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url.startsWith('/') ? userProfile.avatar_url : `/public-objects/${userProfile.avatar_url}`} 
                    alt="Profile" 
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '14px', color: '#8e8e8e' }}>👤</span>
                )}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#262626' }}>
                {userProfile?.display_name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span style={{ fontSize: '12px', color: '#8e8e8e' }}>▼</span>
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #dbdbdb', minWidth: '200px', zIndex: 1000
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626' }}>
                    {userProfile?.display_name || 'Gospel User'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                    {user?.email}
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    setActiveTab(4);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  👤 Profile
                </button>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowMobileSettings(true);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  ⚙️ Settings
                </button>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowMobileSavedPosts(true);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  🔖 Saved Posts
                </button>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowMobileCommunityGuidelines(true);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  📖 Community Guidelines
                </button>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowDonationPage(true);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  ❤️ Be a Supporter
                </button>
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    window.location.href = '/help';
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#262626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                  }}
                >
                  ❓ Help
                </button>
                
                {userProfile?.role === 'admin' && (
                  <>
                    <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '4px' }} />
                    <button 
                      onClick={() => {
                        setShowUserDropdown(false);
                        window.location.href = '/admin/dashboard';
                      }}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                        textAlign: 'left', fontSize: '14px', color: '#dc2626',
                        ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                      }}
                    >
                      🛡️ Admin Dashboard
                    </button>
                    <button 
                      onClick={() => {
                        setShowUserDropdown(false);
                        window.location.href = '/admin/reports';
                      }}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                        textAlign: 'left', fontSize: '14px', color: '#dc2626',
                        ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                      }}
                    >
                      🚨 Review Reports
                    </button>
                    <button 
                      onClick={() => {
                        setShowUserDropdown(false);
                        window.location.href = '/admin/users';
                      }}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                        textAlign: 'left', fontSize: '14px', color: '#dc2626',
                        ':hover': { background: '#f9f9f9' }, cursor: 'pointer'
                      }}
                    >
                      👥 Manage Users
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => {
                    setShowUserDropdown(false);
                    signOut();
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: '14px', color: '#dc2626',
                    ':hover': { background: '#f9f9f9' }, cursor: 'pointer',
                    borderTop: '1px solid #f0f0f0'
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {!user ? (
          <LoginPage />
        ) : showMobileSettings ? (
          <MobileSettingsPage />
        ) : showMobileSavedPosts ? (
          <MobileSavedPostsPage />
        ) : showMobileCommunityGuidelines ? (
          <MobileCommunityGuidelinesPage />
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

      {/* Bottom Navigation - Only show when logged in and not on mobile pages */}
      {user && !showMobileSettings && !showMobileSavedPosts && !showMobileCommunityGuidelines && (
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

      {/* Report Modal */}
      {reportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '24px',
            maxWidth: '90%', width: '400px', maxHeight: '80vh', overflow: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#262626' }}>
              Report Content
            </h3>
            <p style={{ fontSize: '14px', color: '#8e8e8e', marginBottom: '20px' }}>
              Why are you reporting this {reportTarget?.type}?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                'Inappropriate content',
                'Spam or misleading',
                'Not Christ-Centered (prayer not to Jesus)',
                'Harassment or hate speech',
                'Violence or dangerous content',
                'Other'
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleSubmitReport(reason)}
                  style={{
                    padding: '12px 16px', textAlign: 'left', border: '1px solid #dbdbdb',
                    borderRadius: '8px', background: 'white', cursor: 'pointer',
                    fontSize: '14px', color: '#262626'
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setReportModalOpen(false)}
                style={{
                  flex: 1, padding: '12px 16px', border: '1px solid #dbdbdb',
                  borderRadius: '8px', background: 'white', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, color: '#262626'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Media Request Modal */}
      {showMediaRequestModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', padding: '24px', borderRadius: '12px',
            maxWidth: '300px', margin: '16px', textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              Request Link Sharing
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6c757d' }}>
              Link sharing permissions allow you to embed YouTube videos and upload media files to enhance your posts.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowMediaRequestModal(false)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #ddd',
                  borderRadius: '6px', background: '#ffffff', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowMediaRequestModal(false);
                  alert('Link sharing request submitted! You will be notified when approved.');
                }}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '6px', background: '#007bff', color: '#ffffff', cursor: 'pointer'
                }}
              >
                Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileApp;