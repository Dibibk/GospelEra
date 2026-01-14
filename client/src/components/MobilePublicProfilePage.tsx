import { useState, useEffect } from "react";
import { User } from "lucide-react";

function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const isNative =
    typeof window !== "undefined" && window.location.protocol === "capacitor:";
  if (isNative) {
    const baseUrl =
      import.meta.env.VITE_API_URL || "https://gospel-era.replit.app";
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

function formatMemberSince(dateString: string | undefined | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface MobilePublicProfilePageProps {
  publicProfileUserId: string | null;
  onBack: () => void;
}

export function MobilePublicProfilePage({
  publicProfileUserId,
  onBack,
}: MobilePublicProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!publicProfileUserId) {
          setError("No profile selected.");
          return;
        }
        const { getProfilesByIds } = await import("../lib/profiles");
        const result = await getProfilesByIds([publicProfileUserId]);
        let p: any | null = null;
        if (Array.isArray(result.data)) {
          p = result.data[0] || null;
        } else if (result?.data?.get) {
          p = result.data.get(publicProfileUserId) || null;
        }
        if (active) setProfile(p);
      } catch (e) {
        if (active) setError("Failed to load profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [publicProfileUserId]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "#ffffff",
        color: "#000000",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e5e5",
          background: "#ffffff",
        }}
      >
        <button
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBack();
          }}
          onClick={() => {
            onBack();
          }}
          style={{
            border: "none",
            background: "none",
            fontSize: "14px",
            color: "#0095f6",
            cursor: "pointer",
          }}
          aria-label="Back"
        >
          ← Back
        </button>
        <div style={{ fontWeight: 700 }}>
          {loading ? "Profile" : profile?.display_name ? `${profile.display_name}'s Profile` : "Profile"}
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        {loading ? (
          <div style={{ color: "#6c757d" }}>Loading profile…</div>
        ) : error ? (
          <div style={{ color: "#dc2626" }}>{error}</div>
        ) : !profile ? (
          <div style={{ color: "#6c757d" }}>Profile not found.</div>
        ) : (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#dbdbdb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  marginRight: "12px",
                  border: "1px solid #dbdbdb",
                  color: "#8e8e8e",
                }}
              >
                {getImageUrl(profile?.avatar_url) ? (
                  <img
                    src={getImageUrl(profile?.avatar_url)!}
                    alt="Avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <User size={32} color="#8e8e8e" />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#262626",
                  }}
                >
                  {profile?.display_name || "Gospel User"}
                </div>
                {profile?.bio && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6c757d",
                      marginTop: 4,
                    }}
                  >
                    {profile.bio}
                  </div>
                )}
                {profile?.created_at && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#8e8e8e",
                      marginTop: 6,
                    }}
                  >
                    Member since {formatMemberSince(profile.created_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
