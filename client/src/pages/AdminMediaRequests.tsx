import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { listAllRequests, approveMediaRequest, denyMediaRequest } from '../lib/mediaRequests'
import type { MediaRequestWithUser } from '../lib/mediaRequests'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminMediaRequests() {
  const { user } = useAuth()
  const { isAdmin, role } = useRole()
  const [requests, setRequests] = useState<MediaRequestWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await listAllRequests()

    if (loadError) {
      setError(loadError.message || 'Failed to load requests')
    } else {
      setRequests(data || [])
    }

    setLoading(false)
  }

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId)
    setError('')
    setSuccess('')

    const { error: approveError } = await approveMediaRequest(requestId)

    if (approveError) {
      setError(approveError.message || 'Failed to approve request')
    } else {
      setSuccess('Request approved successfully! User can now upload media.')
      // Update the local state
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', admin_id: user?.id || null }
          : req
      ))
      setTimeout(() => setSuccess(''), 5000)
    }

    setProcessingId(null)
  }

  const handleDeny = async (requestId: number) => {
    if (!confirm('Are you sure you want to deny this media access request?')) {
      return
    }

    setProcessingId(requestId)
    setError('')
    setSuccess('')

    const { error: denyError } = await denyMediaRequest(requestId)

    if (denyError) {
      setError(denyError.message || 'Failed to deny request')
    } else {
      setSuccess('Request denied successfully.')
      // Update the local state
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'denied', admin_id: user?.id || null }
          : req
      ))
      setTimeout(() => setSuccess(''), 5000)
    }

    setProcessingId(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
      case 'denied':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Denied</Badge>
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Debug: Log role information
  console.log('Admin check:', { userId: user?.id, isAdmin, role })

  // Check admin access
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">You don't have permission to access this page.</p>
            <Link to="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Media Access Requests</h1>
              <p className="text-gray-600">Review and manage user requests for media upload permissions</p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => r.status === 'approved').length}
                  </p>
                  <p className="text-sm text-gray-600">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => r.status === 'denied').length}
                  </p>
                  <p className="text-sm text-gray-600">Denied</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Media Access Requests</CardTitle>
            <CardDescription>
              Review user requests and manage media upload permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-300 border-t-primary-600"></div>
                  <span className="text-primary-700 font-medium">Loading requests...</span>
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Yet</h3>
                <p className="text-gray-600">No media access requests have been submitted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.user?.display_name || 'Anonymous'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.user?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-900 line-clamp-3">
                              {request.reason}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.created_at.toString())}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.admin?.display_name ? (
                            <span className="text-sm text-gray-600">
                              {request.admin.display_name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                                disabled={processingId === request.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {processingId === request.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeny(request.id)}
                                disabled={processingId === request.id}
                                className="border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-sm text-gray-400">No actions</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}