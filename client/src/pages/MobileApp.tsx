import React, { useState, useEffect } from 'react';

// Instagram-style mobile interface component
const MobileApp = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = (index: number) => {
    // Like functionality would be implemented here
    console.log('Liked post', index);
  };

  const getRandomTime = () => {
    const times = ['2h', '5h', '1d', '3d', '1w'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const getRandomLikes = () => {
    return Math.floor(Math.random() * 500) + 10;
  };

  const getRandomComments = () => {
    return Math.floor(Math.random() * 50) + 1;
  };

  const getPostIcon = (index: number) => {
    const icons = ['○', '□', '△', '◊', '☆'];
    return icons[index % icons.length];
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      background: '#ffffff',
      color: '#262626',
      height: '100vh',
      maxWidth: '414px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '14px'
    }}>
      {/* Instagram-style header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #dbdbdb',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#262626',
          letterSpacing: '-0.5px'
        }}>
          Gospel Era
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>♡</div>
          <div style={{ fontSize: '24px', color: '#262626', cursor: 'pointer', padding: '8px' }}>⊞</div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        padding: '12px 16px',
        background: '#ffffff',
        borderBottom: '1px solid #dbdbdb'
      }}>
        <input 
          type="text" 
          placeholder="Search"
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

      {/* Minimal daily scripture */}
      <div style={{
        background: '#ffffff',
        padding: '8px 16px',
        borderBottom: '1px solid #dbdbdb',
        fontSize: '12px',
        color: '#8e8e8e',
        textAlign: 'center'
      }}>
        "For I know the plans I have for you" - Jeremiah 29:11
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#ffffff',
        paddingBottom: '60px'
      }}>
        {loading ? (
          // Loading shimmer
          Array(3).fill(0).map((_, index) => (
            <div key={index} style={{
              background: '#ffffff',
              borderBottom: '1px solid #dbdbdb'
            }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  marginRight: '12px'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '8px', width: '80px' }} />
                  <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', width: '60px' }} />
                </div>
              </div>
              <div style={{ width: '100%', height: '300px', background: '#f0f0f0' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', marginBottom: '8px' }} />
                <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', width: '70%' }} />
              </div>
            </div>
          ))
        ) : posts.length > 0 ? (
          posts.map((post: any, index: number) => (
            <div key={index} style={{
              background: '#ffffff',
              borderBottom: '1px solid #dbdbdb'
            }}>
              {/* Post header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#dbdbdb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  marginRight: '12px',
                  border: '1px solid #dbdbdb',
                  color: '#8e8e8e'
                }}>
                  ●
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#262626'
                  }}>
                    {post.author || 'gospeluser'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#8e8e8e'
                  }}>
                    {getRandomTime()}
                  </div>
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#262626',
                  cursor: 'pointer',
                  padding: '8px'
                }}>
                  ⋯
                </div>
              </div>

              {/* Post image */}
              <div style={{
                width: '100%',
                height: '300px',
                background: '#ffffff',
                border: '1px solid #dbdbdb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#dbdbdb'
              }}>
                {getPostIcon(index)}
              </div>

              {/* Post actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 16px'
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button 
                    onClick={() => toggleLike(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      color: '#262626',
                      cursor: 'pointer',
                      padding: '8px'
                    }}
                  >
                    ♡
                  </button>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#262626',
                    cursor: 'pointer',
                    padding: '8px'
                  }}>
                    ○
                  </button>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#262626',
                    cursor: 'pointer',
                    padding: '8px'
                  }}>
                    ↗
                  </button>
                </div>
                <button style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#262626',
                  cursor: 'pointer',
                  padding: '8px'
                }}>
                  ⋄
                </button>
              </div>

              {/* Likes count */}
              <div style={{
                padding: '0 16px 4px',
                fontWeight: 600,
                fontSize: '14px',
                color: '#262626'
              }}>
                {getRandomLikes()} likes
              </div>

              {/* Post caption */}
              <div style={{
                padding: '0 16px 8px',
                fontSize: '14px',
                lineHeight: 1.4,
                color: '#262626'
              }}>
                <span style={{ fontWeight: 600, marginRight: '8px' }}>
                  {post.author || 'gospeluser'}
                </span>
                {post.content || post.title}
              </div>

              {/* View comments */}
              <div style={{
                padding: '0 16px 8px',
                fontSize: '14px',
                color: '#8e8e8e',
                cursor: 'pointer'
              }}>
                View all {getRandomComments()} comments
              </div>

              {/* Post timestamp */}
              <div style={{
                padding: '0 16px 12px',
                fontSize: '10px',
                color: '#8e8e8e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {getRandomTime().toUpperCase()}
              </div>
            </div>
          ))
        ) : (
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #dbdbdb',
            padding: '40px 16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Instagram-Style Mobile App</div>
            <div style={{ color: '#8e8e8e', fontSize: '14px' }}>Clean white design ready!</div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed',
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
      }}>
        <div 
          onClick={() => setActiveTab(0)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 0 ? '#262626' : '#8e8e8e',
            fontSize: '24px',
            padding: '12px',
            cursor: 'pointer',
            fontWeight: activeTab === 0 ? 700 : 400
          }}
        >
          ⌂
        </div>
        <div 
          onClick={() => setActiveTab(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 1 ? '#262626' : '#8e8e8e',
            fontSize: '24px',
            padding: '12px',
            cursor: 'pointer'
          }}
        >
          ○
        </div>
        <div 
          onClick={() => setActiveTab(2)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 2 ? '#262626' : '#8e8e8e',
            fontSize: '24px',
            padding: '12px',
            cursor: 'pointer'
          }}
        >
          ⊞
        </div>
        <div 
          onClick={() => setActiveTab(3)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 3 ? '#262626' : '#8e8e8e',
            fontSize: '24px',
            padding: '12px',
            cursor: 'pointer'
          }}
        >
          ☆
        </div>
        <div 
          onClick={() => setActiveTab(4)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 4 ? '#262626' : '#8e8e8e',
            fontSize: '24px',
            padding: '12px',
            cursor: 'pointer'
          }}
        >
          ○
        </div>
      </nav>
    </div>
  );
};

export default MobileApp;