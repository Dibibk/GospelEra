import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Heart, Check, Clock, Plus, Users } from 'lucide-react'
import { getMyRequests, getMyCommitments } from '../lib/prayer'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard } from '../components/Leaderboard'

interface MyRequest {
  id: number
  title: string
  details: string
  status: string
  created_at: string
  prayer_stats?: {
    committed_count: number
    prayed_count: number
    total_warriors: number
  }
}

interface MyCommitment {
  status: string
  committed_at: string
  prayed_at?: string
  note?: string
  prayer_requests: {
    id: number
    title: string
    details: string
    status: string
    created_at: string
    is_anonymous: boolean
    profiles?: {
      display_name?: string
      avatar_url?: string
    }
  }
}

export default function PrayerMy() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'requests' | 'commitments'>('requests')
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [myCommitments, setMyCommitments] = useState<MyCommitment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Set up realtime subscription for user's prayer commitments
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel(`user_prayer_activity_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_commitments',
          filter: `warrior=eq.${user.id}`
        },
        (payload) => {
          console.log('User prayer commitment change:', payload)
          handleUserCommitmentChange(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_requests',
          filter: `requester=eq.${user.id}`
        },
        (payload) => {
          console.log('User prayer request change:', payload)
          handleUserRequestChange(payload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id])

  const handleUserCommitmentChange = async (payload: any) => {
    // Reload commitments when user's commitments change
    try {
      const { data, error } = await getMyCommitments({ limit: 50 })
      if (error) {
        console.error('Failed to refresh commitments:', error)
        return
      }
      setMyCommitments(data || [])
    } catch (err) {
      console.error('Error refreshing commitments:', err)
    }
  }

  const handleUserRequestChange = async (payload: any) => {
    // Reload requests when user's requests change
    try {
      const { data, error } = await getMyRequests({ limit: 50 })
      if (error) {
        console.error('Failed to refresh requests:', error)
        return
      }
      setMyRequests(data || [])
    } catch (err) {
      console.error('Error refreshing requests:', err)
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const [requestsResult, commitmentsResult] = await Promise.all([
        getMyRequests({ limit: 50 }),
        getMyCommitments({ limit: 50 })
      ])

      if (requestsResult.error) {
        setError(requestsResult.error)
        return
      }

      if (commitmentsResult.error) {
        setError(commitmentsResult.error)
        return
      }

      setMyRequests(requestsResult.data || [])
      setMyCommitments(commitmentsResult.data || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load your prayer data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const openRequests = myRequests.filter(r => r.status === 'open')
  const closedRequests = myRequests.filter(r => r.status !== 'open')
  const activeCommitments = myCommitments.filter(c => c.status === 'committed')
  const prayedCommitments = myCommitments.filter(c => c.status === 'prayed')

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/prayer/browse" className="text-purple-600 hover:text-purple-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-purple-800">My Prayers</h1>
            </div>
            <Link
              to="/prayer/new"
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Request</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              My Requests ({myRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('commitments')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'commitments'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              My Commitments ({myCommitments.length})
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* My Requests Tab */}
              {activeTab === 'requests' && (
                <>
                  {/* Open Requests */}
                  {openRequests.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-purple-600" />
                        Open Requests ({openRequests.length})
                      </h2>
                      <div className="space-y-4">
                        {openRequests.map(request => (
                          <div key={request.id} className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <Link
                                  to={`/prayer/${request.id}`}
                                  className="text-lg font-semibold text-purple-800 hover:text-purple-900 block mb-2"
                                >
                                  {request.title}
                                </Link>
                                <p className="text-gray-600 text-sm mb-3">{formatDate(request.created_at)}</p>
                                <p className="text-gray-700 line-clamp-2 mb-4">{request.details}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Users className="w-4 h-4" />
                                  <span>{request.prayer_stats?.total_warriors || 0} warriors</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-green-600">
                                  <Check className="w-4 h-4" />
                                  <span>{request.prayer_stats?.prayed_count || 0} prayed</span>
                                </div>
                              </div>
                              <Link
                                to={`/prayer/${request.id}`}
                                className="text-purple-600 hover:text-purple-700 text-sm"
                              >
                                View Details →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closed Requests */}
                  {closedRequests.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Check className="w-5 h-5 mr-2 text-green-600" />
                        Closed Requests ({closedRequests.length})
                      </h2>
                      <div className="space-y-4">
                        {closedRequests.map(request => (
                          <div key={request.id} className="bg-white rounded-lg shadow-lg p-6 opacity-75">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <Link
                                  to={`/prayer/${request.id}`}
                                  className="text-lg font-semibold text-gray-700 hover:text-gray-900 block mb-2"
                                >
                                  {request.title}
                                </Link>
                                <p className="text-gray-500 text-sm mb-3">{formatDate(request.created_at)}</p>
                                <p className="text-gray-600 line-clamp-2">{request.details}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {myRequests.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-4">You haven't submitted any prayer requests yet</p>
                      <Link
                        to="/prayer/new"
                        className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Your First Request</span>
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* My Commitments Tab */}
              {activeTab === 'commitments' && (
                <>
                  {/* Active Commitments */}
                  {activeCommitments.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-purple-600" />
                        Active Commitments ({activeCommitments.length})
                      </h2>
                      <div className="space-y-4">
                        {activeCommitments.map((commitment, index) => (
                          <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <Link
                                  to={`/prayer/${commitment.prayer_requests.id}`}
                                  className="text-lg font-semibold text-purple-800 hover:text-purple-900 block mb-2"
                                >
                                  {commitment.prayer_requests.title}
                                </Link>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                  <span>
                                    by {commitment.prayer_requests.is_anonymous 
                                      ? 'Anonymous' 
                                      : commitment.prayer_requests.profiles?.display_name || 'Unknown'}
                                  </span>
                                  <span>•</span>
                                  <span>Committed {formatDate(commitment.committed_at)}</span>
                                </div>
                                <p className="text-gray-700 line-clamp-2">{commitment.prayer_requests.details}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-purple-600">
                                <Heart className="w-4 h-4" />
                                <span className="text-sm">Committed to pray</span>
                              </div>
                              <Link
                                to={`/prayer/${commitment.prayer_requests.id}`}
                                className="text-purple-600 hover:text-purple-700 text-sm"
                              >
                                Confirm Prayer →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Prayers */}
                  {prayedCommitments.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Check className="w-5 h-5 mr-2 text-green-600" />
                        Completed Prayers ({prayedCommitments.length})
                      </h2>
                      <div className="space-y-4">
                        {prayedCommitments.map((commitment, index) => (
                          <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <Link
                                  to={`/prayer/${commitment.prayer_requests.id}`}
                                  className="text-lg font-semibold text-gray-700 hover:text-gray-900 block mb-2"
                                >
                                  {commitment.prayer_requests.title}
                                </Link>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                  <span>
                                    by {commitment.prayer_requests.is_anonymous 
                                      ? 'Anonymous' 
                                      : commitment.prayer_requests.profiles?.display_name || 'Unknown'}
                                  </span>
                                  <span>•</span>
                                  <span>Prayed {commitment.prayed_at ? formatDate(commitment.prayed_at) : 'Unknown'}</span>
                                </div>
                                {commitment.note && (
                                  <p className="text-gray-600 italic text-sm mb-2">"{commitment.note}"</p>
                                )}
                                <p className="text-gray-700 line-clamp-2">{commitment.prayer_requests.details}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-green-600">
                                <Check className="w-4 h-4" />
                                <span className="text-sm">Prayer completed</span>
                              </div>
                              <Link
                                to={`/prayer/${commitment.prayer_requests.id}`}
                                className="text-purple-600 hover:text-purple-700 text-sm"
                              >
                                View Details →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {myCommitments.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-4">You haven't committed to pray for anyone yet</p>
                      <Link
                        to="/prayer/browse"
                        className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        <span>Browse Prayer Requests</span>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Leaderboard */}
          <div className="mt-8">
            <Leaderboard limit={6} />
          </div>
        </div>
      </div>
    </div>
  )
}