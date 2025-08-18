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

    // Auto-hide content for "Not Christ-Centered" reports
    if (reason?.includes('Not Christ-Centered (prayer not to Jesus)')) {
      const tableName = targetType === 'post' ? 'posts' : 'comments'
      const targetIdNum = parseInt(targetId)
      
      // Try to hide the content (handle both old and new schema)
      const hideError = await hideContent(tableName, targetIdNum)
      
      // Don't fail the report if hiding fails (schema may not have been updated yet)
      if (hideError) {
        console.warn(`Failed to auto-hide ${targetType} ${targetId}:`, hideError)
      }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

// Helper function to hide content (handles schema compatibility)
async function hideContent(tableName: string, targetId: number) {
  try {
    // First try with the new 'hidden' column
    const { error } = await supabase
      .from(tableName)
      .update({ hidden: true })
      .eq('id', targetId)
    
    return error
  } catch (error: any) {
    // If the column doesn't exist, silently fail (schema hasn't been updated yet)
    if (error?.code === '42703') {
      return null
    }
    return error
  }
}