import React, { Suspense, lazy, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MobileProvider } from '@/contexts/MobileContext';

// Lazy load components for better performance
const MobileHomeFeed = lazy(() => import('./MobileHomeFeed').then(m => ({ default: m.MobileHomeFeed })));
const MobileCreatePost = lazy(() => import('./MobileCreatePost').then(m => ({ default: m.MobileCreatePost })));
const MobilePrayerPage = lazy(() => import('./MobilePrayerPage').then(m => ({ default: m.MobilePrayerPage })));
const MobileProfilePage = lazy(() => import('./MobileProfilePage').then(m => ({ default: m.MobileProfilePage })));
const MobileSearchPage = lazy(() => import('./MobileSearchPage').then(m => ({ default: m.MobileSearchPage })));

// Loading component
const LoadingScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    background: '#ffffff'
  }}>
    <div style={{ fontSize: '20px', color: '#8e8e8e' }}>Loading...</div>
  </div>
);

// Style constants
const STYLES = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: '#ffffff',
    color: '#262626',
    minHeight: '100dvh',
    maxWidth: '414px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '14px',
    position: 'relative' as const,
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
    zIndex: 100,
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    background: '#ffffff',
    paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '414px',
    width: '100%',
    background: '#ffffff',
    borderTop: '1px solid #dbdbdb',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0',
    zIndex: 101,
  }
};

export const MobileAppShell: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Modal states (simplified for this shell)
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const resetAllModalStates = () => {
    setShowSavedPosts(false);
    setShowSettings(false);
  };

  const handleTabChange = (tab: number) => {
    resetAllModalStates();
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    // Import and use supabase signOut
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.auth.signOut();
    resetAllModalStates();
    setActiveTab(0);
  };

  const handlePostCreated = () => {
    setActiveTab(0); // Go back to home feed
  };

  const handleOpenProfile = (userId: string) => {
    console.log('Opening profile for user:', userId);
    // TODO: Implement profile navigation
  };

  const handleOpenPrayerDetail = (prayerId: number) => {
    console.log('Opening prayer detail for:', prayerId);
    // TODO: Implement prayer detail navigation
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleOpenSavedPosts = () => {
    setShowSavedPosts(true);
  };

  const getTabTitle = () => {
    if (!user) return 'Gospel Era';
    
    switch (activeTab) {
      case 0: return 'Gospel Era';
      case 1: return 'Create';
      case 2: return 'Prayer';
      case 3: return 'Search';
      case 4: return 'Profile';
      default: return 'Gospel Era';
    }
  };

  // Show loading during auth
  if (authLoading) {
    return (
      <div style={STYLES.container}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}>
          <div style={{ fontSize: '20px', color: '#8e8e8e' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <MobileProvider>
      <div style={STYLES.container}>
        {/* Header */}
        <div style={STYLES.header}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#262626',
            letterSpacing: '-0.5px',
          }}>
            {getTabTitle()}
          </div>
          
          {user && (
            <div style={{
              fontSize: '14px',
              color: '#8e8e8e'
            }}>
              {user.email?.split('@')[0]}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={STYLES.content}>
          <Suspense fallback={<LoadingScreen />}>
            {activeTab === 0 && (
              <MobileHomeFeed
                onOpenCreatePost={() => setActiveTab(1)}
                onOpenProfile={handleOpenProfile}
              />
            )}
            {activeTab === 1 && (
              <MobileCreatePost
                onPostCreated={handlePostCreated}
                onCancel={() => setActiveTab(0)}
              />
            )}
            {activeTab === 2 && (
              <MobilePrayerPage
                onOpenPrayerDetail={handleOpenPrayerDetail}
              />
            )}
            {activeTab === 3 && (
              <MobileSearchPage
                onOpenProfile={handleOpenProfile}
              />
            )}
            {activeTab === 4 && (
              <MobileProfilePage
                onOpenSettings={handleOpenSettings}
                onOpenSavedPosts={handleOpenSavedPosts}
                onLogout={handleLogout}
              />
            )}
          </Suspense>
        </div>

        {/* Bottom Navigation */}
        {user && (
          <nav style={STYLES.bottomNav}>
            {/* Home */}
            <div
              onClick={() => handleTabChange(0)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px',
                color: activeTab === 0 ? '#262626' : '#8e8e8e'
              }}
              data-testid="nav-home"
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                {activeTab === 0 ? '🏠' : '🏘️'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Home</span>
            </div>

            {/* Search */}
            <div
              onClick={() => handleTabChange(3)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px',
                color: activeTab === 3 ? '#262626' : '#8e8e8e'
              }}
              data-testid="nav-search"
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                {activeTab === 3 ? '🔍' : '🔎'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Search</span>
            </div>

            {/* Create */}
            <div
              onClick={() => handleTabChange(1)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px',
                color: activeTab === 1 ? '#262626' : '#8e8e8e'
              }}
              data-testid="nav-create"
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                {activeTab === 1 ? '✚' : '➕'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Post</span>
            </div>

            {/* Prayer */}
            <div
              onClick={() => handleTabChange(2)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px',
                color: activeTab === 2 ? '#262626' : '#8e8e8e'
              }}
              data-testid="nav-prayer"
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                {activeTab === 2 ? '🙏' : '🤲'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Prayer</span>
            </div>

            {/* Profile */}
            <div
              onClick={() => handleTabChange(4)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px',
                color: activeTab === 4 ? '#262626' : '#8e8e8e'
              }}
              data-testid="nav-profile"
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>
                {activeTab === 4 ? '👤' : '👥'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Profile</span>
            </div>
          </nav>
        )}

        {/* Modals */}
        {showSavedPosts && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '300px',
              textAlign: 'center'
            }}>
              <p>Saved Posts feature coming soon!</p>
              <button
                onClick={() => setShowSavedPosts(false)}
                style={{
                  background: '#5A31F4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '300px',
              textAlign: 'center'
            }}>
              <p>Settings feature coming soon!</p>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: '#5A31F4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileProvider>
  );
};