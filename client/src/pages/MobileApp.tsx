import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { listPosts, createPost, updatePost, softDeletePost, searchPosts, getTopTags } from "@/lib/posts";
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
} from "@/lib/engagement";
import { listComments, createComment, softDeleteComment } from "@/lib/comments";
import { createReport } from "@/lib/reports";
import { checkMediaPermission } from "@/lib/mediaRequests";
import { validateAndNormalizeYouTubeUrl } from "../../../shared/youtube";
import { validateFaithContent } from "../../../shared/moderation";
import { supabase } from "@/lib/supabaseClient";
import { useRole } from "@/hooks/useRole";
import { getTopPrayerWarriors } from "@/lib/leaderboard";
import {
  updateUserSettings,
  getUserSettings,
  upsertMyProfile,
  ensureMyProfile,
} from "@/lib/profiles";
import { ObjectUploader } from "@/components/ObjectUploader";
import { getDailyVerse } from "@/lib/scripture";
import { createDonationPledge, validateDonationAmount, formatCurrency, createStripeCheckout } from "@/lib/donations";
import { PAYMENTS } from "@/config/payments";
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

// replace your stopIfField with this:
const stopIfTextField = (e: React.SyntheticEvent) => {
  const t = e.target as HTMLElement | null;
  const isTextField = !!t?.closest(
    'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"], [role="textbox"]',
  );
  if (isTextField) e.stopPropagation(); // let inputs get focus, don't block buttons/links
};

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
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #dbdbdb",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    background: "#ffffff",
    paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
  },
  bottomNav: {
    position: "fixed" as const,
    bottom: "env(safe-area-inset-bottom, 0px)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "414px",
    height: "56px",
    background: "#ffffff",
    borderTop: "1px solid #dbdbdb",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "0 16px",
    zIndex: 50,
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
    padding: "0 16px",
    fontSize: "14px",
    color: "#262626",
    outline: "none",
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
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
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
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>(
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
  const [error, setError] = useState<string | null>(null);
  const [createContent, setCreateContent] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [prayerTitle, setPrayerTitle] = useState("");
  const [prayerDetails, setPrayerDetails] = useState("");
  const [prayerTags, setPrayerTags] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayerModerationError, setPrayerModerationError] = useState("");
  const [committingToId, setCommittingToId] = useState<number | null>(null);
  const [prayerTab, setPrayerTab] = useState(0); // 0: Browse, 1: My Prayers
  const [selectedPrayerId, setSelectedPrayerId] = useState<number | null>(null);
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);

  // Enhanced post creation states
  const [createTags, setCreateTags] = useState("");
  const [createYouTubeUrl, setCreateYouTubeUrl] = useState("");
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [moderationError, setModerationError] = useState("");

  // Additional engagement states needed for web app parity
  const [editingPost, setEditingPost] = useState<any>(null);
  const [submittingComment, setSubmittingComment] = useState<{
    [postId: number]: boolean;
  }>({});
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null,
  );
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

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (posts.length > 0) return; // already loaded

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchData(), // load posts
          checkUserMediaPermission(), // any permission checks
          loadDailyVerse(), // extra boot data
        ]);
      } catch (err) {
        // optional: console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, posts.length]);

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
      const result = await checkMediaPermission(user.id);
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
      // Fetch real posts from API
      const postsResult = await listPosts({ limit: 20 });
      if (postsResult.data) {
        setPosts(postsResult.data);

        // Load author profiles
        const authorIds = postsResult.data.map((post: any) => post.author_id);
        await loadProfiles(authorIds);

        // Load engagement data
        const postIds = postsResult.data.map((post: any) => post.id);
        await loadEngagementData(postIds);
      }

      // Fetch real prayer requests from API
      const prayerResult = await listPrayerRequests({ limit: 10 });
      if (prayerResult.data) {
        setPrayerRequests(prayerResult.data);
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
            setMyCommitments(commitmentsResult.data);
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

  const handleCreatePost = async () => {
    if (!createTitle.trim() || !createContent.trim()) return;

    if (isBanned) {
      alert("Your account is limited. You cannot create posts.");
      return;
    }

    // Clear previous errors
    setYoutubeError("");
    setModerationError("");

    const titleText = createTitle.trim();
    const contentText = createContent.trim();

    // Enhanced Christ-centric validation for title and content
    const titleValidation = validateFaithContent(titleText);
    const contentValidation = validateFaithContent(contentText);

    if (!titleValidation.isValid && !contentValidation.isValid) {
      setModerationError(
        titleValidation.reason ||
          "Please keep your post centered on Jesus or Scripture.",
      );
      return;
    }

    // Process tags
    const tagsArray = createTags.trim()
      ? createTags.split(",").map((tag) => tag.trim())
      : [];

    // Validate YouTube URL if provided
    let normalizedYouTubeUrl = "";
    if (createYouTubeUrl.trim()) {
      if (!hasMediaPermission) {
        setYoutubeError(
          "You need link sharing permission to add YouTube videos.",
        );
        return;
      }

      const validation = validateAndNormalizeYouTubeUrl(
        createYouTubeUrl.trim(),
      );
      if (!validation.isValid) {
        setYoutubeError(validation.error || "Invalid YouTube URL");
        return;
      }
      normalizedYouTubeUrl = validation.normalizedUrl || "";
    }

    try {
      let result;
      if (editingPostId && editingPost) {
        // Update existing post
        result = await updatePost(editingPostId, {
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
        setCreateTitle("");
        setCreateContent("");
        setCreateTags("");
        setCreateYouTubeUrl("");
        setYoutubeError("");
        setModerationError("");
        setEditingPostId(null);
        setEditingPost(null);
        fetchData();
        setActiveTab(0); // Go back to home
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert(
        `Failed to ${editingPostId ? "update" : "create"} post. Please try again.`,
      );
    }
  };

  const handleCreatePrayerRequest = async () => {
    if (!prayerTitle.trim() || !prayerDetails.trim()) return;

    if (isBanned) {
      alert("Your account is limited. You cannot create prayer requests.");
      return;
    }

    // Clear previous errors
    setPrayerModerationError("");

    const titleText = prayerTitle.trim();
    const detailsText = prayerDetails.trim();

    // Enhanced Christ-centric validation for title and details
    const titleValidation = validateFaithContent(titleText);
    const detailsValidation = validateFaithContent(detailsText);

    if (!titleValidation.isValid && !detailsValidation.isValid) {
      setPrayerModerationError(
        titleValidation.reason ||
          "Please keep your prayer request centered on Jesus or Scripture.",
      );
      return;
    }

    // Process tags
    const tagsArray = prayerTags.trim()
      ? prayerTags.split(",").map((tag) => tag.trim())
      : [];

    try {
      const result = await createPrayerRequest({
        title: titleText,
        details: detailsText,
        tags: tagsArray,
        is_anonymous: isAnonymous,
      });

      if (result.data) {
        // Clear form
        setPrayerTitle("");
        setPrayerDetails("");
        setPrayerTags("");
        setIsAnonymous(false);
        setPrayerModerationError("");
        fetchData();
      }
    } catch (error) {
      console.error("Error creating prayer request:", error);
      alert("Failed to create prayer request. Please try again.");
    }
  };

  const handleCommitToPray = async (requestId: number) => {
    if (!user || isBanned) return;

    setCommittingToId(requestId);

    try {
      const { error } = await commitToPray(requestId);
      if (error) {
        alert("Failed to commit to prayer. Please try again.");
      } else {
        // Refresh prayer requests to show updated counts
        fetchData();
      }
    } catch (error) {
      console.error("Error committing to prayer:", error);
      alert("Failed to commit to prayer. Please try again.");
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

        // Refresh prayer requests and commitments to show updated counts
        fetchData();
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
  // Mobile page states
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMobileCommunityGuidelines, setShowMobileCommunityGuidelines] =
    useState(false);

  // Mobile Profile state
  const [showMobileProfile, setShowMobileProfile] = useState(false);
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
        cursor: fromId ? { created_at: new Date().toISOString(), id: fromId } : undefined,
        limit: 10
      });

      if (data && !error) {
        const posts = data.items || [];
        if (!fromId) {
          setPosts(posts);
        } else {
          setPosts(prev => [...prev, ...posts]);
        }
        setNextCursor(data.nextCursor?.id || null);

        // Load profiles and engagement data for search results
        const authorIds = [...new Set(posts.map((post: any) => post.author_id))];
        await Promise.all([
          loadProfilesForUsers(authorIds),
          loadEngagementDataForPosts(posts.map((post: any) => post.id))
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search posts. Please try again.');
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
        setProfiles(prev => new Map([...prev, ...profilesMap]));
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadEngagementDataForPosts = async (postIds: number[]) => {
    try {
      const [bookmarksResult, amenResult] = await Promise.all([
        Promise.all(postIds.map(id => isBookmarked(id))),
        getAmenInfo(postIds)
      ]);
      
      setEngagementData(prev => {
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
      console.error('Failed to load engagement data:', error);
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
        console.error('Failed to load top tags:', error);
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
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
        const response = await fetch("/api/avatar", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
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

  const handleCreateComment = async (postId: number, e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      console.log("📝 Form submitted for post:", postId);
    }
    const content = commentTexts[postId]?.trim();
    console.log("💬 Creating comment:", {
      postId,
      content,
      user: user?.id,
      isBanned,
    });
    if (!content || !user || isBanned) return;

    // Enhanced Christ-centric validation for comment content
    const validation = validateFaithContent(content);

    if (!validation.isValid) {
      alert(
        validation.reason ||
          "Please keep your comment centered on Jesus or Scripture.",
      );
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      console.log("🚀 Calling createComment API:", { postId, content });
      const { data, error } = await createComment({ postId, content });
      console.log("📤 Create comment response:", { data, error });
      if (error) {
        alert("Failed to create comment");
      } else {
        // Clear the input and reload comments
        console.log(
          "✅ Comment created successfully, clearing input and reloading",
        );
        setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
        await loadComments(postId);
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      alert("Failed to create comment");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
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

    // Set edit mode and populate form fields
    setEditingPostId(postId);
    setEditingPost(post);
    setCreateTitle(post.title || "");
    setCreateContent(post.content || "");
    setCreateTags(post.tags ? post.tags.join(", ") : "");
    setCreateYouTubeUrl(post.embed_url || "");

    // Switch to Create tab for editing
    setActiveTab(2);
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
    setReportModal({
      isOpen: true,
      targetType: "comment",
      targetId: commentId.toString(),
      reason: "",
      selectedReason: "",
    });
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;

    // Check faith affirmation for signup
    if (isSignUp && !faithAffirmed) {
      setLoginError("Please affirm your faith to create an account.");
      return;
    }

    setLoginError("");
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setLoginError(error.message);
    } else {
      setEmail("");
      setPassword("");
      setFaithAffirmed(false);
    }
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

  // ——— Focus safety helpers ———
  const isEditableEl = (el: EventTarget | null) =>
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable);

  const startedInsideFormField = (
    evt: MouseEvent | PointerEvent | TouchEvent,
  ) => {
    const path = (evt as any).composedPath?.() as EventTarget[] | undefined;
    const first = path && path[0];
    return isEditableEl(first ?? evt.target);
  };

  const keepFocus = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const node = ref.current;
    if (!node) return;
    if (document.activeElement !== node) {
      node.focus({ preventScroll: true });
      // place caret at end without scrolling
      try {
        node.setSelectionRange(node.value.length, node.value.length);
      } catch {}
    }
  };

  // Login Component
  function renderLoginPage() {
    return (
      <div style={{ padding: "16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#262626",
              marginBottom: "8px",
            }}
          >
            Gospel Era
          </div>
          <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
            Connect with believers worldwide
          </div>
        </div>

        {loginError && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #fcc",
              color: "#c00",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {loginError}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <input
            ref={emailRef}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              keepFocus(emailRef);
            }}
            //onBlur={() => keepFocus(emailRef)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #dbdbdb",
              borderRadius: "8px",
              fontSize: "16px",
              marginBottom: "12px",
              outline: "none",
            }}
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            ref={passwordRef}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              keepFocus(passwordRef);
            }}
            // onBlur={() => keepFocus(passwordRef)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #dbdbdb",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
            }}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* Faith Affirmation for Signup */}
        {isSignUp && (
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              border: "1px solid #dbdbdb",
              borderRadius: "8px",
              background: "#f9f9f9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={faithAffirmed}
                onChange={(e) => setFaithAffirmed(e.target.checked)}
                style={{ marginRight: "8px", marginTop: "2px" }}
              />
              <label
                style={{
                  fontSize: "14px",
                  color: "#262626",
                  lineHeight: "1.4",
                }}
              >
                <span style={{ color: "#dc2626" }}>*</span> I affirm that I am a
                follower of Jesus Christ and I believe in His saving blood. I
                agree that prayers in this app are directed to Jesus.
              </label>
            </div>
            {isSignUp && !faithAffirmed && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#dc2626",
                  marginLeft: "20px",
                }}
              >
                This affirmation is required to join our Christian prayer
                community.
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={
            !email.trim() || !password.trim() || (isSignUp && !faithAffirmed)
          }
          style={{
            width: "100%",
            background:
              email.trim() && password.trim() && (!isSignUp || faithAffirmed)
                ? "#262626"
                : "#dbdbdb",
            color: "#ffffff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            marginBottom: "16px",
            cursor:
              email.trim() && password.trim() && (!isSignUp || faithAffirmed)
                ? "pointer"
                : "not-allowed",
          }}
        >
          {isSignUp ? "Sign Up" : "Log In"}
        </button>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "none",
              border: "none",
              color: "#262626",
              fontSize: "14px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isSignUp
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  // Home Feed Component
  function renderHomeFeed() {
    return (
      <>
        {/* Search bar with clear button */}
        <div style={{
          ...STYLES.searchContainer,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <input
            type="text"
            placeholder="Search Gospel Era"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              ...STYLES.searchInput,
              flex: 1
            }}
          />
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
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Top Tags */}
        {topTags.length > 0 && (
          <div style={{
            padding: "12px 16px",
            background: "#ffffff",
            borderBottom: "1px solid #dbdbdb"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
              color: "#262626"
            }}>Popular Topics</div>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              {tagsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} style={{
                    background: "#f0f0f0",
                    height: "28px",
                    width: "60px",
                    borderRadius: "16px",
                    animation: "pulse 1.5s ease-in-out infinite"
                  }} />
                ))
              ) : (
                topTags.map((tag, index) => {
                  const tagName = tag.tag || tag.tag_name || tag.name;
                  const isSelected = selectedTags.includes(tagName);
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(selectedTags.filter(t => t !== tagName));
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
                        cursor: "pointer"
                      }}
                    >
                      #{tagName} ({tag.count})
                    </button>
                  );
                })
              )}
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
        {loading ? (
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
          posts
            .filter(
              (post) =>
                !searchQuery ||
                post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.content?.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((post, index) => (
              <div
                key={post.id}
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
                    {profiles.get(post.author_id)?.avatar_url ? (
                      <img
                        src={profiles.get(post.author_id).avatar_url}
                        alt="Avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#262626",
                      }}
                    >
                      {profiles.get(post.author_id)?.display_name ||
                        "Gospel User"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      {formatTimeAgo(post.created_at)}
                    </div>
                  </div>
                  {/* Three dots menu */}
                  <div style={{ position: "relative" }}>
                    <button
                      onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePostMenu(post.id);
                      }}
                      onClick={(e) => {
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
                  {post.embed_url && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          paddingBottom: "56.25%",
                          background: "#f2f2f2",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <iframe
                          src={post.embed_url.replace("watch?v=", "embed/")}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                          frameBorder="0"
                          allowFullScreen
                          title="YouTube video"
                        />
                      </div>
                    </div>
                  )}
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
                    onPointerDownCapture={stopIfTextField}
                    onMouseDownCapture={stopIfTextField}
                    onTouchStartCapture={stopIfTextField}
                    onPointerUpCapture={stopIfTextField}
                    onMouseUpCapture={stopIfTextField}
                    onTouchEndCapture={stopIfTextField}
                    onClickCapture={stopIfTextField}
                  >
                    {/* Comment input */}
                    <form
                      onSubmit={(e) => handleCreateComment(post.id, e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <input
                        type="text"
                        placeholder={
                          isBanned
                            ? "Account limited - cannot comment"
                            : "Add a comment..."
                        }
                        value={commentTexts[post.id] || ""}
                        onChange={(e) => {
                          console.log("📝 Comment input change:", {
                            postId: post.id,
                            value: e.target.value,
                          });
                          setCommentTexts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }));
                        }}
                        disabled={isBanned}
                        inputMode="text"
                        autoCapitalize="sentences"
                        autoCorrect="on"
                        spellCheck={true}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #dbdbdb",
                          borderRadius: "20px",
                          fontSize: "14px",
                          outline: "none",
                          marginRight: "8px",
                          backgroundColor: isBanned ? "#f5f5f5" : "#ffffff",
                          color: isBanned ? "#8e8e8e" : "#262626",
                          cursor: isBanned ? "not-allowed" : "text",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={
                          !commentTexts[post.id]?.trim() ||
                          submittingComment[post.id] ||
                          isBanned
                        }
                        style={{
                          background:
                            commentTexts[post.id]?.trim() && !isBanned
                              ? "#4285f4"
                              : "#dbdbdb",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor:
                            commentTexts[post.id]?.trim() && !isBanned
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        {submittingComment[post.id] ? "Posting..." : "Post"}
                      </button>
                    </form>

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
                                  {profiles.get(comment.author_id)
                                    ?.avatar_url ? (
                                    <img
                                      src={
                                        profiles.get(comment.author_id)
                                          .avatar_url
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
                                    "👤"
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
                                      {profiles.get(comment.author_id)
                                        ?.display_name || "Gospel User"}
                                    </span>
                                    <span style={{ color: "#262626" }}>
                                      {comment.content}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#8e8e8e",
                                      marginTop: "2px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <span>
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleReportComment(comment.id)
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#8e8e8e",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        padding: "4px",
                                        minWidth: "24px",
                                        minHeight: "24px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                      title="Report comment"
                                    >
                                      🚩
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
                                          fontSize: "14px",
                                          cursor: "pointer",
                                          padding: "4px",
                                          minWidth: "24px",
                                          minHeight: "24px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          opacity:
                                            deletingCommentId === comment.id
                                              ? 0.5
                                              : 1,
                                        }}
                                        title="Delete comment"
                                      >
                                        {deletingCommentId === comment.id
                                          ? "⏳"
                                          : "🗑️"}
                                      </button>
                                    )}
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
            ))
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
      </>
    );
  }

  // Search Component

  // Create Post Component
  function renderCreatePage() {
    return (
      <div style={{ padding: "16px" }}>
        {/* Simple header like before */}
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
          <div style={{ fontWeight: 600, color: "#262626" }}>Create Post</div>
        </div>

        {/* Error messages - keep them compact */}
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

        {/* Title input - clean like before */}
        <input
          type="text"
          placeholder="Post title..."
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          disabled={isBanned}
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

        {/* Content textarea - clean like before */}
        <textarea
          placeholder="Share your faith, testimony, or encouragement..."
          value={createContent}
          onChange={(e) => setCreateContent(e.target.value)}
          rows={6}
          disabled={isBanned}
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

        {/* Tags input - clean style */}
        <input
          type="text"
          placeholder="Tags (prayer, testimony, scripture...)"
          value={createTags}
          onChange={(e) => setCreateTags(e.target.value)}
          disabled={isBanned}
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

        {/* YouTube input or request - clean style */}
        {hasMediaPermission ? (
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="YouTube URL (optional)"
              value={createYouTubeUrl}
              onChange={(e) => setCreateYouTubeUrl(e.target.value)}
              disabled={isBanned}
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
                onClick={() => setShowMediaRequestModal(true)}
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

        {/* Share/Update button - same as before */}
        <button
          onClick={handleCreatePost}
          disabled={!createTitle.trim() || !createContent.trim() || isBanned}
          style={{
            width: "100%",
            background:
              createTitle.trim() && createContent.trim() && !isBanned
                ? "#4285f4"
                : "#dbdbdb",
            color: "#ffffff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor:
              createTitle.trim() && createContent.trim() && !isBanned
                ? "pointer"
                : "not-allowed",
          }}
          title={isBanned ? "Account limited - cannot create posts" : ""}
        >
          {editingPostId ? "Update Post" : "Share Post"}
        </button>
      </div>
    );
  }

  // Prayer Page Component
  function renderPrayerPage() {
    return (
      <>
        {/* Tab Navigation - sleek native style */}
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            borderBottom: "1px solid #dbdbdb",
          }}
        >
          <button
            onClick={() => setPrayerTab(0)}
            style={{
              flex: 1,
              padding: "16px",
              border: "none",
              background: prayerTab === 0 ? "#ffffff" : "transparent",
              borderBottom:
                prayerTab === 0 ? "2px solid #262626" : "2px solid transparent",
              fontSize: "16px",
              fontWeight: prayerTab === 0 ? 600 : 400,
              color: prayerTab === 0 ? "#262626" : "#8e8e8e",
              cursor: "pointer",
            }}
          >
            Browse
          </button>
          <button
            onClick={() => setPrayerTab(1)}
            style={{
              flex: 1,
              padding: "16px",
              border: "none",
              background: prayerTab === 1 ? "#ffffff" : "transparent",
              borderBottom:
                prayerTab === 1 ? "2px solid #262626" : "2px solid transparent",
              fontSize: "16px",
              fontWeight: prayerTab === 1 ? 600 : 400,
              color: prayerTab === 1 ? "#262626" : "#8e8e8e",
              cursor: "pointer",
            }}
          >
            My Prayers
          </button>
        </div>

        {prayerTab === 0 ? (
          <>
            {/* Prayer Stats - clean mobile style */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                padding: "12px",
                background: "#f8f9fa",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#262626",
                  }}
                >
                  {prayerRequests.length}
                </div>
                <div style={{ fontSize: "11px", color: "#8e8e8e" }}>
                  Requests
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#262626",
                  }}
                >
                  {prayerRequests.reduce(
                    (sum, req) =>
                      sum + (req.prayer_stats?.committed_count || 0),
                    0,
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#8e8e8e" }}>
                  Committed
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#262626",
                  }}
                >
                  {prayerRequests.reduce(
                    (sum, req) => sum + (req.prayer_stats?.prayed_count || 0),
                    0,
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#8e8e8e" }}>Prayed</div>
              </div>
            </div>

            {/* Create Prayer Request - enhanced with all features */}
            <div style={{ padding: "16px", borderBottom: "1px solid #dbdbdb" }}>
              {/* Simple header like create post */}
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
                    background: "#dbdbdb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                    color: "#8e8e8e",
                  }}
                >
                  🙏
                </div>
                <div style={{ fontWeight: 600, color: "#262626" }}>
                  Create Prayer Request
                </div>
              </div>

              {/* Error messages */}
              {prayerModerationError && (
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
                  {prayerModerationError}
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

              {/* Prayer Title */}
              <input
                type="text"
                placeholder="Prayer request title..."
                value={prayerTitle}
                onChange={(e) => setPrayerTitle(e.target.value)}
                disabled={isBanned}
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
                title={
                  isBanned
                    ? "Account limited - cannot create prayer requests"
                    : ""
                }
              />

              {/* Prayer Details */}
              <textarea
                placeholder="Share your prayer need..."
                value={prayerDetails}
                onChange={(e) => setPrayerDetails(e.target.value)}
                rows={4}
                disabled={isBanned}
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
                title={
                  isBanned
                    ? "Account limited - cannot create prayer requests"
                    : ""
                }
              />

              {/* Tags Input */}
              <input
                type="text"
                placeholder="Tags (healing, family, guidance...)"
                value={prayerTags}
                onChange={(e) => setPrayerTags(e.target.value)}
                disabled={isBanned}
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
                title={
                  isBanned
                    ? "Account limited - cannot create prayer requests"
                    : ""
                }
              />

              {/* Anonymous Toggle */}
              {!isBanned && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    padding: "8px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ marginRight: "8px" }}
                  />
                  <label
                    htmlFor="anonymous"
                    style={{ fontSize: "14px", color: "#262626" }}
                  >
                    Submit anonymously
                  </label>
                </div>
              )}

              {/* Submit Button - Dark Grey */}
              <button
                onClick={handleCreatePrayerRequest}
                disabled={
                  !prayerTitle.trim() || !prayerDetails.trim() || isBanned
                }
                style={{
                  width: "100%",
                  background:
                    prayerTitle.trim() && prayerDetails.trim() && !isBanned
                      ? "#4a4a4a"
                      : "#dbdbdb",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor:
                    prayerTitle.trim() && prayerDetails.trim() && !isBanned
                      ? "pointer"
                      : "not-allowed",
                }}
                title={
                  isBanned
                    ? "Account limited - cannot create prayer requests"
                    : ""
                }
              >
                Submit Prayer Request
              </button>
            </div>

            {/* Top Prayer Warriors Section - Added after Submit Prayer button */}
            <div
              style={{
                background: "#f8f9fa",
                padding: "16px",
                borderBottom: "1px solid #dbdbdb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "16px",
                    color: "#262626",
                  }}
                >
                  🏆 Top Prayer Warriors
                </div>
                <button
                  onClick={() => setPrayerTab(3)}
                  style={{
                    background: "none",
                    border: "1px solid #dbdbdb",
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    color: "#8e8e8e",
                    cursor: "pointer",
                  }}
                >
                  View All
                </button>
              </div>

              {leaderboard.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    overflowX: "auto",
                    paddingBottom: "8px",
                  }}
                >
                  {leaderboard.slice(0, 5).map((warrior, index) => (
                    <div
                      key={warrior.user_id}
                      style={{
                        minWidth: "80px",
                        textAlign: "center",
                        background: "#ffffff",
                        padding: "12px 8px",
                        borderRadius: "12px",
                        border: "1px solid #e1e5e9",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "#4285f4",
                          margin: "0 auto 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          color: "#ffffff",
                        }}
                      >
                        {index === 0
                          ? "🥇"
                          : index === 1
                            ? "🥈"
                            : index === 2
                              ? "🥉"
                              : "🙏"}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#262626",
                          marginBottom: "2px",
                        }}
                      >
                        {warrior.display_name ||
                          `User ${warrior.user_id.slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: "9px", color: "#8e8e8e" }}>
                        {warrior.prayer_count} prayers
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8e8e8e",
                    fontSize: "14px",
                    padding: "20px",
                  }}
                >
                  Loading prayer warriors...
                </div>
              )}
            </div>

            {/* Prayer Requests Feed */}
            {prayerRequests.length > 0 ? (
              prayerRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: "#ffffff",
                    borderBottom: "1px solid #dbdbdb",
                    padding: "16px",
                  }}
                >
                  {/* Request Header - Clickable */}
                  <div
                    onClick={() => handlePrayerClick(request.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#dbdbdb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "12px",
                        color: "#8e8e8e",
                      }}
                    >
                      {request.is_anonymous ? "?" : "•"}
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

                  {request.is_anonymous && (
                    <div
                      style={{
                        background: "#f2f2f2",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "10px",
                        color: "#8e8e8e",
                        marginBottom: "8px",
                      }}
                    >
                      Anonymous
                    </div>
                  )}

                  {/* Request Title */}
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#262626",
                    }}
                  >
                    {request.title}
                  </div>

                  {/* Request Details */}
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.4,
                      marginBottom: "12px",
                      color: "#262626",
                    }}
                  >
                    {request.details}
                  </div>

                  {/* Tags if available */}
                  {request.tags && request.tags.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      {request.tags.map((tag: string, index: number) => (
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

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      {request.prayer_stats?.committed_count || 0} committed ·{" "}
                      {request.prayer_stats?.prayed_count || 0} prayed
                    </div>
                    <button
                      onClick={() => {
                        const commitment = myCommitments.find(
                          (c) => c.prayer_request_id === request.id,
                        );
                        if (commitment && !commitment.has_prayed) {
                          handleConfirmPrayed(request.id);
                        } else if (!commitment) {
                          handleCommitToPray(request.id);
                        }
                      }}
                      disabled={
                        !user || isBanned || committingToId === request.id
                      }
                      style={{
                        background:
                          !user || isBanned
                            ? "#dbdbdb"
                            : myCommitments.some(
                                  (c) =>
                                    c.prayer_request_id === request.id &&
                                    !c.has_prayed,
                                )
                              ? "#28a745"
                              : "#4285f4",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: !user || isBanned ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title={
                        isBanned
                          ? "Account limited - cannot commit to pray"
                          : ""
                      }
                    >
                      {committingToId === request.id
                        ? "..."
                        : prayedJustNow.has(request.id)
                          ? "✓ Prayed just now"
                          : myCommitments.some(
                                (c) =>
                                  c.prayer_request_id === request.id &&
                                  !c.has_prayed,
                              )
                            ? "Confirm Prayed"
                            : myCommitments.some(
                                  (c) =>
                                    c.prayer_request_id === request.id &&
                                    c.has_prayed,
                                )
                              ? "✓ Prayed"
                              : "I will pray"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
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
          </>
        ) : (
          // My Prayers Tab Content
          <div style={{ padding: "16px" }}>
            {/* Tab Navigation for My Prayers */}
            <div style={{ display: "flex", marginBottom: "16px" }}>
              <button
                onClick={() => setMyPrayersTab("commitments")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  background:
                    myPrayersTab === "commitments" ? "#4285f4" : "#f5f5f5",
                  color: myPrayersTab === "commitments" ? "#ffffff" : "#8e8e8e",
                  borderRadius: "8px 0 0 8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                My Commitments
              </button>
              <button
                onClick={() => setMyPrayersTab("requests")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  background:
                    myPrayersTab === "requests" ? "#4285f4" : "#f5f5f5",
                  color: myPrayersTab === "requests" ? "#ffffff" : "#8e8e8e",
                  borderRadius: "0 8px 8px 0",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                My Requests
              </button>
            </div>

            {myPrayersTab === "commitments" ? (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "18px",
                      color: "#262626",
                      marginBottom: "8px",
                    }}
                  >
                    My Prayer Commitments
                  </div>
                  <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                    Prayers I've committed to pray for
                  </div>
                </div>

                {myCommitments.length > 0 ? (
                  myCommitments.map((commitment: any) => (
                    <div
                      key={commitment.id}
                      style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "12px",
                        border: "1px solid #dbdbdb",
                      }}
                    >
                      {/* Author info */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
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
                            border: "1px solid #dbdbdb",
                            color: "#8e8e8e",
                          }}
                        >
                          {commitment.prayer_requests?.is_anonymous
                            ? "👤"
                            : "🙏"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "#262626" }}>
                            {commitment.prayer_requests?.is_anonymous
                              ? "Anonymous"
                              : commitment.prayer_requests?.profiles
                                  ?.display_name || "Prayer Warrior"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                            {formatTimeAgo(commitment.committed_at)}
                          </div>
                        </div>
                      </div>

                      {/* Request content */}
                      <div style={{ marginBottom: "12px" }}>
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
                          }}
                        >
                          {commitment.prayer_requests?.details}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                          Status:{" "}
                          {commitment.status === "prayed"
                            ? "✅ Prayed"
                            : "⏳ Committed"}
                        </div>

                        {commitment.status === "committed" && (
                          <button
                            onClick={() =>
                              handleConfirmPrayed(
                                commitment.prayer_requests?.id,
                              )
                            }
                            disabled={
                              confirmingId === commitment.prayer_requests?.id
                            }
                            style={{
                              background: "#28a745",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {confirmingId === commitment.prayer_requests?.id
                              ? "..."
                              : "✓ Confirm Prayed"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🙏
                    </div>
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
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "18px",
                      color: "#262626",
                      marginBottom: "8px",
                    }}
                  >
                    My Prayer Requests
                  </div>
                  <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                    Prayer requests I've submitted
                  </div>
                </div>

                {myRequests.length > 0 ? (
                  myRequests.map((request: any) => (
                    <div
                      key={request.id}
                      style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "12px",
                        border: "1px solid #dbdbdb",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#262626",
                            marginBottom: "4px",
                          }}
                        >
                          {request.title}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#8e8e8e",
                            lineHeight: 1.4,
                          }}
                        >
                          {request.details}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                          {request.prayer_stats?.committed_count || 0} committed
                          • {request.prayer_stats?.prayed_count || 0} prayed
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color:
                              request.status === "open" ? "#28a745" : "#8e8e8e",
                          }}
                        >
                          {request.status === "open"
                            ? "🟢 Active"
                            : "⏸️ Closed"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      ✍️
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: "8px",
                        color: "#262626",
                      }}
                    >
                      No Prayer Requests
                    </div>
                    <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
                      Submit a prayer request to see it here
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </>
    );
  }
  // Prayer Detail View Component
  const PrayerDetailView = ({
    prayer,
    onBack,
  }: {
    prayer: any;
    onBack: () => void;
  }) => (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
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
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#262626" }}>
          Prayer Details
        </div>
      </div>

      {/* Prayer Content */}
      <div style={{ padding: "16px" }}>
        {/* Author */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#dbdbdb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
              color: "#8e8e8e",
            }}
          >
            {prayer.is_anonymous ? "🙏" : "•"}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#262626" }}>
              {prayer.is_anonymous
                ? "Anonymous Prayer Request"
                : prayer.profiles?.display_name || "Prayer Warrior"}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
              {formatTimeAgo(prayer.created_at)}
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontWeight: 600,
            fontSize: "18px",
            marginBottom: "12px",
            color: "#262626",
          }}
        >
          {prayer.title}
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: "16px",
            lineHeight: 1.5,
            marginBottom: "16px",
            color: "#262626",
          }}
        >
          {prayer.details}
        </div>

        {/* Tags */}
        {prayer.tags && prayer.tags.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            {prayer.tags.map((tag: string, index: number) => (
              <span
                key={`${prayer.id}-detail-tag-${index}`}
                style={{
                  background: "#f0f0f0",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "14px",
                  color: "#666",
                  marginRight: "8px",
                  marginBottom: "8px",
                  display: "inline-block",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Prayer Stats */}
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{ fontWeight: 600, marginBottom: "8px", color: "#262626" }}
          >
            Prayer Impact
          </div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
              >
                {prayer.prayer_stats?.committed_count || 0}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                Committed
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
              >
                {prayer.prayer_stats?.prayed_count || 0}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayed</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            const commitment = myCommitments.find(
              (c) => c.prayer_request_id === prayer.id,
            );
            if (commitment && !commitment.has_prayed) {
              handleConfirmPrayed(prayer.id);
            } else if (!commitment) {
              handleCommitToPray(prayer.id);
            }
          }}
          disabled={!user || isBanned}
          style={{
            width: "100%",
            background:
              !user || isBanned
                ? "#dbdbdb"
                : myCommitments.some(
                      (c) => c.prayer_request_id === prayer.id && !c.has_prayed,
                    )
                  ? "#28a745"
                  : "#4285f4",
            color: "#ffffff",
            border: "none",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: !user || isBanned ? "not-allowed" : "pointer",
          }}
        >
          {!user
            ? "Login to Pray"
            : isBanned
              ? "Account Limited"
              : prayedJustNow.has(prayer.id)
                ? "✓ Prayed just now"
                : myCommitments.some(
                      (c) => c.prayer_request_id === prayer.id && !c.has_prayed,
                    )
                  ? "Confirm Prayed"
                  : myCommitments.some(
                        (c) =>
                          c.prayer_request_id === prayer.id && c.has_prayed,
                      )
                    ? "✓ Prayed"
                    : "I will pray"}
        </button>
      </div>
    </div>
  );

  // Full Leaderboard View Component
  const FullLeaderboardView = ({ onBack }: { onBack: () => void }) => (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
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
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#262626" }}>
          🏆 Prayer Warriors Leaderboard
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ padding: "16px" }}>
        {leaderboard.map((warrior, index) => (
          <div
            key={warrior.warrior}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px",
              background: "#ffffff",
              borderRadius: "12px",
              marginBottom: "8px",
              border: "1px solid #dbdbdb",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginRight: "16px",
                minWidth: "40px",
                textAlign: "center",
              }}
            >
              {index === 0
                ? "🥇"
                : index === 1
                  ? "🥈"
                  : index === 2
                    ? "🥉"
                    : `${index + 1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "4px",
                }}
              >
                {warrior.display_name}
              </div>
              <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                {warrior.count_prayed} prayers completed •{" "}
                {warrior.current_streak || 0} day streak
              </div>
            </div>
            {(warrior.current_streak || 0) >= 7 && (
              <div
                style={{
                  background: "#4a4a4a",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                🔥 Hot Streak
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Mobile Profile Component - view profile information
  const MobileProfilePage = () => {
    useEffect(() => {
      loadMobileProfile();
    }, []);

    if (profileLoading) {
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
              padding: "16px 20px",
              borderBottom: "1px solid #e5e5e5",
              background: "#ffffff",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setShowMobileProfile(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  padding: "0",
                  marginRight: "12px",
                  cursor: "pointer",
                  color: "#000000",
                }}
              >
                ←
              </button>
              <div
                style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
              >
                Profile
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "16px", color: "#8e8e8e" }}>
              Loading profile...
            </div>
          </div>
        </div>
      );
    }

    if (profileError) {
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
              padding: "16px 20px",
              borderBottom: "1px solid #e5e5e5",
              background: "#ffffff",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setShowMobileProfile(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  padding: "0",
                  marginRight: "12px",
                  cursor: "pointer",
                  color: "#000000",
                }}
              >
                ←
              </button>
              <div
                style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
              >
                Profile
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "16px",
                  color: "#dc3545",
                  marginBottom: "12px",
                }}
              >
                {profileError}
              </div>
              <button
                onClick={loadMobileProfile}
                style={{
                  background: "#000000",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

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
            padding: "16px 20px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setShowMobileProfile(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  padding: "0",
                  marginRight: "12px",
                  cursor: "pointer",
                  color: "#000000",
                }}
              >
                ←
              </button>
              <div
                style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
              >
                Profile
              </div>
            </div>
            <button
              onClick={() => {
                setShowMobileProfile(false);
                setShowMobileEditProfile(true);
                // Set profile data for editing
                if (profile) {
                  setEditDisplayName(profile.display_name || "");
                  setEditBio(profile.bio || "");
                  setEditAvatarUrl(profile.avatar_url || "");
                }
              }}
              style={{
                background: "none",
                border: "1px solid #dbdbdb",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#000000",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Profile Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
              background: "#ffffff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
            }}
          >
            <div style={{ marginRight: "16px" }}>
              {profile?.avatar_url ? (
                <img
                  src={
                    profile.avatar_url.startsWith("/objects/")
                      ? profile.avatar_url
                      : profile.avatar_url
                  }
                  alt="Avatar"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "#f0f0f0",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "#e5e5e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    color: "#8e8e8e",
                  }}
                >
                  👤
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  color: "#000000",
                  marginBottom: "4px",
                }}
              >
                {profile?.display_name || "Gospel User"}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#8e8e8e",
                  marginBottom: "8px",
                }}
              >
                {user?.email}
              </div>
              {profile?.bio && (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#262626",
                    lineHeight: "1.4",
                  }}
                >
                  {profile.bio}
                </div>
              )}
            </div>
          </div>

          {/* Profile Stats */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderRight: "1px solid #e5e5e5",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#000000",
                  }}
                >
                  {posts.filter((p) => p.author_id === user?.id).length || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Posts</div>
              </div>
              <div style={{ padding: "16px" }}>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "#000000",
                  }}
                >
                  {prayerRequests.filter((p) => p.author_id === user?.id)
                    .length || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                  Prayers
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #e5e5e5",
              }}
            >
              <div
                style={{ fontSize: "16px", fontWeight: 600, color: "#000000" }}
              >
                Account Information
              </div>
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#8e8e8e",
                    marginBottom: "4px",
                  }}
                >
                  Member Since
                </div>
                <div style={{ fontSize: "14px", color: "#000000" }}>
                  {profile?.created_at
                    ? formatProfileDate(profile.created_at)
                    : "Recently"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#8e8e8e",
                    marginBottom: "4px",
                  }}
                >
                  Email
                </div>
                <div style={{ fontSize: "14px", color: "#000000" }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {profileSuccess && (
          <div
            style={{
              position: "absolute",
              top: "80px",
              left: "20px",
              right: "20px",
              background: "#000000",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              textAlign: "center",
              zIndex: 1000,
            }}
          >
            {profileSuccess}
          </div>
        )}
      </div>
    );
  };

  // Mobile Admin Components - matching webapp functionality
  const MobileReviewReportsPage = () => {
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

    // Load data when component mounts
    useEffect(() => {
      if (showMobileReviewReports) {
        loadAllData();
      }
    }, [showMobileReviewReports]);

    const loadAllData = async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([
          loadReports(),
          loadPrayerRequests(),
          loadBannedUsers(),
        ]);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    const loadReports = async () => {
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
    };

    const loadPrayerRequests = async () => {
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
    };

    const loadBannedUsers = async () => {
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
    };

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
      } catch (err: any) {
        setError(err.message || `Failed to ${action} report`);
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

    const getStatusColor = (status: string) => {
      switch (status) {
        case "resolved":
          return "#28a745";
        case "dismissed":
          return "#6c757d";
        case "open":
        default:
          return "#dc3545";
      }
    };

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
              onClick={() => setShowMobileReviewReports(false)}
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
                        onClick={() =>
                          handleReportAction(report.id, "resolved")
                        }
                        disabled={processingId === report.id}
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
                        onClick={() =>
                          handleReportAction(report.id, "dismissed")
                        }
                        disabled={processingId === report.id}
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
  };

  const MobileMediaRequestsPage = () => {
    const [mediaRequests, setMediaRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Load media requests when component mounts
    useEffect(() => {
      if (showMobileMediaRequests) {
        loadMediaRequests();
      }
    }, [showMobileMediaRequests]);

    const loadMediaRequests = async () => {
      setLoading(true);
      setError("");
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Authentication required");
        }

        const response = await fetch("/api/admin/media-requests", {
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load media requests");
        }

        const data = await response.json();
        setMediaRequests(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load media requests");
      } finally {
        setLoading(false);
      }
    };

    const handleApprove = async (requestId: number) => {
      setProcessingId(requestId);
      setError("");
      setSuccess("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Authentication required");
        }

        const response = await fetch(
          `/api/admin/media-requests/${requestId}/approve`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to approve request");
        }

        setSuccess("Request approved successfully! User can now upload media.");

        // Update local state
        setMediaRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, status: "approved", admin_id: user.id }
              : req,
          ),
        );

        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to approve request");
      } finally {
        setProcessingId(null);
      }
    };

    const handleDeny = async (requestId: number) => {
      if (
        !confirm("Are you sure you want to deny this media access request?")
      ) {
        return;
      }

      setProcessingId(requestId);
      setError("");
      setSuccess("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Authentication required");
        }

        const response = await fetch(
          `/api/admin/media-requests/${requestId}/deny`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to deny request");
        }

        setSuccess("Request denied successfully.");

        // Update local state
        setMediaRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, status: "denied", admin_id: user.id }
              : req,
          ),
        );

        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to deny request");
      } finally {
        setProcessingId(null);
      }
    };

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
              onClick={() => setShowMobileMediaRequests(false)}
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
  };

  const MobileAdminSupportPage = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [bannedUsers, setBannedUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [processingUserId, setProcessingUserId] = useState<string | null>(
      null,
    );
    const [activeTab, setActiveTab] = useState("users");

    // Load users and banned users when component mounts
    useEffect(() => {
      if (showMobileAdminSupport) {
        loadUsersAndBannedUsers();
      }
    }, [showMobileAdminSupport]);

    const loadUsersAndBannedUsers = async () => {
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
    };

    const handleBanUser = async (userId: string) => {
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

        setSuccess("User banned successfully");
        loadUsersAndBannedUsers();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to ban user");
      } finally {
        setProcessingUserId(null);
      }
    };

    const handleUnbanUser = async (userId: string) => {
      setProcessingUserId(userId);
      setError("");
      setSuccess("");

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "user" })
          .eq("id", userId);

        if (error) throw error;

        setSuccess("User unbanned successfully");
        loadUsersAndBannedUsers();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to unban user");
      } finally {
        setProcessingUserId(null);
      }
    };

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
              onClick={() => setShowMobileAdminSupport(false)}
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
                        src={
                          user.avatar_url.startsWith("/")
                            ? user.avatar_url
                            : `/public-objects/${user.avatar_url}`
                        }
                        alt="Avatar"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
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
  };

  // Mobile Edit Profile Component
  const MobileEditProfilePage = () => {
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
            padding: "16px 20px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={handleCancelEditMobileProfile}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  padding: "0",
                  marginRight: "12px",
                  cursor: "pointer",
                  color: "#000000",
                }}
              >
                ←
              </button>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {/* Profile Picture in Header */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: profile?.avatar_url ? "none" : "#e5e5e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={
                        profile.avatar_url.startsWith("/objects/")
                          ? profile.avatar_url
                          : profile.avatar_url
                      }
                      alt="Profile"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "16px", color: "#8e8e8e" }}>
                      👤
                    </span>
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#000000",
                    }}
                  >
                    Edit Profile
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {profile?.display_name || user?.email} • Member since{" "}
                    {new Date(
                      profile?.created_at || user?.created_at || new Date(),
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveMobileProfile}
              disabled={profileSaving}
              style={{
                background: "#4285f4",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: profileSaving ? "not-allowed" : "pointer",
                opacity: profileSaving ? 0.7 : 1,
              }}
            >
              {profileSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Avatar Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              padding: "20px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              {editAvatarUrl ? (
                <img
                  src={
                    editAvatarUrl.startsWith("/objects/")
                      ? editAvatarUrl
                      : editAvatarUrl
                  }
                  alt="Avatar"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "#f0f0f0",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "#e5e5e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    color: "#8e8e8e",
                    margin: "0 auto",
                  }}
                >
                  👤
                </div>
              )}
            </div>
            <div
              onClick={() => {
                // We'll implement a custom file upload here instead of using ObjectUploader
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) {
                    try {
                      const uploadParams =
                        await handleProfileGetUploadParameters();

                      // Upload the file using fetch
                      const formData = new FormData();
                      formData.append("file", files[0]);

                      const response = await fetch(uploadParams.url, {
                        method: "PUT",
                        body: files[0],
                        headers: {
                          "Content-Type": files[0].type,
                        },
                      });

                      if (response.ok) {
                        const result = {
                          successful: [
                            {
                              uploadURL: uploadParams.url,
                            },
                          ],
                        };
                        handleProfileUploadComplete(result as any);
                      }
                    } catch (error) {
                      console.error("Upload error:", error);
                    }
                  }
                };
                input.click();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#4285f4",
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <span>📷</span>
              <span>Change Photo</span>
            </div>
          </div>

          {/* Profile Information */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#000000",
                marginBottom: "16px",
              }}
            >
              Profile Information
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#000000",
                  marginBottom: "6px",
                }}
              >
                Display Name *
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter your display name"
                inputMode="text"
                autoCapitalize="words"
                autoCorrect="on"
                spellCheck={true}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#ffffff",
                  color: "#000000",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#000000",
                  marginBottom: "6px",
                }}
              >
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck={true}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#ffffff",
                  color: "#000000",
                  resize: "vertical",
                  minHeight: "80px",
                }}
              />
            </div>
          </div>
        </div>

        {profileError && (
          <div
            style={{
              position: "absolute",
              top: "80px",
              left: "20px",
              right: "20px",
              background: "#dc3545",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              textAlign: "center",
              zIndex: 1000,
            }}
          >
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div
            style={{
              position: "absolute",
              top: "80px",
              left: "20px",
              right: "20px",
              background: "#000000",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              textAlign: "center",
              zIndex: 1000,
            }}
          >
            {profileSuccess}
          </div>
        )}
      </div>
    );
  };

  // Mobile Settings Component - matches web app functionality exactly
  const MobileSettingsPage = () => {
    // Settings from web app
    const [showNameOnPrayers, setShowNameOnPrayers] = useState(true);
    const [privateProfile, setPrivateProfile] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [commentNotifications, setCommentNotifications] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [newFeatures, setNewFeatures] = useState(true);
    const [realTimeUpdates, setRealTimeUpdates] = useState(true);
    const [dailyVerseReminders, setDailyVerseReminders] = useState(true);
    const [mediaEnabled, setMediaEnabled] = useState(false);
    const [mediaRequestStatus, setMediaRequestStatus] = useState<string | null>(
      null,
    );
    const [showMediaRequestModal, setShowMediaRequestModal] = useState(false);

    const handleToggle = async (setting: string, value: boolean) => {
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      switch (setting) {
        case "showNameOnPrayers":
          setShowNameOnPrayers(value);
          break;
        case "privateProfile":
          setPrivateProfile(value);
          break;
        case "emailNotifications":
          setEmailNotifications(value);
          break;
        case "pushNotifications":
          setPushNotifications(value);
          break;
        case "commentNotifications":
          setCommentNotifications(value);
          break;
        case "weeklyDigest":
          setWeeklyDigest(value);
          break;
        case "newFeatures":
          setNewFeatures(value);
          break;
        case "realTimeUpdates":
          setRealTimeUpdates(value);
          break;
        case "dailyVerseReminders":
          setDailyVerseReminders(value);
          break;
      }

      // Sync profile settings to Supabase
      if (setting === "showNameOnPrayers" || setting === "privateProfile") {
        try {
          await upsertMyProfile({
            show_name_on_prayers:
              setting === "showNameOnPrayers" ? value : showNameOnPrayers,
            private_profile:
              setting === "privateProfile" ? value : privateProfile,
          });
        } catch (error) {
          console.warn("Failed to sync profile settings:", error);
        }
      }
    };

    return (
      <div style={{ background: "#ffffff", minHeight: "100vh" }}>
        {/* Sticky Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#ffffff",
            borderBottom: "1px solid #e5e5e5",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setShowMobileSettings(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                color: "#000000",
                cursor: "pointer",
                marginRight: "16px",
                minHeight: "44px",
                minWidth: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <div
              style={{ fontSize: "20px", fontWeight: 600, color: "#000000" }}
            >
              Settings
            </div>
          </div>
        </div>

        <div style={{ padding: "0 16px 16px" }}>
          {/* Profile Information Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PROFILE INFORMATION
            </div>

            <button
              onClick={() => {
                setShowMobileSettings(false);
                setShowMobileEditProfile(true);
                loadMobileProfile();
              }}
              style={{
                width: "100%",
                minHeight: "48px",
                background: "none",
                border: "none",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Edit Profile
                </div>
                <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
                  Manage your display name, bio, and avatar
                </div>
              </div>
              <div style={{ fontSize: "16px", color: "#c7c7cc" }}>›</div>
            </button>
          </div>

          {/* Media Upload Access Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              MEDIA
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: "#000000",
                  marginBottom: "8px",
                }}
              >
                Request link share
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#8e8e8e",
                  marginBottom: "16px",
                }}
              >
                Manage your ability to upload images and videos to posts,
                comments, and prayers
              </div>

              {mediaEnabled ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div style={{ fontSize: "14px", color: "#22c55e" }}>
                    ✓ Media Uploads Enabled
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMediaRequestModal(true)}
                  style={{
                    padding: "8px 16px",
                    background: "#007aff",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Request Access
                </button>
              )}
            </div>
          </div>

          {/* Email Notifications Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              EMAIL NOTIFICATIONS
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Receive notifications via email
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) =>
                    handleToggle("emailNotifications", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: emailNotifications ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: emailNotifications ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Comment Notifications
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get notified when someone comments on your posts
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={commentNotifications}
                  onChange={(e) =>
                    handleToggle("commentNotifications", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: commentNotifications ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: commentNotifications ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Weekly Digest
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get a summary of community activity each week
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) =>
                    handleToggle("weeklyDigest", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: weeklyDigest ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: weeklyDigest ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  New Features
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Be notified about new platform features and updates
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={newFeatures}
                  onChange={(e) =>
                    handleToggle("newFeatures", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: newFeatures ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: newFeatures ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Push Notifications Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PUSH NOTIFICATIONS
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Receive push notifications in your browser
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) =>
                    handleToggle("pushNotifications", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: pushNotifications ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: pushNotifications ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Real-time Updates
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get instant notifications for comments and reactions
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={realTimeUpdates}
                  onChange={(e) =>
                    handleToggle("realTimeUpdates", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: realTimeUpdates ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: realTimeUpdates ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Daily Verse Reminders
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Get notified when the daily verse is updated
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={dailyVerseReminders}
                  onChange={(e) =>
                    handleToggle("dailyVerseReminders", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: dailyVerseReminders ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: dailyVerseReminders ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Privacy Settings Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              PRIVACY SETTINGS
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Show my display name on prayer requests
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  When disabled, they will appear as "Anonymous"
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={showNameOnPrayers}
                  onChange={(e) =>
                    handleToggle("showNameOnPrayers", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: showNameOnPrayers ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: showNameOnPrayers ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>

            <div
              style={{
                minHeight: "48px",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#000000" }}>
                  Private profile (appear as 'Anonymous' on leaderboards)
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  You will appear as "Anonymous" on prayer leaderboards
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "51px",
                  height: "31px",
                }}
              >
                <input
                  type="checkbox"
                  checked={privateProfile}
                  onChange={(e) =>
                    handleToggle("privateProfile", e.target.checked)
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: privateProfile ? "#34c759" : "#e5e5e5",
                    borderRadius: "31px",
                    transition: "0.3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: "",
                      height: "27px",
                      width: "27px",
                      left: privateProfile ? "22px" : "2px",
                      bottom: "2px",
                      background: "#ffffff",
                      borderRadius: "50%",
                      transition: "0.3s",
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Account Deletion Section (from web app) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              marginBottom: "24px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8e8e8e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              ACCOUNT
            </div>

            <button
              onClick={() =>
                alert("Account deletion - This action cannot be undone")
              }
              style={{
                width: "100%",
                minHeight: "48px",
                background: "none",
                border: "none",
                borderTop: "1px solid #e5e5e5",
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", color: "#ff3b30" }}>
                  Delete Account
                </div>
                <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                  Permanently delete your account and all data
                </div>
              </div>
              <div style={{ fontSize: "16px", color: "#c7c7cc" }}>›</div>
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to sign out?")) {
                await signOut();
              }
            }}
            style={{
              width: "100%",
              minHeight: "48px",
              background: "#ffffff",
              border: "2px solid #ff3b30",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ff3b30",
              cursor: "pointer",
              marginBottom: "32px",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  // Mobile Saved Posts Component
  const MobileSavedPostsPage = () => {
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [savedPostsLoading, setSavedPostsLoading] = useState(true);
    const [savedPostsError, setSavedPostsError] = useState("");

    // Load saved posts when component mounts
    useEffect(() => {
      loadSavedPosts(); // fetch once when this page mounts
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // dependency-less mount effect
    // Only load when this page is shown and no posts loaded

    const loadSavedPosts = async () => {
      setSavedPostsLoading(true);
      setSavedPostsError("");

      try {
        console.log('Loading saved posts...');
        // Use the same listBookmarks function as web app but handle errors properly
        const { data, error } = await listBookmarks({ limit: 50 });

        console.log('Saved posts result:', { data, error });

        if (error) {
          console.error('Saved posts error:', error);
          setSavedPostsError(
            (error as any).message || "Failed to load saved posts",
          );
        } else {
          const bookmarkedPosts = data || [];
          console.log('Setting saved posts:', bookmarkedPosts.length, 'posts');
          setSavedPosts(bookmarkedPosts);

          // Load author profiles for saved posts
          if (Array.isArray(bookmarkedPosts) && bookmarkedPosts.length > 0) {
            const { getProfilesByIds } = await import("../lib/profiles");
            const authorIds = bookmarkedPosts
              .map((post: any) => post.author_id || post.author)
              .filter(Boolean);
            const profilesResult = await getProfilesByIds(authorIds);

            // Update the profiles map
            if (profilesResult.data && !profilesResult.error) {
              setProfiles((prev) => {
                const newProfiles = new Map(prev);
                if (Array.isArray(profilesResult.data)) {
                  profilesResult.data.forEach((profile: any) => {
                    newProfiles.set(profile.id, profile);
                  });
                } else {
                  // Handle Map format
                  Array.from(profilesResult.data).forEach(([id, profile]) => {
                    newProfiles.set(id, profile);
                  });
                }
                return newProfiles;
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading saved posts:", err);
        setSavedPostsError(
          (err as any).message || "Failed to load saved posts",
        );
      }

      setSavedPostsLoading(false);
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
            onClick={() => setShowMobileSavedPosts(false)}
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
        {savedPostsLoading ? (
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
                    {profiles.get(post.author_id)?.avatar_url ? (
                      <img
                        src={profiles.get(post.author_id).avatar_url}
                        alt="Avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#262626",
                      }}
                    >
                      {profiles.get(post.author_id)?.display_name ||
                        "Gospel User"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                      Saved{" "}
                      {formatTimeAgo(post.bookmarked_at || post.created_at)}
                    </div>
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
                </div>

                {/* Post actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderTop: "1px solid #efefef",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px" }}>
                    {/* Heart/Amen button */}
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

                  <div style={{ display: "flex", gap: "12px" }}>
                    {/* Remove from saved button */}
                    <button
                      onClick={() => handleToggleBookmark(post.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                      }}
                      title="Remove from saved"
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Mobile Community Guidelines Component
  function renderMobileCommunityGuidelinesPage() {
    return (
      <div
        style={{ padding: "16px", background: "#ffffff", minHeight: "100vh" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #dbdbdb",
          }}
        >
          <button
            onClick={() => setShowMobileCommunityGuidelines(false)}
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
            Community Guidelines
          </div>
        </div>

        {/* Content */}
        <div style={{ lineHeight: 1.6, color: "#262626" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "#262626",
            }}
          >
            Gospel Era Community Guidelines
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
            >
              Our Mission
            </div>
            <div style={{ fontSize: "14px", marginBottom: "16px" }}>
              Gospel Era is a Christ-centered community dedicated to sharing
              faith, hope, and love through prayer and Gospel messages.
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
            >
              Content Guidelines
            </div>
            <ul style={{ fontSize: "14px", marginLeft: "16px" }}>
              <li style={{ marginBottom: "4px" }}>
                Share content that glorifies Jesus Christ
              </li>
              <li style={{ marginBottom: "4px" }}>
                Focus on faith, hope, love, and encouragement
              </li>
              <li style={{ marginBottom: "4px" }}>
                Be respectful and kind to all members
              </li>
              <li style={{ marginBottom: "4px" }}>
                Avoid controversial or divisive topics
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
            >
              What's Not Allowed
            </div>
            <ul style={{ fontSize: "14px", marginLeft: "16px" }}>
              <li style={{ marginBottom: "4px" }}>
                Hate speech or discrimination
              </li>
              <li style={{ marginBottom: "4px" }}>
                Inappropriate or offensive content
              </li>
              <li style={{ marginBottom: "4px" }}>
                Spam or promotional content
              </li>
              <li style={{ marginBottom: "4px" }}>
                Content promoting other religions
              </li>
            </ul>
          </div>

          <div
            style={{
              background: "#f8f9fa",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
              marginTop: "24px",
            }}
          >
            <div
              style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
            >
              Remember
            </div>
            <div style={{ fontSize: "14px", fontStyle: "italic" }}>
              "Let your conversation be always full of grace, seasoned with
              salt, so that you may know how to answer everyone." - Colossians
              4:6
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Be a Supporter Component
  const MobileSupporterPage = () => {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"stripe" | "paypal">("stripe");

    const predefinedAmounts = [5, 10, 25, 50, 100];
    const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
    const paymentsEnabled = stripeEnabled; // PayPal not implemented yet

    const handleAmountSelect = (amount: number) => {
      console.log("Amount button clicked:", amount);
      setSelectedAmount(amount);
      setCustomAmount("");
      setError("");
    };

    const handleCustomAmountChange = (value: string) => {
      setCustomAmount(value);
      setSelectedAmount(null);
      setError("");
    };

    const getSelectedAmount = () => {
      return selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
    };

    const validateDonationAmount = (
      amount: number,
    ): { valid: boolean; error?: string } => {
      if (amount <= 0) {
        return { valid: false, error: "Amount must be greater than $0" };
      }
      if (amount < 2) {
        return { valid: false, error: "Minimum donation is $2" };
      }
      if (amount > 200) {
        return { valid: false, error: "Maximum donation is $200" };
      }
      return { valid: true };
    };

    const createStripeCheckout = async (data: {
      amount: number;
      note?: string;
    }): Promise<{ url: string } | { error: string }> => {
      try {
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            error: errorData.error || "Failed to create checkout session",
          };
        }

        const result = await response.json();
        return { url: result.url };
      } catch (error) {
        console.error("Error creating Stripe checkout:", error);
        return { error: "Network error occurred" };
      }
    };

    const handleStripePayment = async () => {
      const amount = getSelectedAmount();

      // Validate amount
      const validation = validateDonationAmount(amount);
      if (!validation.valid) {
        setError(validation.error || "Invalid amount");
        return;
      }

      setIsProcessing(true);
      setError("");

      try {
        const result = await createStripeCheckout({
          amount: amount,
          note: message.trim() || undefined,
        });

        if ("error" in result) {
          setError(result.error);
        } else {
          // Navigate directly to Stripe Checkout (mobile-friendly)
          window.location.href = result.url;
        }
      } catch (error) {
        console.error("Stripe payment error:", error);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    };

    const handleSupport = () => {
      if (paymentsEnabled && activeTab === "stripe") {
        handleStripePayment();
      } else {
        const amount = getSelectedAmount();
        const validation = validateDonationAmount(amount);
        if (!validation.valid) {
          setError(validation.error || "Invalid amount");
          return;
        }

        alert(
          `Thank you for wanting to support with $${amount}! Payment processing will be implemented soon.`,
        );
      }
    };

    return (
      <div
        onPointerDownCapture={stopIfTextField}
        onMouseDownCapture={stopIfTextField}
        onClickCapture={stopIfTextField}
        style={{ padding: "16px", background: "#ffffff", minHeight: "100vh" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #dbdbdb",
          }}
        >
          <button
            onClick={() => setShowMobileSupporter(false)}
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
            Be a Supporter
          </div>
        </div>

        {/* Support Notice */}
        <div
          style={{
            background: "#0095f6",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
            color: "#ffffff",
          }}
        >
          <div
            style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}
          >
            Support Gospel Era
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            Your contribution supports hosting, development, and moderation.
            Contributions are not tax-deductible.
          </div>
        </div>

        {/* Payment Processing Banner */}
        {!paymentsEnabled && (
          <div
            style={{
              background: "#fff8dc",
              border: "1px solid #f0e68c",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "14px", color: "#b8860b", fontWeight: 600 }}
            >
              Payment processing will be enabled soon; you can still pledge now.
            </div>
          </div>
        )}

        {/* Amount Selection */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "12px",
            }}
          >
            Choose Amount
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            {predefinedAmounts.map((amount) => (
              <button
                key={amount}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAmountSelect(amount);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  console.log("Touch start on amount button:", amount);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border:
                    selectedAmount === amount
                      ? "2px solid #4285f4"
                      : "1px solid #dbdbdb",
                  background: selectedAmount === amount ? "#4285f4" : "#ffffff",
                  color: selectedAmount === amount ? "#ffffff" : "#262626",
                  fontSize: "14px",
                  fontWeight: selectedAmount === amount ? 700 : 600,
                  cursor: "pointer",
                  touchAction: "manipulation",
                  userSelect: "none",
                  WebkitTapHighlightColor: "rgba(0,0,0,0)",
                  transform:
                    selectedAmount === amount ? "scale(1.02)" : "scale(1)",
                  transition: "all 0.2s ease",
                  boxShadow:
                    selectedAmount === amount
                      ? "0 2px 8px rgba(66, 133, 244, 0.3)"
                      : "none",
                }}
              >
                ${amount}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "8px" }}>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              inputMode="decimal"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: "100%",
                padding: "12px",
                border: customAmount
                  ? "2px solid #4285f4"
                  : "1px solid #dbdbdb",
                borderRadius: "8px",
                fontSize: "16px", // 16px prevents zoom on iOS
                touchAction: "manipulation",
                WebkitAppearance: "none",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                boxShadow: customAmount
                  ? "0 2px 8px rgba(66, 133, 244, 0.2)"
                  : "none",
              }}
              min="2"
              max="200"
            />
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "8px",
            }}
          >
            Optional Message
          </div>
          <textarea
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputMode="text"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            style={{
              width: "100%",
              padding: "12px",
              border: message ? "2px solid #4285f4" : "1px solid #dbdbdb",
              borderRadius: "8px",
              fontSize: "16px", // 16px prevents zoom on iOS
              minHeight: "80px",
              resize: "vertical",
              touchAction: "manipulation",
              WebkitAppearance: "none",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              boxShadow: message ? "0 2px 8px rgba(66, 133, 244, 0.2)" : "none",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #fcc",
              color: "#c00",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Payment Method Selection */}
        {paymentsEnabled && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "8px",
              }}
            >
              Payment Method
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setActiveTab("stripe")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #dbdbdb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: activeTab === "stripe" ? "#0095f6" : "#ffffff",
                  color: activeTab === "stripe" ? "#ffffff" : "#262626",
                  cursor: "pointer",
                }}
              >
                Stripe
              </button>
              <button
                disabled
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #dbdbdb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: "#f5f5f5",
                  color: "#8e8e8e",
                  cursor: "not-allowed",
                }}
              >
                PayPal (Soon)
              </button>
            </div>
          </div>
        )}

        {/* Support Button */}
        <button
          onClick={handleSupport}
          onTouchStart={() => {}} // Enable touch events
          disabled={!getSelectedAmount() || isProcessing}
          style={{
            width: "100%",
            background: getSelectedAmount() ? "#0095f6" : "#dbdbdb",
            color: getSelectedAmount() ? "#ffffff" : "#8e8e8e",
            border: "none",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: getSelectedAmount() ? "pointer" : "default",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitTapHighlightColor: "rgba(0,0,0,0)",
            boxSizing: "border-box",
            transition: "all 0.2s ease",
            boxShadow: getSelectedAmount()
              ? "0 2px 8px rgba(66, 133, 244, 0.3)"
              : "none",
          }}
        >
          {isProcessing
            ? "Processing..."
            : paymentsEnabled
              ? `Pay $${getSelectedAmount() || 0} via Stripe`
              : `Support with $${getSelectedAmount() || 0}`}
        </button>

        {/* Info */}
        {!paymentsEnabled && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#f8f9fa",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#8e8e8e",
              textAlign: "center",
            }}
          >
            Payment processing will be implemented soon. Thank you for your
            interest in supporting Gospel Era!
          </div>
        )}
      </div>
    );
  };

  // Mobile Help Component
  const MobileHelpPage = () => {
    const SUPPORT_EMAIL = "ridibi.service@gmail.com";

    const copyEmail = async () => {
      try {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        alert("Email copied to clipboard!");
      } catch (err) {
        alert("Failed to copy email. Please copy manually: " + SUPPORT_EMAIL);
      }
    };

    const openEmail = () => {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Gospel Era Support Request`;
    };

    return (
      <div
        style={{ padding: "16px", background: "#ffffff", minHeight: "100vh" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #dbdbdb",
          }}
        >
          <button
            onClick={() => setShowMobileHelp(false)}
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
            Help & Support
          </div>
        </div>

        {/* Contact Section */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "16px",
            }}
          >
            📧 Contact Support
          </div>

          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e1e5e9",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#8e8e8e",
                marginBottom: "8px",
              }}
            >
              Support Email
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "16px",
              }}
            >
              {SUPPORT_EMAIL}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={copyEmail}
                style={{
                  flex: 1,
                  background: "#4285f4",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📋 Copy Email
              </button>

              <button
                onClick={openEmail}
                style={{
                  flex: 1,
                  background: "#ffffff",
                  color: "#262626",
                  border: "1px solid #dbdbdb",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✉️ Open Mail App
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "16px",
            }}
          >
            ❓ Frequently Asked Questions
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div
              style={{
                background: "#f8f9fa",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #e1e5e9",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "4px",
                }}
              >
                How do I create a prayer request?
              </div>
              <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
                Go to the Prayer tab and use the "Create Prayer Request" section
                at the top.
              </div>
            </div>

            <div
              style={{
                background: "#f8f9fa",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #e1e5e9",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "4px",
                }}
              >
                How do I report inappropriate content?
              </div>
              <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
                Tap the three dots (⋯) on any post or comment and select
                "Report".
              </div>
            </div>

            <div
              style={{
                background: "#f8f9fa",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid #e1e5e9",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "4px",
                }}
              >
                How do I change my profile picture?
              </div>
              <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
                Go to Settings and tap "Change Profile Picture" in the Profile
                Settings section.
              </div>
            </div>
          </div>
        </div>

        {/* Community Guidelines Link */}
        <div
          style={{
            background: "#f0f8ff",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #b3d9ff",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#1e40af",
              marginBottom: "8px",
            }}
          >
            📖 Community Guidelines
          </div>
          <div
            style={{ fontSize: "13px", color: "#1e40af", marginBottom: "12px" }}
          >
            Learn about our Christ-centered community standards
          </div>
          <button
            onClick={() => {
              setShowMobileHelp(false);
              setShowMobileCommunityGuidelines(true);
            }}
            style={{
              background: "#1e40af",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View Guidelines
          </button>
        </div>
      </div>
    );
  };

  // Profile Component
  function renderProfilePage() {
    return (
      <div style={{ padding: "16px" }}>
        {/* Profile header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: userProfile?.avatar_url ? "none" : "#dbdbdb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              marginRight: "16px",
              color: "#8e8e8e",
              overflow: "hidden",
            }}
          >
            {userProfile?.avatar_url ? (
              <img
                src={
                  userProfile.avatar_url.startsWith("/")
                    ? userProfile.avatar_url
                    : `/public-objects/${userProfile.avatar_url}`
                }
                alt="Profile"
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              "👤"
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
            >
              {userProfile?.display_name ||
                user?.email?.split("@")[0] ||
                "Gospel User"}
            </div>
            <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
              @
              {userProfile?.display_name?.toLowerCase().replace(/\s+/g, "") ||
                user?.email?.split("@")[0] ||
                "gospeluser"}
            </div>
          </div>
          <button
            onClick={() => setShowMobileSettings(true)}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              color: "#262626",
              cursor: "pointer",
              padding: "8px",
            }}
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Bio */}
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.4,
            marginBottom: "16px",
            color: "#262626",
          }}
        >
          {userProfile?.bio ||
            "Sharing faith, hope, and love through Christ ✝️"}
          <br />
          Prayer warrior | Bible study enthusiast
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: "20px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
            >
              {posts.length}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Posts</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
            >
              {prayerRequests.length}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Prayers</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
            >
              {userProfile?.followers_count || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Followers</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#262626" }}
            >
              {userProfile?.following_count || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#8e8e8e" }}>Following</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setShowMobileSettings(true)}
            style={{
              flex: 1,
              background: "#f2f2f2",
              border: "none",
              padding: "10px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#262626",
              cursor: "pointer",
            }}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setShowMobileSavedPosts(true)}
            style={{
              background: "#f2f2f2",
              border: "none",
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "16px",
              color: "#262626",
              cursor: "pointer",
            }}
            title="Saved Posts"
          >
            🔖
          </button>
        </div>

        {/* Recent Activity */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "16px",
              color: "#262626",
              marginBottom: "12px",
            }}
          >
            Recent Activity
          </div>
          {posts.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "4px",
              }}
            >
              {posts.slice(0, 6).map((post) => (
                <div
                  key={post.id}
                  style={{
                    aspectRatio: "1",
                    background: "#f0f0f0",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  📖
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#8e8e8e",
                fontSize: "14px",
                padding: "20px",
              }}
            >
              No posts yet. Share your first Gospel message!
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={signOut}
          style={{
            width: "100%",
            background: "#dc2626",
            color: "#ffffff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Loading state
  if (authLoading) {
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

  // Handle prayer detail view
  if (selectedPrayerId && selectedPrayerDetail) {
    return (
      <PrayerDetailView
        prayer={selectedPrayerDetail}
        onBack={() => {
          setSelectedPrayerId(null);
          setSelectedPrayerDetail(null);
        }}
      />
    );
  }

  // Handle full leaderboard view
  if (showFullLeaderboard) {
    return <FullLeaderboardView onBack={() => setShowFullLeaderboard(false)} />;
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
              gap: "16px",
              position: "relative",
            }}
          >
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
                  background: userProfile?.avatar_url ? "none" : "#dbdbdb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {userProfile?.avatar_url ? (
                  <img
                    src={
                      userProfile.avatar_url.startsWith("/objects/")
                        ? userProfile.avatar_url
                        : userProfile.avatar_url.startsWith("/")
                          ? userProfile.avatar_url
                          : `/public-objects/${userProfile.avatar_url}`
                    }
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
                  <span style={{ fontSize: "14px", color: "#8e8e8e" }}>👤</span>
                )}
              </div>
              <span
                style={{ fontSize: "14px", fontWeight: 600, color: "#262626" }}
              >
                {userProfile?.display_name ||
                  user?.email?.split("@")[0] ||
                  "User"}
              </span>
              <span style={{ fontSize: "12px", color: "#8e8e8e" }}>▼</span>
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
                    {userProfile?.display_name || "Gospel User"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                    {user?.email}
                  </div>
                </div>

                <button
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // (same body as onClick)
                    setShowUserDropdown(false);
                    /* … your existing state toggles … */
                  }}
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

                {(userProfile?.role === "admin" || isAdmin) && (
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
          renderLoginPage()
        ) : showMobileReviewReports ? (
          <MobileReviewReportsPage />
        ) : showMobileMediaRequests ? (
          <MobileMediaRequestsPage />
        ) : showMobileAdminSupport ? (
          <MobileAdminSupportPage />
        ) : showMobileEditProfile ? (
          <MobileEditProfilePage />
        ) : showMobileProfile ? (
          <MobileProfilePage />
        ) : showMobileSettings ? (
          <MobileSettingsPage />
        ) : showMobileSavedPosts ? (
          <MobileSavedPostsPage />
        ) : showMobileCommunityGuidelines ? (
          renderMobileCommunityGuidelinesPage()
        ) : showMobileSupporter ? (
          <MobileSupporterPage />
        ) : showMobileHelp ? (
          <MobileHelpPage />
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
              {renderCreatePage()}
            </div>
            <div
              style={{
                display: activeTab === 2 ? "flex" : "none",
                flex: 1,
                flexDirection: "column",
              }}
            >
              {renderPrayerPage()}
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={activeTab === 2 ? "#4285f4" : "#333333"}
              strokeWidth="2"
            >
              <path d="M14 2v6a2 2 0 01-2 2 2 2 0 01-2-2V2" />
              <path d="M10 2C8 2 8 4 10 6c0 1 0 2-2 2s-4-1-4-4" />
              <path d="M14 2c2 0 2 2 0 4 0 1 0 2 2 2s4-1 4-4" />
              <path d="M9 16v3a1 1 0 002 0v-3" />
              <path d="M13 16v3a1 1 0 002 0v-3" />
              <path d="M9 16h6" />
            </svg>
            <span style={{ fontSize: "10px", marginTop: "2px" }}>Prayer</span>
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
                onClick={() => {
                  setShowMediaRequestModal(false);
                  alert(
                    "Link sharing request submitted! You will be notified when approved.",
                  );
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
    </div>
  );
}
