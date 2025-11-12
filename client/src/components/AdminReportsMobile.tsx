import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AdminReportsMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onActionComplete?: () => void;
  onError?: (error: string) => void;
}

export function AdminReportsMobile({
  isVisible,
  onBack,
  onActionComplete,
  onError,
}: AdminReportsMobileProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("reports");
  const [statusFilter, setStatusFilter] = useState("open");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "resolved":
        return "#28a745";
      case "dismissed":
        return "#6c757d";
      case "open":
      default:
        return "#dc3545";
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `
          *,
          reporter:profiles!reports_reporter_id_fkey(display_name, email),
          post:posts(title, content),
          comment:comments(content)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error("Error loading reports:", err);
    }
  }, []);

  const loadPrayerRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select(
          `
          *,
          profiles!prayer_requests_requester_fkey(display_name, avatar_url, role)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPrayerRequests(data || []);
    } catch (err: any) {
      console.error("Error loading prayer requests:", err);
    }
  }, []);

  const loadBannedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "banned")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBannedUsers(data || []);
    } catch (err: any) {
      console.error("Error loading banned users:", err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([
        loadReports(),
        loadPrayerRequests(),
        loadBannedUsers(),
      ]);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to load data";
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [loadReports, loadPrayerRequests, loadBannedUsers, onError]);

  useEffect(() => {
    if (isVisible) {
      loadAllData();
    }
  }, [isVisible, loadAllData]);

  const handleReportAction = async (
    reportId: string,
    action: "resolved" | "dismissed",
  ) => {
    setProcessingId(reportId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) throw error;

      setSuccess(`Report ${action} successfully`);
      loadReports();
      setTimeout(() => setSuccess(""), 3000);
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      const errorMsg = err.message || `Failed to ${action} report`;
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      report.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporter?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      report.reporter?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e5e5e5",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
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
              color: "#262626",
            }}
          >
            ←
          </button>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
            Admin Reports
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {[
            {
              id: "reports",
              label: "Reports",
              count: filteredReports.length,
            },
            {
              id: "prayers",
              label: "Prayer Requests",
              count: prayerRequests.length,
            },
            {
              id: "banned",
              label: "Banned Users",
              count: bannedUsers.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`button-tab-${tab.id}`}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
                background: activeTab === tab.id ? "#007bff" : "#ffffff",
                color: activeTab === tab.id ? "#ffffff" : "#262626",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by reason, reporter, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
            fontSize: "14px",
            marginBottom: "12px",
          }}
        />

        {/* Status Filter (only for reports tab) */}
        {activeTab === "reports" && (
          <div style={{ display: "flex", gap: "4px" }}>
            {[
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                data-testid={`button-filter-${filter.value}`}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  border: "1px solid #e5e5e5",
                  borderRadius: "4px",
                  background:
                    statusFilter === filter.value
                      ? getStatusColor(filter.value)
                      : "#ffffff",
                  color:
                    statusFilter === filter.value ? "#ffffff" : "#262626",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div
          style={{
            margin: "16px 20px",
            padding: "12px",
            background: "#fee",
            borderRadius: "6px",
            color: "#dc3545",
            fontSize: "14px",
          }}
          data-testid="text-error"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            margin: "16px 20px",
            padding: "12px",
            background: "#efe",
            borderRadius: "6px",
            color: "#28a745",
            fontSize: "14px",
          }}
          data-testid="text-success"
        >
          {success}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "0 20px 20px", flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "16px", color: "#8e8e8e" }}>
              Loading {activeTab}...
            </div>
          </div>
        ) : activeTab === "reports" ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "8px",
              }}
            >
              Reports ({filteredReports.length})
            </div>
            {filteredReports.map((report) => (
              <div
                key={report.id}
                style={{
                  padding: "16px",
                  background: "#f8f9fa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
                data-testid={`card-report-${report.id}`}
              >
                {/* Report Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: "4px",
                      }}
                    >
                      {report.reason || "No reason provided"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      Reported by:{" "}
                      {report.reporter?.display_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d" }}>
                      {new Date(report.created_at).toLocaleDateString()} at{" "}
                      {new Date(report.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: getStatusColor(report.status),
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                  >
                    {report.status || "open"}
                  </div>
                </div>

                {/* Target Content */}
                <div
                  style={{
                    padding: "12px",
                    background: "#ffffff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "6px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6c757d",
                      marginBottom: "4px",
                    }}
                  >
                    Target: {report.target_type} #{report.target_id}
                  </div>
                  <div style={{ fontSize: "13px", color: "#262626" }}>
                    {report.post?.title ||
                      report.comment?.content ||
                      "Content unavailable"}
                  </div>
                </div>

                {/* Actions */}
                {report.status === "open" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleReportAction(report.id, "resolved")}
                      disabled={processingId === report.id}
                      data-testid={`button-resolve-${report.id}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#28a745",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor:
                          processingId === report.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: processingId === report.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === report.id ? "..." : "Resolve"}
                    </button>
                    <button
                      onClick={() => handleReportAction(report.id, "dismissed")}
                      disabled={processingId === report.id}
                      data-testid={`button-dismiss-${report.id}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#6c757d",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor:
                          processingId === report.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: processingId === report.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === report.id ? "..." : "Dismiss"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    fontSize: "16px",
                    color: "#8e8e8e",
                    marginBottom: "8px",
                  }}
                >
                  No reports found
                </div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "All reports have been handled"}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "prayers" ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "8px",
              }}
            >
              Prayer Requests ({prayerRequests.length})
            </div>
            {prayerRequests.map((prayer) => (
              <div
                key={prayer.id}
                style={{
                  padding: "12px",
                  background: "#f8f9fa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
                data-testid={`card-prayer-${prayer.id}`}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#262626",
                    marginBottom: "4px",
                  }}
                >
                  {prayer.title}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6c757d",
                    marginBottom: "8px",
                  }}
                >
                  By: {prayer.profiles?.display_name || "Anonymous"} •{" "}
                  {new Date(prayer.created_at).toLocaleDateString()}
                </div>
                <div style={{ fontSize: "13px", color: "#262626" }}>
                  {prayer.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "8px",
              }}
            >
              Banned Users ({bannedUsers.length})
            </div>
            {bannedUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  background: "#f8f9fa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
                data-testid={`card-banned-user-${user.id}`}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: user.avatar_url ? "none" : "#dbdbdb",
                    marginRight: "12px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {user.avatar_url ? (
                    <img
                      src={
                        user.avatar_url.startsWith("/")
                          ? user.avatar_url
                          : `/public-objects/${user.avatar_url}`
                      }
                      alt="Avatar"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "14px", color: "#8e8e8e" }}>
                      👤
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#262626",
                    }}
                  >
                    {user.display_name || "No display name"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {user.email} • Banned:{" "}
                    {new Date(
                      user.updated_at || user.created_at,
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
