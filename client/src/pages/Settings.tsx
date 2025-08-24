import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, User, Shield, Bell, Trash2, Upload, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getMyProfile, upsertMyProfile, ensureMyProfile } from '../lib/profiles'
import { ObjectUploader } from '../components/ObjectUploader'
import { MediaRequestModal } from '../components/MediaRequestModal'
import { getCurrentRequestStatus, checkMediaPermission } from '../lib/mediaRequests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { UploadResult } from '@uppy/core'
import { BottomNavigation } from '../components/BottomNavigation'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Privacy settings
  const [showNameOnPrayers, setShowNameOnPrayers] = useState(true)
  const [privateProfile, setPrivateProfile] = useState(false)
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [commentNotifications, setCommentNotifications] = useState(true)

  // Media access states
  const [mediaEnabled, setMediaEnabled] = useState(false)
  const [mediaRequestStatus, setMediaRequestStatus] = useState<string | null>(null)
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false)
  const [mediaStatusLoading, setMediaStatusLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    loadMediaStatus()
  }, [])

  const loadMediaStatus = async () => {
    setMediaStatusLoading(true)
    
    try {
      // Check if user has media enabled
      const permissionResult = await checkMediaPermission()
      setMediaEnabled(permissionResult.hasPermission)

      // Get current request status if not enabled
      if (!permissionResult.hasPermission) {
        const statusResult = await getCurrentRequestStatus()
        setMediaRequestStatus(statusResult.status)
      }
    } catch (error) {
      console.error('Error loading media status:', error)
    }
    
    setMediaStatusLoading(false)
  }

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    
    const { data, error } = await ensureMyProfile()
    
    if (error) {
      setError((error as any).message || 'Failed to load profile')
    } else if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || '')
      setShowNameOnPrayers(data.show_name_on_prayers ?? true)
      setPrivateProfile(data.private_profile ?? false)
    }
    
    setLoading(false)
  }

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL')
    }
    
    const { uploadURL } = await response.json()
    
    return {
      method: 'PUT' as const,
      url: uploadURL,
    }
  }

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0]
      const uploadURL = uploadedFile.uploadURL
      
      if (uploadURL) {
        const response = await fetch('/api/avatar', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ avatarURL: uploadURL }),
        })
        
        if (response.ok) {
          const { objectPath } = await response.json()
          setAvatarUrl(objectPath)
          
          // Auto-save the profile with the new avatar
          const { data, error } = await upsertMyProfile({
            display_name: displayName.trim(),
            bio: bio.trim(),
            avatar_url: objectPath
          })

          if (error) {
            setError((error as any).message || 'Failed to save avatar')
          } else {
            setProfile(data)
            setSuccess('Avatar uploaded successfully!')
            setTimeout(() => setSuccess(''), 3000)
          }
        } else {
          setError('Failed to process uploaded image')
        }
      }
    }
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const { data, error } = await upsertMyProfile({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
      show_name_on_prayers: showNameOnPrayers,
      private_profile: privateProfile
    })

    if (error) {
      setError((error as any).message || 'Failed to save profile')
    } else {
      setProfile(data)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="privacy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Quick Profile Link */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Manage your display name, bio, and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/profile">
                <Button variant="outline" className="w-full sm:w-auto">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Media Upload Settings */}
          <TabsContent value="media" id="media">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Media Upload Access
                  </CardTitle>
                  <CardDescription>
                    Manage your ability to upload images and videos to posts, comments, and prayers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mediaStatusLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-300 border-t-primary-600"></div>
                      <span className="text-sm text-primary-600">Loading media status...</span>
                    </div>
                  ) : mediaEnabled ? (
                    /* Media Enabled State */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-800">Media Uploads Enabled</h3>
                          <p className="text-sm text-green-600">
                            You can now upload images and videos to your posts, comments, and prayers.
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
                      </div>
                      <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-700 text-sm">
                          <strong>Remember:</strong> All uploads must honor Jesus and align with our community guidelines. 
                          Inappropriate content may result in access being revoked.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : mediaRequestStatus === 'pending' ? (
                    /* Pending Request State */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-orange-800">Request Under Review</h3>
                          <p className="text-sm text-orange-600">
                            Your media access request is being reviewed by our team.
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>
                      </div>
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-700 text-sm">
                          We'll notify you once your request has been reviewed. This typically takes 1-2 business days.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : mediaRequestStatus === 'denied' ? (
                    /* Denied Request State */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                          <XCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-800">Request Not Approved</h3>
                          <p className="text-sm text-red-600">
                            At this time, your request for media uploads was not approved.
                          </p>
                        </div>
                        <Badge className="bg-red-100 text-red-800 border-red-300">Denied</Badge>
                      </div>
                      <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700 text-sm">
                          At this time, your request for media uploads was not approved. You can continue to post text prayers 
                          and scriptures, which remain the heart of our community.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => setShowMediaRequestModal(true)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Submit New Request
                      </Button>
                    </div>
                  ) : (
                    /* No Request Made State */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <Upload className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-primary-800">Media Upload Access</h3>
                          <p className="text-sm text-primary-600">
                            Request permission to upload images and videos
                          </p>
                        </div>
                      </div>
                      <Alert className="border-primary-200 bg-primary-50">
                        <AlertDescription className="text-primary-700 text-sm leading-relaxed">
                          Media uploads are a privilege granted to trusted community members to keep our app Christ-centered. 
                          If you feel led to share gospel images or videos, you can request access. Every upload must honor 
                          Jesus and align with our guidelines.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => setShowMediaRequestModal(true)}
                        className="bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white"
                      >
                        Request Access
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>
                    Choose what you want to receive via email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="comment-notifications">Comment Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when someone comments on your posts
                      </p>
                    </div>
                    <Switch
                      id="comment-notifications"
                      checked={commentNotifications}
                      onCheckedChange={setCommentNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Digest</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get a summary of community activity each week
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Features</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Be notified about new platform features and updates
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="w-full sm:w-auto">
                    Save Email Preferences
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Push Notifications</CardTitle>
                  <CardDescription>
                    Control browser and mobile notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Real-time Updates</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get instant notifications for comments and reactions
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Verse Reminders</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when the daily verse is updated
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="w-full sm:w-auto">
                    Save Push Preferences
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Privacy & Security Settings */}
          <TabsContent value="privacy">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control who can see your content and activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-name-prayers">Show my display name on prayer requests</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        When enabled, your display name will appear on your prayer requests. When disabled, they will appear as "Anonymous".
                      </p>
                    </div>
                    <Switch
                      id="show-name-prayers"
                      checked={showNameOnPrayers}
                      onCheckedChange={setShowNameOnPrayers}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="private-profile">Private profile (appear as 'Anonymous' on leaderboards)</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        When enabled, you will appear as "Anonymous" on prayer leaderboards instead of your display name.
                      </p>
                    </div>
                    <Switch
                      id="private-profile"
                      checked={privateProfile}
                      onCheckedChange={setPrivateProfile}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? 'Saving...' : 'Save Privacy Settings'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content & Safety</CardTitle>
                  <CardDescription>
                    Manage content filtering and safety features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Content Filtering</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Filter potentially sensitive content
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-hide Reported Content</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Hide content that has been reported by the community
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="w-full sm:w-auto">
                    Save Safety Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Analytics</CardTitle>
                  <CardDescription>
                    Control how your data is used to improve the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Usage Analytics</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Help improve our service by sharing anonymous usage data
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Personalized Recommendations</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use your activity to suggest relevant content
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Button className="w-full sm:w-auto">
                    Save Data Preferences
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>
                    Manage your account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleLogout}
                    variant="outline" 
                    className="w-full sm:w-auto"
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription>
                    These actions cannot be undone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="destructive" 
                    className="w-full sm:w-auto"
                    disabled
                  >
                    Delete Account (Coming Soon)
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Account deletion will be available in a future update
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Media Request Modal */}
        <MediaRequestModal
          open={showMediaRequestModal}
          onOpenChange={setShowMediaRequestModal}
          onSuccess={() => {
            setSuccess('Media access request submitted successfully! We\'ll review it within 1-2 business days.')
            setMediaRequestStatus('pending')
            setTimeout(() => setSuccess(''), 5000)
          }}
        />
      </div>
      <BottomNavigation />
    </div>
  )
}