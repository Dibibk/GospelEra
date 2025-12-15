import { useState, useCallback } from "react";
import { User } from "lucide-react";

interface PrayerMyMobileProps {
  myCommitments: any[];
  myRequests: any[];
  confirmingId: number | null;
  onBack: () => void;
  onConfirmPrayed: (requestId: number) => Promise<void>;
  onSelectRequest: (request: any) => void;
  onNavigateToNew: () => void;
}

export function PrayerMyMobile({
  myCommitments,
  myRequests,
  confirmingId,
  onBack,
  onConfirmPrayed,
  onSelectRequest,
  onNavigateToNew,
}: PrayerMyMobileProps) {
  const [activeTab, setActiveTab] = useState<"commitments" | "requests">(
    "commitments"
  );

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
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back-my"
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
          My Prayers
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", padding: "16px", gap: "8px" }}>
        <button
          onClick={() => setActiveTab("commitments")}
          data-testid="button-tab-commitments"
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            background: activeTab === "commitments" ? "#4285f4" : "#f5f5f5",
            color: activeTab === "commitments" ? "#ffffff" : "#8e8e8e",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          My Commitments ({myCommitments.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          data-testid="button-tab-requests"
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            background: activeTab === "requests" ? "#4285f4" : "#f5f5f5",
            color: activeTab === "requests" ? "#ffffff" : "#8e8e8e",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          My Requests ({myRequests.length})
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {activeTab === "commitments" ? (
          <>
            {myCommitments.length > 0 ? (
              myCommitments.map((commitment: any) => (
                <div
                  key={commitment.id}
                  data-testid={`card-commitment-${commitment.id}`}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbdbdb",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "12px",
                  }}
                >
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
                        background: commitment.prayer_requests?.is_anonymous ? "#dbdbdb" : (commitment.prayer_requests?.profiles?.avatar_url ? "transparent" : "#dbdbdb"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        marginRight: "12px",
                        color: "#8e8e8e",
                        overflow: "hidden",
                      }}
                    >
                      {commitment.prayer_requests?.is_anonymous ? (
                        "🙏"
                      ) : commitment.prayer_requests?.profiles?.avatar_url ? (
                        <img
                          src={commitment.prayer_requests.profiles.avatar_url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <User size={16} color="#8e8e8e" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#262626" }}>
                        {commitment.prayer_requests?.is_anonymous
                          ? "Anonymous"
                          : commitment.prayer_requests?.profiles?.display_name ||
                            "Prayer Warrior"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                        Committed {formatTimeAgo(commitment.committed_at)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background:
                          commitment.status === "prayed" ? "#d4edda" : "#fff3cd",
                        color:
                          commitment.status === "prayed" ? "#155724" : "#856404",
                      }}
                    >
                      {commitment.status === "prayed"
                        ? "✓ Prayed"
                        : "Committed"}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      color: "#262626",
                      marginBottom: "4px",
                    }}
                  >
                    {commitment.prayer_requests?.title}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#8e8e8e",
                      lineHeight: 1.4,
                      marginBottom: "12px",
                    }}
                  >
                    {commitment.prayer_requests?.details}
                  </div>

                  {commitment.status === "committed" && (
                    <button
                      onClick={() =>
                        onConfirmPrayed(commitment.prayer_requests?.id)
                      }
                      disabled={confirmingId === commitment.prayer_requests?.id}
                      data-testid={`button-confirm-prayed-${commitment.id}`}
                      style={{
                        background: "#28a745",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {confirmingId === commitment.prayer_requests?.id
                        ? "..."
                        : "✓ Confirm I Prayed"}
                    </button>
                  )}
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
                  No Prayer Commitments
                </div>
                <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
                  Commit to pray for others to see them here
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {myRequests.length > 0 ? (
              myRequests.map((request: any) => (
                <div
                  key={request.id}
                  data-testid={`card-request-${request.id}`}
                  onClick={() => onSelectRequest(request)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbdbdb",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, color: "#262626", flex: 1 }}
                    >
                      {request.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background:
                          request.status === "open" ? "#d4edda" : "#f8f9fa",
                        color:
                          request.status === "open" ? "#155724" : "#8e8e8e",
                        marginLeft: "8px",
                      }}
                    >
                      {request.status === "open" ? "🟢 Active" : "⏸️ Closed"}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#8e8e8e",
                      lineHeight: 1.4,
                      marginBottom: "12px",
                    }}
                  >
                    {request.details.slice(0, 100)}
                    {request.details.length > 100 ? "..." : ""}
                  </div>

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
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✍️</div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: "8px",
                    color: "#262626",
                  }}
                >
                  No Prayer Requests
                </div>
                <div
                  style={{
                    color: "#8e8e8e",
                    fontSize: "14px",
                    marginBottom: "16px",
                  }}
                >
                  Submit a prayer request to see it here
                </div>
                <button
                  onClick={onNavigateToNew}
                  data-testid="button-create-first-prayer"
                  style={{
                    background: "#4285f4",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Prayer Request
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
