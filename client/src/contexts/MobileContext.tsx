import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getProfilesByIds } from '@/lib/profiles';

// Shared data types
interface SharedData {
  profiles: Map<string, any>;
  setProfiles: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  engagementData: Map<number, any>;
  setEngagementData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
}

const MobileContext = createContext<SharedData | null>(null);

export const useMobileContext = () => {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobileContext must be used within MobileProvider');
  }
  return context;
};

interface MobileProviderProps {
  children: React.ReactNode;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [engagementData, setEngagementData] = useState<Map<number, any>>(new Map());
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile when user changes
  useEffect(() => {
    if (user?.id) {
      const loadUserProfile = async () => {
        try {
          const { data } = await getProfilesByIds([user.id]);
          if (data && data.length > 0) {
            setUserProfile(data[0]);
            setProfiles(prev => {
              const next = new Map(prev);
              next.set(user.id, data[0]);
              return next;
            });
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      };
      loadUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user?.id]);

  const value: SharedData = {
    profiles,
    setProfiles,
    engagementData,
    setEngagementData,
    userProfile,
    setUserProfile,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};