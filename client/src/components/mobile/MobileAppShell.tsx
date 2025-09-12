import React, { Suspense, lazy, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MobileProvider } from '@/contexts/MobileContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import '@/styles/mobile-native.css';

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

// Use mobile-native.css classes instead of inline styles

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
      <div className="min-h-screen max-w-sm mx-auto flex flex-col bg-white">
        <div className="flex items-center justify-center h-full">
          <div className="text-mobile-lg text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <MobileProvider>
      <div className="min-h-screen max-w-sm mx-auto flex flex-col bg-white relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <h1 className="text-mobile-2xl font-bold text-gray-900 tracking-tight">
            {getTabTitle()}
          </h1>
          
          {user && (
            <div className="text-mobile-sm text-gray-500">
              {user.email?.split('@')[0]}
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white pb-20">
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
        </main>

        {/* Bottom Navigation - Use your original component */}
        {user && <BottomNavigation />}

        {/* Modals */}
        {showSavedPosts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="modal-mobile">
              <h3 className="text-mobile-lg font-semibold mb-3">Saved Posts</h3>
              <p className="text-mobile-base text-gray-600 mb-4">Coming soon...</p>
              <button 
                onClick={() => setShowSavedPosts(false)}
                className="btn-mobile w-full"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="modal-mobile">
              <h3 className="text-mobile-lg font-semibold mb-3">Settings</h3>
              <p className="text-mobile-base text-gray-600 mb-4">Settings coming soon...</p>
              <button 
                onClick={() => setShowSettings(false)}
                className="btn-mobile w-full"
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