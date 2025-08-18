import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Trophy, Flame, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
// @ts-ignore
import { getTopPrayerWarriors } from '../lib/leaderboard'
import { supabase } from '../lib/supabaseClient'

interface WarriorData {
  warrior: string
  rank: number
  display_name: string
  avatar_url: string | null
  count_prayed: number
  is_anonymous: boolean
}

const rankEmojis = {
  1: '🕊️',
  2: '🌟', 
  3: '🙏'
}

export default function PrayerLeaderboard() {
  const [weekData, setWeekData] = useState<WarriorData[]>([])
  const [monthData, setMonthData] = useState<WarriorData[]>([])
  const [allTimeData, setAllTimeData] = useState<WarriorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    loadLeaderboards()
  }, [])

  // Set up realtime subscription for leaderboard updates
  useEffect(() => {
    const subscription = supabase
      .channel('leaderboard_page_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prayer_commitments',
          filter: 'status=eq.prayed'
        },
        (payload) => {
          console.log('Prayer confirmed, refreshing leaderboard:', payload)
          if (payload.new?.status === 'prayed' && payload.old?.status !== 'prayed') {
            setRefreshTrigger(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Refresh active tab when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshActiveTab()
    }
  }, [refreshTrigger, activeTab])

  const loadLeaderboards = async () => {
    setLoading(true)
    setError('')

    try {
      const [weekResult, monthResult, allTimeResult] = await Promise.all([
        getTopPrayerWarriors({ timeframe: 'week', limit: 50 }),
        getTopPrayerWarriors({ timeframe: 'month', limit: 50 }),
        getTopPrayerWarriors({ timeframe: 'alltime', limit: 50 })
      ])

      if (weekResult.error || monthResult.error || allTimeResult.error) {
        setError(weekResult.error || monthResult.error || allTimeResult.error || 'Failed to load leaderboards')
        return
      }

      setWeekData(weekResult.data || [])
      setMonthData(monthResult.data || [])
      setAllTimeData(allTimeResult.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboards')
    } finally {
      setLoading(false)
    }
  }

  const refreshActiveTab = async () => {
    if (loading) return
    
    try {
      let result
      if (activeTab === 'week') {
        result = await getTopPrayerWarriors({ timeframe: 'week', limit: 50 })
        if (result.data) setWeekData(result.data)
      } else if (activeTab === 'month') {
        result = await getTopPrayerWarriors({ timeframe: 'month', limit: 50 })
        if (result.data) setMonthData(result.data)
      } else if (activeTab === 'alltime') {
        result = await getTopPrayerWarriors({ timeframe: 'alltime', limit: 50 })
        if (result.data) setAllTimeData(result.data)
      }
    } catch (err) {
      console.error('Failed to refresh active tab:', err)
    }
  }

  const filterWarriors = (data: WarriorData[]) => {
    if (!searchQuery.trim()) return data
    
    return data.filter(warrior => 
      warrior.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const renderWarriorList = (data: WarriorData[]) => {
    const filteredData = filterWarriors(data)
    
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                <div className="w-24 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      )
    }

    if (filteredData.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No prayer warriors found matching your search' : 'No prayer warriors yet'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {filteredData.map((warrior) => (
          <div
            key={warrior.warrior}
            className="flex items-center space-x-4 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-sm">
              {warrior.rank <= 3 ? rankEmojis[warrior.rank as keyof typeof rankEmojis] : warrior.rank}
            </div>

            {/* Avatar */}
            <Avatar className="w-12 h-12">
              <AvatarImage src={warrior.avatar_url || undefined} alt={warrior.display_name} />
              <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                {warrior.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {warrior.display_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Prayer Warrior
              </p>
            </div>

            {/* Count */}
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {warrior.count_prayed}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">prayers</p>
            </div>

            {/* Top 3 badges */}
            {warrior.rank <= 3 && (
              <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-200">
                Top {warrior.rank}
              </Badge>
            )}
          </div>
        ))}
      </div>
    )
  }

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
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-purple-800">Prayer Warriors Leaderboard</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search prayer warriors by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-amber-200"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Leaderboard Tabs */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>Top Prayer Warriors</span>
              </CardTitle>
              <CardDescription>
                Celebrating our community's prayer commitment across different timeframes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="week">This Week</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                  <TabsTrigger value="alltime">All Time</TabsTrigger>
                </TabsList>

                <TabsContent value="week" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">This Week's Champions</h3>
                    <Badge variant="outline">{filterWarriors(weekData).length} warriors</Badge>
                  </div>
                  {renderWarriorList(weekData)}
                </TabsContent>

                <TabsContent value="month" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">This Month's Champions</h3>
                    <Badge variant="outline">{filterWarriors(monthData).length} warriors</Badge>
                  </div>
                  {renderWarriorList(monthData)}
                </TabsContent>

                <TabsContent value="alltime" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">All-Time Champions</h3>
                    <Badge variant="outline">{filterWarriors(allTimeData).length} warriors</Badge>
                  </div>
                  {renderWarriorList(allTimeData)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}