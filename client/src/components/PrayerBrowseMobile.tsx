import { useCallback } from "react";

interface PrayerBrowseMobileProps {
  prayerRequests: any[];
  onNavigateToNew: () => void;
  onNavigateToMy: () => void;
  onNavigateToLeaderboard: () => void;
  onSelectPrayer: (prayer: any) => void;
}

export function PrayerBrowseMobile({
  prayerRequests,
  onNavigateToNew,
  onNavigateToMy,
  onNavigateToLeaderboard,
  onSelectPrayer,
}: PrayerBrowseMobileProps) {
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

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff" }}>
      {/* Header with Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          Prayer Requests
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onNavigateToNew}
            data-testid="button-new-prayer"
            style={{
              background: "#4285f4",
              color: "#ffffff",
              border: "none",
              padding: "8px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New
          </button>
          <button
            onClick={onNavigateToMy}
            data-testid="button-my-prayers"
            style={{
              background: "none",
              color: "#4285f4",
              border: "1px solid #4285f4",
              padding: "8px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            My Prayers
          </button>
          <button
            onClick={onNavigateToLeaderboard}
            data-testid="button-leaderboard"
            style={{
              background: "none",
              color: "#8e8e8e",
              border: "1px solid #dbdbdb",
              padding: "8px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🏆
          </button>
        </div>
      </div>

      {/* Prayer Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px",
          background: "#f8f9fa",
          borderBottom: "1px solid #dbdbdb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}>
            {prayerRequests.length}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Requests</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}>
            {prayerRequests.reduce(
              (sum, req) => sum + (req.prayer_stats?.committed_count || 0),
              0
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Committed</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}>
            {prayerRequests.reduce(
              (sum, req) => sum + (req.prayer_stats?.prayed_count || 0),
              0
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayed</div>
        </div>
      </div>

      {/* Prayer Requests Feed */}
      <div style={{ padding: "16px" }}>
        {prayerRequests.length > 0 ? (
          prayerRequests.map((request) => (
            <div
              key={request.id}
              data-testid={`card-prayer-${request.id}`}
              onClick={() => onSelectPrayer(request)}
              style={{
                background: "#ffffff",
                border: "1px solid #dbdbdb",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
                cursor: "pointer",
              }}
            >
              {/* Author */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: request.is_anonymous ? "#dbdbdb" : (request.profiles?.avatar_url ? "transparent" : "#dbdbdb"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                    color: "#8e8e8e",
                    overflow: "hidden",
                  }}
                >
                  {request.is_anonymous ? (
                    "🙏"
                  ) : request.profiles?.avatar_url ? (
                    <img
                      src={request.profiles.avatar_url}
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#262626" }}>
                    {request.is_anonymous
                      ? "Anonymous"
                      : request.profiles?.display_name || "Prayer Warrior"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {formatTimeAgo(request.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: "16px", color: "#8e8e8e" }}>→</div>
              </div>

              {/* Title */}
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "#262626",
                }}
              >
                {request.title}
              </div>

              {/* Details */}
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: 1.4,
                  marginBottom: "12px",
                  color: "#8e8e8e",
                }}
              >
                {request.details.slice(0, 100)}
                {request.details.length > 100 ? "..." : ""}
              </div>

              {/* Tags */}
              {request.tags && request.tags.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  {request.tags.slice(0, 3).map((tag: string, index: number) => (
                    <span
                      key={`${request.id}-tag-${index}`}
                      style={{
                        background: "#f0f0f0",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#666",
                        marginRight: "6px",
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
                  fontSize: "12px",
                  color: "#8e8e8e",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {request.prayer_stats?.committed_count || 0} committed ·{" "}
                  {request.prayer_stats?.prayed_count || 0} prayed
                </span>
                <span>Tap to view</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🙏</div>
            <div
              style={{
                fontWeight: 600,
                marginBottom: "8px",
                color: "#262626",
              }}
            >
              Prayer Community
            </div>
            <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
              Share your prayer needs and pray for others
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
