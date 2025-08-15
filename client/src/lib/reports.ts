import { supabase } from './supabaseClient'

interface CreateReportData {
  targetType: 'post' | 'comment'
  targetId: string
  reason?: string
}

/**
 * Creates a new report with the current user as reporter
 * @param {Object} reportData - The report data
 * @param {string} reportData.targetType - Type of target being reported ('post' or 'comment')
 * @param {string} reportData.targetId - ID of the target being reported
 * @param {string} reportData.reason - Reason for the report (optional)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createReport({ targetType, targetId, reason }: CreateReportData) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to create reports')
    }

    // Insert the report
    const { data, error } = await supabase
      .from('reports')
      .insert({
        target_type: targetType,
        target_id: targetId,
        reason,
        reporter: user.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}