import { useState, useCallback, useEffect } from "react";
import { User } from "lucide-react";
import { Capacitor } from "@capacitor/core";

// Helper to convert relative image URLs to full URLs for native apps (same as Home page)
function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Check if running on native platform
  if (Capacitor.isNativePlatform()) {
    // Prepend production backend URL for native apps
    const baseUrl =
      import.meta.env.VITE_API_URL || "https://gospel-era.replit.app";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  // For web, return as-is (relative URLs work)
  return url;
}

interface PrayerDetailMobileProps {
  prayer: any;
  commitment: any | undefined;
  user: any;
  isBanned: boolean;
  onBack: () => void;
  onCommitToPray: (prayerId: number) => Promise<void>;
  onConfirmPrayed: (prayerId: number) => Promise<void>;
  onRefresh?: (prayerId: number) => Promise<void>;
}

export function PrayerDetailMobile({
  prayer,
  commitment,
  user,
  isBanned,
  onBack,
  onCommitToPray,
  onConfirmPrayed,
  onRefresh = async () => {},
}: PrayerDetailMobileProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [localCommitmentStatus, setLocalCommitmentStatus] = useState<
    "none" | "committed" | "prayed"
  >("none");

  // Check if this is user's own prayer request
  const isOwnPrayer = user?.id && prayer?.requester === user.id;

  useEffect(() => {
    if (!prayer?.id) return;

    // When you enter this screen again, re-sync from server
    setLocalCommitmentStatus("none");
    onRefresh(prayer.id);
  }, [prayer?.id]);
  useEffect(() => {
    // Once parent provides updated commitment, stop using optimistic local override
    if (commitment) {
      setLocalCommitmentStatus("none");
    }
  }, [commitment?.status]);

  // Debug logging
  console.log("🔍 PrayerDetail ownership check:", {
    userId: user?.id,
    prayerRequester: prayer?.requester,
    isOwnPrayer,
    match: user?.id === prayer?.requester,
    userType: typeof user?.id,
    requesterType: typeof prayer?.requester,
  });

  // TEMP DEBUG: Show on screen
  const debugInfo = `User: ${user?.id?.substring(0, 8)}... | Requester: ${prayer?.requester?.substring(0, 8)}... | Match: ${isOwnPrayer}`;

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  }, []);

  // Derive effective status from prop or local state
  const effectiveStatus =
    localCommitmentStatus !== "none"
      ? localCommitmentStatus
      : commitment
        ? commitment.status === "prayed"
          ? "prayed"
          : "committed"
        : "none";

  const handleAction = async () => {
    console.log("🙏 [PrayerDetailMobile] handleAction called", {
      prayerId: prayer.id,
      hasCommitment: !!commitment,
      effectiveStatus,
    });
    setIsCommitting(true);
    try {
      if (effectiveStatus === "committed") {
        console.log(" [PrayerDetailMobile] Confirming prayed...");
        setLocalCommitmentStatus("prayed");
        await onConfirmPrayed(prayer.id);
        await onRefresh(prayer.id);
      } else if (effectiveStatus === "none") {
        console.log("[PrayerDetailMobile] Committing to pray...");
        setLocalCommitmentStatus("committed");
        await onCommitToPray(prayer.id);
        await onRefresh(prayer.id);
      }
      console.log("[PrayerDetailMobile] Action completed successfully");
    } catch (err) {
      console.error(" [PrayerDetailMobile] Action error:", err);
      setLocalCommitmentStatus("none");
    } finally {
      setIsCommitting(false);
    }
  };

  if (!prayer) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div>Prayer not found</div>
        <button
          onClick={onBack}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #dbdbdb",
            background: "#ffffff",
          }}
        >
          Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff" }}>
      {/* Header with iOS safe area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingBottom: "16px",
          minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
          borderBottom: "1px solid #dbdbdb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back-detail"
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
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          Prayer Details
        </div>
      </div>

      {/* TEMP DEBUG BANNER - REMOVE AFTER TESTING */}
      <div
        style={{
          padding: "8px 16px",
          background: "#fef3c7",
          fontSize: "10px",
          fontFamily: "monospace",
          borderBottom: "1px solid #f59e0b",
        }}
      >
        {debugInfo}
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* Author */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#dbdbdb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "16px",
              color: "#8e8e8e",
              overflow: "hidden",
            }}
          >
            {prayer.is_anonymous ? (
              "🙏"
            ) : getImageUrl(prayer.profiles?.avatar_url) ? (
              <img
                src={getImageUrl(prayer.profiles.avatar_url)!}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <User size={24} color="#8e8e8e" />
            )}
          </div>
          <div>
            <div
              style={{ fontWeight: 600, fontSize: "16px", color: "#262626" }}
            >
              {prayer.is_anonymous
                ? "Anonymous Prayer Request"
                : prayer.profiles?.display_name || "Prayer Warrior"}
            </div>
            <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
              {formatTimeAgo(prayer.created_at)}
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#262626",
            lineHeight: 1.3,
          }}
        >
          {prayer.title}
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: "16px",
            lineHeight: 1.5,
            marginBottom: "20px",
            color: "#262626",
          }}
        >
          {prayer.details}
        </div>

        {/* Tags */}
        {prayer.tags && prayer.tags.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            {prayer.tags.map((tag: string, index: number) => (
              <span
                key={`detail-tag-${index}`}
                style={{
                  background: "#f0f0f0",
                  padding: "6px 12px",
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

        {/* Stats */}
        <div
          style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ color: "#8e8e8e" }}>Prayer Warriors Committed:</span>
            <span style={{ fontWeight: 600, color: "#262626" }}>
              {prayer.prayer_stats?.committed_count || 0}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8e8e8e" }}>Times Prayed:</span>
            <span style={{ fontWeight: 600, color: "#262626" }}>
              {prayer.prayer_stats?.prayed_count || 0}
            </span>
          </div>
        </div>

        {/* Action Button - hide for own prayer requests */}
        {user && !isBanned && !isOwnPrayer && (
          <button
            onClick={handleAction}
            disabled={isCommitting || effectiveStatus === "prayed"}
            data-testid="button-commit-pray"
            style={{
              width: "100%",
              background:
                effectiveStatus === "prayed"
                  ? "#28a745"
                  : effectiveStatus === "committed"
                    ? "#f59e0b"
                    : "#4285f4",
              color: "#ffffff",
              border: "none",
              padding: "16px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: effectiveStatus === "prayed" ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isCommitting
              ? "..."
              : effectiveStatus === "prayed"
                ? "✓ Prayed"
                : effectiveStatus === "committed"
                  ? "Confirm I Prayed"
                  : "I Will Pray"}
          </button>
        )}

        {isBanned && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffeaa7",
              color: "#856404",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            Account limited - cannot commit to pray
          </div>
        )}
      </div>
    </div>
  );
}
