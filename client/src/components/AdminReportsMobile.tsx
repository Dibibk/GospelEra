import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateReportStatus, banUser, unbanUser, getBannedUsers } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Eye, 
  Ban, 
  UserCheck, 
  MoreVertical, 
  Search, 
  Filter, 
  Heart, 
  X, 
  Users, 
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  
  // Data state
  const [reports, setReports] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  
  // Selection and action state
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  
  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showCommitments, setShowCommitments] = useState(false);
  const [unbanDialogUser, setUnbanDialogUser] = useState<{id: string, name: string} | null>(null);

  // Format date utility
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get status badge variant
  const getStatusBadgeVariant = useCallback((status: string): 'destructive' | 'default' | 'secondary' => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      open: 'destructive',
      resolved: 'default',
      dismissed: 'secondary'
    };
    return variants[status] || 'default';
  }, []);

  // Load reports with server-side filtering
  const loadReports = useCallback(async (status = statusFilter) => {
    try {
      // Build query for reports
      const query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (status !== 'all') {
        query.eq('status', status);
      }

      const { data: reportsData, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Collect IDs for related data
      const reporterIds = Array.from(new Set(reportsData.map(r => r.reporter_id).filter(Boolean)));
      const postIds = Array.from(new Set(reportsData.filter(r => r.target_type === 'post').map(r => r.target_id)));
      const commentIds = Array.from(new Set(reportsData.filter(r => r.target_type === 'comment').map(r => r.target_id)));

      // Fetch related data in parallel
      const [profilesData, postsData, commentsData] = await Promise.all([
        reporterIds.length > 0 
          ? supabase.from('profiles').select('id, display_name, email').in('id', reporterIds).then(r => r.data || [])
          : Promise.resolve([]),
        postIds.length > 0
          ? supabase.from('posts').select('id, title, content, author').in('id', postIds).then(r => r.data || [])
          : Promise.resolve([]),
        commentIds.length > 0
          ? supabase.from('comments').select('id, content, author').in('id', commentIds).then(r => r.data || [])
          : Promise.resolve([])
      ]);

      // Get author IDs from posts and comments
      const authorIds = Array.from(new Set([
        ...postsData.map(p => p.author).filter(Boolean),
        ...commentsData.map(c => c.author).filter(Boolean)
      ]));

      // Fetch author profiles
      const authorsData = authorIds.length > 0
        ? await supabase.from('profiles').select('id, display_name').in('id', authorIds).then(r => r.data || [])
        : [];

      // Create lookup maps
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const postsMap = new Map(postsData.map(p => [p.id, p]));
      const commentsMap = new Map(commentsData.map(c => [c.id, c]));
      const authorsMap = new Map(authorsData.map(a => [a.id, a]));

      // Merge data
      const enrichedReports = reportsData.map(report => {
        const enriched: any = { ...report };
        
        // Add reporter
        if (report.reporter_id) {
          enriched.reporter = profilesMap.get(report.reporter_id);
        }
        
        // Add post/comment with author
        if (report.target_type === 'post' && report.target_id) {
          const post = postsMap.get(report.target_id);
          if (post) {
            enriched.post = {
              ...post,
              author: authorsMap.get(post.author)
            };
          }
        } else if (report.target_type === 'comment' && report.target_id) {
          const comment = commentsMap.get(report.target_id);
          if (comment) {
            enriched.comment = {
              ...comment,
              author: authorsMap.get(comment.author)
            };
          }
        }
        
        return enriched;
      });

      setReports(enrichedReports);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [statusFilter, toast]);

  // Load prayer requests with commitments
  const loadPrayerRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select(`
          *,
          profiles!prayer_requests_requester_fkey (
            display_name,
            avatar_url,
            role
          ),
          prayer_commitments (
            request_id,
            warrior,
            status,
            prayed_at,
            committed_at,
            note,
            profiles!prayer_commitments_warrior_fkey (
              display_name,
              avatar_url,
              role
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPrayerRequests(data || []);
    } catch (err: any) {
      console.error('Error loading prayer requests:', err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load banned users
  const loadBannedUsers = useCallback(async () => {
    try {
      const users = await getBannedUsers();
      setBannedUsers(users);
    } catch (err: any) {
      console.error('Error loading banned users:', err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadReports(),
        loadPrayerRequests(),
        loadBannedUsers(),
      ]);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to load data";
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [loadReports, loadPrayerRequests, loadBannedUsers, onError]);

  // Effect: Load data when visible
  useEffect(() => {
    if (isVisible) {
      loadAllData();
    }
  }, [isVisible, loadAllData]);

  // Handle status change with optimistic update
  const handleStatusChange = useCallback(async (reportId: string, newStatus: string) => {
    if (actionLoading.has(reportId)) return;

    setActionLoading(prev => new Set(prev).add(reportId));

    // Optimistic update
    const originalReports = [...reports];
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { ...report, status: newStatus }
        : report
    ));

    try {
      await updateReportStatus(reportId, newStatus);
      
      toast({
        title: 'Success',
        description: `Report ${newStatus} successfully`
      });

      // Remove from current view if filter doesn't match
      if (newStatus !== statusFilter) {
        setReports(prev => prev.filter(report => report.id !== reportId));
      }
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      // Revert optimistic update
      setReports(originalReports);
      
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      
      if (onError) {
        onError(err.message);
      }
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  }, [actionLoading, reports, statusFilter, toast, onActionComplete, onError]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedReports.size === 0) return;

    const reportIds = Array.from(selectedReports);
    
    try {
      await Promise.all(reportIds.map(id => handleStatusChange(id, action)));
      setSelectedReports(new Set());
      toast({
        title: 'Success',
        description: `${reportIds.length} reports ${action} successfully`
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Some operations failed',
        variant: 'destructive'
      });
    }
  }, [selectedReports, handleStatusChange, toast]);

  // Filtered reports with enhanced search (useMemo to avoid re-computing on every render)
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        String(report.target_id || '').toLowerCase().includes(query) ||
        report.reporter?.email?.toLowerCase().includes(query) ||
        report.reporter?.display_name?.toLowerCase().includes(query) ||
        report.post?.title?.toLowerCase().includes(query) ||
        report.post?.content?.toLowerCase().includes(query) ||
        report.post?.author?.display_name?.toLowerCase().includes(query) ||
        report.comment?.content?.toLowerCase().includes(query) ||
        report.comment?.author?.display_name?.toLowerCase().includes(query)
      );
    });
  }, [reports, searchQuery]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map(r => r.id)));
    }
  }, [selectedReports.size, filteredReports]);

  // Handle user actions (ban/unban)
  const handleUserAction = useCallback(async (userId: string, action: string) => {
    if (actionLoading.has(`user-${userId}`)) return;

    setActionLoading(prev => new Set(prev).add(`user-${userId}`));

    try {
      if (action === 'ban') {
        await banUser(userId);
        toast({
          title: 'Success',
          description: 'User banned successfully'
        });
        await loadBannedUsers();
      } else if (action === 'unban') {
        await unbanUser(userId);
        toast({
          title: 'Success',
          description: 'User unbanned successfully'
        });
        await loadBannedUsers();
      }
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      
      if (onError) {
        onError(err.message);
      }
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(`user-${userId}`);
        return newSet;
      });
    }
  }, [actionLoading, toast, loadBannedUsers, onActionComplete, onError]);

  // Handle unban with confirmation
  const handleUnbanUser = useCallback(async (userId: string, displayName: string) => {
    setUnbanDialogUser({ id: userId, name: displayName });
  }, []);

  const confirmUnban = useCallback(async () => {
    if (!unbanDialogUser) return;
    
    await handleUserAction(unbanDialogUser.id, 'unban');
    setUnbanDialogUser(null);
  }, [unbanDialogUser, handleUserAction]);

  // Handle prayer request actions
  const handlePrayerRequestAction = useCallback(async (requestId: string, action: 'close' | 'answered') => {
    setActionLoading(prev => new Set(prev).add(requestId));
    
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({ 
          status: action === 'close' ? 'closed' : 'answered',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Prayer request ${action === 'close' ? 'closed' : 'marked as answered'} successfully`
      });

      loadPrayerRequests();
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      
      if (onError) {
        onError(err.message);
      }
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  }, [toast, loadPrayerRequests, onActionComplete, onError]);

  // Handle delete commitment
  const handleDeleteCommitment = useCallback(async (requestId: string, warriorId: string) => {
    const commitmentKey = `${requestId}-${warriorId}`;
    setActionLoading(prev => new Set(prev).add(commitmentKey));
    
    try {
      const { error } = await supabase
        .from('prayer_commitments')
        .delete()
        .eq('request_id', requestId)
        .eq('warrior', warriorId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Commitment deleted successfully'
      });

      loadPrayerRequests();
      if (selectedRequest) {
        // Refresh the selected request data
        const updated = prayerRequests.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      
      if (onError) {
        onError(err.message);
      }
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(commitmentKey);
        return newSet;
      });
    }
  }, [toast, loadPrayerRequests, selectedRequest, prayerRequests, onActionComplete, onError]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by target, reporter, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" data-testid="tab-reports">
              Reports ({filteredReports.length})
            </TabsTrigger>
            <TabsTrigger value="prayer" data-testid="tab-prayer">
              Prayer ({prayerRequests.length})
            </TabsTrigger>
            <TabsTrigger value="banned-users" data-testid="tab-banned">
              Banned ({bannedUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4 space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {['open', 'resolved', 'dismissed'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(status);
                    loadReports(status);
                  }}
                  data-testid={`button-filter-${status}`}
                  className="flex-1"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedReports.size > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {selectedReports.size} selected
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleBulkAction('resolved')}
                        disabled={statusFilter === 'resolved'}
                        data-testid="button-bulk-resolve"
                      >
                        Resolve Selected
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('dismissed')}
                        disabled={statusFilter === 'dismissed'}
                        data-testid="button-bulk-dismiss"
                      >
                        Dismiss Selected
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Select All */}
            {filteredReports.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={selectedReports.size === filteredReports.length && filteredReports.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <label className="text-sm font-medium">
                  Select All ({filteredReports.length})
                </label>
              </div>
            )}

            {/* Reports List */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports found matching your criteria
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <Card key={report.id} data-testid={`card-report-${report.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedReports.has(report.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedReports);
                            if (checked) {
                              newSet.add(report.id);
                            } else {
                              newSet.delete(report.id);
                            }
                            setSelectedReports(newSet);
                          }}
                          data-testid={`checkbox-report-${report.id}`}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          {/* Report Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm mb-1">
                                {report.reason || 'No reason provided'}
                              </h3>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>By: {report.reporter?.display_name || 'Unknown'}</div>
                                <div>{report.reporter?.email}</div>
                                <div>{formatDate(report.created_at)}</div>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </div>

                          {/* Target Info */}
                          {(report.post || report.comment) && (
                            <div className="mb-3 p-2 bg-muted rounded text-xs">
                              <div className="font-medium mb-1">
                                Target: {report.post ? 'Post' : 'Comment'}
                              </div>
                              {report.post && (
                                <>
                                  <div className="font-medium">{report.post.title}</div>
                                  {report.post.content && (
                                    <div className="text-muted-foreground truncate">
                                      {report.post.content.substring(0, 100)}...
                                    </div>
                                  )}
                                </>
                              )}
                              {report.comment && report.comment.content && (
                                <div className="text-muted-foreground truncate">
                                  {report.comment.content.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {report.status === 'open' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(report.id, 'resolved')}
                                  disabled={actionLoading.has(report.id)}
                                  data-testid={`button-resolve-${report.id}`}
                                >
                                  {actionLoading.has(report.id) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Resolve'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(report.id, 'dismissed')}
                                  disabled={actionLoading.has(report.id)}
                                  data-testid={`button-dismiss-${report.id}`}
                                >
                                  Dismiss
                                </Button>
                              </>
                            )}

                            {/* User Actions Dropdown */}
                            {(report.post || report.comment) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleUserAction(report.reporter?.id, 'ban')}
                                    disabled={actionLoading.has(`user-${report.reporter?.id}`)}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Ban Reporter
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Prayer Requests Tab */}
          <TabsContent value="prayer" className="mt-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading prayer requests...
              </div>
            ) : prayerRequests.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No prayer requests</h3>
                <p className="text-muted-foreground">No prayer requests have been submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prayerRequests.map((request) => (
                  <Card key={request.id} data-testid={`card-prayer-${request.id}`}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-medium text-sm">{request.title}</h3>
                              <Badge variant={request.status === 'open' ? 'destructive' : 
                                            request.status === 'answered' ? 'default' : 'secondary'}>
                                {request.status}
                              </Badge>
                              {request.is_anonymous && (
                                <Badge variant="outline" className="text-xs">Anonymous</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {request.content}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span>By: {request.is_anonymous ? 'Anonymous' : request.profiles?.display_name || 'Unknown'}</span>
                              <span>{formatDate(request.created_at)}</span>
                              <span>{request.prayer_commitments?.length || 0} commitments</span>
                              <span>{request.prayer_commitments?.filter((c: any) => c.status === 'prayed').length || 0} prayed</span>
                            </div>
                            {request.tags && request.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {request.tags.map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowCommitments(true);
                            }}
                            data-testid={`button-view-commitments-${request.id}`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            View Commitments
                          </Button>
                          {request.status === 'open' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrayerRequestAction(request.id, 'answered')}
                                disabled={actionLoading.has(request.id)}
                                className="text-green-600 hover:text-green-700"
                                data-testid={`button-answered-${request.id}`}
                              >
                                {actionLoading.has(request.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Mark Answered
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrayerRequestAction(request.id, 'close')}
                                disabled={actionLoading.has(request.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-close-${request.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Close
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Banned Users Tab */}
          <TabsContent value="banned-users" className="mt-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading banned users...
              </div>
            ) : bannedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No banned users</h3>
                <p className="text-muted-foreground">All users currently have access to the platform.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bannedUsers.map((user) => (
                  <Card key={user.id} data-testid={`card-banned-user-${user.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">
                            {(user.display_name || user.email)?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.display_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Banned: {formatDate(user.updated_at || user.created_at)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleUnbanUser(user.id, user.display_name || user.email)}
                          disabled={actionLoading.has(user.id)}
                          className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                          data-testid={`button-unban-${user.id}`}
                        >
                          {actionLoading.has(user.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Unbanning...
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Unban
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Commitments Sheet */}
      <Sheet open={showCommitments} onOpenChange={setShowCommitments}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>
              Prayer Commitments for "{selectedRequest?.title}"
            </SheetTitle>
            <SheetDescription>
              View and manage commitments for this prayer request
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(80vh-8rem)]">
            {selectedRequest?.prayer_commitments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No commitments yet for this prayer request.
              </div>
            ) : (
              selectedRequest?.prayer_commitments?.map((commitment: any) => (
                <Card key={`${commitment.request_id}-${commitment.warrior}`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {commitment.profiles?.display_name || 'Unknown User'}
                            </span>
                            <Badge variant={commitment.status === 'prayed' ? 'default' : 'secondary'}>
                              {commitment.status}
                            </Badge>
                            {commitment.profiles?.role === 'banned' && (
                              <Badge variant="destructive" className="text-xs">Banned</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Committed: {formatDate(commitment.committed_at)}</div>
                            {commitment.prayed_at && (
                              <div>Prayed: {formatDate(commitment.prayed_at)}</div>
                            )}
                          </div>
                          {commitment.note && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{commitment.note}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCommitment(commitment.request_id, commitment.warrior)}
                          disabled={actionLoading.has(`${commitment.request_id}-${commitment.warrior}`)}
                          className="text-red-600 hover:text-red-700"
                        >
                          {actionLoading.has(`${commitment.request_id}-${commitment.warrior}`) ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          Delete
                        </Button>
                        {commitment.profiles?.role !== 'banned' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserAction(commitment.warrior, 'ban')}
                            disabled={actionLoading.has(`user-${commitment.warrior}`)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Ban User
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Unban Confirmation Dialog */}
      <AlertDialog open={!!unbanDialogUser} onOpenChange={() => setUnbanDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unban "{unbanDialogUser?.name}"? They will be able to post and comment again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnban}>
              Confirm Unban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
