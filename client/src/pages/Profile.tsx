import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings, User, Calendar } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ensureMyProfile } from '../lib/profiles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    }
    
    setLoading(false)
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
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Content */}
        {profile && (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={profile.avatar_url} 
                      alt={profile.display_name || user?.email || 'User'} 
                    />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                      {(profile.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
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
                  Learn more about this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.bio ? (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No bio available. {user?.email === profile.id ? (
                      <Link to="/settings" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Add one in your settings
                      </Link>
                    ) : null}
                  </p>
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
    </div>
  )
}