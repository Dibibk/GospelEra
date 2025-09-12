import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMobileContext } from '@/contexts/MobileContext';
import { listBookmarks } from '@/lib/engagement';

interface MobileProfilePageProps {
  onOpenSettings: () => void;
  onOpenSavedPosts: () => void;
  onLogout: () => void;
}

export const MobileProfilePage: React.FC<MobileProfilePageProps> = ({ 
  onOpenSettings,
  onOpenSavedPosts,
  onLogout 
}) => {
  const { user } = useAuth();
  const { userProfile } = useMobileContext();
  
  // Stats state
  const [savedPostsCount, setSavedPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load user stats on mount
  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      
      // Load saved posts count
      const bookmarksResult = await listBookmarks({ limit: 1 });
      if (bookmarksResult.data && Array.isArray(bookmarksResult.data)) {
        setSavedPostsCount(bookmarksResult.data.length);
      }
      
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Your Profile
        </div>
        <div style={{ color: '#8e8e8e' }}>
          Sign in to view your profile and saved content
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Profile Header */}
      <div style={{
        padding: '20px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {/* Avatar */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: userProfile?.avatar_url ? 'none' : '#dbdbdb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          overflow: 'hidden'
        }}>
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url.startsWith('/') ? userProfile.avatar_url : `/public-objects/${userProfile.avatar_url}`}
              alt="Profile"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <span style={{ fontSize: '32px', color: '#8e8e8e' }}>
              {userProfile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Username */}
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '4px',
          color: '#262626'
        }}>
          {userProfile?.username || user?.email?.split('@')[0] || 'Gospel Era User'}
        </div>

        {/* Bio */}
        {userProfile?.bio && (
          <div style={{
            fontSize: '14px',
            color: '#8e8e8e',
            lineHeight: '1.4',
            marginBottom: '16px'
          }}>
            {userProfile.bio}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginTop: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#262626'
            }}>
              {loading ? '...' : savedPostsCount}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8e8e8e'
            }}>
              Saved
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#262626'
            }}>
              {userProfile?.posts_count || 0}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8e8e8e'
            }}>
              Posts
            </div>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div style={{ padding: '0' }}>
        {/* Saved Posts */}
        <button
          onClick={onOpenSavedPosts}
          style={{
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          data-testid="button-saved-posts"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>🔖</span>
            <span style={{ color: '#262626' }}>Saved Posts</span>
          </div>
          <span style={{ color: '#8e8e8e', fontSize: '18px' }}>›</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          style={{
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          data-testid="button-settings"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <span style={{ color: '#262626' }}>Settings</span>
          </div>
          <span style={{ color: '#8e8e8e', fontSize: '18px' }}>›</span>
        </button>

        {/* Community Guidelines */}
        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <span style={{ color: '#262626' }}>Community Guidelines</span>
          </div>
          <span style={{ color: '#8e8e8e', fontSize: '18px' }}>›</span>
        </button>

        {/* Support */}
        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>💝</span>
            <span style={{ color: '#262626' }}>Support Gospel Era</span>
          </div>
          <span style={{ color: '#8e8e8e', fontSize: '18px' }}>›</span>
        </button>

        {/* Help */}
        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>❓</span>
            <span style={{ color: '#262626' }}>Help</span>
          </div>
          <span style={{ color: '#8e8e8e', fontSize: '18px' }}>›</span>
        </button>
      </div>

      {/* Logout Section */}
      <div style={{
        padding: '20px 16px',
        borderTop: '1px solid #f0f0f0',
        marginTop: '20px'
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '16px',
            background: '#ff4757',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          data-testid="button-logout"
        >
          Sign Out
        </button>
      </div>

      {/* App Info */}
      <div style={{
        padding: '20px 16px',
        textAlign: 'center',
        borderTop: '1px solid #f0f0f0'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#8e8e8e',
          marginBottom: '8px'
        }}>
          Gospel Era v1.0.0
        </div>
        <div style={{
          fontSize: '12px',
          color: '#8e8e8e',
          fontStyle: 'italic'
        }}>
          "Let your light shine before others" - Matthew 5:16
        </div>
      </div>
    </div>
  );
};