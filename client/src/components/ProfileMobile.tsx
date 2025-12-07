import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getApiBaseUrl } from "@/lib/posts";

interface ProfileMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onEditProfile: () => void;
  userId?: string;
  userEmail?: string;
}

interface ProfileData {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  email?: string;
}

interface Post {
  id: string;
  author_id: string;
}

interface PrayerRequest {
  id: string;
  author_id: string;
}

export function ProfileMobile({
  isVisible,
  onBack,
  onEditProfile,
  userId,
  userEmail,
}: ProfileMobileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postsCount, setPostsCount] = useState(0);
  const [prayersCount, setPrayersCount] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError("No user ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Load profile data
      const { getProfilesByIds } = await import("../lib/profiles");
      const result = await getProfilesByIds([userId]);

      let profileData: ProfileData | null = null;
      if (Array.isArray(result.data)) {
        profileData = result.data[0] || null;
      } else if (result?.data?.get) {
        profileData = result.data.get(userId) || null;
      }

      if (!profileData) {
        throw new Error("Profile not found");
      }

      setProfile(profileData);

      // Load posts count
      const { supabase } = await import("../lib/supabaseClient");
      const { count: postsCountResult } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId);

      setPostsCount(postsCountResult || 0);

      // Load prayer commitments count (prayers user committed to pray for)
      const { count: prayersCountResult } = await supabase
        .from("prayer_commitments")
        .select("*", { count: "exact", head: true })
        .eq("warrior", userId);

      setPrayersCount(prayersCountResult || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isVisible && userId) {
      loadProfile();
    }
  }, [isVisible, userId, loadProfile]);

  const formatProfileDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  if (!isVisible) {
    return null;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "#ffffff",
          color: "#000000",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={onBack}
              data-testid="button-back"
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                padding: "0",
                marginRight: "12px",
                cursor: "pointer",
                color: "#000000",
              }}
            >
              ←
            </button>
            <div
              style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
            >
              Profile
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: "16px", color: "#8e8e8e" }}>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "#ffffff",
          color: "#000000",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={onBack}
              data-testid="button-back"
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                padding: "0",
                marginRight: "12px",
                cursor: "pointer",
                color: "#000000",
              }}
            >
              ←
            </button>
            <div
              style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
            >
              Profile
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "16px",
                color: "#dc3545",
                marginBottom: "12px",
              }}
            >
              {error}
            </div>
            <button
              onClick={loadProfile}
              data-testid="button-retry"
              style={{
                background: "#000000",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "#ffffff",
        color: "#000000",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e5e5e5",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={onBack}
              data-testid="button-back"
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                padding: "0",
                marginRight: "12px",
                cursor: "pointer",
                color: "#000000",
              }}
            >
              ←
            </button>
            <div
              style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
            >
              Profile
            </div>
          </div>
          <button
            onClick={onEditProfile}
            data-testid="button-edit"
            style={{
              background: "none",
              border: "1px solid #dbdbdb",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#000000",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Profile Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
          }}
        >
          <div style={{ marginRight: "16px" }}>
            {profile?.avatar_url ? (
              <img
                src={
                  profile.avatar_url.startsWith("/objects/") && Capacitor.isNativePlatform()
                    ? `${getApiBaseUrl()}${profile.avatar_url}`
                    : profile.avatar_url
                }
                alt="Avatar"
                data-testid="img-avatar"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  background: "#f0f0f0",
                }}
              />
            ) : (
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "#e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  color: "#8e8e8e",
                }}
              >
                👤
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "#000000",
                marginBottom: "4px",
              }}
              data-testid="text-display-name"
            >
              {profile?.display_name || "Gospel User"}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#8e8e8e",
                marginBottom: "8px",
              }}
              data-testid="text-email"
            >
              {userEmail}
            </div>
            {profile?.bio && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#262626",
                  lineHeight: "1.4",
                }}
                data-testid="text-bio"
              >
                {profile.bio}
              </div>
            )}
          </div>
        </div>

        {/* Profile Stats */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              textAlign: "center",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRight: "1px solid #e5e5e5",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#000000",
                }}
                data-testid="text-posts-count"
              >
                {postsCount}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Posts</div>
            </div>
            <div style={{ padding: "16px" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#000000",
                }}
                data-testid="text-prayers-count"
              >
                {prayersCount}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayers</div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid #e5e5e5",
            }}
          >
            <div
              style={{ fontSize: "16px", fontWeight: 600, color: "#000000" }}
            >
              Account Information
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8e8e8e",
                  marginBottom: "4px",
                }}
              >
                Member Since
              </div>
              <div
                style={{ fontSize: "14px", color: "#000000" }}
                data-testid="text-member-since"
              >
                {profile?.created_at
                  ? formatProfileDate(profile.created_at)
                  : "Recently"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8e8e8e",
                  marginBottom: "4px",
                }}
              >
                Email
              </div>
              <div
                style={{ fontSize: "14px", color: "#000000" }}
                data-testid="text-account-email"
              >
                {userEmail}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
