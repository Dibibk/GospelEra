import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getApiBaseUrl } from "@/lib/posts";

interface MediaRequestsMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onSuccess?: (message: string) => void;
}

export function MediaRequestsMobile({
  isVisible,
  onBack,
  onSuccess,
}: MediaRequestsMobileProps) {
  const [mediaRequests, setMediaRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Load media requests when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadMediaRequests();
    }
  }, [isVisible]);

  const loadMediaRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Use getSession for auth token (same pattern as fetchFeed)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/admin/media-requests`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load media requests");
      }

      const data = await response.json();
      setMediaRequests(data || []);
    } catch (err: any) {
      console.error("Error loading media requests:", err);
      // Provide a more user-friendly error message
      const errorMessage = err.message || "Failed to load media requests";
      if (errorMessage.includes("pattern") || errorMessage.includes("Invalid")) {
        setError("Unable to authenticate. Please try logging out and back in.");
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("Load failed") || errorMessage.includes("NetworkError")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = useCallback(async (requestId: number) => {
    setProcessingId(requestId);
    setError("");
    setSuccess("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/admin/media-requests/${requestId}/approve`,
        {
          method: "PUT",
          mode: 'cors',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve request");
      }

      const successMsg = "Request approved successfully! User can now upload media.";
      setSuccess(successMsg);

      // Update local state
      setMediaRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: "approved", admin_id: session.user.id }
            : req,
        ),
      );

      if (onSuccess) {
        onSuccess(successMsg);
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  }, [onSuccess]);

  const handleDeny = useCallback(async (requestId: number) => {
    if (
      !confirm("Are you sure you want to deny this media access request?")
    ) {
      return;
    }

    setProcessingId(requestId);
    setError("");
    setSuccess("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/admin/media-requests/${requestId}/deny`,
        {
          method: "PUT",
          mode: 'cors',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deny request");
      }

      const successMsg = "Request denied successfully.";
      setSuccess(successMsg);

      // Update local state
      setMediaRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: "denied", admin_id: session.user.id }
            : req,
        ),
      );

      if (onSuccess) {
        onSuccess(successMsg);
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to deny request");
    } finally {
      setProcessingId(null);
    }
  }, [onSuccess]);

  const filteredRequests = mediaRequests.filter((request) => {
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      request.user?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      request.user?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#28a745";
      case "denied":
        return "#dc3545";
      case "pending":
      default:
        return "#ffc107";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "✅";
      case "denied":
        return "❌";
      case "pending":
      default:
        return "⏳";
    }
  };

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
          <div
            style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}
          >
            📤 Media Requests
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by user, email, or reason..."
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

        {/* Status Filter */}
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { value: "all", label: "All", count: filteredRequests.length },
            {
              value: "pending",
              label: "Pending",
              count: mediaRequests.filter((r) => r.status === "pending")
                .length,
            },
            {
              value: "approved",
              label: "Approved",
              count: mediaRequests.filter((r) => r.status === "approved")
                .length,
            },
            {
              value: "denied",
              label: "Denied",
              count: mediaRequests.filter((r) => r.status === "denied")
                .length,
            },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              data-testid={`button-filter-${filter.value}`}
              style={{
                flex: 1,
                padding: "6px 8px",
                border: "1px solid #e5e5e5",
                borderRadius: "4px",
                background:
                  statusFilter === filter.value ? "#007bff" : "#ffffff",
                color: statusFilter === filter.value ? "#ffffff" : "#262626",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
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
        >
          {success}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "0 20px 20px", flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "16px", color: "#8e8e8e" }}>
              Loading media requests...
            </div>
          </div>
        ) : (
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
              Media Requests ({filteredRequests.length})
            </div>

            {filteredRequests.map((request) => (
              <div
                key={request.id}
                data-testid={`card-request-${request.id}`}
                style={{
                  padding: "16px",
                  background: "#f8f9fa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
              >
                {/* Request Header */}
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
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#262626",
                          marginRight: "8px",
                        }}
                      >
                        {request.user?.display_name || "Unknown User"}
                      </div>
                      <div
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: getStatusColor(request.status),
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        {getStatusIcon(request.status)} {request.status}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#8e8e8e",
                        marginBottom: "2px",
                      }}
                    >
                      {request.user?.email || "No email"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      Requested:{" "}
                      {new Date(request.created_at).toLocaleDateString()} at{" "}
                      {new Date(request.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Request Reason */}
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
                    Reason for Media Access:
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#262626",
                      lineHeight: "1.4",
                    }}
                  >
                    {request.reason || "No reason provided"}
                  </div>
                </div>

                {/* Admin Info */}
                {request.admin && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6c757d",
                      marginBottom: "12px",
                    }}
                  >
                    {request.status === "approved" ? "Approved" : "Denied"}{" "}
                    by: {request.admin.display_name || "Admin"}
                    {request.updated_at && (
                      <>
                        {" "}
                        • {new Date(request.updated_at).toLocaleDateString()}
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                {request.status === "pending" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      data-testid={`button-approve-${request.id}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#28a745",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor:
                          processingId === request.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: processingId === request.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === request.id ? "..." : "✅ Approve"}
                    </button>
                    <button
                      onClick={() => handleDeny(request.id)}
                      disabled={processingId === request.id}
                      data-testid={`button-deny-${request.id}`}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#dc3545",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor:
                          processingId === request.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: processingId === request.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === request.id ? "..." : "❌ Deny"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredRequests.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  📤
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    color: "#8e8e8e",
                    marginBottom: "8px",
                  }}
                >
                  {searchQuery
                    ? "No requests match your search"
                    : "No media requests found"}
                </div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Users can request media upload access from their settings page"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
