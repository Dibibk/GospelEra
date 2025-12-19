import { supabase } from './supabaseClient'

/**
 * Get top prayer warriors for a given timeframe
 * @param {Object} options - Configuration options
 * @param {string} options.timeframe - 'week', 'month', or 'alltime'
 * @param {number} options.limit - Maximum number of results to return
 * @returns {Object} { data, error }
 */
export async function getTopPrayerWarriors({ timeframe = 'week', limit = 10 } = {}) {
  try {
    // Determine which view to query based on timeframe
    const viewName = timeframe === 'week' ? 'vw_prayer_leaderboard_week' :
                     timeframe === 'month' ? 'vw_prayer_leaderboard_month' :
                     timeframe === 'alltime' ? 'vw_prayer_leaderboard_alltime' :
                     'vw_prayer_leaderboard_week'

    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from(viewName)
      .select('*')
      .limit(limit)

    if (leaderboardError) {
      console.error('Error fetching leaderboard:', leaderboardError)
      return { data: null, error: leaderboardError.message }
    }

    if (!leaderboardData || leaderboardData.length === 0) {
      return { data: [], error: null }
    }

    // Get warrior profile information including private_profile setting
    const warriorIds = leaderboardData.map(row => row.warrior)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, private_profile')
      .in('id', warriorIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { data: null, error: profilesError.message }
    }

    // Create profile lookup map
    const profileMap = {}
    profiles?.forEach(profile => {
      profileMap[profile.id] = profile
    })

    // Combine leaderboard data with profile information
    const enrichedData = leaderboardData.map((row, index) => {
      const profile = profileMap[row.warrior]
      
      // Show "Anonymous" for missing display names OR when user has private_profile enabled
      const isPrivate = !profile?.display_name || profile?.private_profile === true
      
      return {
        ...row,
        rank: index + 1,
        display_name: isPrivate ? 'Anonymous' : profile?.display_name || 'Anonymous',
        avatar_url: isPrivate ? null : profile?.avatar_url || null,
        is_anonymous: isPrivate
      }
    })

    return { data: enrichedData, error: null }
  } catch (err) {
    console.error('Unexpected error in getTopPrayerWarriors:', err)
    return { data: null, error: err.message }
  }
}

/**
 * Get current user's prayer streak
 * @returns {Object} { data, error }
 */
export async function getMyStreak() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    const { data: streakData, error: streakError } = await supabase
      .from('vw_prayer_streaks')
      .select('*')
      .eq('warrior', user.id)
      .single()

    if (streakError) {
      // If no streak record found, user has no prayers yet
      if (streakError.code === 'PGRST116') {
        return { 
          data: {
            warrior: user.id,
            current_streak: 0,
            streak_start_date: null,
            streak_end_date: null,
            is_active_streak: false
          }, 
          error: null 
        }
      }
      console.error('Error fetching user streak:', streakError)
      return { data: null, error: streakError.message }
    }

    return { data: streakData, error: null }
  } catch (err) {
    console.error('Unexpected error in getMyStreak:', err)
    return { data: null, error: err.message }
  }
}

/**
 * Get badges for a warrior based on their prayer count
 * @param {string} userId - The warrior's user ID
 * @returns {Object} { data, error }
 */
export async function getWarriorBadges(userId) {
  try {
    if (!userId) {
      return { data: [], error: 'User ID is required' }
    }

    // Get total prayer count from all-time leaderboard
    const { data: warriorData, error: warriorError } = await supabase
      .from('vw_prayer_leaderboard_alltime')
      .select('count_prayed')
      .eq('warrior', userId)
      .single()

    if (warriorError) {
      // If no record found, user has no confirmed prayers yet
      if (warriorError.code === 'PGRST116') {
        return { data: [], error: null }
      }
      console.error('Error fetching warrior prayer count:', warriorError)
      return { data: null, error: warriorError.message }
    }

    const prayerCount = warriorData?.count_prayed || 0
    const badges = []

    // Define badge tiers
    const badgeTiers = [
      { threshold: 1, name: 'First Prayer', description: 'Completed your first prayer commitment', icon: '🙏', color: 'bg-blue-100 text-blue-800' },
      { threshold: 5, name: 'Faithful', description: 'Completed 5 prayer commitments', icon: '⭐', color: 'bg-green-100 text-green-800' },
      { threshold: 10, name: 'Prayer Warrior', description: 'Completed 10 prayer commitments', icon: '🛡️', color: 'bg-purple-100 text-purple-800' },
      { threshold: 25, name: 'Devoted', description: 'Completed 25 prayer commitments', icon: '💎', color: 'bg-indigo-100 text-indigo-800' },
      { threshold: 50, name: 'Intercessor', description: 'Completed 50 prayer commitments', icon: '👑', color: 'bg-yellow-100 text-yellow-800' },
      { threshold: 100, name: 'Prayer Champion', description: 'Completed 100 prayer commitments', icon: '🏆', color: 'bg-orange-100 text-orange-800' },
      { threshold: 250, name: 'Spiritual Giant', description: 'Completed 250 prayer commitments', icon: '🌟', color: 'bg-red-100 text-red-800' },
      { threshold: 500, name: 'Prayer Legend', description: 'Completed 500 prayer commitments', icon: '⚡', color: 'bg-pink-100 text-pink-800' },
      { threshold: 1000, name: 'Saint', description: 'Completed 1000+ prayer commitments', icon: '😇', color: 'bg-gray-100 text-gray-800' }
    ]

    // Find all earned badges
    badgeTiers.forEach(tier => {
      if (prayerCount >= tier.threshold) {
        badges.push({
          ...tier,
          earned: true,
          earned_at: warriorData.first_prayed_at // Approximate - could be more precise with actual tracking
        })
      }
    })

    // Add streak-based badges if we have streak data
    const { data: streakData } = await getMyStreak()
    if (streakData && streakData.current_streak > 0) {
      const streakBadges = [
        { threshold: 3, name: 'Consistent', description: '3-day prayer streak', icon: '🔥', color: 'bg-orange-100 text-orange-800' },
        { threshold: 7, name: 'Dedicated', description: '7-day prayer streak', icon: '🔥🔥', color: 'bg-red-100 text-red-800' },
        { threshold: 14, name: 'Committed', description: '14-day prayer streak', icon: '🔥🔥🔥', color: 'bg-red-200 text-red-900' },
        { threshold: 30, name: 'Prayer Monk', description: '30-day prayer streak', icon: '🧘', color: 'bg-purple-200 text-purple-900' }
      ]

      streakBadges.forEach(badge => {
        if (streakData.current_streak >= badge.threshold) {
          badges.push({
            ...badge,
            earned: true,
            earned_at: streakData.streak_end_date,
            type: 'streak'
          })
        }
      })
    }

    // Sort badges by threshold (ascending) to show progression
    badges.sort((a, b) => a.threshold - b.threshold)

    return { data: badges, error: null }
  } catch (err) {
    console.error('Unexpected error in getWarriorBadges:', err)
    return { data: null, error: err.message }
  }
}

/**
 * Get global prayer statistics
 * @returns {Object} { data, error }
 */
export async function getPrayerStats() {
  try {
    // Get total prayers this week
    const { data: weekData, error: weekError } = await supabase
      .from('vw_prayer_leaderboard_week')
      .select('count_prayed')

    // Get total prayers this month  
    const { data: monthData, error: monthError } = await supabase
      .from('vw_prayer_leaderboard_month')
      .select('count_prayed')

    // Get total prayers all time
    const { data: allTimeData, error: allTimeError } = await supabase
      .from('vw_prayer_leaderboard_alltime')
      .select('count_prayed')

    // Get active streaks count
    const { data: streaksData, error: streaksError } = await supabase
      .from('vw_prayer_streaks')
      .select('current_streak')
      .gt('current_streak', 0)

    if (weekError || monthError || allTimeError || streaksError) {
      const errorMsg = weekError?.message || monthError?.message || allTimeError?.message || streaksError?.message
      console.error('Error fetching prayer stats:', errorMsg)
      return { data: null, error: errorMsg }
    }

    const stats = {
      prayers_this_week: weekData?.reduce((sum, row) => sum + row.count_prayed, 0) || 0,
      prayers_this_month: monthData?.reduce((sum, row) => sum + row.count_prayed, 0) || 0,
      prayers_all_time: allTimeData?.reduce((sum, row) => sum + row.count_prayed, 0) || 0,
      active_warriors: streaksData?.length || 0,
      total_warriors: allTimeData?.length || 0
    }

    return { data: stats, error: null }
  } catch (err) {
    console.error('Unexpected error in getPrayerStats:', err)
    return { data: null, error: err.message }
  }
}