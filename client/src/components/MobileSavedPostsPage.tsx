import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";

// Helper to convert relative image URLs to full URLs for native apps
function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if running on native platform
  const isNative = typeof window !== 'undefined' && 
    window.location.protocol === 'capacitor:';
  
  if (isNative) {
    // Prepend production backend URL for native apps
    const baseUrl = import.meta.env.VITE_API_URL || 'https://gospel-era.replit.app';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  
  // For web, return as-is (relative URLs work)
  return url;
}

interface MobileSavedPostsPageProps {
  profiles: Map<string, any>;
  onBack: () => void;
  onSetProfiles: (updater: (prev: Map<string, any>) => Map<string, any>) => void;
  onToggleBookmark: (postId: number) => void;
  onSelectPost: (postId: number) => void;
}

export function MobileSavedPostsPage({
  profiles,
  onBack,
  onSetProfiles,
  onToggleBookmark,
  onSelectPost,
}: MobileSavedPostsPageProps) {
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(true);
  const [savedPostsError, setSavedPostsError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<number, boolean>>({});

  const didInitRef = useRef(false);
  const savedLoadInFlightRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadSavedPosts();
    setHasLoadedOnce(true);
    setSavedPostsLoading(false);
  }, []);

  const loadSavedPosts = async () => {
    if (savedLoadInFlightRef.current) return;
    savedLoadInFlightRef.current = true;

    if (!hasLoadedOnce) setSavedPostsLoading(true);
    setSavedPostsError("");

    try {
      const { listBookmarks } = await import("../lib/engagement");
      const { data, error } = await listBookmarks({ limit: 20 });

      if (error) {
        setSavedPostsError(
          (error as any).message || "Failed to load saved posts"
        );
        setSavedPosts([]);
        return;
      }

      const bookmarkedPosts = Array.isArray(data) ? data : [];
      setSavedPosts(bookmarkedPosts);

      if (bookmarkedPosts.length > 0) {
        try {
          const { getProfilesByIds } = await import("../lib/profiles");
          const authorIds = Array.from(
            new Set(
              bookmarkedPosts
                .map((p: any) => p?.author_id || p?.author)
                .filter(Boolean)
            )
          );

          if (authorIds.length > 0) {
            const profilesResult: any = await getProfilesByIds(authorIds);
            if (
              profilesResult?.data &&
              !profilesResult?.error &&
              Array.isArray(profilesResult.data)
            ) {
              onSetProfiles((prev) => {
                const next = new Map(prev);
                profilesResult.data.forEach((profile: any) => {
                  next.set(profile.id, profile);
                });
                return next;
              });
            }
          }
        } catch (profileError) {
          console.log("Profile loading failed (non-blocking):", profileError);
        }
      }
    } catch (err: any) {
      setSavedPostsError(err?.message || "Failed to load saved posts");
      setSavedPosts([]);
    } finally {
      if (!hasLoadedOnce) setSavedPostsLoading(false);
      setHasLoadedOnce(true);
      savedLoadInFlightRef.current = false;
    }
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid #dbdbdb",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            color: "#262626",
            cursor: "pointer",
            marginRight: "16px",
          }}
        >
          ←
        </button>
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          Saved Posts
        </div>
      </div>

      {/* Content */}
      {savedPostsLoading && !hasLoadedOnce ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "20px", color: "#8e8e8e" }}>
            Loading saved posts...
          </div>
        </div>
      ) : savedPostsError ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <div
            style={{
              fontSize: "16px",
              color: "#ef4444",
              marginBottom: "8px",
            }}
          >
            Error
          </div>
          <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
            {savedPostsError}
          </div>
          <button
            onClick={loadSavedPosts}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              background: "#4285f4",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : !Array.isArray(savedPosts) || savedPosts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#8e8e8e",
            fontSize: "14px",
            padding: "40px 20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔖</div>
          <div style={{ marginBottom: "8px" }}>No saved posts yet</div>
          <div>
            Save posts you want to read later by tapping the bookmark icon
          </div>
        </div>
      ) : (
        <div>
          {savedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onSelectPost(post.id)}
              style={{
                background: "#ffffff",
                borderBottom: "1px solid #dbdbdb",
                cursor: "pointer",
              }}
            >
              {/* Post header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: getImageUrl(profiles.get(post.author_id || post.author)?.avatar_url) && !avatarErrors[post.id] ? "transparent" : "#dbdbdb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                    overflow: "hidden",
                  }}
                >
                  {getImageUrl(profiles.get(post.author_id || post.author)?.avatar_url) && !avatarErrors[post.id] ? (
                    <img
                      src={getImageUrl(profiles.get(post.author_id || post.author)?.avatar_url)!}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      onError={() => setAvatarErrors(prev => ({ ...prev, [post.id]: true }))}
                    />
                  ) : (
                    <User size={18} color="#8e8e8e" />
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
                    {profiles.get(post.author_id || post.author)
                      ?.display_name ||
                      post.author_name ||
                      "Gospel User"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>

              </div>

              {/* Post body */}
              <div style={{ padding: "0 16px 12px 16px" }}>
                <div
                  style={{
                    fontSize: "15px",
                    color: "#262626",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {post.content || ""}
                </div>

                {/* Media (if any) */}
                {post.media_url && (
                  <div
                    style={{
                      marginTop: "12px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#f5f5f5",
                    }}
                  >
                    {/* Basic image/video heuristic */}
                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(post.media_url) ? (
                      <img
                        src={post.media_url}
                        alt="Post media"
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                        }}
                      />
                    ) : (
                      <video
                        src={post.media_url}
                        controls
                        style={{ width: "100%", display: "block" }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Footer actions - Only Unsave button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "8px 16px 12px 16px",
                }}
              >
                {/* Unsave (Bookmark icon) */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    onToggleBookmark(post.id);
                    // Remove the post from local state immediately for instant feedback
                    setSavedPosts(prev => prev.filter(p => p.id !== post.id));
                  }}
                  aria-label="Remove from saved"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ color: "#262626" }}
                  >
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
