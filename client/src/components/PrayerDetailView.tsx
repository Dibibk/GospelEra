import { useState } from "react";

interface PrayerDetailViewProps {
  prayer: any;
  myCommitments: any[];
  user: any;
  isBanned: boolean;
  prayedJustNow: Set<number>;
  onBack: () => void;
  onCommitToPray: (prayerId: number) => Promise<void>;
  onConfirmPrayed: (prayerId: number) => Promise<void>;
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
}: PrayerDetailViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    if (!user || isBanned) return;
    
    setIsProcessing(true);
    try {
      const commitment = myCommitments.find(
        (c) => c.prayer_request_id === prayer.id
      );
      
      if (commitment && !commitment.has_prayed) {
        await onConfirmPrayed(prayer.id);
      } else if (!commitment) {
        await onCommitToPray(prayer.id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (!user) return "Login to Pray";
    if (isBanned) return "Account Limited";
    if (prayedJustNow.has(prayer.id)) return "✓ Prayed just now";
    
    const hasCommitment = myCommitments.some(
      (c) => c.prayer_request_id === prayer.id && !c.has_prayed
    );
    const hasPrayed = myCommitments.some(
      (c) => c.prayer_request_id === prayer.id && c.has_prayed
    );
    
    if (isProcessing) return "...";
    if (hasCommitment) return "Confirm Prayed";
    if (hasPrayed) return "✓ Prayed";
    return "I will pray";
  };

  const getButtonBackground = () => {
    if (!user || isBanned) return "#dbdbdb";
    
    const hasCommitment = myCommitments.some(
      (c) => c.prayer_request_id === prayer.id && !c.has_prayed
    );
    
    return hasCommitment ? "#28a745" : "#4285f4";
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
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

      {/* Prayer Content */}
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
              background: "#dbdbdb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
              color: "#8e8e8e",
            }}
          >
            {prayer.is_anonymous ? "🙏" : "•"}
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

        {/* Content */}
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

        {/* Prayer Stats */}
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

        {/* Action Button */}
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
      </div>
    </div>
  );
}
