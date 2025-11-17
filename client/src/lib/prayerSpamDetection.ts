import { supabase } from './supabaseClient'

/**
 * Prayer Commitment Spam Detection System
 * Prevents bots and spam using behavioral analysis
 */

export interface SpamCheckResult {
  allowed: boolean
  score: number
  reason: string | null
  warningLevel: 'none' | 'low' | 'high'
}

interface UserStats {
  accountAge: number // in days
  recentCommitments: number // in last 5 minutes
  rapidFireCommitments: number // in last 10 seconds
  totalCommitments: number
  prayedConfirmations: number
  confirmationRatio: number // percentage
}

/**
 * Check if a prayer commitment attempt is spam
 */
export async function checkPrayerCommitmentSpam(userId: string): Promise<SpamCheckResult> {
  try {
    // Get user statistics
    const stats = await getUserPrayerStats(userId)
    
    // Calculate spam score
    let score = 0
    const reasons: string[] = []

    // 1. Account Age Check (30 points if < 1 day old)
    if (stats.accountAge < 1) {
      score += 30
      reasons.push('new account')
    }

    // 2. Rate Limiting Check (40 points if > 5 in 5 minutes)
    if (stats.recentCommitments >= 5) {
      score += 40
      reasons.push('too many recent commitments')
    }

    // 3. Rapid Fire Check (60 points if 3+ in 10 seconds)
    if (stats.rapidFireCommitments >= 3) {
      score += 60
      reasons.push('rapid-fire commitments')
    }

    // 4. Prayer Confirmation Ratio (50 points if < 20% and has 5+ commitments)
    if (stats.totalCommitments >= 5 && stats.confirmationRatio < 20) {
      score += 50
      reasons.push('low prayer confirmation rate')
    }

    // Determine action based on score
    if (score >= 80) {
      // BLOCK - High spam score
      return {
        allowed: false,
        score,
        reason: generateBlockMessage(reasons),
        warningLevel: 'high'
      }
    } else if (score >= 50) {
      // WARN - Medium spam score (allow but warn)
      return {
        allowed: true,
        score,
        reason: generateWarningMessage(reasons),
        warningLevel: 'low'
      }
    } else {
      // ALLOW - Low spam score
      return {
        allowed: true,
        score,
        reason: null,
        warningLevel: 'none'
      }
    }
  } catch (error) {
    console.error('Spam check error:', error)
    // On error, allow the commitment (fail open)
    return {
      allowed: true,
      score: 0,
      reason: null,
      warningLevel: 'none'
    }
  }
}

/**
 * Get user prayer statistics for spam detection
 */
async function getUserPrayerStats(userId: string): Promise<UserStats> {
  // Get user profile for account age
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single()

  const accountAge = profile?.created_at 
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 999 // Assume old account if can't determine

  // Get all commitments for this user
  const { data: commitments } = await supabase
    .from('prayer_commitments')
    .select('committed_at, status')
    .eq('warrior', userId)
    .order('committed_at', { ascending: false })

  const now = Date.now()
  const fiveMinutesAgo = now - (5 * 60 * 1000)
  const tenSecondsAgo = now - (10 * 1000)

  const recentCommitments = (commitments || []).filter(c => 
    new Date(c.committed_at).getTime() > fiveMinutesAgo
  ).length

  const rapidFireCommitments = (commitments || []).filter(c => 
    new Date(c.committed_at).getTime() > tenSecondsAgo
  ).length

  const totalCommitments = commitments?.length || 0
  const prayedConfirmations = (commitments || []).filter(c => c.status === 'prayed').length
  const confirmationRatio = totalCommitments > 0 
    ? (prayedConfirmations / totalCommitments) * 100 
    : 100 // Give benefit of doubt for new users

  return {
    accountAge,
    recentCommitments,
    rapidFireCommitments,
    totalCommitments,
    prayedConfirmations,
    confirmationRatio
  }
}

/**
 * Generate user-friendly block message
 */
function generateBlockMessage(reasons: string[]): string {
  const baseMessage = "We've detected unusual activity on your account. "
  
  if (reasons.includes('rapid-fire commitments')) {
    return baseMessage + "Please slow down and take time to genuinely commit to pray for each request."
  }
  
  if (reasons.includes('too many recent commitments')) {
    return baseMessage + "You've made many prayer commitments recently. Please take a moment to pray for the requests you've already committed to."
  }
  
  if (reasons.includes('low prayer confirmation rate')) {
    return baseMessage + "We noticed you haven't been confirming your prayers. Please remember to click 'I Prayed' after you've prayed for a request."
  }
  
  if (reasons.includes('new account')) {
    return "New accounts are limited to 3 prayer commitments per day. Keep engaging with the community to unlock full access!"
  }

  return baseMessage + "Please contact support if you believe this is an error."
}

/**
 * Generate user-friendly warning message
 */
function generateWarningMessage(reasons: string[]): string {
  if (reasons.includes('low prayer confirmation rate')) {
    return "Reminder: Don't forget to confirm when you've prayed for a request by clicking 'I Prayed'!"
  }
  
  if (reasons.includes('too many recent commitments')) {
    return "You're committing to pray for many requests! Remember to take time to actually pray for each one."
  }

  if (reasons.includes('new account')) {
    return "Welcome! As a new member, please take your time and genuinely commit to pray for each request."
  }

  return "Thank you for your prayer commitments! Remember to confirm when you've prayed."
}

/**
 * Get spam statistics for admin dashboard
 */
export async function getSpamStatistics(): Promise<any> {
  try {
    // Get users with suspicious patterns
    const { data: allCommitments } = await supabase
      .from('prayer_commitments')
      .select('warrior, status, committed_at')
      .order('committed_at', { ascending: false })

    const userStats = new Map<string, {
      total: number
      prayed: number
      ratio: number
    }>()

    allCommitments?.forEach(c => {
      const existing = userStats.get(c.warrior) || { total: 0, prayed: 0, ratio: 0 }
      existing.total++
      if (c.status === 'prayed') existing.prayed++
      existing.ratio = (existing.prayed / existing.total) * 100
      userStats.set(c.warrior, existing)
    })

    // Find users with low confirmation ratios
    const suspiciousUsers = Array.from(userStats.entries())
      .filter(([_, stats]) => stats.total >= 5 && stats.ratio < 20)
      .map(([userId, stats]) => ({ userId, ...stats }))

    return {
      totalUsers: userStats.size,
      suspiciousUsers: suspiciousUsers.length,
      details: suspiciousUsers
    }
  } catch (error) {
    console.error('Failed to get spam statistics:', error)
    return { totalUsers: 0, suspiciousUsers: 0, details: [] }
  }
}
