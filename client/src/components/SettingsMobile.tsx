import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ensureMyProfile, upsertMyProfile } from '@/lib/profiles';
import { checkMediaPermission, getCurrentRequestStatus } from '@/lib/mediaRequests';

interface SettingsMobileProps {
  onBack: () => void;
  onEditProfile: () => void;
  onSuccess?: () => void;
}

export function SettingsMobile({ onBack, onEditProfile, onSuccess }: SettingsMobileProps) {
  const { signOut } = useAuth();
  
  // Settings state - isolated to prevent parent re-renders
  const [showNameOnPrayers, setShowNameOnPrayers] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [newFeatures, setNewFeatures] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [dailyVerseReminders, setDailyVerseReminders] = useState(true);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [mediaRequestStatus, setMediaRequestStatus] = useState<string | null>(null);
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load user settings from database on mount
  useEffect(() => {
    loadSettingsFromDatabase();
  }, []);

  const loadSettingsFromDatabase = async () => {
    setSettingsLoading(true);
    try {
      // Load profile settings
      const { data: profileData } = await ensureMyProfile();
      if (profileData) {
        setShowNameOnPrayers(profileData.show_name_on_prayers ?? true);
        setPrivateProfile(profileData.private_profile ?? false);
      }

      // Load media status
      const permissionResult = await checkMediaPermission();
      setMediaEnabled(permissionResult.hasPermission);

      if (!permissionResult.hasPermission) {
        const statusResult = await getCurrentRequestStatus();
        setMediaRequestStatus(statusResult.status);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setSettingsLoading(false);
  };

  const handleToggle = async (setting: string, value: boolean) => {
    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    switch (setting) {
      case "showNameOnPrayers":
        setShowNameOnPrayers(value);
        break;
      case "privateProfile":
        setPrivateProfile(value);
        break;
      case "emailNotifications":
        setEmailNotifications(value);
        break;
      case "pushNotifications":
        setPushNotifications(value);
        break;
      case "commentNotifications":
        setCommentNotifications(value);
        break;
      case "weeklyDigest":
        setWeeklyDigest(value);
        break;
      case "newFeatures":
        setNewFeatures(value);
        break;
      case "realTimeUpdates":
        setRealTimeUpdates(value);
        break;
      case "dailyVerseReminders":
        setDailyVerseReminders(value);
        break;
    }

    // Sync profile settings to Supabase
    if (setting === "showNameOnPrayers" || setting === "privateProfile") {
      try {
        await upsertMyProfile({
          show_name_on_prayers:
            setting === "showNameOnPrayers" ? value : showNameOnPrayers,
          private_profile:
            setting === "privateProfile" ? value : privateProfile,
        });
        onSuccess?.();
      } catch (error) {
        console.warn("Failed to sync profile settings:", error);
      }
    }
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#ffffff",
          borderBottom: "1px solid #e5e5e5",
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={onBack}
            data-testid="button-back-settings"
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              color: "#000000",
              cursor: "pointer",
              marginRight: "16px",
              minHeight: "44px",
              minWidth: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div
            style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
          >
            Settings
          </div>
        </div>
      </div>

      {settingsLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#8e8e8e" }}>
          Loading settings...
        </div>
      ) : (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Profile Information Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PROFILE INFORMATION
            </div>

            <button
              onClick={onEditProfile}
              data-testid="button-edit-profile"
              style={{
                width: "100%",
                minHeight: "48px",
                background: "none",
                border: "none",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Edit Profile
                </div>
                <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
                  Manage your display name, bio, and avatar
                </div>
              </div>
              <div style={{ fontSize: "16px", color: "#c7c7cc" }}>›</div>
            </button>
          </div>

          {/* Media Upload Access Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              MEDIA
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: "#000000",
                  marginBottom: "8px",
                }}
              >
                Request link share
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#8e8e8e",
                  marginBottom: "16px",
                }}
              >
                Manage your ability to upload images and videos to posts,
                comments, and prayers
              </div>

              {mediaEnabled ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div style={{ fontSize: "14px", color: "#22c55e" }}>
                    ✓ Media Uploads Enabled
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMediaRequestModal(true)}
                  data-testid="button-request-media"
                  style={{
                    padding: "8px 16px",
                    background: "#007aff",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Request Access
                </button>
              )}
            </div>
          </div>

          {/* Push Notifications Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PUSH NOTIFICATIONS
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Receive push notifications in your browser
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) =>
                    handleToggle("pushNotifications", e.target.checked)
                  }
                  data-testid="toggle-push-notifications"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: pushNotifications ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: pushNotifications ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Real-time Updates
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get instant notifications for comments and reactions
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={realTimeUpdates}
                  onChange={(e) =>
                    handleToggle("realTimeUpdates", e.target.checked)
                  }
                  data-testid="toggle-realtime-updates"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: realTimeUpdates ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: realTimeUpdates ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Daily Verse Reminders
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get notified when the daily verse is updated
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={dailyVerseReminders}
                  onChange={(e) =>
                    handleToggle("dailyVerseReminders", e.target.checked)
                  }
                  data-testid="toggle-daily-verse"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: dailyVerseReminders ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: dailyVerseReminders ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Privacy Settings Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PRIVACY SETTINGS
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Show my display name on prayer requests
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  When disabled, they will appear as "Anonymous"
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={showNameOnPrayers}
                  onChange={(e) =>
                    handleToggle("showNameOnPrayers", e.target.checked)
                  }
                  data-testid="toggle-show-name-prayers"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: showNameOnPrayers ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: showNameOnPrayers ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Private profile (appear as 'Anonymous' on leaderboards)
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  You will appear as "Anonymous" on prayer leaderboards
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={privateProfile}
                  onChange={(e) =>
                    handleToggle("privateProfile", e.target.checked)
                  }
                  data-testid="toggle-private-profile"
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: privateProfile ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: privateProfile ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Account Deletion Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              ACCOUNT
            </div>

            <button
              onClick={() =>
                alert("Account deletion - This action cannot be undone")
              }
              data-testid="button-delete-account"
              style={{
                width: "100%",
                minHeight: "48px",
                background: "none",
                border: "none",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#ff3b30" }}>
                  Delete Account
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Permanently delete your account and all data
                </div>
              </div>
              <div style={{ fontSize: "16px", color: "#c7c7cc" }}>›</div>
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to sign out?")) {
                await signOut();
              }
            }}
            data-testid="button-sign-out"
            style={{
              width: "100%",
              minHeight: "48px",
              background: "#ffffff",
              border: "2px solid #ff3b30",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ff3b30",
              cursor: "pointer",
              marginBottom: "32px",
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
