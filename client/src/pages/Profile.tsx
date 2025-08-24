import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings, User, Calendar, Edit2, Save, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ensureMyProfile, upsertMyProfile } from '../lib/profiles'
import { ObjectUploader } from '../components/ObjectUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { UploadResult } from '@uppy/core'
import { BottomNavigation } from '../components/BottomNavigation'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

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
          setSuccess('Avatar updated successfully!')
          setTimeout(() => setSuccess(''), 3000)
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
      avatar_url: avatarUrl
    })

    if (error) {
      setError((error as any).message || 'Failed to save profile')
    } else {
      setProfile(data)
      setIsEditing(false)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    }

    setSaving(false)
  }

  const handleCancelEdit = () => {
    // Reset form to current profile data
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setAvatarUrl(profile?.avatar_url || '')
    setIsEditing(false)
    setError('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving || !displayName.trim()}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline" 
                size="sm"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                App Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Messages */}
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

        {/* Profile Content */}
        {profile && (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage 
                        src={avatarUrl || profile.avatar_url} 
                        alt={displayName || profile.display_name || user?.email || 'User'} 
                      />
                      <AvatarFallback className="text-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                        {(displayName || profile.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div className="mt-2">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="text-xs"
                        >
                          Change Photo
                        </ObjectUploader>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="edit-display-name">Display Name</Label>
                          <Input
                            id="edit-display-name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                            maxLength={40}
                          />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {user?.email}
                        </p>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {profile.display_name || 'Anonymous User'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                          {user?.email}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          Member since {formatDate(profile.created_at)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  About
                </CardTitle>
                <CardDescription>
                  {isEditing ? 'Tell others about yourself' : 'Learn more about this user'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea
                      id="edit-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={200}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {bio.length}/200 characters
                    </p>
                  </div>
                ) : (
                  <>
                    {profile.bio ? (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {profile.bio}
                      </p>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">
                        No bio available. Click "Edit Profile" to add one.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>
                  Your community engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Comments</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Amens</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Activity stats coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  )
}