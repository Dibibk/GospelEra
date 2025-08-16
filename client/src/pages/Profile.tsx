import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getMyProfile, upsertMyProfile, ensureMyProfile } from '../lib/profiles'
import { ObjectUploader } from '../components/ObjectUploader'
import type { UploadResult } from '@uppy/core'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const handleLogout = async () => {
    await signOut()
  }

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
        // Convert the upload URL to an object path that can be served
        const response = await fetch('/api/avatar', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ avatarURL: uploadURL }),
        })
        
        if (response.ok) {
          const { objectPath } = await response.json()
          // Set the avatar URL to the object path
          setAvatarUrl(objectPath)
          setSuccess('Image uploaded successfully!')
          setTimeout(() => setSuccess(''), 3000)
        } else {
          setError('Failed to process uploaded image')
        }
      }
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const { data, error } = await upsertMyProfile({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl.trim()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-white via-purple-50 to-gold-50 shadow-lg border-b border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Community</h1>
                  <p className="text-sm text-primary-600 font-medium">Share your faith, grow together</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                to="/"
                className="inline-flex items-center px-4 py-2 text-sm font-bold text-primary-700 bg-gradient-to-r from-primary-100 to-purple-100 hover:from-primary-200 hover:to-purple-200 rounded-xl transition-all duration-200 transform hover:scale-105 border border-primary-200/60 shadow-sm"
              >
                <svg className="h-4 w-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 text-sm font-bold text-red-700 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 rounded-xl transition-all duration-200 transform hover:scale-105 border border-red-200/60 shadow-sm"
              >
                <svg className="h-4 w-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent mb-2">
            Your Profile
          </h1>
          <p className="text-primary-600 font-medium">
            Manage your profile information and settings
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-300 border-t-gold-600"></div>
              <span className="text-primary-700 font-medium">Loading profile...</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 shadow-xl rounded-2xl border border-primary-200/50 backdrop-blur-sm">
            {/* Profile Info Header */}
            {profile && (
              <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
                <div className="flex items-center space-x-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary-900 mb-1">
                      {profile.display_name || 'No name set'}
                    </h2>
                    <p className="text-primary-600 font-medium mb-2">{user?.email}</p>
                    <p className="text-sm text-primary-500">
                      Member since {formatDate(profile.created_at)}
                    </p>
                  </div>
                </div>
                {profile.bio && (
                  <div className="mt-4 pt-4 border-t border-primary-200/40">
                    <p className="text-primary-700 italic leading-relaxed">"{profile.bio}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Display Name */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                    <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                    placeholder="Your display name"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                    <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400 resize-none"
                    placeholder="Tell others about yourself and your faith journey..."
                  />
                </div>

                {/* Avatar Section */}
                <div>
                  <label className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                    <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Profile Picture
                  </label>
                  
                  <div className="space-y-4">
                    {/* Current Avatar Preview */}
                    {avatarUrl && (
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                          <img 
                            src={avatarUrl} 
                            alt="Current avatar" 
                            className="h-16 w-16 rounded-full object-cover"
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary-800">Current avatar</p>
                          <p className="text-xs text-primary-600">This will be displayed on your posts and comments</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <div className="flex items-center space-x-4">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB limit for images
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="flex items-center px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Image
                      </ObjectUploader>
                      
                      <span className="text-sm text-primary-600">or</span>
                      
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove avatar
                      </button>
                    </div>
                    
                    {/* Manual URL Input */}
                    <div>
                      <label htmlFor="avatarUrl" className="block text-xs font-medium text-primary-700 mb-1">
                        Or enter image URL manually:
                      </label>
                      <input
                        id="avatarUrl"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="w-full px-3 py-2 text-sm border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                        placeholder="https://example.com/your-avatar.jpg"
                      />
                    </div>
                    
                    <p className="text-xs text-primary-600">
                      Upload an image from your computer or enter a URL. Recommended size: 256x256 pixels. Max file size: 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex justify-center items-center py-3 px-8 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}