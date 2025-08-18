import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Search, Plus, Heart, Check, Clock, X } from 'lucide-react'
import { listPrayerRequests, commitToPray, confirmPrayed } from '../lib/prayer'

interface PrayerRequest {
  id: number
  title: string
  details: string
  tags: string[]
  is_anonymous: boolean
  created_at: string
  profiles?: {
    display_name?: string
    avatar_url?: string
  }
  prayer_stats?: {
    committed_count: number
    prayed_count: number
    total_warriors: number
  }
  prayer_commitments?: Array<{
    status: string
    prayed_at?: string
    warrior: string
  }>
}

export default function PrayerBrowse() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  useEffect(() => {
    loadRequests()
  }, [searchQuery, selectedTags])

  const loadRequests = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await listPrayerRequests({
        status: 'open',
        q: searchQuery,
        tags: selectedTags,
        limit: 50
      })

      if (error) {
        setError(error)
        return
      }

      setRequests(data || [])
      
      // Extract available tags
      const allTags = (data || []).flatMap(req => req.tags || [])
      const uniqueTags = Array.from(new Set(allTags)).sort()
      setAvailableTags(uniqueTags)

    } catch (err) {
      console.error('Failed to load prayer requests:', err)
      setError('Failed to load prayer requests')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleCommitToPray = async (requestId: number) => {
    try {
      const { error } = await commitToPray(requestId)
      if (error) {
        console.error('Failed to commit:', error)
        return
      }
      loadRequests() // Refresh to update UI
    } catch (err) {
      console.error('Failed to commit to pray:', err)
    }
  }

  const handleConfirmPrayed = async (requestId: number) => {
    try {
      const { error } = await confirmPrayed(requestId)
      if (error) {
        console.error('Failed to confirm prayed:', error)
        return
      }
      loadRequests() // Refresh to update UI
    } catch (err) {
      console.error('Failed to confirm prayed:', err)
    }
  }

  const getUserCommitmentStatus = (request: PrayerRequest) => {
    const userCommitment = request.prayer_commitments?.find(c => c.warrior === user?.id)
    if (!userCommitment) return 'none'
    return userCommitment.status === 'prayed' ? 'prayed' : 'committed'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-purple-800">Prayer Requests</h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/prayer/my"
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                My Prayers
              </Link>
              <Link
                to="/prayer/new"
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prayer requests..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Tag filters */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No prayer requests found</p>
              <Link
                to="/prayer/new"
                className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Request</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map(request => {
                const commitmentStatus = getUserCommitmentStatus(request)
                const userCommitment = request.prayer_commitments?.find(c => c.warrior === user?.id)
                
                return (
                  <div key={request.id} className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link
                          to={`/prayer/${request.id}`}
                          className="text-lg font-semibold text-purple-800 hover:text-purple-900 block mb-2"
                        >
                          {request.title}
                        </Link>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span>
                            {request.is_anonymous ? 'Anonymous' : request.profiles?.display_name || 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>{formatDate(request.created_at)}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {request.prayer_stats?.prayed_count || 0} prayed
                          </span>
                        </div>
                        <p className="text-gray-700 line-clamp-3 mb-4">{request.details}</p>
                        
                        {/* Tags */}
                        {request.tags && request.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {request.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/prayer/${request.id}`}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        View Details →
                      </Link>
                      
                      <div className="flex items-center space-x-3">
                        {commitmentStatus === 'none' && (
                          <button
                            onClick={() => handleCommitToPray(request.id)}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Heart className="w-4 h-4" />
                            <span>I will pray</span>
                          </button>
                        )}
                        
                        {commitmentStatus === 'committed' && (
                          <button
                            onClick={() => handleConfirmPrayed(request.id)}
                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirm Prayed</span>
                          </button>
                        )}
                        
                        {commitmentStatus === 'prayed' && userCommitment?.prayed_at && (
                          <div className="flex items-center space-x-2 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm">
                              Prayed {formatDate(userCommitment.prayed_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}