import { useState } from "react";
import { User } from "lucide-react";

// Helper to convert relative image URLs to full URLs for native apps
// (same logic as PrayerBrowseMobile)
function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Check if running on native platform (Capacitor WebView)
  const isNative =
    typeof window !== "undefined" && window.location.protocol === "capacitor:";

  if (isNative) {
    // Prepend production backend URL for native apps
    const baseUrl =
      import.meta.env.VITE_API_URL || "https://gospel-era.replit.app";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  // For web, return as-is (relative URLs work)
  return url;
}

interface PrayerDetailViewProps {
  prayer: any;
  myCommitments: any[];
  user: any;
  isBanned: boolean;
  prayedJustNow: Set<number>;
  onBack: () => void;
  onCommitToPray: (prayerId: number) => Promise<void>;
  onConfirmPrayed: (prayerId: number) => Promise<void>;
  onRefresh: (prayerId: number) => Promise<void>;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 604800)}w`;
}

export function PrayerDetailView({
  prayer,
  myCommitments,
  user,
  isBanned,
  prayedJustNow,
  onBack,
  onCommitToPray,
  onConfirmPrayed,
  onRefresh, // ✅ ADD THIS
}: PrayerDetailViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<
    "none" | "committed" | "prayed"
  >("none");

  // This prayer belongs to the logged-in user
  const isOwnPrayer = !!user?.id && prayer?.requester === user.id;

  const avatarUrl = getImageUrl(prayer.profiles?.avatar_url || null);

  const handleAction = async () => {
    if (!user || isBanned || isOwnPrayer) return;

    setIsProcessing(true);
    try {
      if (effectiveStatus === "committed") {
        setOptimisticStatus("prayed");
        await onConfirmPrayed(prayer.id);
        await onRefresh(prayer.id);
      } else if (effectiveStatus === "none") {
        setOptimisticStatus("committed");
        await onCommitToPray(prayer.id);
        await onRefresh(prayer.id); 
      }
    } catch (error) {
      console.error("[PrayerDetailView] Error during action:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const deriveStatusFromProps = () => {
    const committed = myCommitments.some(
      (c) => c.request_id === prayer.id && c.status !== "prayed",
    );
    const prayed = myCommitments.some(
      (c) => c.request_id === prayer.id && c.status === "prayed",
    );

    if (prayed) return "prayed";
    if (committed) return "committed";
    return "none";
  };

  const effectiveStatus =
    optimisticStatus !== "none" ? optimisticStatus : deriveStatusFromProps();

  const getButtonText = () => {
    if (!user) return "Login to Pray";
    if (isBanned) return "Account Limited";
    if (isOwnPrayer) return "This is your request";
    if (prayedJustNow.has(prayer.id)) return "✓ Prayed just now";

    if (isProcessing) return "...";
    if (effectiveStatus === "committed") return "Confirm Prayed";
    if (effectiveStatus === "prayed") return "✓ Prayed";
    return "I will pray";
  };

  const getButtonBackground = () => {
    if (!user || isBanned || isOwnPrayer) return "#dbdbdb";
    if (effectiveStatus === "prayed") return "#28a745";
    if (effectiveStatus === "committed") return "#f59e0b";
    return "#4285f4";
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header with iOS safe area */}
      <div
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingBottom: "16px",
          minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
          borderBottom: "1px solid #dbdbdb",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            marginRight: "12px",
            color: "#262626",
          }}
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#262626" }}>
          Prayer Details
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* Author */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: prayer.is_anonymous
                ? "#dbdbdb"
                : avatarUrl && !avatarError
                  ? "transparent"
                  : "#dbdbdb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
              color: "#8e8e8e",
              overflow: "hidden",
            }}
          >
            {prayer.is_anonymous ? (
              "🙏"
            ) : avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <User size={20} color="#8e8e8e" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#262626" }}>
              {prayer.is_anonymous
                ? "Anonymous Prayer Request"
                : prayer.profiles?.display_name || "Prayer Warrior"}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
              {formatTimeAgo(prayer.created_at)}
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontWeight: 600,
            fontSize: "18px",
            marginBottom: "12px",
            color: "#262626",
          }}
        >
          {prayer.title}
        </div>

        {/* Details */}
        <div
          style={{
            fontSize: "16px",
            lineHeight: 1.5,
            marginBottom: "16px",
            color: "#262626",
          }}
        >
          {prayer.details}
        </div>

        {/* Tags */}
        {prayer.tags && prayer.tags.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            {prayer.tags.map((tag: string, index: number) => (
              <span
                key={`${prayer.id}-detail-tag-${index}`}
                style={{
                  background: "#f0f0f0",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "14px",
                  color: "#666",
                  marginRight: "8px",
                  marginBottom: "8px",
                  display: "inline-block",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Prayer Impact */}
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{ fontWeight: 600, marginBottom: "8px", color: "#262626" }}
          >
            Prayer Impact
          </div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
              >
                {prayer.prayer_stats?.committed_count || 0}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                Committed
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
              >
                {prayer.prayer_stats?.prayed_count || 0}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayed</div>
            </div>
          </div>
        </div>

        {/* Action Button – hidden for own prayers */}
        {!isOwnPrayer && (
          <button
            onClick={handleAction}
            disabled={!user || isBanned || isProcessing}
            style={{
              width: "100%",
              background: getButtonBackground(),
              color: "#ffffff",
              border: "none",
              padding: "16px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: !user || isBanned ? "not-allowed" : "pointer",
            }}
          >
            {getButtonText()}
          </button>
        )}

        {isOwnPrayer && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              textAlign: "center",
              color: "#8e8e8e",
            }}
          >
            This is your own prayer request, so you can’t commit to pray for it.
          </div>
        )}
      </div>
    </div>
  );
}
