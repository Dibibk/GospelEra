import { useState, useCallback } from "react";

interface PrayerDetailMobileProps {
  prayer: any;
  commitment: any | undefined;
  user: any;
  isBanned: boolean;
  onBack: () => void;
  onCommitToPray: (prayerId: number) => Promise<void>;
  onConfirmPrayed: (prayerId: number) => Promise<void>;
}

export function PrayerDetailMobile({
  prayer,
  commitment,
  user,
  isBanned,
  onBack,
  onCommitToPray,
  onConfirmPrayed,
}: PrayerDetailMobileProps) {
  const [isCommitting, setIsCommitting] = useState(false);

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

  const handleAction = async () => {
    console.log("🙏 [PrayerDetailMobile] handleAction called", { prayerId: prayer.id, hasCommitment: !!commitment });
    setIsCommitting(true);
    try {
      if (commitment && commitment.status !== 'prayed') {
        console.log("🙏 [PrayerDetailMobile] Confirming prayed...");
        await onConfirmPrayed(prayer.id);
      } else if (!commitment) {
        console.log("🙏 [PrayerDetailMobile] Committing to pray...");
        await onCommitToPray(prayer.id);
      }
      console.log("🙏 [PrayerDetailMobile] Action completed successfully");
    } catch (err) {
      console.error("🙏 [PrayerDetailMobile] Action error:", err);
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
              background: prayer.is_anonymous ? "#dbdbdb" : (prayer.profiles?.avatar_url ? "transparent" : "#dbdbdb"),
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
            ) : prayer.profiles?.avatar_url ? (
              <img
                src={prayer.profiles.avatar_url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              "•"
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

        {/* Action Button */}
        {user && !isBanned && (
          <button
            onClick={handleAction}
            disabled={isCommitting}
            data-testid="button-commit-pray"
            style={{
              width: "100%",
              background:
                commitment && commitment.status === 'prayed' ? "#28a745" : "#4285f4",
              color: "#ffffff",
              border: "none",
              padding: "16px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isCommitting
              ? "..."
              : commitment && commitment.status === 'prayed'
                ? "✓ Prayed"
                : commitment && commitment.status !== 'prayed'
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
