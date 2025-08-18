import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTopPrayerWarriors } from '../lib/leaderboard.js'

interface LeaderboardProps {
  limit?: number
  className?: string
}

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

export function Leaderboard({ limit = 10, className = '' }: LeaderboardProps) {
  const [weekData, setWeekData] = useState<WarriorData[]>([])
  const [monthData, setMonthData] = useState<WarriorData[]>([])
  const [allTimeData, setAllTimeData] = useState<WarriorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('week')

  useEffect(() => {
    loadLeaderboards()
  }, [limit])

  const loadLeaderboards = async () => {
    setLoading(true)
    setError('')

    try {
      // Load all timeframes simultaneously
      const [weekResult, monthResult, allTimeResult] = await Promise.all([
        getTopPrayerWarriors({ timeframe: 'week', limit }),
        getTopPrayerWarriors({ timeframe: 'month', limit }),
        getTopPrayerWarriors({ timeframe: 'alltime', limit })
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

  const renderWarriorList = (data: WarriorData[]) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🙏</div>
          <p className="text-sm">No prayer warriors yet</p>
          <p className="text-xs mt-1">Be the first to complete a prayer commitment!</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((warrior) => (
          <div 
            key={warrior.warrior} 
            className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            {/* Rank with optional emoji */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-800 dark:text-purple-200 font-semibold text-sm">
              {rankEmojis[warrior.rank as keyof typeof rankEmojis] || warrior.rank}
            </div>

            {/* Avatar */}
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={warrior.is_anonymous ? undefined : warrior.avatar_url || undefined} 
                alt={warrior.display_name}
              />
              <AvatarFallback className="bg-gradient-to-br from-gold to-amber-200 text-purple-900 font-semibold">
                {warrior.is_anonymous ? '🕊️' : warrior.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* Name and count */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {warrior.display_name}
                </p>
                {warrior.is_anonymous && (
                  <Badge variant="outline" className="text-xs">Anonymous</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {warrior.count_prayed} confirmed prayer{warrior.count_prayed !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Top 3 special badge */}
            {warrior.rank <= 3 && (
              <div className="flex-shrink-0">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    warrior.rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    warrior.rank === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  }`}
                >
                  #{warrior.rank}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏆 Top Prayer Warriors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            <p className="text-sm">{error}</p>
            <button 
              onClick={loadLeaderboards}
              className="mt-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          🏆 Top Prayer Warriors
        </CardTitle>
        <CardDescription>
          Community members leading in confirmed prayers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="week" className="text-xs sm:text-sm">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs sm:text-sm">This Month</TabsTrigger>
            <TabsTrigger value="alltime" className="text-xs sm:text-sm">All-Time</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-4">
            {renderWarriorList(weekData)}
          </TabsContent>

          <TabsContent value="month" className="mt-4">
            {renderWarriorList(monthData)}
          </TabsContent>

          <TabsContent value="alltime" className="mt-4">
            {renderWarriorList(allTimeData)}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Counts reflect confirmed prayers
          </p>
        </div>
      </CardContent>
    </Card>
  )
}