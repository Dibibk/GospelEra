import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Eye, Ban, UserCheck, MoreVertical, Search, Filter, Heart, X, Users, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { listReports, updateReportStatus, banUser, unbanUser, getUserProfile, getBannedUsers } from '../lib/admin.js'
import { supabase } from '../lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function AdminReports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [prayerRequests, setPrayerRequests] = useState<any[]>([])
  const [bannedUsers, setBannedUsers] = useState<any[]>([])
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState('open')
  const [activeTab, setActiveTab] = useState('reports')
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showCommitments, setShowCommitments] = useState(false)

  // Check admin status on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/')
        return
      }

      try {
        const profile = await getUserProfile(user.id)
        // Admin access based on email - only diviabharath@gmail.com is admin
        const adminEmails = ['diviabharath@gmail.com']
        const emailBasedAdmin = user?.email && adminEmails.includes(user.email)
        
        if (profile.role !== 'admin' && !emailBasedAdmin) {
          navigate('/')
          return
        }
        setLoading(false)
        loadReports()
        loadPrayerRequests()
        loadBannedUsers()
      } catch (err) {
        console.error('Admin access check failed:', err)
        navigate('/')
      }
    }

    checkAdminAccess()
  }, [user, navigate])

  const loadReports = async (status = currentFilter) => {
    try {
      setError('')
      const { items } = await listReports({ status, limit: 100 })
      setReports(items)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadPrayerRequests = async () => {
    try {
      setError('')
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
            id,
            status,
            prayed_at,
            committed_at,
            note,
            warrior,
            profiles!prayer_commitments_warrior_fkey (
              display_name,
              avatar_url,
              role
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setPrayerRequests(data || [])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadBannedUsers = async () => {
    try {
      setError('')
      const users = await getBannedUsers()
      setBannedUsers(users)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    if (actionLoading.has(reportId)) return

    setActionLoading(prev => new Set(prev).add(reportId))

    try {
      // Optimistic update
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus }
          : report
      ))

      await updateReportStatus(reportId, newStatus)
      
      toast({
        title: 'Success',
        description: `Report ${newStatus} successfully`
      })

      // Remove from current view if filter doesn't match
      if (newStatus !== currentFilter) {
        setReports(prev => prev.filter(report => report.id !== reportId))
      }
    } catch (err: any) {
      // Revert optimistic update
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: currentFilter }
          : report
      ))
      
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const handleUserAction = async (userId: string, action: string) => {
    if (actionLoading.has(`user-${userId}`)) return

    setActionLoading(prev => new Set(prev).add(`user-${userId}`))

    try {
      if (action === 'ban') {
        await banUser(userId)
        toast({
          title: 'Success',
          description: 'User banned successfully'
        })
        await loadBannedUsers()
      } else if (action === 'unban') {
        await unbanUser(userId)
        toast({
          title: 'Success',
          description: 'User unbanned successfully'
        })
        await loadBannedUsers()
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(`user-${userId}`)
        return newSet
      })
    }
  }

  const handleUnbanUser = async (userId: string, displayName: string) => {
    if (actionLoading.has(userId)) return

    const confirmed = window.confirm(`Are you sure you want to unban "${displayName}"? They will be able to post and comment again.`)
    if (!confirmed) return

    setActionLoading(prev => new Set(prev).add(userId))

    try {
      await unbanUser(userId)
      
      toast({
        title: "User unbanned",
        description: `${displayName} has been unbanned successfully.`,
      })

      await loadBannedUsers()
    } catch (err: any) {
      toast({
        title: "Unban failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handlePrayerRequestAction = async (requestId: string, action: 'close' | 'answered') => {
    setActionLoading(prev => new Set(prev).add(requestId))
    
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({ 
          status: action === 'close' ? 'closed' : 'answered',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Prayer request ${action === 'close' ? 'closed' : 'marked as answered'} successfully`
      })

      loadPrayerRequests()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleDeleteCommitment = async (commitmentId: string, warriorId: string) => {
    setActionLoading(prev => new Set(prev).add(commitmentId))
    
    try {
      const { error } = await supabase
        .from('prayer_commitments')
        .delete()
        .eq('id', commitmentId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Commitment deleted successfully'
      })

      loadPrayerRequests()
      if (selectedRequest) {
        // Refresh the selected request data
        const updated = prayerRequests.find(r => r.id === selectedRequest.id)
        if (updated) setSelectedRequest(updated)
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(commitmentId)
        return newSet
      })
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedReports.size === 0) return

    const reportIds = Array.from(selectedReports)
    const promises = reportIds.map(id => handleStatusChange(id, action))
    
    try {
      await Promise.all(promises)
      setSelectedReports(new Set())
      toast({
        title: 'Success',
        description: `${reportIds.length} reports ${action} successfully`
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Some operations failed',
        variant: 'destructive'
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(filteredReports.map(r => r.id)))
    }
  }

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      report.target_id?.toLowerCase().includes(query) ||
      report.reporter?.email?.toLowerCase().includes(query) ||
      report.target?.author?.display_name?.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      open: 'destructive',
      resolved: 'default',
      dismissed: 'secondary'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading admin panel...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="prayer">Prayer Requests</TabsTrigger>
          <TabsTrigger value="banned-users">Banned Users</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Search and Filters for Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by target ID, reporter email, or author name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filters */}
              <Tabs value={currentFilter} onValueChange={setCurrentFilter}>
                <TabsList>
                  <TabsTrigger value="open" onClick={() => loadReports('open')}>
                    Open
                  </TabsTrigger>
                  <TabsTrigger value="resolved" onClick={() => loadReports('resolved')}>
                    Resolved
                  </TabsTrigger>
                  <TabsTrigger value="dismissed" onClick={() => loadReports('dismissed')}>
                    Dismissed
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Bulk Actions */}
              {selectedReports.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedReports.size} selected
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkAction('resolved')}
                    disabled={currentFilter === 'resolved'}
                  >
                    Resolve Selected
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleBulkAction('dismissed')}
                    disabled={currentFilter === 'dismissed'}
                  >
                    Dismiss Selected
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({filteredReports.length})</CardTitle>
          <CardDescription>
            Manage community reports and take appropriate actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <Checkbox
                      checked={selectedReports.size === filteredReports.length && filteredReports.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Target</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">Reporter</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedReports.has(report.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedReports)
                          if (checked) {
                            newSet.add(report.id)
                          } else {
                            newSet.delete(report.id)
                          }
                          setSelectedReports(newSet)
                        }}
                      />
                    </td>
                    <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {report.target?.deleted ? (
                            <span className="text-gray-500">[Deleted {report.target_type}]</span>
                          ) : (
                            <Link 
                              to={report.target_type === 'post' ? `/posts/${report.target_id}` : `/comments/${report.target_id}`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            >
                              {report.target_type === 'post' ? 'Post' : 'Comment'}
                            </Link>
                          )}
                        </div>
                        {report.target?.content && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {report.target.content.substring(0, 50)}...
                          </div>
                        )}
                        {report.target?.author?.display_name && (
                          <div className="text-xs text-gray-400">
                            by {report.target.author.display_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-sm max-w-xs">
                      <div className="truncate" title={report.reason}>
                        {report.reason || 'No reason provided'}
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      <div>
                        <div className="font-medium">{report.reporter?.display_name || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500">{report.reporter?.email}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {/* Status Actions */}
                        {report.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(report.id, 'resolved')}
                              disabled={actionLoading.has(report.id)}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(report.id, 'dismissed')}
                              disabled={actionLoading.has(report.id)}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}

                        {/* User Actions Menu */}
                        {report.target?.author?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/profile/${report.target.author.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUserAction(report.target.author.id, 'ban')}
                                disabled={actionLoading.has(`user-${report.target.author.id}`)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUserAction(report.target.author.id, 'unban')}
                                disabled={actionLoading.has(`user-${report.target.author.id}`)}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredReports.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No reports found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Prayer Requests Tab */}
        <TabsContent value="prayer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Prayer Requests ({prayerRequests.length})
              </CardTitle>
              <CardDescription>
                Manage prayer requests and commitments. Close requests or mark as answered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prayerRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No prayer requests</h3>
                  <p className="text-gray-500">No prayer requests have been submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prayerRequests.map((request) => (
                    <div key={request.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {request.title}
                            </h3>
                            <Badge variant={request.status === 'open' ? 'destructive' : 
                                          request.status === 'answered' ? 'default' : 'secondary'}>
                              {request.status}
                            </Badge>
                            {request.is_anonymous && (
                              <Badge variant="outline" className="text-xs">Anonymous</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {request.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>By: {request.is_anonymous ? 'Anonymous' : request.profiles?.display_name || 'Unknown'}</span>
                            <span>{formatDate(request.created_at)}</span>
                            <span>{request.prayer_commitments?.length || 0} commitments</span>
                            <span>{request.prayer_commitments?.filter((c: any) => c.status === 'prayed').length || 0} prayed</span>
                          </div>
                          {request.tags && request.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {request.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowCommitments(true)
                            }}
                          >
                            <Users className="h-4 w-4 mr-1" />
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
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Answered
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrayerRequestAction(request.id, 'close')}
                                disabled={actionLoading.has(request.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Close
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commitments Modal */}
          {showCommitments && selectedRequest && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Prayer Commitments for "{selectedRequest.title}"
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCommitments(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {selectedRequest.prayer_commitments?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No commitments yet for this prayer request.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRequest.prayer_commitments?.map((commitment: any) => (
                        <div key={commitment.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {commitment.profiles?.display_name || 'Unknown User'}
                                </span>
                                <Badge variant={commitment.status === 'prayed' ? 'default' : 'secondary'}>
                                  {commitment.status}
                                </Badge>
                                {commitment.profiles?.role === 'banned' && (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>Committed: {formatDate(commitment.committed_at)}</div>
                                {commitment.prayed_at && (
                                  <div>Prayed: {formatDate(commitment.prayed_at)}</div>
                                )}
                              </div>
                              {commitment.note && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                  "{commitment.note}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteCommitment(commitment.id, commitment.warrior)}
                                disabled={actionLoading.has(commitment.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
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
                                  <Ban className="h-4 w-4 mr-1" />
                                  Ban User
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Banned Users Tab */}
        <TabsContent value="banned-users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Banned Users ({bannedUsers.length})
              </CardTitle>
              <CardDescription>
                Manage banned users and restore their access when appropriate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bannedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No banned users</h3>
                  <p className="text-gray-500">All users currently have access to the platform.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bannedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {(user.display_name || user.email)?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.display_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Banned: {formatDate(user.updated_at || user.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleUnbanUser(user.id, user.display_name || user.email)}
                          disabled={actionLoading.has(user.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {actionLoading.has(user.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Unbanning...
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Unban User
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}