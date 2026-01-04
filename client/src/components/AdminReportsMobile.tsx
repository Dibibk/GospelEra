import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateReportStatus, banUser, unbanUser, getBannedUsers } from "@/lib/admin";
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
  Loader2,
  Check
} from "lucide-react";

// Mobile app theme styles (matching MobileApp.tsx)
const ADMIN_STYLES = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: '#ffffff',
    minHeight: '100dvh',
    maxWidth: '414px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '14px',
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #dbdbdb',
    padding: '12px 16px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#262626',
  },
  searchContainer: {
    position: 'relative' as const,
    marginBottom: '12px',
  },
  searchInput: {
    width: '100%',
    height: '36px',
    background: '#f2f2f2',
    border: 'none',
    borderRadius: '18px',
    padding: '0 16px 0 36px',
    fontSize: '14px',
    color: '#262626',
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8e8e8e',
    pointerEvents: 'none' as const,
  },
  tabList: {
    display: 'flex',
    borderBottom: '1px solid #dbdbdb',
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: 600,
    color: '#8e8e8e',
    cursor: 'pointer',
  },
  tabActive: {
    color: '#262626',
    borderBottomColor: '#262626',
  },
  content: {
    flex: 1,
    overflow: 'auto' as const,
    background: '#ffffff',
    padding: '16px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  filterButton: {
    padding: '6px 12px',
    background: '#f2f2f2',
    border: '1px solid #dbdbdb',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#262626',
    cursor: 'pointer',
  },
  filterButtonActive: {
    background: '#262626',
    color: '#ffffff',
    borderColor: '#262626',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: '8px',
    marginBottom: '12px',
    padding: '12px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#262626',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#8e8e8e',
    marginTop: '4px',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeOpen: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  badgeResolved: {
    background: '#d1fae5',
    color: '#065f46',
  },
  badgeDismissed: {
    background: '#e5e7eb',
    color: '#374151',
  },
  badgeDefault: {
    background: '#f3f4f6',
    color: '#4b5563',
  },
  button: {
    padding: '8px 16px',
    background: '#262626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonSecondary: {
    background: '#f2f2f2',
    color: '#262626',
    border: '1px solid #dbdbdb',
  },
  buttonSmall: {
    padding: '6px 12px',
    fontSize: '13px',
  },
  buttonIcon: {
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#262626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #dbdbdb',
    borderRadius: '4px',
    background: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    background: '#262626',
    borderColor: '#262626',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '12px',
    maxWidth: '90%',
    maxHeight: '80vh',
    overflow: 'auto' as const,
    padding: '20px',
  },
  modalFullscreen: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#ffffff',
    zIndex: 1001,
    overflow: 'auto' as const,
  },
  modalHeader: {
    borderBottom: '1px solid #dbdbdb',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#262626',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#8e8e8e',
    marginTop: '4px',
  },
  bulkActions: {
    position: 'sticky' as const,
    bottom: 0,
    background: '#ffffff',
    borderTop: '1px solid #dbdbdb',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: '#8e8e8e',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#8e8e8e',
  },
  menuContainer: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    background: '#ffffff',
    border: '1px solid #dbdbdb',
    borderRadius: '8px',
    minWidth: '150px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  menuItem: {
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    color: '#262626',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  menuItemHover: {
    background: '#f2f2f2',
  },
};

interface AdminReportsMobileProps {
  isVisible: boolean;
  onBack: () => void;
  onActionComplete?: () => void;
  onError?: (error: string) => void;
}

// Simple toast utility
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#262626' : '#dc2626'};
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    max-width: 90%;
    text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

export function AdminReportsMobile({
  isVisible,
  onBack,
  onActionComplete,
  onError,
}: AdminReportsMobileProps) {
  // Data state
  const [reports, setReports] = useState<any[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  
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

  // Get status badge style
  const getStatusBadgeStyle = useCallback((status: string) => {
    const styles: Record<string, any> = {
      open: ADMIN_STYLES.badgeOpen,
      resolved: ADMIN_STYLES.badgeResolved,
      dismissed: ADMIN_STYLES.badgeDismissed
    };
    return { ...ADMIN_STYLES.badge, ...(styles[status] || ADMIN_STYLES.badgeDefault) };
  }, []);

  // Load reports via backend API (bypasses RLS)
  const loadReports = useCallback(async (status = statusFilter) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session for loading reports');
        return;
      }

      const statusParam = status === 'all' ? 'open' : status;
      const response = await fetch(`/api/admin/reports?status=${statusParam}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      showToast(err.message || 'Failed to load reports', 'error');
    }
  }, [statusFilter]);

  // Load prayer requests with commitments
  const loadPrayerRequests = useCallback(async () => {
    try {
      // Fetch prayer requests with commitments (without foreign key hints)
      const { data: requestsData, error: requestsError } = await supabase
        .from('prayer_requests')
        .select(`
          *,
          prayer_commitments (
            request_id,
            warrior,
            status,
            prayed_at,
            committed_at,
            note
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (requestsError) throw requestsError;
      if (!requestsData || requestsData.length === 0) {
        setPrayerRequests([]);
        return;
      }

      // Collect all requester IDs and warrior IDs
      const requesterIds = Array.from(new Set(requestsData.map(r => r.requester).filter(Boolean)));
      const warriorIds = Array.from(new Set(
        requestsData.flatMap(r => (r.prayer_commitments || []).map((c: any) => c.warrior).filter(Boolean))
      ));
      const allProfileIds = Array.from(new Set([...requesterIds, ...warriorIds]));

      // Fetch all profiles in one query
      const profilesMap = new Map<string, any>();
      if (allProfileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role')
          .in('id', allProfileIds);
        
        if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
        }
      }

      // Merge profile data into requests
      const enrichedRequests = requestsData.map(request => ({
        ...request,
        profiles: profilesMap.get(request.requester) || null,
        prayer_commitments: (request.prayer_commitments || []).map((commitment: any) => ({
          ...commitment,
          profiles: profilesMap.get(commitment.warrior) || null
        }))
      }));

      setPrayerRequests(enrichedRequests);
    } catch (err: any) {
      console.error('Error loading prayer requests:', err);
      showToast(err.message || 'Failed to load prayer requests', 'error');
    }
  }, []);

  // Load banned users
  const loadBannedUsers = useCallback(async () => {
    try {
      const users = await getBannedUsers();
      setBannedUsers(users);
    } catch (err: any) {
      console.error('Error loading banned users:', err);
      showToast(err.message || 'Failed to load banned users', 'error');
    }
  }, []);

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
      
      showToast(`Report ${newStatus} successfully`);

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
      
      showToast(err.message || 'Failed to update report', 'error');
      
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
  }, [actionLoading, reports, statusFilter, onActionComplete, onError]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedReports.size === 0) return;

    const reportIds = Array.from(selectedReports);
    
    try {
      await Promise.all(reportIds.map(id => handleStatusChange(id, action)));
      setSelectedReports(new Set());
      showToast(`${reportIds.length} reports ${action} successfully`);
    } catch (err) {
      showToast('Some operations failed', 'error');
    }
  }, [selectedReports, handleStatusChange]);

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
        report.comment?.author?.display_name?.toLowerCase().includes(query) ||
        report.prayer_request?.title?.toLowerCase().includes(query) ||
        report.prayer_request?.details?.toLowerCase().includes(query) ||
        report.prayer_request?.author?.display_name?.toLowerCase().includes(query)
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
        showToast('User banned successfully');
        await loadBannedUsers();
      } else if (action === 'unban') {
        await unbanUser(userId);
        showToast('User unbanned successfully');
        await loadBannedUsers();
      }
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
      
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
  }, [actionLoading, loadBannedUsers, onActionComplete, onError]);

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

      showToast(`Prayer request ${action === 'close' ? 'closed' : 'marked as answered'} successfully`);

      loadPrayerRequests();
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update prayer request', 'error');
      
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
  }, [loadPrayerRequests, onActionComplete, onError]);

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

      showToast('Commitment deleted successfully');

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
      showToast(err.message || 'Failed to delete commitment', 'error');
      
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
  }, [loadPrayerRequests, selectedRequest, prayerRequests, onActionComplete, onError]);

  if (!isVisible) {
    return null;
  }

  return (
    <div style={ADMIN_STYLES.container}>
      {/* Header */}
      <div style={ADMIN_STYLES.header}>
        <div style={ADMIN_STYLES.headerRow}>
          <button
            onClick={onBack}
            data-testid="button-back"
            style={ADMIN_STYLES.buttonIcon}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={ADMIN_STYLES.headerTitle}>Admin Panel</div>
        </div>

        {/* Search */}
        <div style={ADMIN_STYLES.searchContainer}>
          <div style={ADMIN_STYLES.searchIcon}>
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by target, reporter, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={ADMIN_STYLES.searchInput}
            data-testid="input-search"
          />
        </div>

        {/* Tabs */}
        <div>
          <div style={ADMIN_STYLES.tabList}>
            <button
              onClick={() => setActiveTab("reports")}
              data-testid="tab-reports"
              style={{...ADMIN_STYLES.tab, ...(activeTab === "reports" ? ADMIN_STYLES.tabActive : {})}}
            >
              Reports ({filteredReports.length})
            </button>
            <button
              onClick={() => setActiveTab("prayer")}
              data-testid="tab-prayer"
              style={{...ADMIN_STYLES.tab, ...(activeTab === "prayer" ? ADMIN_STYLES.tabActive : {})}}
            >
              Prayer ({prayerRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("banned-users")}
              data-testid="tab-banned"
              style={{...ADMIN_STYLES.tab, ...(activeTab === "banned-users" ? ADMIN_STYLES.tabActive : {})}}
            >
              Banned ({bannedUsers.length})
            </button>
          </div>

          {/* Reports Tab */}
          <div style={{display: activeTab === "reports" ? 'block' : 'none'}}>
            <div style={ADMIN_STYLES.content}>
              {/* Status Filter */}
              <div style={ADMIN_STYLES.filterRow}>
                {['open', 'resolved', 'dismissed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      loadReports(status);
                    }}
                    data-testid={`button-filter-${status}`}
                    style={{
                      ...ADMIN_STYLES.filterButton,
                      ...(statusFilter === status ? ADMIN_STYLES.filterButtonActive : {}),
                      flex: 1,
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Bulk Actions */}
              {selectedReports.size > 0 && (
                <div style={{...ADMIN_STYLES.card, background: '#eff6ff', marginBottom: '12px'}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'}}>
                    <span style={{fontSize: '13px', fontWeight: 600}}>
                      {selectedReports.size} selected
                    </span>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button 
                        onClick={() => handleBulkAction('resolved')}
                        disabled={statusFilter === 'resolved'}
                        data-testid="button-bulk-resolve"
                        style={{
                          ...ADMIN_STYLES.button,
                          ...ADMIN_STYLES.buttonSmall,
                          ...(statusFilter === 'resolved' ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                        }}
                      >
                        Resolve Selected
                      </button>
                      <button 
                        onClick={() => handleBulkAction('dismissed')}
                        disabled={statusFilter === 'dismissed'}
                        data-testid="button-bulk-dismiss"
                        style={{
                          ...ADMIN_STYLES.button,
                          ...ADMIN_STYLES.buttonSecondary,
                          ...ADMIN_STYLES.buttonSmall,
                          ...(statusFilter === 'dismissed' ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                        }}
                      >
                        Dismiss Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Select All */}
              {filteredReports.length > 0 && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', marginBottom: '12px'}}>
                  <div
                    role="checkbox"
                    aria-checked={selectedReports.size === filteredReports.length && filteredReports.length > 0}
                    tabIndex={0}
                    onClick={handleSelectAll}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectAll();
                      }
                    }}
                    data-testid="checkbox-select-all"
                    style={{
                      ...ADMIN_STYLES.checkbox,
                      ...(selectedReports.size === filteredReports.length && filteredReports.length > 0 ? ADMIN_STYLES.checkboxChecked : {})
                    }}
                  >
                    {selectedReports.size === filteredReports.length && filteredReports.length > 0 && <Check size={14} color="#ffffff" />}
                  </div>
                  <label style={{fontSize: '13px', fontWeight: 600}}>
                    Select All ({filteredReports.length})
                  </label>
                </div>
              )}

              {/* Reports List */}
              {loading ? (
                <div style={ADMIN_STYLES.loadingContainer}>
                  <div style={{textAlign: 'center'}}>
                    <Loader2 size={32} className="animate-spin" style={{margin: '0 auto 8px'}} />
                    <div>Loading reports...</div>
                  </div>
                </div>
              ) : filteredReports.length === 0 ? (
                <div style={ADMIN_STYLES.emptyState}>
                  No reports found matching your criteria
                </div>
              ) : (
                <div>
                  {filteredReports.map((report) => (
                    <div key={report.id} data-testid={`card-report-${report.id}`} style={ADMIN_STYLES.card}>
                      <div style={{display: 'flex', alignItems: 'start', gap: '12px'}}>
                        <div
                          role="checkbox"
                          aria-checked={selectedReports.has(report.id)}
                          tabIndex={0}
                          onClick={() => {
                            const newSet = new Set(selectedReports);
                            if (selectedReports.has(report.id)) {
                              newSet.delete(report.id);
                            } else {
                              newSet.add(report.id);
                            }
                            setSelectedReports(newSet);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              const newSet = new Set(selectedReports);
                              if (selectedReports.has(report.id)) {
                                newSet.delete(report.id);
                              } else {
                                newSet.add(report.id);
                              }
                              setSelectedReports(newSet);
                            }
                          }}
                          data-testid={`checkbox-report-${report.id}`}
                          style={{
                            ...ADMIN_STYLES.checkbox,
                            marginTop: '4px',
                            ...(selectedReports.has(report.id) ? ADMIN_STYLES.checkboxChecked : {})
                          }}
                        >
                          {selectedReports.has(report.id) && <Check size={14} color="#ffffff" />}
                        </div>
                        <div style={{flex: 1, minWidth: 0}}>
                          {/* Report Header */}
                          <div style={{display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px'}}>
                            <div style={{flex: 1}}>
                              <h3 style={{fontWeight: 600, fontSize: '13px', marginBottom: '4px'}}>
                                {report.reason || 'No reason provided'}
                              </h3>
                              <div style={{fontSize: '12px', color: '#8e8e8e'}}>
                                <div>By: {report.reporter?.display_name || 'Unknown'}</div>
                                <div>{report.reporter?.email}</div>
                                <div>{formatDate(report.created_at)}</div>
                              </div>
                            </div>
                            <span style={getStatusBadgeStyle(report.status)}>
                              {report.status}
                            </span>
                          </div>

                          {/* Target Info */}
                          {(report.post || report.comment) && (
                            <div style={{marginBottom: '12px', padding: '8px', background: '#f2f2f2', borderRadius: '6px', fontSize: '12px'}}>
                              <div style={{fontWeight: 600, marginBottom: '4px'}}>
                                Target: {report.post ? 'Post' : 'Comment'}
                              </div>
                              {report.post && (
                                <>
                                  <div style={{fontWeight: 600}}>{report.post.title}</div>
                                  {report.post.content && (
                                    <div style={{color: '#8e8e8e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                      {report.post.content.substring(0, 100)}...
                                    </div>
                                  )}
                                </>
                              )}
                              {report.comment && report.comment.content && (
                                <div style={{color: '#8e8e8e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                  {report.comment.content.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                            {report.status === 'open' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(report.id, 'resolved')}
                                  disabled={actionLoading.has(report.id)}
                                  data-testid={`button-resolve-${report.id}`}
                                  style={{
                                    ...ADMIN_STYLES.button,
                                    ...ADMIN_STYLES.buttonSmall,
                                    ...(actionLoading.has(report.id) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                                  }}
                                >
                                  {actionLoading.has(report.id) ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    'Resolve'
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStatusChange(report.id, 'dismissed')}
                                  disabled={actionLoading.has(report.id)}
                                  data-testid={`button-dismiss-${report.id}`}
                                  style={{
                                    ...ADMIN_STYLES.button,
                                    ...ADMIN_STYLES.buttonSecondary,
                                    ...ADMIN_STYLES.buttonSmall,
                                    ...(actionLoading.has(report.id) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                                  }}
                                >
                                  Dismiss
                                </button>
                              </>
                            )}

                            {/* User Actions Dropdown */}
                            {(report.post || report.comment) && (
                              <div style={ADMIN_STYLES.menuContainer}>
                                <button
                                  onClick={() => setShowUserMenu(showUserMenu === report.reporter?.id ? null : report.reporter?.id)}
                                  style={{...ADMIN_STYLES.button, ...ADMIN_STYLES.buttonSecondary, ...ADMIN_STYLES.buttonSmall}}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {showUserMenu === report.reporter?.id && (
                                  <>
                                    <div 
                                      style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9}}
                                      onClick={() => setShowUserMenu(null)}
                                    />
                                    <div style={ADMIN_STYLES.menu}>
                                      <button
                                        onClick={() => {
                                          handleUserAction(report.reporter?.id, 'ban');
                                          setShowUserMenu(null);
                                        }}
                                        disabled={actionLoading.has(`user-${report.reporter?.id}`)}
                                        style={{
                                          ...ADMIN_STYLES.menuItem,
                                          ...(actionLoading.has(`user-${report.reporter?.id}`) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = ADMIN_STYLES.menuItemHover.background}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                      >
                                        <Ban size={16} />
                                        Ban Reporter
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prayer Requests Tab */}
          <div style={{display: activeTab === "prayer" ? 'block' : 'none'}}>
            <div style={ADMIN_STYLES.content}>
              {loading ? (
                <div style={ADMIN_STYLES.loadingContainer}>
                  <div style={{textAlign: 'center'}}>
                    <Loader2 size={32} className="animate-spin" style={{margin: '0 auto 8px'}} />
                    <div>Loading prayer requests...</div>
                  </div>
                </div>
              ) : prayerRequests.length === 0 ? (
                <div style={ADMIN_STYLES.emptyState}>
                  <Heart size={48} style={{margin: '0 auto 16px', color: '#8e8e8e'}} />
                  <h3 style={{fontSize: '16px', fontWeight: 600, marginBottom: '8px'}}>No prayer requests</h3>
                  <p>No prayer requests have been submitted yet.</p>
                </div>
              ) : (
                <div>
                  {prayerRequests.map((request) => (
                    <div key={request.id} data-testid={`card-prayer-${request.id}`} style={ADMIN_STYLES.card}>
                      {/* Header */}
                      <div style={{display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px'}}>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
                            <h3 style={{fontWeight: 600, fontSize: '13px'}}>{request.title}</h3>
                            <span style={getStatusBadgeStyle(request.status === 'open' ? 'open' : request.status === 'answered' ? 'resolved' : 'dismissed')}>
                              {request.status}
                            </span>
                            {request.is_anonymous && (
                              <span style={{...ADMIN_STYLES.badge, background: '#f3f4f6', color: '#4b5563', fontSize: '10px'}}>Anonymous</span>
                            )}
                          </div>
                          <p style={{fontSize: '13px', color: '#8e8e8e', marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                            {request.content}
                          </p>
                          <div style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#8e8e8e', flexWrap: 'wrap'}}>
                            <span>By: {request.is_anonymous ? 'Anonymous' : request.profiles?.display_name || 'Unknown'}</span>
                            <span>{formatDate(request.created_at)}</span>
                            <span>{request.prayer_commitments?.length || 0} commitments</span>
                            <span>{request.prayer_commitments?.filter((c: any) => c.status === 'prayed').length || 0} prayed</span>
                          </div>
                          {request.tags && request.tags.length > 0 && (
                            <div style={{display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap'}}>
                              {request.tags.map((tag: string, index: number) => (
                                <span key={index} style={{...ADMIN_STYLES.badge, background: '#f3f4f6', color: '#4b5563', fontSize: '10px'}}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowCommitments(true);
                          }}
                          data-testid={`button-view-commitments-${request.id}`}
                          style={{...ADMIN_STYLES.button, ...ADMIN_STYLES.buttonSecondary, ...ADMIN_STYLES.buttonSmall, display: 'flex', alignItems: 'center', gap: '4px'}}
                        >
                          <Users size={12} />
                          View Commitments
                        </button>
                        {request.status === 'open' && (
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto'}}>
                            <button
                              onClick={() => handlePrayerRequestAction(request.id, 'answered')}
                              disabled={actionLoading.has(request.id)}
                              data-testid={`button-answered-${request.id}`}
                              title="Mark Answered"
                              style={{
                                padding: '8px',
                                background: '#f2f2f2',
                                color: '#16a34a',
                                border: '1px solid #dbdbdb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ...(actionLoading.has(request.id) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                              }}
                            >
                              {actionLoading.has(request.id) ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handlePrayerRequestAction(request.id, 'close')}
                              disabled={actionLoading.has(request.id)}
                              data-testid={`button-close-${request.id}`}
                              title="Close"
                              style={{
                                padding: '8px',
                                background: '#f2f2f2',
                                color: '#dc2626',
                                border: '1px solid #dbdbdb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ...(actionLoading.has(request.id) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Banned Users Tab */}
          <div style={{display: activeTab === "banned-users" ? 'block' : 'none'}}>
            <div style={ADMIN_STYLES.content}>
              {loading ? (
                <div style={ADMIN_STYLES.loadingContainer}>
                  <div style={{textAlign: 'center'}}>
                    <Loader2 size={32} className="animate-spin" style={{margin: '0 auto 8px'}} />
                    <div>Loading banned users...</div>
                  </div>
                </div>
              ) : bannedUsers.length === 0 ? (
                <div style={ADMIN_STYLES.emptyState}>
                  <UserCheck size={48} style={{margin: '0 auto 16px', color: '#8e8e8e'}} />
                  <h3 style={{fontSize: '16px', fontWeight: 600, marginBottom: '8px'}}>No banned users</h3>
                  <p>All users currently have access to the platform.</p>
                </div>
              ) : (
                <div>
                  {bannedUsers.map((user) => (
                    <div key={user.id} data-testid={`card-banned-user-${user.id}`} style={ADMIN_STYLES.card}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div style={{height: '40px', width: '40px', borderRadius: '50%', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                          <span style={{fontSize: '13px', fontWeight: 600}}>
                            {(user.display_name || user.email)?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <p style={{fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {user.display_name || 'Unknown User'}
                          </p>
                          <p style={{fontSize: '12px', color: '#8e8e8e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {user.email}
                          </p>
                          <p style={{fontSize: '12px', color: '#8e8e8e'}}>
                            Banned: {formatDate(user.updated_at || user.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnbanUser(user.id, user.display_name || user.email)}
                          disabled={actionLoading.has(user.id)}
                          data-testid={`button-unban-${user.id}`}
                          style={{
                            ...ADMIN_STYLES.button,
                            ...ADMIN_STYLES.buttonSmall,
                            background: '#16a34a',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            ...(actionLoading.has(user.id) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                          }}
                        >
                          {actionLoading.has(user.id) ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Unbanning...
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} />
                              Unban
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Commitments Sheet */}
      {showCommitments && (
        <div style={ADMIN_STYLES.modalFullscreen}>
          <div style={{...ADMIN_STYLES.header, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={ADMIN_STYLES.headerTitle}>
              Prayer Commitments for "{selectedRequest?.title}"
            </div>
            <button
              onClick={() => setShowCommitments(false)}
              style={ADMIN_STYLES.buttonIcon}
            >
              <X size={24} />
            </button>
          </div>
          <div style={{...ADMIN_STYLES.content, maxHeight: 'calc(100vh - 60px)', overflow: 'auto'}}>
            <div style={{...ADMIN_STYLES.modalDescription, marginBottom: '16px'}}>
              View and manage commitments for this prayer request
            </div>
            {selectedRequest?.prayer_commitments?.length === 0 ? (
              <div style={ADMIN_STYLES.emptyState}>
                No commitments yet for this prayer request.
              </div>
            ) : (
              selectedRequest?.prayer_commitments?.map((commitment: any) => (
                <div key={`${commitment.request_id}-${commitment.warrior}`} style={ADMIN_STYLES.card}>
                  <div style={{marginBottom: '12px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
                      <span style={{fontWeight: 600, fontSize: '13px'}}>
                        {commitment.profiles?.display_name || 'Unknown User'}
                      </span>
                      <span style={getStatusBadgeStyle(commitment.status === 'prayed' ? 'resolved' : 'dismissed')}>
                        {commitment.status}
                      </span>
                      {commitment.profiles?.role === 'banned' && (
                        <span style={{...ADMIN_STYLES.badge, background: '#fee2e2', color: '#991b1b', fontSize: '10px'}}>Banned</span>
                      )}
                    </div>
                    <div style={{fontSize: '12px', color: '#8e8e8e'}}>
                      <div>Committed: {formatDate(commitment.committed_at)}</div>
                      {commitment.prayed_at && (
                        <div>Prayed: {formatDate(commitment.prayed_at)}</div>
                      )}
                    </div>
                    {commitment.note && (
                      <p style={{fontSize: '13px', color: '#8e8e8e', marginTop: '8px', fontStyle: 'italic'}}>
                        "{commitment.note}"
                      </p>
                    )}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                    <button
                      onClick={() => handleDeleteCommitment(commitment.request_id, commitment.warrior)}
                      disabled={actionLoading.has(`${commitment.request_id}-${commitment.warrior}`)}
                      style={{
                        ...ADMIN_STYLES.button,
                        ...ADMIN_STYLES.buttonSecondary,
                        ...ADMIN_STYLES.buttonSmall,
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        ...(actionLoading.has(`${commitment.request_id}-${commitment.warrior}`) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                      }}
                    >
                      {actionLoading.has(`${commitment.request_id}-${commitment.warrior}`) ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} />
                      )}
                      Delete
                    </button>
                    {commitment.profiles?.role !== 'banned' && (
                      <button
                        onClick={() => handleUserAction(commitment.warrior, 'ban')}
                        disabled={actionLoading.has(`user-${commitment.warrior}`)}
                        style={{
                          ...ADMIN_STYLES.button,
                          ...ADMIN_STYLES.buttonSecondary,
                          ...ADMIN_STYLES.buttonSmall,
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          ...(actionLoading.has(`user-${commitment.warrior}`) ? {opacity: 0.5, cursor: 'not-allowed'} : {})
                        }}
                      >
                        <Ban size={12} />
                        Ban User
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Unban Confirmation Dialog */}
      {unbanDialogUser && (
        <div style={ADMIN_STYLES.overlay} onClick={() => setUnbanDialogUser(null)}>
          <div style={ADMIN_STYLES.modal} onClick={(e) => e.stopPropagation()}>
            <div style={ADMIN_STYLES.modalHeader}>
              <div style={ADMIN_STYLES.modalTitle}>Unban User?</div>
              <div style={ADMIN_STYLES.modalDescription}>
                Are you sure you want to unban "{unbanDialogUser?.name}"? They will be able to post and comment again.
              </div>
            </div>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px'}}>
              <button
                onClick={() => setUnbanDialogUser(null)}
                style={{...ADMIN_STYLES.button, ...ADMIN_STYLES.buttonSecondary}}
              >
                Cancel
              </button>
              <button
                onClick={confirmUnban}
                style={ADMIN_STYLES.button}
              >
                Confirm Unban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
