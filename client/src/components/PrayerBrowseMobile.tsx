import { useCallback, useState, useRef, useEffect } from "react";
import { User, Loader2 } from "lucide-react";

// Helper to convert relative image URLs to full URLs for native apps
function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Check if running on native platform
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

interface PrayerBrowseMobileProps {
  prayerRequests: any[];
  onNavigateToNew: () => void;
  onNavigateToMy: () => void;
  onNavigateToLeaderboard: () => void;
  onSelectPrayer: (prayer: any) => void;
  nextCursor?: number | null;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function PrayerBrowseMobile({
  prayerRequests,
  onNavigateToNew,
  onNavigateToMy,
  onNavigateToLeaderboard,
  onSelectPrayer,
  nextCursor,
  loadingMore,
  onLoadMore,
}: PrayerBrowseMobileProps) {
  const [avatarErrors, setAvatarErrors] = useState<
    Record<number | string, boolean>
  >({});
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore) return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, onLoadMore]);

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
      {/* Header */}
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
              0,
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Committed</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}>
            {prayerRequests.reduce(
              (sum, req) => sum + (req.prayer_stats?.prayed_count || 0),
              0,
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayed</div>
        </div>
      </div>

      {/* Prayer List */}
      <div style={{ padding: "16px" }}>
        {prayerRequests.length > 0 ? (
          prayerRequests.map((request) => {
            const avatarUrl = getImageUrl(request.profiles?.avatar_url || null);

            const hasError = avatarErrors[request.id];

            return (
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
                      background: request.is_anonymous
                        ? "#dbdbdb"
                        : avatarUrl && !hasError
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
                    {request.is_anonymous ? (
                      "🙏"
                    ) : avatarUrl && !hasError ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={() =>
                          setAvatarErrors((prev) => ({
                            ...prev,
                            [request.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <User size={18} color="#8e8e8e" />
                    )}
                  </div>

                  {/* Author Name + Time */}
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
                    {request.tags.slice(0, 3).map((tag, index) => (
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
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🙏</div>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>
              Prayer Community
            </div>
            <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
              Share your prayer needs and pray for others
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel and loading indicator */}
        <div ref={loadMoreSentinelRef} style={{ height: "1px" }} />
        {loadingMore && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <Loader2
              size={24}
              color="#8e8e8e"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}
        {!nextCursor && prayerRequests.length >= 20 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#8e8e8e",
              fontSize: "14px",
            }}
          >
            You've reached the end
          </div>
        )}
      </div>
    </div>
  );
}
