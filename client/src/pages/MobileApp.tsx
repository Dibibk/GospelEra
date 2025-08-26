import React, { useState, useEffect } from 'react';

// Complete Instagram-style Gospel Era Mobile App
const MobileApp = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch posts
      const postsResponse = await fetch('/api/posts');
      const postsData = await postsResponse.json();
      setPosts(postsData);

      // Fetch prayer requests
      try {
        const prayerResponse = await fetch('/api/prayer/browse?limit=10');
        const prayerData = await prayerResponse.json();
        setPrayerRequests(prayerData.requests || []);
      } catch (error) {
        console.log('Prayer requests not available');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRandomTime = () => {
    const times = ['2h', '5h', '1d', '3d', '1w'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const getRandomStats = () => ({
    likes: Math.floor(Math.random() * 500) + 10,
    comments: Math.floor(Math.random() * 50) + 1,
    prayers: Math.floor(Math.random() * 100) + 5
  });

  const createPost = async () => {
    if (!createTitle.trim() || !createContent.trim()) return;
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle.trim(),
          content: createContent.trim()
        })
      });
      
      if (response.ok) {
        setCreateTitle('');
        setCreateContent('');
        fetchData();
        setActiveTab(0); // Go back to home
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const createPrayerRequest = async () => {
    if (!prayerTitle.trim() || !prayerContent.trim()) return;
    
    try {
      const response = await fetch('/api/prayer/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prayerTitle.trim(),
          description: prayerContent.trim(),
          anonymous: false
        })
      });
      
      if (response.ok) {
        setPrayerTitle('');
        setPrayerContent('');
        fetchData();
        setActiveTab(3); // Go to prayer tab
      }
    } catch (error) {
      console.error('Error creating prayer request:', error);
    }
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
            width: '100%',
            height: '36px',
            background: '#f2f2f2',
            border: 'none',
            borderRadius: '18px',
            padding: '0 16px',
            fontSize: '14px',
            color: '#262626',
            outline: 'none'
          }}
        />
      </div>

      {/* Daily scripture */}
      <div style={{
        background: '#ffffff',
        padding: '8px 16px',
        borderBottom: '1px solid #dbdbdb',
        fontSize: '12px',
        color: '#8e8e8e',
        textAlign: 'center'
      }}>
        "For I know the plans I have for you" - Jeremiah 29:11 ✝️
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
            <div style={{ width: '100%', height: '300px', background: '#f0f0f0' }} />
          </div>
        ))
      ) : posts.length > 0 ? (
        posts.filter((post: any) => 
          !searchText || 
          post.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          post.content?.toLowerCase().includes(searchText.toLowerCase())
        ).map((post: any, index: number) => {
          const stats = getRandomStats();
          return (
            <div key={index} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb' }}>
              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', marginRight: '12px', border: '1px solid #dbdbdb', color: '#8e8e8e'
                }}>
                  ●
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#262626' }}>
                    {post.author_username || 'gospeluser'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                    {getRandomTime()}
                  </div>
                </div>
                <div style={{ fontSize: '16px', color: '#262626', cursor: 'pointer', padding: '8px' }}>⋯</div>
              </div>

              {/* Post image placeholder */}
              <div style={{
                width: '100%', height: '300px', background: '#ffffff', border: '1px solid #dbdbdb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '48px', color: '#dbdbdb'
              }}>
                ○
              </div>

              {/* Post actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>♡</button>
                  <button style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>💬</button>
                  <button style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>↗</button>
                </div>
                <button style={{ background: 'none', border: 'none', fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>🔖</button>
              </div>

              {/* Likes count */}
              <div style={{ padding: '0 16px 4px', fontWeight: 600, fontSize: '14px', color: '#262626' }}>
                {stats.likes} likes
              </div>

              {/* Post caption */}
              <div style={{ padding: '0 16px 8px', fontSize: '14px', lineHeight: 1.4, color: '#262626' }}>
                <span style={{ fontWeight: 600, marginRight: '8px' }}>{post.author_username || 'gospeluser'}</span>
                <span style={{ fontWeight: 600, marginRight: '8px' }}>{post.title}</span>
                {post.content}
              </div>

              {/* View comments */}
              <div style={{ padding: '0 16px 8px', fontSize: '14px', color: '#8e8e8e', cursor: 'pointer' }}>
                View all {stats.comments} comments
              </div>

              {/* Post timestamp */}
              <div style={{ padding: '0 16px 12px', fontSize: '10px', color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {getRandomTime().toUpperCase()}
              </div>
            </div>
          );
        })
      ) : (
        <div style={{ background: '#ffffff', padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✝️</div>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Welcome to Gospel Era</div>
          <div style={{ color: '#8e8e8e', fontSize: '14px' }}>Share your faith and grow together</div>
        </div>
      )}
    </>
  );

  // Search Component
  const SearchPage = () => (
    <>
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
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', color: '#262626' }}>Popular Topics</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {['#Faith', '#Prayer', '#Worship', '#Bible', '#Community', '#Testimony'].map((tag, index) => (
            <div key={index} style={{
              background: '#f2f2f2', padding: '8px 16px', borderRadius: '20px',
              fontSize: '14px', color: '#262626', cursor: 'pointer'
            }}>
              {tag}
            </div>
          ))}
        </div>

        <div style={{ fontWeight: 600, marginBottom: '12px', color: '#262626' }}>Suggested Users</div>
        {[1, 2, 3].map((user) => (
          <div key={user} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', background: '#dbdbdb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: '12px', color: '#8e8e8e'
            }}>
              ●
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#262626' }}>faithfuluser{user}</div>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Active in prayer community</div>
            </div>
            <button style={{
              background: '#262626', color: '#ffffff', border: 'none',
              padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600
            }}>
              Follow
            </button>
          </div>
        ))}
      </div>
    </>
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
            ●
          </div>
          <div style={{ fontWeight: 600, color: '#262626' }}>Create Post</div>
        </div>

        <input
          type="text"
          placeholder="📝 Post title..."
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', marginBottom: '12px', outline: 'none'
          }}
        />

        <textarea
          placeholder="❤️ Share your faith, testimony, or encouragement..."
          value={createContent}
          onChange={(e) => setCreateContent(e.target.value)}
          rows={6}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #dbdbdb',
            borderRadius: '8px', fontSize: '16px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', marginBottom: '16px'
          }}
        />

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button style={{
            flex: 1, background: '#f2f2f2', border: 'none', padding: '12px',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', cursor: 'pointer'
          }}>
            📷 Photo
          </button>
          <button style={{
            flex: 1, background: '#f2f2f2', border: 'none', padding: '12px',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', cursor: 'pointer'
          }}>
            🎥 Video
          </button>
        </div>

        <button
          onClick={createPost}
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

      <div style={{ marginTop: '24px' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', color: '#262626' }}>Popular Tags</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['#Faith', '#Prayer', '#Testimony', '#Worship', '#Bible', '#Community'].map((tag, index) => (
            <button
              key={index}
              onClick={() => setCreateContent(prev => prev + ' ' + tag)}
              style={{
                background: '#f2f2f2', border: 'none', padding: '8px 16px',
                borderRadius: '20px', fontSize: '14px', color: '#262626', cursor: 'pointer'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
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
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>127</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Active</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>2.4K</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Today</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#262626' }}>45</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Answered</div>
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
          value={prayerContent}
          onChange={(e) => setPrayerContent(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #dbdbdb',
            borderRadius: '6px', fontSize: '14px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', marginBottom: '8px'
          }}
        />
        <button
          onClick={createPrayerRequest}
          disabled={!prayerTitle.trim() || !prayerContent.trim()}
          style={{
            background: prayerTitle.trim() && prayerContent.trim() ? '#7c3aed' : '#dbdbdb',
            color: '#ffffff', border: 'none', padding: '8px 16px',
            borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            cursor: prayerTitle.trim() && prayerContent.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          🙏 Submit Request
        </button>
      </div>

      {/* Prayer Requests Feed */}
      {prayerRequests.length > 0 ? (
        prayerRequests.map((request: any, index: number) => {
          const stats = getRandomStats();
          return (
            <div key={index} style={{ background: '#ffffff', borderBottom: '1px solid #dbdbdb', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: '#dbdbdb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: '12px', color: '#8e8e8e'
                }}>
                  {request.anonymous ? '?' : '●'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#262626' }}>
                    {request.anonymous ? 'Anonymous' : (request.author || 'FaithfulUser')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>{getRandomTime()}</div>
                </div>
                {request.anonymous && (
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
                {request.description || request.content}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button style={{
                  background: '#7c3aed', color: '#ffffff', border: 'none',
                  padding: '8px 16px', borderRadius: '20px', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px'
                }}>
                  🙏 Pray
                </button>
                <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                  {stats.prayers} prayers
                </div>
              </div>
            </div>
          );
        })
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
          ●
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>Gospel User</div>
          <div style={{ fontSize: '14px', color: '#8e8e8e' }}>@gospeluser</div>
        </div>
        <button style={{
          background: 'none', border: 'none', fontSize: '24px',
          color: '#262626', cursor: 'pointer', padding: '8px'
        }}>
          ⚙️
        </button>
      </div>

      {/* Bio */}
      <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '16px', color: '#262626' }}>
        Sharing faith, hope, and love through Christ ✝️<br />
        Prayer warrior | Bible study enthusiast
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>42</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Posts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>156</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Prayers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>89</div>
          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>Following</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>124</div>
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
          📤
        </button>
      </div>

      {/* Menu items */}
      {[
        { icon: '🔖', text: 'Saved Posts' },
        { icon: '🙏', text: 'My Prayer Requests' },
        { icon: '📖', text: 'Prayer History' },
        { icon: '🔔', text: 'Notifications' },
        { icon: '⚙️', text: 'Settings & Privacy' },
        { icon: '❓', text: 'Help & Support' },
        { icon: 'ℹ️', text: 'About Gospel Era' }
      ].map((item, index) => (
        <div key={index} style={{
          display: 'flex', alignItems: 'center', padding: '16px 0',
          borderBottom: index < 6 ? '1px solid #f2f2f2' : 'none', cursor: 'pointer'
        }}>
          <div style={{ fontSize: '24px', marginRight: '16px' }}>{item.icon}</div>
          <div style={{ flex: 1, fontSize: '16px', color: '#262626' }}>{item.text}</div>
          <div style={{ fontSize: '16px', color: '#8e8e8e' }}>›</div>
        </div>
      ))}
    </div>
  );

  // Render main component
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#262626', letterSpacing: '-0.5px' }}>
          {activeTab === 0 && 'Gospel Era'}
          {activeTab === 1 && 'Search'}
          {activeTab === 2 && 'Create'}
          {activeTab === 3 && 'Prayer'}
          {activeTab === 4 && 'Profile'}
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>💕</div>
          <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>💬</div>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 0 && <HomeFeed />}
        {activeTab === 1 && <SearchPage />}
        {activeTab === 2 && <CreatePage />}
        {activeTab === 3 && <PrayerPage />}
        {activeTab === 4 && <ProfilePage />}
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div onClick={() => setActiveTab(0)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: activeTab === 0 ? '#262626' : '#8e8e8e', fontSize: '24px',
          padding: '12px', cursor: 'pointer', fontWeight: activeTab === 0 ? 700 : 400
        }}>
          🏠
        </div>
        <div onClick={() => setActiveTab(1)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: activeTab === 1 ? '#262626' : '#8e8e8e', fontSize: '24px',
          padding: '12px', cursor: 'pointer'
        }}>
          🔍
        </div>
        <div onClick={() => setActiveTab(2)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: activeTab === 2 ? '#262626' : '#8e8e8e', fontSize: '24px',
          padding: '12px', cursor: 'pointer'
        }}>
          ➕
        </div>
        <div onClick={() => setActiveTab(3)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: activeTab === 3 ? '#262626' : '#8e8e8e', fontSize: '24px',
          padding: '12px', cursor: 'pointer'
        }}>
          🙏
        </div>
        <div onClick={() => setActiveTab(4)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: activeTab === 4 ? '#262626' : '#8e8e8e', fontSize: '24px',
          padding: '12px', cursor: 'pointer'
        }}>
          👤
        </div>
      </nav>
    </div>
  );
};

export default MobileApp;