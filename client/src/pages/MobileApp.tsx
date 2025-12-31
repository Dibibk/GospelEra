import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import {
  listPosts,
  createPost,
  updatePost,
  softDeletePost,
  searchPosts,
  getTopTags,
  fetchFeed,
} from "@/lib/posts";
import {
  listPrayerRequests,
  createPrayerRequest,
  commitToPray,
  confirmPrayed,
  getMyCommitments,
  getPrayerRequest,
} from "@/lib/prayer";
import { getProfilesByIds } from "@/lib/profiles";
import {
  toggleAmen,
  toggleBookmark,
  isBookmarked,
  getAmenInfo,
  listBookmarks,
} from "@/lib/engagement";
import {
  listComments,
  createComment,
  softDeleteComment,
  updateComment,
} from "@/lib/comments";
import { createReport } from "@/lib/reports";
import {
  checkMediaPermission,
  getCurrentRequestStatus,
} from "@/lib/mediaRequests";
import { validateAndNormalizeYouTubeUrl } from "../../../shared/youtube";
import { validateFaithContent } from "../../../shared/moderation";
import { supabase } from "@/lib/supabaseClient";
import { useRole } from "@/hooks/useRole";
import {
  subscribeToFeed,
  unsubscribeFromFeed,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  cleanupAllSubscriptions,
} from "@/lib/realtime";
import {
  isNativePlatform,
  initNativePushNotifications,
} from "@/lib/pushNotifications";
import { getTopPrayerWarriors } from "@/lib/leaderboard";
import prayIconPath from "@assets/pray_7139204_1765217804830.png";
import {
  updateUserSettings,
  getUserSettings,
  upsertMyProfile,
  ensureMyProfile,
} from "@/lib/profiles";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PrayerNewMobile } from "@/components/PrayerNewMobile";
import { SupporterMobile } from "@/components/SupporterMobile";
import { EditProfileMobile } from "@/components/EditProfileMobile";
import { SettingsMobile } from "@/components/SettingsMobile";
import { CommentInputMobile } from "@/components/CommentInputMobile";
import { CommunityGuidelinesMobile } from "@/components/CommunityGuidelinesMobile";
import { HelpMobile } from "@/components/HelpMobile";
import { AdminReportsMobile } from "@/components/AdminReportsMobile";
import { MediaRequestsMobile } from "@/components/MediaRequestsMobile";
import { AdminSupportMobile } from "@/components/AdminSupportMobile";
import { ProfileMobile } from "@/components/ProfileMobile";
import { CreatePostMobile } from "@/components/CreatePostMobile";
import { PrayerBrowseMobile } from "@/components/PrayerBrowseMobile";
import { PrayerDetailMobile } from "@/components/PrayerDetailMobile";
import { NotificationsMobile } from "@/components/NotificationsMobile";
import { PrayerMyMobile } from "@/components/PrayerMyMobile";
import { PrayerLeaderboardMobile } from "@/components/PrayerLeaderboardMobile";
import { User } from "lucide-react";
import { PrayerDetailView } from "@/components/PrayerDetailView";
import { FullLeaderboardView } from "@/components/FullLeaderboardView";
import { MobilePublicProfilePage } from "@/components/MobilePublicProfilePage";
import { MobileSavedPostsPage } from "@/components/MobileSavedPostsPage";
import { LoginMobile } from "@/components/LoginMobile";
import { PasswordUpdateMobile } from "@/components/PasswordUpdateMobile";
import { GuidelinesAcceptanceModal } from "@/components/GuidelinesAcceptanceModal";
import { getDailyVerse } from "@/lib/scripture";
import {
  createDonationPledge,
  validateDonationAmount,
  formatCurrency,
  createStripeCheckout,
} from "@/lib/donations";
import { PAYMENTS } from "@/config/payments";
import { EmbedCard } from "@/components/EmbedCard";
import { Flag, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
// at top of MobileApp.tsx

// focus helpers (no hooks here)
const isEditableEl = (el: any) =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable ||
    el.getAttribute?.("role") === "textbox");

const keepFocus = (
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
) => {
  const node = ref.current;
  if (!node) return;
  if (document.activeElement !== node) {
    node.focus({ preventScroll: true });
    try {
      node.setSelectionRange?.(node.value.length, node.value.length);
    } catch {}
  }
};

const stopIfTextField = (e: React.SyntheticEvent) => {
  const t = e.target as HTMLElement | null;
  const isTextField = !!t?.closest(
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable="true"], [role="textbox"]',
  );
  if (isTextField) e.stopPropagation();
};

// YouTube video ID extractor
function getYoutubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const id =
      u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
    return id || null;
  } catch {
    return null;
  }
}

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

// Helper to get display name with proper fallbacks (handles null, undefined, empty strings)
function getDisplayName(profile: any, fallbackEmail?: string | null): string {
  // Check if profile has a valid display_name (not null, undefined, or empty/whitespace)
  const displayName = profile?.display_name?.trim();
  if (displayName) {
    return displayName;
  }

  // Try email username as fallback
  const email = profile?.email || fallbackEmail;
  if (email) {
    const username = email.split("@")[0];
    if (username) {
      return username;
    }
  }

  // Ultimate fallback
  return "Gospel User";
}

// Module-level style constants to prevent recreation on each render
const STYLES = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: "#ffffff",
    color: "#262626",
    minHeight: "100dvh",
    maxWidth: "414px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    fontSize: "14px",
    position: "relative" as const,
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
    paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
    paddingRight: "16px",
    paddingBottom: "12px",
    paddingLeft: "16px",
    minHeight: "calc(48px + env(safe-area-inset-top, 0px))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky" as const,
    top: 0,
    zIndex: 1100,
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    background: "#ffffff",
    paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
  },
  bottomNav: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "414px",
    height: "calc(56px + env(safe-area-inset-bottom, 0px))",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    background: "#ffffff",
    borderTop: "1px solid #dbdbdb",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: "8px",
    paddingLeft: "16px",
    paddingRight: "16px",
    zIndex: 1100,
  },
  searchContainer: {
    padding: "12px 16px",
    background: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
  },
  searchInput: {
    width: "100%",
    height: "36px",
    background: "#f2f2f2",
    border: "none",
    borderRadius: "18px",
    padding: "0 16px 0 40px",
    fontSize: "14px",
    color: "#262626",
    outline: "none",
  },
  searchIconWrapper: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    zIndex: 1,
  },
  verseContainer: {
    background: "#ffffff",
    padding: "12px 16px",
    borderBottom: "1px solid #dbdbdb",
    textAlign: "center" as const,
  },
  verseText: {
    fontSize: "13px",
    color: "#262626",
    fontStyle: "italic" as const,
    lineHeight: 1.4,
    marginBottom: "4px",
  },
  verseReference: {
    fontSize: "11px",
    color: "#8e8e8e",
    fontWeight: 600,
  },
  verseLoading: {
    fontSize: "12px",
    color: "#8e8e8e",
  },
  // Post styles
  postContainer: {
    background: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
  },
  postHeader: {
    display: "flex" as const,
    alignItems: "center",
    padding: "12px 16px",
  },
  postAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#dbdbdb",
    display: "flex" as const,
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    marginRight: "12px",
    border: "1px solid #dbdbdb",
    color: "#8e8e8e",
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#262626",
  },
  postTimeAgo: {
    fontSize: "12px",
    color: "#8e8e8e",
  },
  postContent: {
    padding: "0 16px 8px",
  },
  postTitle: {
    fontWeight: 600,
    marginBottom: "8px",
    color: "#262626",
  },
  postText: {
    fontSize: "14px",
    lineHeight: 1.4,
    color: "#262626",
    marginBottom: "8px",
  },
  postActions: {
    display: "flex" as const,
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderTop: "1px solid #efefef",
  },
  postActionsLeft: {
    display: "flex" as const,
    gap: "16px",
  },
  actionButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex" as const,
    alignItems: "center",
    gap: "4px",
  },
  skeletonPost: {
    background: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
  },
  skeletonHeader: {
    padding: "12px 16px",
    display: "flex" as const,
    alignItems: "center",
  },
  skeletonAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#f0f0f0",
    marginRight: "12px",
  },
  skeletonText: {
    height: "12px",
    background: "#f0f0f0",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  skeletonImage: {
    width: "100%",
    height: "200px",
    background: "#f0f0f0",
  },
};

// Complete Instagram-style Gospel Era Mobile App with Real API Integration
export default function MobileApp() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isBanned, isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [engagementData, setEngagementData] = useState<Map<number, any>>(
    new Map(),
  );
  const [postComments, setPostComments] = useState<{ [key: string]: any[] }>(
    {},
  );
  const [commentForms, setCommentForms] = useState<{ [key: string]: boolean }>(
    {},
  );
  // Enhanced search state - matching web app functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [topTags, setTopTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prayerNextCursor, setPrayerNextCursor] = useState<number | null>(null);
  const [loadingMorePrayers, setLoadingMorePrayers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committingToId, setCommittingToId] = useState<number | null>(null);
  // Prayer System Internal Routing
  const [prayerRoute, setPrayerRoute] = useState<
    "browse" | "new" | "detail" | "my" | "leaderboard"
  >("browse");
  const [previousPrayerRoute, setPreviousPrayerRoute] = useState<
    "browse" | "my"
  >("browse");
  const [prayerRefreshTrigger, setPrayerRefreshTrigger] = useState(0);
  const [prayerDetailId, setPrayerDetailId] = useState<number | null>(null);
  const [selectedPrayerDetail, setSelectedPrayerDetail] = useState<any>(null);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [prayedJustNow, setPrayedJustNow] = useState<Set<number>>(new Set());
  const [myCommitments, setMyCommitments] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myPrayersTab, setMyPrayersTab] = useState<"commitments" | "requests">(
    "commitments",
  );
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);

  // Enhanced post creation states
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false);

  // Additional engagement states needed for web app parity
  const [editingPost, setEditingPost] = useState<any>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null,
  );
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    targetType: "post" | "comment";
    targetId: string;
    reason: string;
    selectedReason: string;
  }>({
    isOpen: false,
    targetType: "post",
    targetId: "",
    reason: "",
    selectedReason: "",
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  // Daily scripture state
  const [dailyVerse, setDailyVerse] = useState<{
    reference: string;
    text: string;
  } | null>(null);

  // Three dots menu state
  const [showPostMenu, setShowPostMenu] = useState<{
    [postId: number]: boolean;
  }>({});
  const isLoading = useRef(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // Banned user modal state
  const [showBannedModal, setShowBannedModal] = useState(false);
  const bannedModalShownRef = useRef(false);

  // Guidelines acceptance state
  const [guidelinesAccepted, setGuidelinesAccepted] = useState<boolean | null>(
    null,
  );
  const [checkingGuidelines, setCheckingGuidelines] = useState(true);

  // Show banned modal when user is banned
  useEffect(() => {
    if (isBanned && user && !bannedModalShownRef.current) {
      bannedModalShownRef.current = true;
      setShowBannedModal(true);
    }
  }, [isBanned, user]);

  // Check guidelines acceptance status on login
  useEffect(() => {
    if (!user) {
      setGuidelinesAccepted(null);
      setCheckingGuidelines(false);
      return;
    }

    const checkGuidelines = async () => {
      setCheckingGuidelines(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setGuidelinesAccepted(false);
          return;
        }

        const baseUrl = Capacitor.isNativePlatform()
          ? "https://gospel-era.replit.app"
          : "";
        const response = await fetch(`${baseUrl}/api/guidelines/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setGuidelinesAccepted(data.accepted);
        } else {
          setGuidelinesAccepted(false);
        }
      } catch (error) {
        console.error("Error checking guidelines status:", error);
        setGuidelinesAccepted(false);
      } finally {
        setCheckingGuidelines(false);
      }
    };

    checkGuidelines();
  }, [user]);

  // Handle guidelines acceptance
  const handleAcceptGuidelines = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No session");
      }

      const baseUrl = Capacitor.isNativePlatform()
        ? "https://gospel-era.replit.app"
        : "";
      const response = await fetch(`${baseUrl}/api/guidelines/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setGuidelinesAccepted(true);
      } else {
        throw new Error("Failed to accept guidelines");
      }
    } catch (error) {
      console.error("Error accepting guidelines:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("🔍 MobileApp fetchData effect", {
      hasUser: !!user,
      postsLength: posts.length,
    });
    if (!user) {
      console.log("🔍 No user, skipping fetchData");
      setLoading(false);
      return;
    }
    if (posts.length > 0) {
      console.log("🔍 Posts already loaded, skipping fetchData");
      return; // already loaded
    }

    console.log("🔍 Calling fetchData now...");
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await fetchData();
        console.log("🔍 fetchData completed");
      } catch (err) {
        console.error("🔍 fetchData error:", err);
      } finally {
        if (!cancelled) {
          console.log("🔍 Setting loading to FALSE");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, posts.length]);

  // Check media permission separately so it runs even when posts are already loaded
  useEffect(() => {
    if (user) {
      checkUserMediaPermission();
    }
  }, [user, isAdmin]);

  // Infinite scroll observer for loading more posts
  useEffect(() => {
    if (!loadMoreSentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          nextCursor &&
          !searchQuery &&
          activeTab === 0
        ) {
          loadMorePosts();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(loadMoreSentinelRef.current);

    return () => observer.disconnect();
  }, [nextCursor, loadingMore, searchQuery, activeTab]);

  // Load daily verse separately to ensure it always loads
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        await loadDailyVerse();
      } catch (err) {
        console.error("Failed to load daily verse:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch unread notification count
  const fetchNotificationCount = async () => {
    if (!user) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const baseUrl = Capacitor.isNativePlatform()
        ? "https://gospel-era.replit.app"
        : "";
      const response = await fetch(
        `${baseUrl}/api/notifications/unread-count`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadNotificationCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Load notification count
  useEffect(() => {
    if (!user) return;
    fetchNotificationCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to feed changes for new posts
    subscribeToFeed();

    // Subscribe to notifications for this user
    subscribeToNotifications(user.id);

    return () => {
      cleanupAllSubscriptions();
    };
  }, [user]);

  // Initialize native push notifications for iOS/Android
  useEffect(() => {
    if (!user) return;
    if (!isNativePlatform()) return;

    initNativePushNotifications();
  }, [user]);

  // Load daily scripture verse
  const loadDailyVerse = async () => {
    try {
      const verse = await getDailyVerse();
      setDailyVerse(verse);
    } catch (error) {
      console.error("Failed to load daily verse:", error);
    }
  };

  // Toggle post menu dropdown
  const togglePostMenu = useCallback((postId: number) => {
    setShowPostMenu((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }, []);

  // Close all post menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowPostMenu({});
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Consolidated prayer data fetching function
  const refreshAllPrayerData = useCallback(async () => {
    if (!user) return;
    console.log("🔄 refreshAllPrayerData called...");
    try {
      const { listPrayerRequests, getMyCommitments, getMyRequests } =
        await import("../lib/prayer");
      const [prayerResult, commitmentsResult, requestsResult] =
        await Promise.all([
          listPrayerRequests({ limit: 20 }),
          getMyCommitments(),
          getMyRequests(),
        ]);

      if (prayerResult.data) {
        setPrayerRequests(prayerResult.data);
        setPrayerNextCursor(prayerResult.nextCursor ?? null);
      }

      if (commitmentsResult.data) {
        setMyCommitments((prev) => {
          const serverIds = new Set(
            commitmentsResult.data!.map((c: any) => c.request_id),
          );
          const localOnly = prev.filter((c) => !serverIds.has(c.request_id));
          return [...commitmentsResult.data!, ...localOnly];
        });
      }

      if (requestsResult.data) {
        setMyRequests(requestsResult.data);
      }
    } catch (error) {
      console.error("Error refreshing prayer data:", error);
    }
  }, [user]);

  // Refresh prayer data when navigating to Prayer tab or back to browse view
  useEffect(() => {
    if (activeTab !== 2 || !user) return; // Tab 2 is Prayer
    if (prayerRoute !== "browse") return;

    // Force fresh fetch by clearing state first
    const forceRefreshPrayerData = async () => {
      console.log("🔄 Force refreshing prayer data (clearing state first)...");
      setPrayerRequests([]); // Clear to force re-render with fresh data
      
      try {
        const { listPrayerRequests, getMyCommitments, getMyRequests } =
          await import("../lib/prayer");
        const [prayerResult, commitmentsResult, requestsResult] =
          await Promise.all([
            listPrayerRequests({ limit: 20 }),
            getMyCommitments(),
            getMyRequests(),
          ]);

        if (prayerResult.data) {
          console.log("🔄 Setting fresh prayer data:", prayerResult.data.length, "requests");
          setPrayerRequests(prayerResult.data);
          setPrayerNextCursor(prayerResult.nextCursor ?? null);
        }

        if (commitmentsResult.data) {
          setMyCommitments(commitmentsResult.data);
        }

        if (requestsResult.data) {
          setMyRequests(requestsResult.data);
        }
      } catch (error) {
        console.error("Error force refreshing prayer data:", error);
      }
    };

    forceRefreshPrayerData();
  }, [
    activeTab,
    prayerRoute,
    user,
    prayerRefreshTrigger,
  ]);

  // Open report modal for post
  const openReportModal = (postId: number) => {
    setReportModal({
      isOpen: true,
      targetType: "post",
      targetId: postId.toString(),
      reason: "",
      selectedReason: "",
    });
    setShowPostMenu({}); // Close all menus
  };

  // Check media permission for current user
  const checkUserMediaPermission = async () => {
    if (!user) return;

    setIsCheckingPermission(true);
    try {
      // Admins always have media permission
      if (isAdmin) {
        console.log("🎥 Media permission: Admin user, granting access");
        setHasMediaPermission(true);
        setIsCheckingPermission(false);
        return;
      }

      console.log("🎥 Media permission: Checking for user", user.id);
      const result = await checkMediaPermission(user.id);
      console.log("🎥 Media permission result:", result);
      setHasMediaPermission(result.hasPermission);
    } catch (error) {
      console.error("Error checking media permission:", error);
      setHasMediaPermission(false);
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use optimized feed endpoint - combines posts + profiles + engagement in ONE request
      console.log("🔍 fetchData: calling fetchFeed (optimized)...");
      const feedResult = await fetchFeed({ limit: 20 });
      console.log("🔍 fetchData: fetchFeed result", {
        hasData: !!feedResult.data,
        count: feedResult.data?.posts?.length,
      });

      if (feedResult.data) {
        // Set posts directly from feed
        setPosts(feedResult.data.posts);
        console.log(
          "🔍 fetchData: setPosts called with",
          feedResult.data.posts.length,
          "posts",
        );

        // Set nextCursor for infinite scroll pagination
        setNextCursor(feedResult.data.nextCursor ?? null);
        console.log(
          "🔍 fetchData: nextCursor set to",
          feedResult.data.nextCursor,
        );

        // Set profiles from feed response (already a map)
        if (feedResult.data.profiles) {
          const profilesMap = new Map(Object.entries(feedResult.data.profiles));
          setProfiles(
            (prev) =>
              new Map([...Array.from(prev), ...Array.from(profilesMap)]),
          );
        }

        // Set engagement data from feed response
        if (feedResult.data.engagement) {
          const engagementMap = new Map();
          for (const [postId, data] of Object.entries(
            feedResult.data.engagement,
          )) {
            engagementMap.set(parseInt(postId), {
              isBookmarked: false, // Will be loaded separately if needed
              hasAmened: (data as any).userAmened || false,
              amenCount: (data as any).amenCount || 0,
              commentCount: (data as any).commentCount || 0,
            });
          }
          setEngagementData(
            (prev) =>
              new Map([...Array.from(prev), ...Array.from(engagementMap)]),
          );
        }
      }

      // Fetch real prayer requests from API (in parallel)
      const prayerResult = await listPrayerRequests({ limit: 20 });
      console.log("🙏 fetchData: prayerResult", {
        hasData: !!prayerResult.data,
        count: prayerResult.data?.length,
        error: prayerResult.error,
      });
      if (prayerResult.data) {
        setPrayerRequests(prayerResult.data);
        setPrayerNextCursor(prayerResult.nextCursor ?? null);
        console.log(
          "🙏 fetchData: setPrayerRequests called with",
          prayerResult.data.length,
          "requests, nextCursor:",
          prayerResult.nextCursor,
        );
      }

      // Fetch user's prayer commitments and requests if authenticated
      if (user?.id) {
        try {
          const { getMyCommitments, getMyRequests } = await import(
            "../lib/prayer"
          );
          const [commitmentsResult, requestsResult] = await Promise.all([
            getMyCommitments(),
            getMyRequests(),
          ]);

          if (commitmentsResult.data) {
            // MERGE server data with existing local commitments to preserve optimistic updates
            setMyCommitments((prev) => {
              const serverIds = new Set(
                commitmentsResult.data!.map((c: any) => c.request_id),
              );
              // Keep local commitments that aren't in server response (optimistic updates)
              const localOnly = prev.filter(
                (c) => !serverIds.has(c.request_id),
              );
              // Server data takes precedence for items that exist on both
              return [...commitmentsResult.data!, ...localOnly];
            });
          }

          if (requestsResult.data) {
            setMyRequests(requestsResult.data);
          }
        } catch (error) {
          console.error("Error fetching user prayer data:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load more posts for infinite scroll
  const loadMorePosts = async () => {
    if (loadingMore || !nextCursor || searchQuery) return;

    setLoadingMore(true);
    try {
      const feedResult = await fetchFeed({ limit: 20, fromId: nextCursor });

      if (feedResult.data) {
        // Always update nextCursor to stop pagination when no more posts
        setNextCursor(feedResult.data.nextCursor ?? null);

        if (feedResult.data.posts.length > 0) {
          // Append new posts to existing posts
          setPosts((prev) => [...prev, ...feedResult.data!.posts]);

          // Merge profiles
          if (feedResult.data.profiles) {
            const profilesMap = new Map(
              Object.entries(feedResult.data.profiles),
            );
            setProfiles(
              (prev) =>
                new Map([...Array.from(prev), ...Array.from(profilesMap)]),
            );
          }

          // Merge engagement data
          if (feedResult.data.engagement) {
            const engagementMap = new Map();
            for (const [postId, data] of Object.entries(
              feedResult.data.engagement,
            )) {
              engagementMap.set(parseInt(postId), {
                isBookmarked: false,
                hasAmened: (data as any).userAmened || false,
                amenCount: (data as any).amenCount || 0,
                commentCount: (data as any).commentCount || 0,
              });
            }
            setEngagementData(
              (prev) =>
                new Map([...Array.from(prev), ...Array.from(engagementMap)]),
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load more prayer requests for infinite scroll
  const loadMorePrayerRequests = async () => {
    if (loadingMorePrayers || !prayerNextCursor) return;

    setLoadingMorePrayers(true);
    try {
      const prayerResult = await listPrayerRequests({
        limit: 20,
        cursor: prayerNextCursor,
      });

      if (prayerResult.data) {
        // Always update nextCursor to stop pagination when no more requests
        setPrayerNextCursor(prayerResult.nextCursor ?? null);

        if (prayerResult.data.length > 0) {
          // Append new prayer requests to existing ones
          setPrayerRequests((prev) => [...prev, ...prayerResult.data!]);
        }
      }
    } catch (error) {
      console.error("Error loading more prayer requests:", error);
    } finally {
      setLoadingMorePrayers(false);
    }
  };

  // Pull-to-refresh handler
  const handlePullRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  // Pull-to-refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = feedContainerRef.current;
    if (!container || container.scrollTop > 0) {
      pullStartY.current = null;
      return;
    }
    pullStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === null || isRefreshing) return;

    const container = feedContainerRef.current;
    if (!container || container.scrollTop > 0) {
      pullStartY.current = null;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;

    if (diff > 0) {
      const resistance = 0.4;
      setPullDistance(Math.min(diff * resistance, 80));
    }
  };

  const handleTouchEnd = () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;

    if (pullDistance >= 60 && !isRefreshing) {
      handlePullRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const loadProfiles = async (authorIds: string[]) => {
    try {
      const { data: profileMap } = await getProfilesByIds(authorIds);
      if (profileMap) {
        setProfiles(
          (prev) => new Map([...Array.from(prev), ...Array.from(profileMap)]),
        );
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadEngagementData = async (postIds: number[]) => {
    try {
      const engagementMap = new Map();

      // Get Amen info for all posts
      const { data: amenData } = await getAmenInfo(postIds);

      // Batch load bookmarks to reduce API calls
      const bookmarkPromises = postIds.map(async (postId) => {
        try {
          const { isBookmarked: bookmarked } = await isBookmarked(postId);
          return { postId, bookmarked };
        } catch {
          return { postId, bookmarked: false };
        }
      });

      const bookmarkResults = await Promise.all(bookmarkPromises);

      for (const { postId, bookmarked } of bookmarkResults) {
        const amenInfo = amenData?.[postId] || { count: 0, mine: false };

        engagementMap.set(postId, {
          isBookmarked: bookmarked,
          hasAmened: amenInfo.mine,
          amenCount: amenInfo.count,
        });
      }
      setEngagementData(
        (prev) => new Map([...Array.from(prev), ...Array.from(engagementMap)]),
      );
    } catch (error) {
      console.error("Error loading engagement data:", error);
    }
  };

  const handleCommitToPray = async (requestId: number) => {
    if (!user || isBanned) return;

    setCommittingToId(requestId);

    try {
      const { data, error } = await commitToPray(requestId);

      if (error) {
        // Show spam-specific error messages
        showToast(error, "error");
      } else {
        // Show spam warning if present (non-blocking)
        if (data?.spamWarning) {
          showToast(data.spamWarning, "warning");
        } else {
          showToast("✓ Committed to pray", "success");
        }

        // Immediately add the new commitment to myCommitments state
        if (data) {
          // ✅ Immediately add/update the commitment in myCommitments state (even if API returns no data)
          setMyCommitments((prev) => {
            const existing = prev.find((c) => c.request_id === requestId);

            const base = {
              request_id: requestId,
              warrior: user.id,
              status: "committed",
              committed_at: new Date().toISOString(),
            };

            const merged = {
              ...(existing || {}),
              ...base,
              ...(data || {}), // if API returned extra fields, keep them
            };

            return [merged, ...prev.filter((c) => c.request_id !== requestId)];
          });
        }
        await refreshCommitmentForPrayer(requestId);

        // Update prayer request stats in the list
        setPrayerRequests((prev) =>
          prev.map((p) => {
            if (p.id !== requestId) return p;

            const alreadyHad = myCommitments.some(
              (c) => c.request_id === requestId,
            );
            if (alreadyHad) return p; // don't double-increment

            return {
              ...p,
              prayer_stats: {
                ...p.prayer_stats,
                committed_count: (p.prayer_stats?.committed_count || 0) + 1,
                total_warriors: (p.prayer_stats?.total_warriors || 0) + 1,
              },
            };
          }),
        );
        if (selectedPrayerDetail?.id === requestId) {
          setSelectedPrayerDetail((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              prayer_stats: {
                ...prev.prayer_stats,
                committed_count: (prev.prayer_stats?.committed_count || 0) + 1,
                total_warriors: (prev.prayer_stats?.total_warriors || 0) + 1,
              },
            };
          });
        }

        // Also refresh the selected prayer detail if viewing this request
        if (selectedPrayerDetail && selectedPrayerDetail.id === requestId) {
          const { data: refreshedPrayer } = await getPrayerRequest(requestId);
          if (refreshedPrayer) {
            setSelectedPrayerDetail(refreshedPrayer);
          }
        }
      }
    } catch (error) {
      console.error("Error committing to prayer:", error);
      showToast("Failed to commit to prayer. Please try again.", "error");
    } finally {
      setCommittingToId(null);
    }
  };

  const handleConfirmPrayed = async (requestId: number) => {
    if (!user || isBanned) return;

    setConfirmingId(requestId);

    try {
      const { error } = await confirmPrayed(requestId);
      if (error) {
        alert("Failed to confirm prayer. Please try again.");
      } else {
        // Show "Prayed just now" state temporarily
        setPrayedJustNow((prev) => new Set([...prev, requestId]));

        // Remove the "just now" state after 3 seconds
        setTimeout(() => {
          setPrayedJustNow((prev) => {
            const newSet = new Set(prev);
            newSet.delete(requestId);
            return newSet;
          });
        }, 3000);

        // Immediately update the commitment status to 'prayed' in myCommitments
        setMyCommitments((prev) =>
          prev.map((c) =>
            c.request_id === requestId
              ? { ...c, status: "prayed", prayed_at: new Date().toISOString() }
              : c,
          ),
        );

        // Update prayer request stats in the list
        setPrayerRequests((prev) =>
          prev.map((p) =>
            p.id === requestId
              ? {
                  ...p,
                  prayer_stats: {
                    ...p.prayer_stats,
                    committed_count: Math.max(
                      0,
                      (p.prayer_stats?.committed_count || 0) - 1,
                    ),
                    prayed_count: (p.prayer_stats?.prayed_count || 0) + 1,
                  },
                }
              : p,
          ),
        );
      }
    } catch (error) {
      console.error("Error confirming prayer:", error);
      alert("Failed to confirm prayer. Please try again.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePrayerClick = async (prayerId: number) => {
    try {
      const result = await getPrayerRequest(prayerId);
      if (result.data) {
        setSelectedPrayerId(prayerId);
        setSelectedPrayerDetail(result.data);
      }
    } catch (error) {
      console.error("Error fetching prayer details:", error);
    }
  };

  // Get real leaderboard data
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  // User profile and dropdown state
  const [userProfile, setUserProfile] = useState<{
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    role?: string;
    followers_count?: number;
    following_count?: number;
  } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingPostNavigation, setPendingPostNavigation] = useState<
    number | null
  >(null);
  // Mobile page states
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMobileCommunityGuidelines, setShowMobileCommunityGuidelines] =
    useState(false);

  // Mobile Profile state
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  // Public profile (viewing other users) Dibi
  const [showMobilePublicProfile, setShowMobilePublicProfile] = useState(false);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(
    null,
  );

  const [showMobileEditProfile, setShowMobileEditProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Profile form state
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [showMobileSavedPosts, setShowMobileSavedPosts] = useState(false);
  const [showMobileSupporter, setShowMobileSupporter] = useState(false);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);

  // Function to reset all modal/page states
  const resetAllModalStates = () => {
    setShowMobileProfile(false);
    setShowMobileEditProfile(false);
    setShowMobileSettings(false);
    setShowMobileSavedPosts(false);
    setShowMobileCommunityGuidelines(false);
    setShowMobileSupporter(false);
    setShowMobileHelp(false);
    setShowMobileReviewReports(false);
    setShowMobileMediaRequests(false);
    setShowMobileAdminSupport(false);
    setShowUserDropdown(false);
    setShowMobilePublicProfile(false); //Dibi
    setPublicProfileUserId(null); //Dibi
    setShowPasswordUpdate(false);
  };

  // Check for password reset on mount
  useEffect(() => {
    const checkPasswordReset = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("reset") === "true") {
        // Check if user has a session from password reset flow
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setShowPasswordUpdate(true);
          // Remove the parameter from URL
          window.history.replaceState({}, "", "/mobile");
        }
      }
    };
    checkPasswordReset();
  }, []);
  // Open another user's public profile (mobile) Dibi
  const openPublicProfile = (userId: string) => {
    if (!userId) return;
    resetAllModalStates();
    setPublicProfileUserId(userId);
    setShowMobilePublicProfile(true);
  };

  const [showMobileHelp, setShowMobileHelp] = useState(false);

  // Admin page states
  const [showMobileReviewReports, setShowMobileReviewReports] = useState(false);
  const [showMobileMediaRequests, setShowMobileMediaRequests] = useState(false);
  const [showMobileAdminSupport, setShowMobileAdminSupport] = useState(false);

  // Debounced search effect - matching web app
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400); // 400ms debounce like web app

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search mode effect
  useEffect(() => {
    setIsSearchMode(searchQuery.length > 0 || selectedTags.length > 0);
  }, [searchQuery, selectedTags]);

  // Handle pending post navigation from notifications
  useEffect(() => {
    if (pendingPostNavigation !== null && !loading) {
      // Wait a tick for the DOM to update
      setTimeout(() => {
        const postElement = document.getElementById(
          `post-${pendingPostNavigation}`,
        );
        if (postElement) {
          postElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Open the comment section for this post
          setCommentForms((prev) => ({
            ...prev,
            [pendingPostNavigation]: true,
          }));
          // Load comments if not already loaded
          if (!postComments[pendingPostNavigation]) {
            loadComments(pendingPostNavigation);
          }
        }
        setPendingPostNavigation(null);
      }, 300);
    }
  }, [pendingPostNavigation, loading, postComments]);

  // Handle search functionality - matching web app
  const handleSearch = async (fromId?: number) => {
    if (!debouncedQuery && selectedTags.length === 0) {
      return;
    }

    try {
      if (!fromId) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data, error } = await searchPosts({
        query: debouncedQuery,
        tags: selectedTags,
        cursor: fromId
          ? { created_at: new Date().toISOString(), id: fromId }
          : undefined,
        limit: 10,
      });

      if (data && !error) {
        const posts = data.items || [];
        if (!fromId) {
          setPosts(posts);
        } else {
          setPosts((prev) => [...prev, ...posts]);
        }
        setNextCursor(data.nextCursor?.id || null);

        // Load profiles and engagement data for search results
        const authorIds = [
          ...new Set(posts.map((post: any) => post.author_id)),
        ];
        await Promise.all([
          loadProfilesForUsers(authorIds),
          loadEngagementDataForPosts(posts.map((post: any) => post.id)),
        ]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setError("Failed to search posts. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Helper functions for search
  const loadProfilesForUsers = async (userIds: string[]) => {
    try {
      const { data: profilesMap } = await getProfilesByIds(userIds);
      if (profilesMap) {
        setProfiles((prev) => new Map([...prev, ...profilesMap]));
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
    }
  };

  const loadEngagementDataForPosts = async (postIds: number[]) => {
    try {
      const [bookmarksResult, amenResult] = await Promise.all([
        Promise.all(postIds.map((id) => isBookmarked(id))),
        getAmenInfo(postIds),
      ]);

      setEngagementData((prev) => {
        const updated = new Map(prev);

        postIds.forEach((postId, index) => {
          const currentData = updated.get(postId) || {};

          if (!bookmarksResult[index]?.error) {
            currentData.isBookmarked = bookmarksResult[index].isBookmarked;
          }

          if (amenResult.data && amenResult.data[postId]) {
            currentData.amenCount = amenResult.data[postId].count;
            currentData.hasAmened = amenResult.data[postId].mine;
          }

          updated.set(postId, currentData);
        });

        return updated;
      });
    } catch (error) {
      console.error("Failed to load engagement data:", error);
    }
  };

  // Search effect - trigger search when query/tags change
  useEffect(() => {
    if (debouncedQuery || selectedTags.length > 0) {
      handleSearch();
    } else {
      fetchData();
    }
  }, [debouncedQuery, selectedTags]);

  // Load top tags
  useEffect(() => {
    const loadTopTags = async () => {
      try {
        setTagsLoading(true);
        const { data } = await getTopTags({ limit: 10 });
        if (data) {
          setTopTags(data);
        }
      } catch (error) {
        console.error("Failed to load top tags:", error);
      } finally {
        setTagsLoading(false);
      }
    };

    loadTopTags();
  }, []);

  // Fetch leaderboard data and user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leaderboard
        const leaderboardResult = await getTopPrayerWarriors({
          timeframe: "week",
          limit: 10,
        });
        if (leaderboardResult.data) {
          setLeaderboard(leaderboardResult.data);
        }

        // Fetch user profile - fix to get proper profile data
        if (user?.id) {
          try {
            const { data: profileData } = await ensureMyProfile();
            if (profileData) {
              setUserProfile(profileData);
            }
          } catch (error) {
            console.error("Error loading user profile:", error);
            // Fallback to basic profile info
            setUserProfile({
              display_name: user.email?.split("@")[0] || "Gospel User",
              avatar_url: "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  // Mobile Profile functions
  const loadMobileProfile = async () => {
    setProfileLoading(true);
    setProfileError("");

    try {
      console.log("Loading mobile profile... user:", user?.id);

      // Fallback: Use the userProfile if it exists
      if (userProfile && user) {
        console.log("Using existing userProfile:", userProfile);
        const fallbackProfile = {
          id: user.id,
          display_name: userProfile.display_name || user.email || "Gospel User",
          bio: userProfile.bio || "",
          avatar_url: userProfile.avatar_url || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        setEditDisplayName(fallbackProfile.display_name);
        setEditBio(fallbackProfile.bio);
        setEditAvatarUrl(fallbackProfile.avatar_url);
        setProfileLoading(false);
        return;
      }

      // Add timeout to prevent infinite loading
      const profilePromise = ensureMyProfile();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile loading timeout")), 5000),
      );

      const { data, error } = (await Promise.race([
        profilePromise,
        timeoutPromise,
      ])) as any;
      console.log("Profile result:", { data, error });

      if (error) {
        console.error("Profile error:", error);
        // Use fallback with user data
        if (user) {
          const fallbackProfile = {
            id: user.id,
            display_name: user.email || "Gospel User",
            bio: "",
            avatar_url: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          setEditDisplayName(fallbackProfile.display_name);
          setEditBio(fallbackProfile.bio);
          setEditAvatarUrl(fallbackProfile.avatar_url);
        } else {
          setProfileError((error as any).message || "Failed to load profile");
        }
      } else if (data) {
        console.log("Profile data loaded:", data);
        setProfile(data);
        setEditDisplayName(data.display_name || "");
        setEditBio(data.bio || "");
        setEditAvatarUrl(data.avatar_url || "");
      } else {
        console.log("No profile data returned, using fallback");
        if (user) {
          const fallbackProfile = {
            id: user.id,
            display_name: user.email || "Gospel User",
            bio: "",
            avatar_url: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          setEditDisplayName(fallbackProfile.display_name);
          setEditBio(fallbackProfile.bio);
          setEditAvatarUrl(fallbackProfile.avatar_url);
        } else {
          setProfileError("No profile data found");
        }
      }
    } catch (err) {
      console.error("Profile loading exception:", err);
      // Use fallback with user data
      if (user) {
        const fallbackProfile = {
          id: user.id,
          display_name: user.email || "Gospel User",
          bio: "",
          avatar_url: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        setEditDisplayName(fallbackProfile.display_name);
        setEditBio(fallbackProfile.bio);
        setEditAvatarUrl(fallbackProfile.avatar_url);
      } else {
        setProfileError((err as any).message || "Failed to load profile");
      }
    }

    setProfileLoading(false);
  };

  const handleProfileGetUploadParameters = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadURL } = await response.json();

    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  const handleProfileUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;

      if (uploadURL) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch("/api/avatar", {
          method: "PUT",
          headers,
          body: JSON.stringify({ avatarURL: uploadURL }),
        });

        if (response.ok) {
          const { objectPath } = await response.json();
          setEditAvatarUrl(objectPath);
          setProfileSuccess("Avatar updated successfully!");
          setTimeout(() => setProfileSuccess(""), 3000);
        } else {
          setProfileError("Failed to process uploaded image");
        }
      }
    }
  };

  const handleSaveMobileProfile = async () => {
    if (!editDisplayName.trim()) {
      setProfileError("Display name is required");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    const { data, error } = await upsertMyProfile({
      display_name: editDisplayName.trim(),
      bio: editBio.trim(),
      avatar_url: editAvatarUrl,
    });

    if (error) {
      setProfileError((error as any).message || "Failed to save profile");
    } else {
      setProfile(data);
      setShowMobileEditProfile(false);
      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    }

    setProfileSaving(false);
  };

  const handleCancelEditMobileProfile = () => {
    // Reset form to current profile data
    setEditDisplayName(profile?.display_name || "");
    setEditBio(profile?.bio || "");
    setEditAvatarUrl(profile?.avatar_url || "");
    setShowMobileEditProfile(false);
    setShowMobileProfile(true);
    setProfileError("");
  };

  const formatProfileDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      // Ignore clicks that began in form fields / editors
      if (
        target &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="textbox"], button',
        )
      ) {
        return;
      }

      if (showUserDropdown && !target?.closest(".user-dropdown-container")) {
        setShowUserDropdown(false);
      }
    };

    // IMPORTANT: capture phase so we win against other global listeners
    document.addEventListener("click", handleClickOutside, true);
    return () =>
      document.removeEventListener("click", handleClickOutside, true);
  }, [showUserDropdown]);

  const handleToggleAmen = async (postId: number) => {
    try {
      const result = await toggleAmen(postId);
      if (result.success) {
        // Update engagement data immediately for better UX
        const currentData = engagementData.get(postId) || {};
        const newData = {
          ...currentData,
          hasAmened: result.hasReacted,
          amenCount: result.hasReacted
            ? (currentData.amenCount || 0) + 1
            : Math.max(0, (currentData.amenCount || 0) - 1),
        };
        setEngagementData(
          (prev) => new Map([...Array.from(prev), [postId, newData]]),
        );

        // Refresh engagement data for this post to get accurate count
        await loadEngagementData([postId]);
      }
    } catch (error) {
      console.error("Error toggling amen:", error);
    }
  };

  const handleToggleBookmark = async (postId: number) => {
    try {
      await toggleBookmark(postId);
      // Refresh engagement data for this post
      await loadEngagementData([postId]);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const toggleCommentForm = useCallback((postId: number) => {
    setCommentForms((prev) => {
      const newState = { ...prev, [postId]: !prev[postId] };

      // Load comments when opening the form for the first time
      if (!prev[postId]) {
        setPostComments((prevComments) => {
          if (!prevComments[postId]) {
            loadComments(postId);
          }
          return prevComments;
        });
      }

      return newState;
    });
  }, []);

  const loadComments = async (postId: number) => {
    console.log("🔍 Loading comments for post:", postId);
    try {
      const { data, error } = await listComments({ postId, limit: 3 });
      console.log("📥 Load comments response:", { data, error });
      if (error) {
        console.error("Failed to load comments:", error);
      } else {
        const comments = data || [];
        setPostComments((prev) => ({ ...prev, [postId]: comments }));

        // Load comment author profiles
        if (comments.length > 0) {
          const authorIds = comments.map((comment) => comment.author_id);
          await loadProfiles(authorIds);
        }
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleCreateComment = async (postId: number, content: string) => {
    console.log("💬 Creating comment:", {
      postId,
      content,
      user: user?.id,
      isBanned,
    });

    if (!user) {
      throw new Error("You must be logged in to comment");
    }

    if (isBanned) {
      throw new Error("Your account is limited. You cannot post comments.");
    }

    if (!content) {
      throw new Error("Comment cannot be empty");
    }

    console.log("🚀 Calling createComment API:", { postId, content });
    const { data, error } = await createComment({ postId, content });
    console.log("📤 Create comment response:", { data, error });

    if (error) {
      throw new Error((error as any)?.message || "Failed to create comment");
    }

    // Reload comments after successful creation
    console.log("✅ Comment created successfully, reloading comments");
    await loadComments(postId);
  };

  const handleDeletePost = async (postId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this post? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingPostId(postId);
    const { error } = await softDeletePost(postId);

    if (error) {
      alert(
        `Failed to delete post: ${(error as any).message || "Unknown error"}`,
      );
    } else {
      alert("Post deleted successfully");
      fetchData(); // Reload posts
    }

    setDeletingPostId(null);
  };

  const handleEditPost = (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Set edit mode - CreatePostMobile component will populate its own form fields
    setEditingPostId(postId);
    setEditingPost(post);

    // Switch to Create tab for editing
    setActiveTab(1);
  };

  const handleReportPost = (postId: number) => {
    setReportModal({
      isOpen: true,
      targetType: "post",
      targetId: postId.toString(),
      reason: "",
      selectedReason: "",
    });
  };

  const handleReportComment = (commentId: number) => {
    setReportTarget({
      type: "comment",
      id: commentId.toString(),
    });
    setReportModalOpen(true);
  };

  const closeReportModal = () => {
    setReportModal({
      isOpen: false,
      targetType: "post",
      targetId: "",
      reason: "",
      selectedReason: "",
    });
  };

  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    setDeletingCommentId(commentId);

    const { error } = await softDeleteComment(commentId);

    if (error) {
      alert(`Failed to delete comment: ${(error as any).message}`);
    } else {
      // Reload comments to show updated list
      await loadComments(postId);
    }

    setDeletingCommentId(null);
  };

  const handleEditComment = (commentId: number, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleSaveEditComment = async (commentId: number, postId: number) => {
    if (!editingCommentContent.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    const { error } = await updateComment(
      commentId,
      editingCommentContent.trim(),
    );

    if (error) {
      alert(`Failed to update comment: ${(error as any).message}`);
    } else {
      // Reload comments to show updated list
      await loadComments(postId);
      setEditingCommentId(null);
      setEditingCommentContent("");
    }
  };

  const handleSubmitReport = async (reason: string) => {
    if (!reportTarget) return;

    try {
      const result = await createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason,
      });

      if (result.data) {
        alert(
          "Report submitted successfully. Thank you for helping keep our community safe.",
        );
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    }

    setReportModalOpen(false);
    setReportTarget(null);
  };

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

  // Home Feed Component
  function renderHomeFeed() {
    return (
      <div
        ref={feedContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Pull-to-refresh indicator */}
        <div
          style={{
            height:
              pullDistance > 0 || isRefreshing
                ? `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px`
                : "0px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition:
              pullDistance === 0 && !isRefreshing
                ? "height 0.2s ease-out"
                : "none",
            background: "#f5f5f5",
          }}
        >
          {isRefreshing ? (
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "3px solid #e0e0e0",
                borderTopColor: "#4285f4",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          ) : pullDistance > 0 ? (
            <div
              style={{
                color: "#8e8e8e",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform:
                    pullDistance >= 60 ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
              {pullDistance >= 60
                ? "Release to refresh"
                : "Pull down to refresh"}
            </div>
          ) : null}
        </div>

        {/* Search bar with clear button */}
        <div
          style={{
            ...STYLES.searchContainer,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <div
              style={STYLES.searchIconWrapper}
              onTouchEnd={(e) => {
                e.preventDefault();
                const searchInput = document.querySelector(
                  'input[placeholder*="Search"]',
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                }
              }}
              onClick={() => {
                const searchInput = document.querySelector(
                  'input[placeholder*="Search"]',
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                }
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8e8e8e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search Gospel Era"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={STYLES.searchInput}
            />
          </div>
          {(searchQuery || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedTags([]);
              }}
              style={{
                background: "#f0f0f0",
                border: "none",
                borderRadius: "16px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#262626",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Top Tags */}
        {topTags.length > 0 && (
          <div
            style={{
              padding: "12px 16px",
              background: "#ffffff",
              borderBottom: "1px solid #dbdbdb",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#262626",
              }}
            >
              Popular Topics
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {tagsLoading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#f0f0f0",
                          height: "28px",
                          width: "60px",
                          borderRadius: "16px",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    ))
                : topTags.map((tag, index) => {
                    const tagName = tag.tag || tag.tag_name || tag.name;
                    const isSelected = selectedTags.includes(tagName);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(
                              selectedTags.filter((t) => t !== tagName),
                            );
                          } else {
                            setSelectedTags([...selectedTags, tagName]);
                          }
                        }}
                        style={{
                          background: isSelected ? "#0095f6" : "#f0f0f0",
                          color: isSelected ? "#ffffff" : "#262626",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        #{tagName} ({tag.count})
                      </button>
                    );
                  })}
            </div>
          </div>
        )}

        {/* Daily scripture */}
        <div style={STYLES.verseContainer}>
          {dailyVerse ? (
            <>
              <div style={STYLES.verseText}>"{dailyVerse.text}"</div>
              <div style={STYLES.verseReference}>- {dailyVerse.reference}</div>
            </>
          ) : (
            <div style={STYLES.verseLoading}>Loading daily verse...</div>
          )}
        </div>

        {/* Posts feed */}
        {(() => {
          console.log("🔍 Posts feed render check:", {
            loading,
            postsLength: posts.length,
            postsArray: posts,
          });
          return loading;
        })() ? (
          Array(3)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                style={{
                  background: "#ffffff",
                  borderBottom: "1px solid #dbdbdb",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#f0f0f0",
                      marginRight: "12px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: "12px",
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        marginBottom: "8px",
                        width: "80px",
                      }}
                    />
                    <div
                      style={{
                        height: "12px",
                        background: "#f0f0f0",
                        borderRadius: "6px",
                        width: "60px",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    background: "#f0f0f0",
                  }}
                />
              </div>
            ))
        ) : posts.length > 0 ? (
          (() => {
            const filteredPosts = posts.filter(
              (post) =>
                !searchQuery ||
                post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.content?.toLowerCase().includes(searchQuery.toLowerCase()),
            );
            console.log("🔍 Rendering posts:", {
              totalPosts: posts.length,
              filteredPosts: filteredPosts.length,
              searchQuery,
            });
            return filteredPosts.map((post, index) => (
              <div
                key={post.id}
                id={`post-${post.id}`}
                style={{
                  background: "#ffffff",
                  borderBottom: "1px solid #dbdbdb",
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
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openPublicProfile(post.author_id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPublicProfile(post.author_id);
                    }} //dibi
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#dbdbdb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      marginRight: "12px",
                      border: "1px solid #dbdbdb",
                      color: "#8e8e8e",
                    }}
                  >
                    {getImageUrl(profiles.get(post.author_id)?.avatar_url) ? (
                      <img
                        src={
                          getImageUrl(profiles.get(post.author_id)?.avatar_url)!
                        }
                        alt="Avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <User size={18} color="#8e8e8e" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openPublicProfile(post.author_id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openPublicProfile(post.author_id);
                      }} //dibi
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#262626",
                      }}
                    >
                      {getDisplayName(profiles.get(post.author_id))}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      {formatTimeAgo(post.created_at)}
                    </div>
                  </div>
                  {/* Three dots menu */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePostMenu(post.id);
                      }}
                      style={{
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                        background: "none",
                        border: "none",
                        fontSize: "16px",
                        color: "#262626",
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "50%",
                      }}
                    >
                      ⋯
                    </button>

                    {/* Dropdown menu */}
                    {showPostMenu[post.id] && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: "0",
                          background: "#ffffff",
                          border: "1px solid #dbdbdb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 1000,
                          minWidth: "120px",
                        }}
                      >
                        <button
                          onClick={() => openReportModal(post.id)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontSize: "14px",
                            color: "#262626",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          Report
                        </button>

                        {/* Edit option for post owner only */}
                        {post.author_id === user?.id && (
                          <button
                            onClick={() => {
                              setShowPostMenu({});
                              handleEditPost(post.id);
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              fontSize: "14px",
                              color: "#0095f6",
                              cursor: "pointer",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            Edit
                          </button>
                        )}

                        {/* Delete option for post owner or admin */}
                        {(post.author_id === user?.id || isAdmin) && (
                          <button
                            onClick={() => {
                              setShowPostMenu({});
                              handleDeletePost(post.id);
                            }}
                            disabled={deletingPostId === post.id}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              fontSize: "14px",
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                          >
                            {deletingPostId === post.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post content */}
                <div style={{ padding: "0 16px 8px" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#262626",
                    }}
                  >
                    {post.title}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.4,
                      color: "#262626",
                      marginBottom: "8px",
                    }}
                  >
                    {post.content}
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      {post.tags.map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          style={{
                            background: "#f2f2f2",
                            color: "#4285f4",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <img
                        src={post.media_urls[0]}
                        alt="Post media"
                        style={{
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                        onError={(e: any) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* YouTube embed */}
                  {post.embed_url &&
                    (() => {
                      const videoId = getYoutubeEmbedSrc(post.embed_url);
                      if (!videoId) return null;
                      return (
                        <div style={{ marginBottom: "8px" }}>
                          <EmbedCard videoId={videoId} />
                        </div>
                      );
                    })()}
                </div>

                {/* Post actions - All 6 icons matching webapp */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderTop: "1px solid #efefef",
                  }}
                >
                  {/* Left side actions */}
                  <div style={{ display: "flex", gap: "16px" }}>
                    {/* Heart/Amen button with count */}
                    <button
                      onClick={() => handleToggleAmen(post.id)}
                      disabled={isBanned}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: isBanned ? "not-allowed" : "pointer",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: isBanned ? 0.5 : 1,
                      }}
                      title={
                        isBanned
                          ? "Account limited"
                          : engagementData.get(post.id)?.hasAmened
                            ? "Amen'd"
                            : "Amen"
                      }
                    >
                      <span
                        style={{
                          fontSize: "24px",
                          color: engagementData.get(post.id)?.hasAmened
                            ? "#ef4444"
                            : "#262626",
                        }}
                      >
                        {engagementData.get(post.id)?.hasAmened ? "♥" : "♡"}
                      </span>
                      {engagementData.get(post.id)?.amenCount > 0 && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#8e8e8e",
                            fontWeight: 500,
                          }}
                        >
                          {engagementData.get(post.id)?.amenCount}
                        </span>
                      )}
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={() => toggleCommentForm(post.id)}
                      disabled={isBanned}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: isBanned ? "not-allowed" : "pointer",
                        padding: "8px",
                        opacity: isBanned ? 0.5 : 1,
                      }}
                      title={isBanned ? "Account limited" : "Reply"}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ color: "#262626" }}
                      >
                        <path d="M21 15c0 1.1-.9 2-2 2H7l-4 4V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z" />
                      </svg>
                    </button>
                  </div>

                  {/* Right side actions */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    {/* Save/Bookmark button */}
                    <button
                      onClick={() => handleToggleBookmark(post.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                      }}
                      title={
                        engagementData.get(post.id)?.isBookmarked
                          ? "Saved"
                          : "Save"
                      }
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        style={{
                          color: engagementData.get(post.id)?.isBookmarked
                            ? "#262626"
                            : "#8e8e8e",
                        }}
                      >
                        <path
                          d={
                            engagementData.get(post.id)?.isBookmarked
                              ? "M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"
                              : "M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"
                          }
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Comments section */}
                {commentForms[post.id] && (
                  <div
                    style={{
                      borderTop: "1px solid #dbdbdb",
                      padding: "12px 16px",
                    }}
                  >
                    {/* Comment input */}
                    <CommentInputMobile
                      postId={post.id}
                      isBanned={isBanned}
                      onSubmit={handleCreateComment}
                    />

                    {/* Comments list */}
                    {postComments[post.id] &&
                      postComments[post.id].length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {postComments[post.id].map(
                            (comment, commentIndex) => (
                              <div
                                key={comment.id}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  marginBottom: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: "#dbdbdb",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    marginRight: "8px",
                                    flexShrink: 0,
                                    color: "#8e8e8e",
                                  }}
                                >
                                  {getImageUrl(
                                    profiles.get(comment.author_id)?.avatar_url,
                                  ) ? (
                                    <img
                                      src={
                                        getImageUrl(
                                          profiles.get(comment.author_id)
                                            ?.avatar_url,
                                        )!
                                      }
                                      alt="Avatar"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <User size={14} color="#8e8e8e" />
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "12px" }}>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: "#262626",
                                        marginRight: "6px",
                                      }}
                                    >
                                      {getDisplayName(
                                        profiles.get(comment.author_id),
                                      )}
                                    </span>
                                    {editingCommentId === comment.id ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          marginTop: "4px",
                                        }}
                                      >
                                        <input
                                          type="text"
                                          value={editingCommentContent}
                                          onChange={(e) =>
                                            setEditingCommentContent(
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            flex: 1,
                                            padding: "6px 10px",
                                            border: "1px solid #dbdbdb",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            outline: "none",
                                          }}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleSaveEditComment(
                                                comment.id,
                                                post.id,
                                              );
                                            } else if (e.key === "Escape") {
                                              handleCancelEditComment();
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() =>
                                            handleSaveEditComment(
                                              comment.id,
                                              post.id,
                                            )
                                          }
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#22c55e",
                                            cursor: "pointer",
                                            padding: "4px",
                                          }}
                                          title="Save"
                                        >
                                          <Check size={16} />
                                        </button>
                                        <button
                                          onClick={handleCancelEditComment}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            padding: "4px",
                                          }}
                                          title="Cancel"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ color: "#262626" }}>
                                        {comment.content}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#8e8e8e",
                                      marginTop: "2px",
                                      display: "flex",
                                      alignItems: "center",
                                      flexWrap: "nowrap",
                                    }}
                                  >
                                    <span style={{ flexShrink: 0 }}>
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        marginLeft: "auto",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {comment.author_id === user?.id &&
                                        editingCommentId !== comment.id && (
                                          <button
                                            onClick={() =>
                                              handleEditComment(
                                                comment.id,
                                                comment.content,
                                              )
                                            }
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "#3b82f6",
                                              cursor: "pointer",
                                              padding: "6px",
                                              minWidth: "32px",
                                              minHeight: "32px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              borderRadius: "50%",
                                            }}
                                            title="Edit comment"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                        )}
                                      <button
                                        onClick={() =>
                                          handleReportComment(comment.id)
                                        }
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#9ca3af",
                                          cursor: "pointer",
                                          padding: "6px",
                                          minWidth: "32px",
                                          minHeight: "32px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: "50%",
                                        }}
                                        title="Report comment"
                                      >
                                        <Flag size={14} />
                                      </button>
                                      {(comment.author_id === user?.id ||
                                        isAdmin) && (
                                        <button
                                          onClick={() =>
                                            handleDeleteComment(
                                              comment.id,
                                              post.id,
                                            )
                                          }
                                          disabled={
                                            deletingCommentId === comment.id
                                          }
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            padding: "6px",
                                            minWidth: "32px",
                                            minHeight: "32px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "50%",
                                            opacity:
                                              deletingCommentId === comment.id
                                                ? 0.5
                                                : 1,
                                          }}
                                          title="Delete comment"
                                        >
                                          {deletingCommentId === comment.id ? (
                                            <Loader2
                                              size={14}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Trash2 size={14} />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                )}

                {/* Post timestamp */}
                <div
                  style={{
                    padding: "0 16px 12px",
                    fontSize: "10px",
                    color: "#8e8e8e",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {formatTimeAgo(post.created_at).toUpperCase()}
                </div>
              </div>
            ));
          })()
        ) : (
          <div
            style={{
              background: "#ffffff",
              padding: "40px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📖</div>
            <div
              style={{ fontWeight: 600, marginBottom: "8px", color: "#262626" }}
            >
              Welcome to Gospel Era
            </div>
            <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
              Share your faith and grow together
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel and loading indicator */}
        {posts.length > 0 && !searchQuery && (
          <>
            <div ref={loadMoreSentinelRef} style={{ height: "1px" }} />
            {loadingMore && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "20px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    border: "3px solid #e0e0e0",
                    borderTopColor: "#4285f4",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              </div>
            )}
            {!nextCursor && posts.length >= 20 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#8e8e8e",
                  fontSize: "14px",
                  background: "#ffffff",
                }}
              >
                You've reached the end
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  const refreshCommitmentForPrayer = async (requestId: number) => {
    if (!user?.id) return;

    try {
      // Use backend API to bypass RLS issues
      const baseUrl = getApiBaseUrl();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      const response = await fetch(`${baseUrl}/api/my-commitments`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        console.error("Failed to refresh commitments:", response.status);
        return;
      }

      const result = await response.json();
      const commitment = result.commitments?.find((c: any) => c.request_id === requestId);

      // 🔑 Merge into myCommitments so navigation keeps state
      setMyCommitments((prev) => {
        const filtered = prev.filter((c) => c.request_id !== requestId);
        return commitment ? [commitment, ...filtered] : filtered;
      });
    } catch (err) {
      console.error("refreshCommitmentForPrayer error:", err);
    }
  };

  // Search Component

  const goBackToBrowse = React.useCallback(() => setPrayerRoute("browse"), []);

  // Prayer Router - Complete Mobile Prayer System
  function renderPrayerRouter() {
    switch (prayerRoute) {
      case "browse":
        return (
          <PrayerBrowseMobile
            prayerRequests={prayerRequests}
            onNavigateToNew={() => setPrayerRoute("new")}
            onNavigateToMy={() => setPrayerRoute("my")}
            onNavigateToLeaderboard={() => setPrayerRoute("leaderboard")}
            onSelectPrayer={async (prayer) => {
              console.log('📿 [onSelectPrayer] Prayer clicked:', prayer.id, 'stats:', prayer.prayer_stats);
              setPreviousPrayerRoute("browse");
              setPrayerDetailId(prayer.id);
              // Set initial data immediately for fast display
              setSelectedPrayerDetail(prayer);
              setPrayerRoute("detail");
              // Then fetch fresh data from backend API to update
              console.log('📿 [onSelectPrayer] Calling getPrayerRequest API...');
              try {
                const result = await getPrayerRequest(prayer.id);
                console.log('📿 [onSelectPrayer] API result:', result.data?.prayer_stats, 'error:', result.error);
                if (result.data) {
                  setSelectedPrayerDetail(result.data);
                  console.log('📿 [onSelectPrayer] State updated with fresh data');
                }
              } catch (err) {
                console.error('📿 [onSelectPrayer] API error:', err);
              }
            }}
            nextCursor={prayerNextCursor}
            loadingMore={loadingMorePrayers}
            onLoadMore={loadMorePrayerRequests}
          />
        );
      case "new":
        return (
          <PrayerNewMobile
            onBack={goBackToBrowse}
            onSuccess={() => {
              fetchData();
              setPrayerRoute("browse");
            }}
            isBanned={isBanned}
          />
        );
      case "detail":
        // Guard: if no prayer is selected, show browse instead
        if (!selectedPrayerDetail) {
          return (
            <PrayerBrowseMobile
              prayerRequests={prayerRequests}
              onNavigateToNew={() => setPrayerRoute("new")}
              onNavigateToMy={() => setPrayerRoute("my")}
              onNavigateToLeaderboard={() => setPrayerRoute("leaderboard")}
              onSelectPrayer={(prayer) => {
                setPreviousPrayerRoute("browse");
                setPrayerDetailId(prayer.id);
                setSelectedPrayerDetail(prayer);
                setPrayerRoute("detail");
              }}
              nextCursor={prayerNextCursor}
              loadingMore={loadingMorePrayers}
              onLoadMore={loadMorePrayerRequests}
            />
          );
        }
        return (
          <PrayerDetailMobile
            prayer={selectedPrayerDetail}
            commitment={myCommitments.find(
              (c) => c.request_id === selectedPrayerDetail?.id,
            )}
            user={user}
            isBanned={isBanned}
            onBack={() => {
              // Clear detail IDs FIRST to prevent any effects from reasserting the detail route
              setSelectedPrayerDetail(null);
              setPrayerDetailId(null);
              // Trigger a refresh when going back
              setPrayerRefreshTrigger((prev) => prev + 1);
              // Then navigate to the previous route
              setPrayerRoute(previousPrayerRoute);
              // Force immediate refresh
              refreshAllPrayerData();
            }}
            onCommitToPray={handleCommitToPray}
            onConfirmPrayed={handleConfirmPrayed}
            onRefresh={async (prayerId: number) => {
              try {
                await refreshCommitmentForPrayer(prayerId);
                const { data: refreshedPrayer } = await getPrayerRequest(prayerId);
                if (refreshedPrayer) setSelectedPrayerDetail(refreshedPrayer);
                await fetchData();
              } catch (err) {
                console.warn("onRefresh error (non-critical):", err);
              }
            }}
          />
        );
      case "my":
        return (
          <PrayerMyMobile
            myCommitments={myCommitments}
            myRequests={myRequests}
            confirmingId={confirmingId}
            onBack={() => setPrayerRoute("browse")}
            onConfirmPrayed={handleConfirmPrayed}
            onSelectRequest={(request) => {
              setPreviousPrayerRoute("my");
              setPrayerDetailId(request.id);
              setSelectedPrayerDetail(request);
              setPrayerRoute("detail");
            }}
            onNavigateToNew={() => setPrayerRoute("new")}
          />
        );
      case "leaderboard":
        return (
          <PrayerLeaderboardMobile
            leaderboardData={leaderboardData}
            onBack={() => setPrayerRoute("browse")}
          />
        );
      default:
        return (
          <PrayerBrowseMobile
            prayerRequests={prayerRequests}
            onNavigateToNew={() => setPrayerRoute("new")}
            onNavigateToMy={() => setPrayerRoute("my")}
            onNavigateToLeaderboard={() => setPrayerRoute("leaderboard")}
            onSelectPrayer={async (prayer) => {
              setPreviousPrayerRoute("browse");
              setPrayerDetailId(prayer.id);
              // Set initial data immediately for fast display
              setSelectedPrayerDetail(prayer);
              setPrayerRoute("detail");
              // Then fetch fresh data from backend API to update
              const result = await getPrayerRequest(prayer.id);
              if (result.data) {
                setSelectedPrayerDetail(result.data);
              }
            }}
            nextCursor={prayerNextCursor}
            loadingMore={loadingMorePrayers}
            onLoadMore={loadMorePrayerRequests}
          />
        );
    }
  }

  // Loading state (auth loading or checking guidelines)
  if (authLoading || (user && checkingGuidelines)) {
    return (
      <div style={STYLES.container}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <div style={{ fontSize: "20px", color: "#8e8e8e" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Show guidelines acceptance modal for logged-in users who haven't accepted
  if (user && guidelinesAccepted === false) {
    return <GuidelinesAcceptanceModal onAccept={handleAcceptGuidelines} />;
  }

  // Handle prayer detail view
  if (prayerDetailId && selectedPrayerDetail) {
    return (
      <PrayerDetailView
        prayer={selectedPrayerDetail}
        myCommitments={myCommitments}
        user={user}
        isBanned={isBanned}
        prayedJustNow={prayedJustNow}
        onBack={() => {
          setPrayerDetailId(null);
          setSelectedPrayerDetail(null);
        }}
        onCommitToPray={handleCommitToPray}
        onConfirmPrayed={handleConfirmPrayed}
        onRefresh={async (prayerId: number) => {
          await refreshCommitmentForPrayer(prayerId); // ✅ ensure commitment exists
          const { data: refreshedPrayer } = await getPrayerRequest(prayerId);
          if (refreshedPrayer) setSelectedPrayerDetail(refreshedPrayer);
          await fetchData(); // optional: list refresh
        }}
      />
    );
  }

  // Handle notifications view
  if (showNotifications) {
    return (
      <NotificationsMobile
        onBack={() => setShowNotifications(false)}
        onCountChange={setUnreadNotificationCount}
        onNotificationClick={(notification) => {
          setShowNotifications(false);
          // Navigate to the relevant content
          if (notification.post_id) {
            // Switch to home tab and scroll to the post
            setActiveTab(0);
            setPendingPostNavigation(notification.post_id);
          } else if (notification.prayer_request_id) {
            // Switch to prayer tab and open the prayer request
            setActiveTab(1);
            handlePrayerClick(notification.prayer_request_id);
          }
        }}
      />
    );
  }

  // Handle full leaderboard view
  if (showFullLeaderboard) {
    return (
      <FullLeaderboardView
        leaderboardData={leaderboard}
        onBack={() => setShowFullLeaderboard(false)}
      />
    );
  }

  // Render main component
  return (
    <div style={STYLES.container}>
      {/* Header */}
      <div style={STYLES.header}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#262626",
            letterSpacing: "-0.5px",
          }}
        >
          {!user
            ? "Gospel Era"
            : activeTab === 0
              ? "Gospel Era"
              : activeTab === 1
                ? "Create"
                : activeTab === 2
                  ? "Prayer"
                  : "Profile"}
        </div>
        {user && (
          <div
            className="user-dropdown-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              position: "relative",
            }}
          >
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              data-testid="button-notifications"
              style={{
                position: "relative",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#262626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotificationCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 700,
                    minWidth: "16px",
                    height: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* User Name and Avatar */}
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
                e.currentTarget.style.opacity = "0.7";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.opacity = "1";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "20px",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                userSelect: "none",
                transition: "transform 0.1s, opacity 0.1s",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: getImageUrl(userProfile?.avatar_url)
                    ? "none"
                    : "#dbdbdb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {getImageUrl(userProfile?.avatar_url) ? (
                  <img
                    src={getImageUrl(userProfile?.avatar_url)!}
                    alt="Profile"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const parent = (e.target as HTMLImageElement)
                        .parentElement;
                      if (parent) {
                        parent.innerHTML =
                          '<span style="fontSize: 14px; color: #8e8e8e">👤</span>';
                      }
                    }}
                  />
                ) : (
                  <User size={16} color="#8e8e8e" />
                )}
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userProfile?.display_name ||
                  user?.email?.split("@")[0] ||
                  "User"}
              </span>
              <span
                style={{ fontSize: "12px", color: "#8e8e8e", flexShrink: 0 }}
              >
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #dbdbdb",
                  minWidth: "200px",
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#262626",
                    }}
                  >
                    {getDisplayName(userProfile, user?.email)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {user?.email}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowMobileEditProfile(false);
                    setShowMobileSettings(false);
                    setShowMobileSavedPosts(false);
                    setShowMobileCommunityGuidelines(false);
                    setShowMobileSupporter(false);
                    setShowMobileHelp(false);
                    setShowMobileProfile(true);
                    // Set profile immediately instead of loading
                    if (userProfile) {
                      setProfile({
                        id: user?.id || "",
                        display_name:
                          userProfile.display_name ||
                          user?.email ||
                          "Gospel User",
                        bio: userProfile.bio || "",
                        avatar_url: userProfile.avatar_url || "",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                      setEditDisplayName(
                        userProfile.display_name ||
                          user?.email ||
                          "Gospel User",
                      );
                      setEditBio(userProfile.bio || "");
                      setEditAvatarUrl(userProfile.avatar_url || "");
                      setProfileLoading(false);
                    } else {
                      loadMobileProfile();
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  👤 Profile
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    resetAllModalStates();
                    setShowMobileSettings(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  Settings
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    resetAllModalStates();
                    setShowMobileSavedPosts(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  Saved Posts
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    resetAllModalStates();
                    setShowMobileCommunityGuidelines(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  Community Guidelines
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    resetAllModalStates();
                    setShowMobileSupporter(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  Be a Supporter
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    resetAllModalStates();
                    setShowMobileHelp(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#262626",

                    cursor: "pointer",
                  }}
                >
                  Help
                </button>

                {isAdmin && (
                  <>
                    <div
                      style={{
                        borderTop: "1px solid #f0f0f0",
                        marginTop: "4px",
                      }}
                    />
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        resetAllModalStates();
                        setShowMobileReviewReports(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        fontSize: "14px",
                        color: "#dc2626",

                        cursor: "pointer",
                      }}
                    >
                      Admin Reports
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        resetAllModalStates();
                        setShowMobileMediaRequests(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        fontSize: "14px",
                        color: "#dc2626",

                        cursor: "pointer",
                      }}
                    >
                      Media Requests
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        resetAllModalStates();
                        setShowMobileAdminSupport(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        fontSize: "14px",
                        color: "#dc2626",

                        cursor: "pointer",
                      }}
                    >
                      Admin Support
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    signOut();
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "#dc2626",

                    cursor: "pointer",
                    borderTop: "1px solid #f0f0f0",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={STYLES.content}>
        {!user ? (
          <LoginMobile onSuccess={() => {}} />
        ) : showMobileReviewReports ? (
          <AdminReportsMobile
            isVisible={showMobileReviewReports}
            onBack={() => setShowMobileReviewReports(false)}
          />
        ) : showMobileMediaRequests ? (
          <MediaRequestsMobile
            isVisible={showMobileMediaRequests}
            onBack={() => setShowMobileMediaRequests(false)}
          />
        ) : showMobileAdminSupport ? (
          <AdminSupportMobile
            isVisible={showMobileAdminSupport}
            onBack={() => setShowMobileAdminSupport(false)}
          />
        ) : showPasswordUpdate ? (
          <PasswordUpdateMobile
            onSuccess={() => {
              setShowPasswordUpdate(false);
              // User will see success screen before this is called
            }}
            onCancel={() => setShowPasswordUpdate(false)}
          />
        ) : showMobileEditProfile ? (
          <EditProfileMobile
            profile={profile}
            onBack={() => setShowMobileEditProfile(false)}
            onSuccess={() => {
              // Stay on the edit profile page, just reload the profile data
              loadMobileProfile();
            }}
          />
        ) : showMobilePublicProfile ? (
          <MobilePublicProfilePage
            publicProfileUserId={publicProfileUserId}
            onBack={() => resetAllModalStates()}
          />
        ) : showMobileProfile ? (
          <ProfileMobile
            isVisible={showMobileProfile}
            onBack={() => setShowMobileProfile(false)}
            onEditProfile={() => {
              setShowMobileProfile(false);
              setShowMobileEditProfile(true);
            }}
            userId={user?.id}
            userEmail={user?.email}
          />
        ) : showMobileSettings ? (
          <SettingsMobile
            onBack={() => setShowMobileSettings(false)}
            onEditProfile={() => {
              setShowMobileSettings(false);
              setShowMobileEditProfile(true);
              loadMobileProfile();
            }}
            onSuccess={() => loadMobileProfile()}
          />
        ) : showMobileSavedPosts ? (
          <MobileSavedPostsPage
            profiles={profiles}
            onBack={() => setShowMobileSavedPosts(false)}
            onSetProfiles={setProfiles}
            onToggleBookmark={handleToggleBookmark}
            onSelectPost={(postId) => {
              setShowMobileSavedPosts(false);
              setActiveTab(0);
              setPendingPostNavigation(postId);
            }}
          />
        ) : showMobileCommunityGuidelines ? (
          <CommunityGuidelinesMobile
            onBack={() => setShowMobileCommunityGuidelines(false)}
          />
        ) : showMobileSupporter ? (
          <SupporterMobile onBack={() => setShowMobileSupporter(false)} />
        ) : showMobileHelp ? (
          <HelpMobile
            onBack={() => setShowMobileHelp(false)}
            onViewGuidelines={() => {
              setShowMobileHelp(false);
              setShowMobileCommunityGuidelines(true);
            }}
          />
        ) : (
          <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
            <div
              style={{
                display: activeTab === 0 ? "flex" : "none",
                flex: 1,
                flexDirection: "column",
              }}
            >
              {renderHomeFeed()}
            </div>
            <div
              style={{
                display: activeTab === 1 ? "flex" : "none",
                flex: 1,
                flexDirection: "column",
              }}
            >
              <CreatePostMobile
                isVisible={activeTab === 1}
                onBack={() => setActiveTab(0)}
                onSuccess={() => {
                  fetchData();
                  setActiveTab(0);
                  setEditingPostId(null);
                  setEditingPost(null);
                }}
                isBanned={isBanned}
                hasMediaPermission={hasMediaPermission}
                onRequestMediaPermission={() => setShowMediaRequestModal(true)}
                editingPost={
                  editingPostId && editingPost
                    ? {
                        id: editingPostId,
                        title: editingPost.title || "",
                        content: editingPost.content || "",
                        tags: editingPost.tags || [],
                        media_urls: editingPost.media_urls || [],
                        embed_url: editingPost.embed_url,
                      }
                    : null
                }
              />
            </div>
            <div
              style={{
                display: activeTab === 2 ? "flex" : "none",
                flex: 1,
                flexDirection: "column",
              }}
            >
              {renderPrayerRouter()}
            </div>
            {/* Profile tab content removed - now uses MobileProfilePage instead */}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Always show when logged in */}
      {user && (
        <nav style={STYLES.bottomNav}>
          <div
            onClick={() => {
              resetAllModalStates();
              setActiveTab(0);
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: activeTab === 0 ? "#4285f4" : "#8e8e8e",
              fontSize: "20px",
              padding: "8px 12px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.1s, opacity 0.1s",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span style={{ fontSize: "10px", marginTop: "2px" }}>Home</span>
          </div>
          <div
            onClick={() => {
              resetAllModalStates();
              setActiveTab(0);
              // Focus on search input in home page
              setTimeout(() => {
                const searchInput = document.querySelector(
                  'input[placeholder*="Search"]',
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }, 100);
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#8e8e8e",
              fontSize: "20px",
              padding: "8px 12px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.1s, opacity 0.1s",
            }}
          >
            🔍
            <span style={{ fontSize: "10px", marginTop: "2px" }}>Search</span>
          </div>
          <div
            onClick={() => {
              resetAllModalStates();
              // Clear editing state to ensure fresh create form
              setEditingPostId(null);
              setEditingPost(null);
              setActiveTab(1);
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: activeTab === 1 ? "#4285f4" : "#8e8e8e",
              fontSize: "20px",
              padding: "8px 12px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.1s, opacity 0.1s",
            }}
          >
            ➕<span style={{ fontSize: "10px", marginTop: "2px" }}>Post</span>
          </div>
          <div
            onClick={() => {
              resetAllModalStates();
              setActiveTab(2);
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: activeTab === 2 ? "#4285f4" : "#8e8e8e",
              fontSize: "20px",
              padding: "8px 12px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.1s, opacity 0.1s",
            }}
          >
            <img
              src={prayIconPath}
              alt="Prayer"
              width="24"
              height="24"
              style={{
                opacity: activeTab === 2 ? 1 : 0.5,
              }}
            />
            <span
              style={{
                fontSize: "10px",
                marginTop: "2px",
                color: activeTab === 2 ? "#000000" : "#8e8e8e",
              }}
            >
              Prayer
            </span>
          </div>
          <div
            onClick={() => {
              // Use the same profile page as the dropdown
              setActiveTab(0); // Keep on home tab
              setShowMobileProfile(true);
              if (userProfile) {
                setProfile({
                  id: user?.id || "",
                  display_name:
                    userProfile.display_name || user?.email || "Gospel User",
                  bio: userProfile.bio || "",
                  avatar_url: userProfile.avatar_url || "",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                setEditDisplayName(
                  userProfile.display_name || user?.email || "Gospel User",
                );
                setEditBio(userProfile.bio || "");
                setEditAvatarUrl(userProfile.avatar_url || "");
                setProfileLoading(false);
              } else {
                loadMobileProfile();
              }
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
              e.currentTarget.style.opacity = "0.7";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#8e8e8e", // Always inactive since we use MobileProfilePage instead
              fontSize: "20px",
              padding: "8px 12px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.1s, opacity 0.1s",
            }}
          >
            👤
            <span style={{ fontSize: "10px", marginTop: "2px" }}>Profile</span>
          </div>
        </nav>
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "90%",
              width: "400px",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "16px",
                color: "#262626",
              }}
            >
              Report Content
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#8e8e8e",
                marginBottom: "20px",
              }}
            >
              Why are you reporting this {reportTarget?.type}?
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {[
                "Inappropriate content",
                "Spam or misleading",
                "Not Christ-Centered (prayer not to Jesus)",
                "Harassment or hate speech",
                "Violence or dangerous content",
                "Other",
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleSubmitReport(reason)}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    border: "1px solid #dbdbdb",
                    borderRadius: "8px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#262626",
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setReportModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Media Request Modal */}
      {showMediaRequestModal && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "12px",
              maxWidth: "300px",
              margin: "16px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Request Link Sharing
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                color: "#6c757d",
              }}
            >
              Link sharing permissions allow you to embed YouTube videos and
              upload media files to enhance your posts.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowMediaRequestModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { requestMediaAccess } = await import(
                      "@/lib/mediaRequests"
                    );
                    const { data, error } = await requestMediaAccess(
                      "Requesting permission to share video links and upload media",
                    );
                    setShowMediaRequestModal(false);
                    if (error) {
                      alert(
                        `Failed to submit request: ${error.message || "Unknown error"}`,
                      );
                    } else {
                      alert(
                        "Link sharing request submitted! You will be notified when approved.",
                      );
                    }
                  } catch (err) {
                    setShowMediaRequestModal(false);
                    alert("Failed to submit request. Please try again.");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#007bff",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banned User Modal */}
      {showBannedModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "28px",
              borderRadius: "16px",
              maxWidth: "320px",
              margin: "16px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "#fee2e2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "20px",
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              Account Restricted
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "15px",
                color: "#4b5563",
                lineHeight: 1.5,
              }}
            >
              Your account has been restricted due to a violation of our
              community guidelines. You can still browse content, but posting
              and interactions are limited.
            </p>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              If you believe this is a mistake, please contact us at{" "}
              <a
                href="mailto:support@gospelera.app"
                style={{ color: "#2563eb", textDecoration: "underline" }}
              >
                support@gospelera.app
              </a>
            </p>
            <button
              onClick={() => setShowBannedModal(false)}
              data-testid="button-close-banned-modal"
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
