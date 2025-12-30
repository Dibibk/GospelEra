import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft,
  Heart,
  Check,
  Users,
  Clock,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import {
  getPrayerRequest,
  commitToPray,
  confirmPrayed,
  uncommitToPray,
} from "../lib/prayer";
import { supabase } from "../lib/supabaseClient";

interface PrayerRequest {
  id: number;
  title: string;
  details: string;
  tags: string[];
  is_anonymous: boolean;
  status: string;
  created_at: string;
  requester?: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string;
    role?: string;
  };
  prayer_stats?: {
    committed_count: number;
    prayed_count: number;
    total_warriors: number;
    recent_activity?: Array<{
      kind: string;
      message?: string;
      created_at: string;
      profiles?: {
        display_name?: string;
        avatar_url?: string;
      };
    }>;
  };
  prayer_commitments?: Array<{
    status: string;
    prayed_at?: string;
    committed_at: string;
    note?: string;
    warrior: string;
    profiles?: {
      display_name?: string;
      avatar_url?: string;
    };
  }>;
}
const buildStats = (commitments: PrayerRequest["prayer_commitments"] = []) => {
  const committed_count = commitments.filter(
    (c) => c.status === "committed",
  ).length;
  const prayed_count = commitments.filter((c) => c.status === "prayed").length;
  return {
    committed_count,
    prayed_count,
    total_warriors: commitments.length,
  };
};

export default function PrayerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<PrayerRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [prayerNote, setPrayerNote] = useState("");

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  // Set up realtime subscription for this specific prayer request
  useEffect(() => {
    if (!id) return;

    const subscription = supabase
      .channel(`prayer_request_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prayer_commitments",
          filter: `request_id=eq.${id}`,
        },
        (payload) => {
          console.log("Prayer commitment change for request:", payload);
          handleCommitmentChange(payload);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const handleCommitmentChange = async (payload: any) => {
    if (!request) return;

    try {
      // Fetch updated request data with fresh commitments (without foreign key hints)
      const { data, error } = await supabase
        .from("prayer_requests")
        .select(
          `
          *,
          prayer_commitments (
            status,
            prayed_at,
            committed_at,
            note,
            warrior
          )
        `,
        )
        .eq("id", request.id)
        .single();

      if (error) {
        console.error("Failed to refresh request data:", error);
        return;
      }

      // Collect all profile IDs needed
      const profileIds = [
        data.requester,
        ...(data.prayer_commitments || []).map((c: any) => c.warrior),
      ].filter(Boolean);
      const uniqueProfileIds = Array.from(new Set(profileIds));

      // Fetch profiles
      const profilesMap = new Map<string, any>();
      if (uniqueProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role")
          .in("id", uniqueProfileIds);

        if (profilesData) {
          profilesData.forEach((p) => profilesMap.set(p.id, p));
        }
      }

      // Calculate updated stats
      const commitments = data.prayer_commitments || [];
      const updatedStats = {
        committed_count: commitments.filter(
          (c: any) => c.status === "committed",
        ).length,
        prayed_count: commitments.filter((c: any) => c.status === "prayed")
          .length,
        total_warriors: commitments.length,
      };

      // Merge profile data and update the request
      setRequest({
        ...data,
        profiles: profilesMap.get(data.requester) || null,
        prayer_commitments: commitments.map((c: any) => ({
          ...c,
          profiles: profilesMap.get(c.warrior) || null,
        })),
        prayer_stats: updatedStats,
      });
    } catch (err) {
      console.error("Error updating request data:", err);
    }
  };

  const loadRequest = async () => {
    if (!id) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await getPrayerRequest(parseInt(id));

      if (error) {
        setError(error);
        return;
      }

      setRequest(data);
    } catch (err) {
      console.error("Failed to load prayer request:", err);
      setError("Failed to load prayer request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitToPray = async () => {
    if (!request || !user) return;

    // ✅ 1) Optimistically update UI immediately (button + counts)
    const optimisticCommitment = {
      status: "committed",
      committed_at: new Date().toISOString(),
      prayed_at: undefined,
      note: undefined,
      warrior: user.id,
      profiles: {
        display_name: user.user_metadata?.display_name || user.email || "You",
        avatar_url: user.user_metadata?.avatar_url,
      },
    };

    setRequest((prev) => {
      if (!prev) return prev;

      // prevent duplicates if user clicks twice
      const already = prev.prayer_commitments?.some(
        (c) => c.warrior === user.id,
      );
      if (already) return prev;

      const nextCommitments = [
        ...(prev.prayer_commitments || []),
        optimisticCommitment,
      ];
      return {
        ...prev,
        prayer_commitments: nextCommitments,
        prayer_stats: buildStats(nextCommitments),
      };
    });

    setActionLoading(true);

    try {
      // ✅ 2) Save to DB
      const { error } = await commitToPray(request.id);
      if (error) {
        console.error("Failed to commit:", error);

        // ✅ 3) Rollback optimistic update if DB fails
        setRequest((prev) => {
          if (!prev) return prev;
          const nextCommitments = (prev.prayer_commitments || []).filter(
            (c) => c.warrior !== user.id,
          );
          return {
            ...prev,
            prayer_commitments: nextCommitments,
            prayer_stats: buildStats(nextCommitments),
          };
        });

        return;
      }

      // ✅ 4) Sync from server to ensure exact truth (optional but recommended)
      await loadRequest();
    } catch (err) {
      console.error("Failed to commit to pray:", err);

      // rollback on unexpected failure too
      setRequest((prev) => {
        if (!prev) return prev;
        const nextCommitments = (prev.prayer_commitments || []).filter(
          (c) => c.warrior !== user.id,
        );
        return {
          ...prev,
          prayer_commitments: nextCommitments,
          prayer_stats: buildStats(nextCommitments),
        };
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUncommit = async () => {
    if (!request) return;

    setActionLoading(true);
    try {
      const { error } = await uncommitToPray(request.id);
      if (error) {
        console.error("Failed to uncommit:", error);
        return;
      }
      loadRequest();
    } catch (err) {
      console.error("Failed to uncommit:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPrayed = async () => {
    if (!request) return;

    setActionLoading(true);
    try {
      const { error } = await confirmPrayed(request.id, {
        note: prayerNote.trim() || null,
      });
      if (error) {
        console.error("Failed to confirm prayed:", error);
        return;
      }
      setShowNoteDialog(false);
      setPrayerNote("");
      loadRequest();
    } catch (err) {
      console.error("Failed to confirm prayed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getUserCommitmentStatus = () => {
    if (!request || !user) return "none";
    const userCommitment = request.prayer_commitments?.find(
      (c) => c.warrior === user.id,
    );
    if (!userCommitment) return "none";
    return userCommitment.status === "prayed" ? "prayed" : "committed";
  };

  const isRequester = request?.requester === user?.id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
              <p className="text-red-800 mb-4">
                {error || "Prayer request not found"}
              </p>
              <Link
                to="/prayer/browse"
                className="text-purple-600 hover:text-purple-700"
              >
                ← Back to Prayer Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const commitmentStatus = getUserCommitmentStatus();
  const userCommitment = request.prayer_commitments?.find(
    (c) => c.warrior === user?.id,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/prayer/browse"
                className="text-purple-600 hover:text-purple-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-purple-800">
                Prayer Request
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Request Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-purple-800 mb-4">
                {request.title}
              </h1>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    {request.is_anonymous
                      ? "Anonymous"
                      : request.profiles?.display_name || "Unknown"}
                  </span>
                  <span>•</span>
                  <span>{formatDate(request.created_at)}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {request.prayer_stats?.total_warriors || 0} prayer warriors
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                    <Check className="w-4 h-4" />
                    <span>
                      {request.prayer_stats?.prayed_count || 0} prayed
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                    <Heart className="w-4 h-4" />
                    <span>
                      {request.prayer_stats?.committed_count || 0} committed
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {request.tags && request.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {request.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Request Details */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Prayer Request
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {request.details}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {commitmentStatus === "none" && (
                    <button
                      onClick={handleCommitToPray}
                      disabled={actionLoading}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      <span>I will pray for this</span>
                    </button>
                  )}

                  {commitmentStatus === "committed" && (
                    <>
                      <button
                        onClick={() => setShowNoteDialog(true)}
                        disabled={actionLoading}
                        className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm I prayed</span>
                      </button>
                      <button
                        onClick={handleUncommit}
                        disabled={actionLoading}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Remove commitment
                      </button>
                    </>
                  )}

                  {commitmentStatus === "prayed" &&
                    userCommitment?.prayed_at && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span>
                          You prayed on {formatDate(userCommitment.prayed_at)}
                        </span>
                        {userCommitment.note && (
                          <span className="text-gray-600">
                            - "{userCommitment.note}"
                          </span>
                        )}
                      </div>
                    )}
                </div>

                {isRequester && (
                  <div className="flex items-center space-x-3">
                    <button className="text-purple-600 hover:text-purple-700 text-sm">
                      Mark as Answered
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 text-sm">
                      Close Request
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prayer Warriors */}
            {request.prayer_commitments &&
              request.prayer_commitments.length > 0 && (
                <div className="border-t pt-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Prayer Warriors
                  </h2>
                  <div className="space-y-3">
                    {request.prayer_commitments.map((commitment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 text-sm font-medium">
                              {commitment.profiles?.display_name?.[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {commitment.profiles?.display_name || "Anonymous"}
                            </p>
                            {commitment.status === "prayed" &&
                              commitment.prayed_at && (
                                <p className="text-sm text-green-600">
                                  Prayed on {formatDate(commitment.prayed_at)}
                                </p>
                              )}
                            {commitment.note && (
                              <p className="text-sm text-gray-600 italic">
                                "{commitment.note}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {commitment.status === "prayed" ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <Check className="w-4 h-4 mr-1" />
                              Prayed
                            </span>
                          ) : (
                            <span className="flex items-center text-purple-600 text-sm">
                              <Clock className="w-4 h-4 mr-1" />
                              Committed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Prayer Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Your Prayer
            </h3>
            <p className="text-gray-600 mb-4">
              Thank you for praying! You can optionally add a note about your
              prayer.
            </p>
            <textarea
              value={prayerNote}
              onChange={(e) => setPrayerNote(e.target.value)}
              placeholder="Optional: Share how you prayed or any thoughts..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowNoteDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrayed}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm Prayer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
