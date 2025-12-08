import { useState, useEffect, useCallback } from "react";
import { validateFaithContent } from "../../../shared/moderation";
import { validateAndNormalizeYouTubeUrl } from "../../../shared/youtube";
import { getApiBaseUrl } from "../lib/posts";

interface CreatePostMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onSuccess: () => void;
  isBanned: boolean;
  hasMediaPermission: boolean;
  onRequestMediaPermission: () => void;
  editingPost?: {
    id: number;
    title: string;
    content: string;
    tags: string[];
    media_urls: string[];
    embed_url?: string;
  } | null;
}

export function CreatePostMobile({
  isVisible,
  onBack,
  onSuccess,
  isBanned,
  hasMediaPermission,
  onRequestMediaPermission,
  editingPost,
}: CreatePostMobileProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [youTubeUrl, setYouTubeUrl] = useState("");
  const [moderationError, setModerationError] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [validatingVideo, setValidatingVideo] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || "");
      setContent(editingPost.content || "");
      setTags(editingPost.tags ? editingPost.tags.join(", ") : "");
      setYouTubeUrl(editingPost.embed_url || "");
    } else {
      setTitle("");
      setContent("");
      setTags("");
      setYouTubeUrl("");
    }
    setModerationError("");
    setYoutubeError("");
  }, [editingPost]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;

    if (isBanned) {
      alert("Your account is limited. You cannot create posts.");
      return;
    }

    // Clear previous errors
    setYoutubeError("");
    setModerationError("");

    const titleText = title.trim();
    const contentText = content.trim();

    // Enhanced Christ-centric validation for title and content
    const titleValidation = validateFaithContent(titleText);
    const contentValidation = validateFaithContent(contentText);

    if (!titleValidation.isValid && !contentValidation.isValid) {
      setModerationError(
        titleValidation.reason ||
          "Please keep your post centered on Jesus or Scripture."
      );
      return;
    }

    // Process tags
    const tagsArray = tags.trim()
      ? tags.split(",").map((tag) => tag.trim())
      : [];

    // Validate YouTube URL if provided
    let normalizedYouTubeUrl = "";
    if (youTubeUrl.trim()) {
      if (!hasMediaPermission) {
        setYoutubeError(
          "You need link sharing permission to add YouTube videos."
        );
        return;
      }

      const validation = validateAndNormalizeYouTubeUrl(youTubeUrl.trim());
      if (!validation.isValid) {
        setYoutubeError(validation.error || "Invalid YouTube URL");
        return;
      }
      normalizedYouTubeUrl = validation.normalizedUrl || "";

      // AI validation for YouTube video content
      setValidatingVideo(true);
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/validate-youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: validation.videoId }),
        });

        const aiValidation = await response.json();

        if (!aiValidation.allowed) {
          setYoutubeError(
            aiValidation.reason ||
              "This video doesn't appear to be Christ-centered content. Please share gospel music, sermons, or Christian testimonies."
          );
          setValidatingVideo(false);
          return;
        }
      } catch (error) {
        console.error("Error validating YouTube video:", error);
        setYoutubeError(
          "Unable to validate video. Please try again or choose a different video."
        );
        setValidatingVideo(false);
        return;
      } finally {
        setValidatingVideo(false);
      }
    }

    setSaving(true);

    try {
      const { createPost, updatePost } = await import("../lib/posts");
      let result;

      if (editingPost) {
        // Update existing post
        result = await updatePost(editingPost.id, {
          title: titleText,
          content: contentText,
          tags: tagsArray,
          media_urls: editingPost.media_urls || [],
          embed_url: normalizedYouTubeUrl,
        });
      } else {
        // Create new post
        result = await createPost({
          title: titleText,
          content: contentText,
          tags: tagsArray,
          media_urls: [],
          embed_url: normalizedYouTubeUrl,
        });
      }

      if (result.data) {
        // Clear form
        setTitle("");
        setContent("");
        setTags("");
        setYouTubeUrl("");
        setYoutubeError("");
        setModerationError("");
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert(
        `Failed to ${editingPost ? "update" : "create"} post. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  }, [
    title,
    content,
    tags,
    youTubeUrl,
    isBanned,
    hasMediaPermission,
    editingPost,
    onSuccess,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{ padding: "16px" }}>
      {/* Simple header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#0095f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          ✏️
        </div>
        <div style={{ fontWeight: 600, color: "#262626" }}>
          {editingPost ? "Edit Testimony" : "Share Your Testimony"}
        </div>
      </div>

      {/* Error messages */}
      {moderationError && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #fcc",
            color: "#c00",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          {moderationError}
        </div>
      )}

      {isBanned && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            color: "#856404",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          Account limited. You can read but cannot post or comment.
        </div>
      )}

      {/* Title input */}
      <input
        type="text"
        placeholder="Testimony title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isBanned}
        data-testid="input-title"
        inputMode="text"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck={true}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "1px solid #dbdbdb",
          borderRadius: "8px",
          fontSize: "16px",
          marginBottom: "12px",
          outline: "none",
          backgroundColor: isBanned ? "#f5f5f5" : "#ffffff",
          color: isBanned ? "#8e8e8e" : "#262626",
        }}
        title={isBanned ? "Account limited - cannot create posts" : ""}
      />

      {/* Content textarea */}
      <textarea
        placeholder="Share how God is working in your life to strengthen others' faith..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        disabled={isBanned}
        data-testid="input-content"
        inputMode="text"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck={true}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "1px solid #dbdbdb",
          borderRadius: "8px",
          fontSize: "16px",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          marginBottom: "12px",
          backgroundColor: isBanned ? "#f5f5f5" : "#ffffff",
          color: isBanned ? "#8e8e8e" : "#262626",
        }}
        title={isBanned ? "Account limited - cannot create posts" : ""}
      />

      {/* Tags input */}
      <input
        type="text"
        placeholder="Tags (prayer, testimony, scripture...)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        disabled={isBanned}
        data-testid="input-tags"
        inputMode="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "1px solid #dbdbdb",
          borderRadius: "8px",
          fontSize: "16px",
          marginBottom: "12px",
          outline: "none",
          backgroundColor: isBanned ? "#f5f5f5" : "#ffffff",
          color: isBanned ? "#8e8e8e" : "#262626",
        }}
        title={isBanned ? "Account limited - cannot create posts" : ""}
      />

      {/* YouTube input or request */}
      {hasMediaPermission ? (
        <div style={{ marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="YouTube URL (optional)"
            value={youTubeUrl}
            onChange={(e) => setYouTubeUrl(e.target.value)}
            disabled={isBanned}
            data-testid="input-youtube"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #dbdbdb",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              backgroundColor: isBanned ? "#f5f5f5" : "#ffffff",
              color: isBanned ? "#8e8e8e" : "#262626",
            }}
            title={isBanned ? "Account limited - cannot create posts" : ""}
          />
          {validatingVideo && (
            <div
              style={{
                color: "#0095f6",
                fontSize: "12px",
                marginTop: "4px",
                paddingLeft: "4px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔍</span>
              Checking if video is Christ-centered...
            </div>
          )}
          {youtubeError && (
            <div
              style={{
                color: "#c00",
                fontSize: "12px",
                marginTop: "4px",
                paddingLeft: "4px",
              }}
            >
              {youtubeError}
            </div>
          )}
        </div>
      ) : (
        !isBanned && (
          <div
            style={{
              padding: "12px",
              background: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#6c757d",
                marginBottom: "8px",
              }}
            >
              Want to share YouTube videos?
            </div>
            <button
              onClick={onRequestMediaPermission}
              data-testid="button-request-media"
              style={{
                background: "#0095f6",
                color: "#ffffff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Request Access
            </button>
          </div>
        )
      )}

      {/* Share/Update button */}
      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim() || isBanned || saving || validatingVideo}
        data-testid="button-submit"
        style={{
          width: "100%",
          background:
            title.trim() && content.trim() && !isBanned && !saving
              ? "#4285f4"
              : "#dbdbdb",
          color: "#ffffff",
          border: "none",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: 600,
          cursor:
            title.trim() && content.trim() && !isBanned && !saving
              ? "pointer"
              : "not-allowed",
        }}
        title={isBanned ? "Account limited - cannot create posts" : ""}
      >
        {saving
          ? "Saving..."
          : editingPost
          ? "Update Post"
          : "Share Post"}
      </button>
    </div>
  );
}
