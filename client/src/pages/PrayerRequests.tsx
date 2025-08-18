import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Send, Heart, Users, HandHeart } from 'lucide-react'
import { 
  createPrayerRequest, 
  listPrayerRequests, 
  commitToPray, 
  confirmPrayed 
} from '../lib/prayer'

export default function PrayerRequests() {
  const { user, signOut } = useAuth()
  const { isBanned } = useRole()
  const isOnline = useOnlineStatus()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  // Prayer request form state
  const [prayerName, setPrayerName] = useState('')
  const [prayerRequest, setPrayerRequest] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  
  // Prayer requests list state
  const [prayerRequests, setPrayerRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  
  // User profile state
  const [userProfile, setUserProfile] = useState<{display_name?: string, avatar_url?: string, role?: string} | null>(null)

  // Toast state
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success'|'error'}>({show: false, message: '', type: 'success'})

  const handleLogout = async () => {
    await signOut()
  }

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({show: true, message, type})
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load user profile
  const loadUserProfile = async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Failed to load user profile:', error)
      } else if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Load prayer requests using the new API
  const loadPrayerRequests = async () => {
    setIsLoading(true)
    setLoadError('')
    
    try {
      const { data, error } = await listPrayerRequests({ 
        status: 'open',
        limit: 50 
      })
      
      if (error) {
        setLoadError(error)
        return
      }
      
      setPrayerRequests(data || [])
    } catch (error) {
      console.error('Failed to load prayer requests:', error)
      setLoadError('Failed to load prayer requests')
    } finally {
      setIsLoading(false)
    }
  }

  // Submit prayer request using the new API
  const handleSubmitPrayerRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prayerName.trim() || !prayerRequest.trim()) {
      setSubmitError('Please fill in all fields')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      const { data, error } = await createPrayerRequest({
        title: prayerName.trim(),
        details: prayerRequest.trim(),
        is_anonymous: prayerName.toLowerCase().includes('anonymous')
      })
      
      if (error) {
        setSubmitError(error)
        return
      }
      
      // Clear form
      setPrayerName('')
      setPrayerRequest('')
      
      // Reload prayer requests to get updated list
      loadPrayerRequests()
      showToast('Your prayer request has been shared with the community', 'success')
      
    } catch (error) {
      console.error('Failed to submit prayer request:', error)
      setSubmitError('Failed to submit prayer request')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle prayer commitment using the new API
  const handlePrayerCommitment = async (requestId: number) => {
    try {
      // Try to commit to pray first
      const { data, error } = await commitToPray(requestId)
      
      if (error) {
        showToast(error, 'error')
        return
      }
      
      showToast('You committed to pray!', 'success')
      
      // Reload prayer requests to update counts
      loadPrayerRequests()
      
    } catch (error) {
      console.error('Failed to handle prayer commitment:', error)
      showToast('Failed to process prayer commitment', 'error')
    }
  }

  // Handle marking prayer as completed
  const handleMarkPrayed = async (requestId: number) => {
    try {
      const { data, error } = await confirmPrayed(requestId)
      
      if (error) {
        showToast(error, 'error')
        return
      }
      
      showToast('Marked as prayed! Thank you for lifting them up', 'success')
      
      // Reload prayer requests to update counts
      loadPrayerRequests()
      
    } catch (error) {
      console.error('Failed to mark as prayed:', error)
      showToast('Failed to mark as prayed', 'error')
    }
  }

  useEffect(() => {
    loadUserProfile()
    loadPrayerRequests()
  }, [user])

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">You're Offline</h2>
          <p className="text-gray-600">Please check your internet connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Back Button */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2 text-purple-700 hover:text-purple-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Posts</span>
              </Link>
              <div className="h-6 w-px bg-purple-200"></div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <HandHeart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
                    Prayer Requests
                  </h1>
                  <p className="text-sm text-purple-600">Community prayer support</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 rounded-full px-3 py-2 transition-colors"
              >
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <span className="text-purple-700 font-medium text-sm">
                      {userProfile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <span className="text-sm text-purple-700 hidden sm:block">
                  {userProfile?.display_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-purple-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-purple-100">
                    <p className="text-sm text-purple-600">
                      {userProfile?.display_name || user?.email || 'User'}
                    </p>
                  </div>
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50">
                    👤 Profile
                  </Link>
                  <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50">
                    ⚙️ Settings
                  </Link>
                  <Link to="/saved" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50">
                    🔖 Saved Posts
                  </Link>
                  {userProfile?.role === 'admin' && (
                    <Link to="/admin/reports" className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50">
                      🛡️ Admin Reports
                    </Link>
                  )}
                  <div className="px-4 py-2 border-t border-purple-100">
                    <ThemeSwitcher />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Banned User Banner */}
        {isBanned && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <p className="text-orange-700 font-medium">
                Account limited. You can read prayer requests but cannot submit new ones.
              </p>
            </div>
          </div>
        )}

        {/* Prayer Request Submission Form */}
        {!isBanned && (
          <div className="bg-white rounded-xl shadow-md border border-purple-100 p-6 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800">Share Your Prayer Request</h2>
                <p className="text-purple-600 text-sm">Let our community lift you up in prayer</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPrayerRequest} className="space-y-4">
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{submitError}</p>
                </div>
              )}

              <div>
                <label htmlFor="prayer-name" className="block text-sm font-medium text-purple-700 mb-2">
                  📝 Your Name (or "Anonymous")
                </label>
                <input
                  id="prayer-name"
                  type="text"
                  value={prayerName}
                  onChange={(e) => setPrayerName(e.target.value)}
                  placeholder="Enter your name or stay anonymous"
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="prayer-request" className="block text-sm font-medium text-purple-700 mb-2">
                  ❤️ Your Prayer Request
                </label>
                <textarea
                  id="prayer-request"
                  rows={4}
                  value={prayerRequest}
                  onChange={(e) => setPrayerRequest(e.target.value)}
                  placeholder="Share what's on your heart. Our community is here to pray with you."
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !prayerName.trim() || !prayerRequest.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Share Prayer Request</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Prayer Requests List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-purple-800">Community Prayer Requests</h3>
            <div className="flex items-center space-x-2 text-purple-600">
              <Users className="w-5 h-5" />
              <span className="text-sm">{prayerRequests.length} prayer requests</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border border-purple-100 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-purple-100 rounded w-1/4"></div>
                      <div className="h-4 bg-purple-100 rounded w-3/4"></div>
                      <div className="h-4 bg-purple-100 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{loadError}</p>
              <button 
                onClick={loadPrayerRequests}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Prayer Requests */}
          {!isLoading && !loadError && prayerRequests.length === 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
              <Heart className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-purple-700 mb-2">No Prayer Requests Yet</h4>
              <p className="text-purple-600">Be the first to share a prayer request with the community.</p>
            </div>
          )}

          {!isLoading && !loadError && prayerRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-md border border-purple-100 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {request.profiles?.avatar_url ? (
                    <img 
                      src={request.profiles.avatar_url} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                      <HandHeart className="w-6 h-6 text-purple-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-purple-800">{request.is_anonymous ? 'Anonymous' : request.title}</h4>
                      <p className="text-sm text-purple-500">{formatDate(request.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handlePrayerCommitment(request.id)}
                      className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-full transition-colors text-sm"
                    >
                      <Heart className="w-4 h-4" />
                      <span>Pray ({request.prayer_stats?.prayed_count || 0})</span>
                    </button>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">{request.details}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  )
}