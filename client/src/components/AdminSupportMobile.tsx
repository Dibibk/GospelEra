import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";

// Helper to convert relative image URLs to full URLs for native apps
function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Check if running on native platform (works for both iOS and Android)
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // Prepend production backend URL for native apps
    const baseUrl =
      import.meta.env.VITE_API_URL || "https://gospel-era.replit.app";
    // Handle both /public-objects/ paths and raw paths
    const path = url.startsWith("/") ? url : `/public-objects/${url}`;
    return `${baseUrl}${path}`;
  }

  // For web, return formatted path
  return url.startsWith("/") ? url : `/public-objects/${url}`;
}

interface AdminSupportMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onSuccess?: (message: string) => void;
}

export function AdminSupportMobile({
  isVisible,
  onBack,
  onSuccess,
}: AdminSupportMobileProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Load users and banned users when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadUsersAndBannedUsers();
    }
  }, [isVisible]);

  const loadUsersAndBannedUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load all users
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (userError) throw userError;
      setUsers(userData || []);

      // Load banned users (users with role 'banned')
      const { data: bannedData, error: bannedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "banned")
        .order("created_at", { ascending: false });

      if (bannedError) throw bannedError;
      setBannedUsers(bannedData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBanUser = useCallback(async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to ban this user? They will lose access to post and comment.",
      )
    ) {
      return;
    }

    setProcessingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "banned" })
        .eq("id", userId);

      if (error) throw error;

      const successMsg = "User banned successfully";
      setSuccess(successMsg);

      if (onSuccess) {
        onSuccess(successMsg);
      }

      loadUsersAndBannedUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to ban user");
    } finally {
      setProcessingUserId(null);
    }
  }, [loadUsersAndBannedUsers, onSuccess]);

  const handleUnbanUser = useCallback(async (userId: string) => {
    setProcessingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "user" })
        .eq("id", userId);

      if (error) throw error;

      const successMsg = "User unbanned successfully";
      setSuccess(successMsg);

      if (onSuccess) {
        onSuccess(successMsg);
      }

      loadUsersAndBannedUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to unban user");
    } finally {
      setProcessingUserId(null);
    }
  }, [loadUsersAndBannedUsers, onSuccess]);

  const filteredUsers = users.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredBannedUsers = bannedUsers.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
            🛠️ Admin Support
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search users..."
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("users")}
            data-testid="button-tab-users"
            style={{
              flex: 1,
              padding: "8px 16px",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              background: activeTab === "users" ? "#007bff" : "#ffffff",
              color: activeTab === "users" ? "#ffffff" : "#262626",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Users ({filteredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("banned")}
            data-testid="button-tab-banned"
            style={{
              flex: 1,
              padding: "8px 16px",
              border: "1px solid #e5e5e5",
              borderRadius: "6px",
              background: activeTab === "banned" ? "#dc3545" : "#ffffff",
              color: activeTab === "banned" ? "#ffffff" : "#262626",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Banned ({filteredBannedUsers.length})
          </button>
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
              Loading users...
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            {(activeTab === "users"
              ? filteredUsers
              : filteredBannedUsers
            ).map((user) => (
              <div
                key={user.id}
                data-testid={`card-user-${user.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  background: "#f8f9fa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
              >
                {/* User Avatar */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
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
                      src={getImageUrl(user.avatar_url) || ""}
                      alt="Avatar"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "16px", color: "#8e8e8e" }}>
                      👤
                    </span>
                  )}
                </div>

                {/* User Info */}
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
                    {user.email || "No email"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>
                    Role: {user.role || "user"} • Joined:{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginLeft: "12px" }}>
                  {activeTab === "users" ? (
                    user.role !== "banned" && (
                      <button
                        onClick={() => handleBanUser(user.id)}
                        disabled={processingUserId === user.id}
                        data-testid={`button-ban-${user.id}`}
                        style={{
                          padding: "6px 12px",
                          background: "#dc3545",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                          cursor:
                            processingUserId === user.id
                              ? "not-allowed"
                              : "pointer",
                          opacity: processingUserId === user.id ? 0.6 : 1,
                        }}
                      >
                        {processingUserId === user.id ? "..." : "Ban"}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleUnbanUser(user.id)}
                      disabled={processingUserId === user.id}
                      data-testid={`button-unban-${user.id}`}
                      style={{
                        padding: "6px 12px",
                        background: "#28a745",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor:
                          processingUserId === user.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: processingUserId === user.id ? 0.6 : 1,
                      }}
                    >
                      {processingUserId === user.id ? "..." : "Unban"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {(activeTab === "users" ? filteredUsers : filteredBannedUsers)
              .length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    fontSize: "16px",
                    color: "#8e8e8e",
                    marginBottom: "8px",
                  }}
                >
                  {searchQuery
                    ? "No users match your search"
                    : `No ${activeTab} found`}
                </div>
                {searchQuery && (
                  <div style={{ fontSize: "14px", color: "#6c757d" }}>
                    Try adjusting your search terms
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
