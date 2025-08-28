import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Users, Shield, TrendingUp, Settings, UserCheck, UserX, Eye, Mail, Calendar, Activity } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { getUserProfile, getBannedUsers, banUser, unbanUser } from '../lib/admin'
import { supabase } from '../lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function AdminSupport() {
  const { user } = useAuth()
  const { isAdmin, role } = useRole()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [bannedUsers, setBannedUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    checkAdminAccess()
  }, [])

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
      loadUsers()
      loadBannedUsers()
    } catch (err) {
      console.error('Admin access check failed:', err)
      navigate('/')
    }
  }

  const loadUsers = async () => {
    try {
      setError('')
      // Get all users from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        setError(error.message || 'Failed to load users')
      } else {
        setUsers(data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    }
  }

  const loadBannedUsers = async () => {
    try {
      const bannedUsersData = await getBannedUsers()
      setBannedUsers(bannedUsersData)
    } catch (err: any) {
      setError(err.message || 'Failed to load banned users')
    }
  }

  const handleBanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user? They will lose access to post and comment.')) {
      return
    }

    setProcessingUserId(userId)
    try {
      await banUser(userId)
      setSuccess('User banned successfully')
      loadUsers()
      loadBannedUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    setProcessingUserId(userId)
    try {
      await unbanUser(userId)
      setSuccess('User unbanned successfully')
      loadUsers()
      loadBannedUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingUserId(null)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Admin</Badge>
      case 'banned':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Banned</Badge>
      case 'user':
      default:
        return <Badge className="bg-green-100 text-green-800 border-green-300">User</Badge>
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

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatsData = () => {
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.role !== 'banned').length
    const bannedCount = bannedUsers.length
    const adminCount = users.filter(u => u.role === 'admin').length

    return { totalUsers, activeUsers, bannedCount, adminCount }
  }

  const stats = getStatsData()

  // Check admin access
  if (!isAdmin && user?.email !== 'diviabharath@gmail.com') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-300 border-t-primary-600"></div>
          <span className="text-primary-700 font-medium">Loading admin support...</span>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Admin Support</h1>
              <p className="text-gray-600">Manage users and administrative recommendations</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <UserX className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.bannedCount}</p>
                  <p className="text-sm text-gray-600">Banned Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.adminCount}</p>
                  <p className="text-sm text-gray-600">Administrators</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="users">All Users</TabsTrigger>
                    <TabsTrigger value="banned">Banned Users</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="users">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((userProfile) => (
                            <TableRow key={userProfile.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <Users className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {userProfile.display_name || 'Anonymous'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {userProfile.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getRoleBadge(userProfile.role || 'user')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(userProfile.created_at)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {userProfile.role !== 'admin' && userProfile.role !== 'banned' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBanUser(userProfile.id)}
                                    disabled={processingUserId === userProfile.id}
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                  >
                                    {processingUserId === userProfile.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-700 border-t-transparent" />
                                    ) : (
                                      <>
                                        <UserX className="h-4 w-4 mr-1" />
                                        Ban
                                      </>
                                    )}
                                  </Button>
                                )}
                                {userProfile.role === 'banned' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUnbanUser(userProfile.id)}
                                    disabled={processingUserId === userProfile.id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {processingUserId === userProfile.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    ) : (
                                      <>
                                        <UserCheck className="h-4 w-4 mr-1" />
                                        Unban
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="banned">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Banned Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bannedUsers.map((userProfile) => (
                            <TableRow key={userProfile.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                                    <UserX className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {userProfile.display_name || 'Anonymous'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {userProfile.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(userProfile.updated_at || userProfile.created_at)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleUnbanUser(userProfile.id)}
                                  disabled={processingUserId === userProfile.id}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {processingUserId === userProfile.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Unban
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Admin Recommendations */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Admin Recommendations
                </CardTitle>
                <CardDescription>
                  Suggested actions for community management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Community Growth</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    With {stats.totalUsers} users, consider creating featured content to encourage engagement.
                  </p>
                  <Link to="/admin/reports">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Review Content
                    </Button>
                  </Link>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-medium text-green-900 mb-2">Moderation Health</h3>
                  <p className="text-sm text-green-700 mb-3">
                    {stats.bannedCount < 5 ? 'Low' : stats.bannedCount < 15 ? 'Moderate' : 'High'} moderation activity. 
                    {stats.bannedCount < 5 ? ' Community is healthy!' : ' Monitor for issues.'}
                  </p>
                  <Link to="/admin/media-requests">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Media Requests
                    </Button>
                  </Link>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-medium text-purple-900 mb-2">Prayer Community</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    Encourage prayer requests and commitments to strengthen the spiritual community.
                  </p>
                  <Link to="/prayer/browse">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      Prayer Requests
                    </Button>
                  </Link>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="font-medium text-amber-900 mb-2">User Engagement</h3>
                  <p className="text-sm text-amber-700 mb-3">
                    {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of users are active. 
                    Consider community events to boost engagement.
                  </p>
                  <Link to="/dashboard">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}