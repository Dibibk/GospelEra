import { supabase } from './supabaseClient'

/**
 * Check if posts or comments have open reports (for admin flagged indicators)
 * @param targetIds Array of target IDs to check
 * @param targetType Either 'post' or 'comment'
 * @returns Map of target ID to boolean (true if has open reports)
 */
export async function checkFlaggedStatus(targetIds: (string | number)[], targetType: 'post' | 'comment'): Promise<Map<string | number, boolean>> {
  const flaggedMap = new Map<string | number, boolean>()
  
  if (targetIds.length === 0) {
    return flaggedMap
  }

  try {
    // Get current user to check if they're admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return flaggedMap // Return empty map if not authenticated
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return flaggedMap // Return empty map if not admin
    }

    // Query for open reports on these targets
    const { data: reports, error } = await supabase
      .from('reports')
      .select('target_id')
      .eq('target_type', targetType)
      .eq('status', 'open')
      .in('target_id', targetIds.map(String)) // Convert to strings for query

    if (error) {
      console.error('Error checking flagged status:', error)
      return flaggedMap
    }

    // Mark flagged targets
    if (reports) {
      reports.forEach(report => {
        // Try both string and number versions of the ID
        const targetId = report.target_id
        flaggedMap.set(targetId, true)
        // Also set numeric version if it's a valid number
        const numericId = Number(targetId)
        if (!isNaN(numericId)) {
          flaggedMap.set(numericId, true)
        }
      })
    }

    return flaggedMap
  } catch (error) {
    console.error('Error checking flagged status:', error)
    return flaggedMap
  }
}