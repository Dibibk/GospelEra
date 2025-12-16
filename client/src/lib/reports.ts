import { supabase } from './supabaseClient'
import { getApiBaseUrl } from './posts'

interface CreateReportData {
  targetType: 'post' | 'comment'
  targetId: string
  reason?: string
}

/**
 * Creates a new report with the current user as reporter
 * Uses backend API to bypass RLS issues on native apps
 * @param {Object} reportData - The report data
 * @param {string} reportData.targetType - Type of target being reported ('post' or 'comment')
 * @param {string} reportData.targetId - ID of the target being reported
 * @param {string} reportData.reason - Reason for the report (optional)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createReport({ targetType, targetId, reason }: CreateReportData) {
  try {
    // Get current session for auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`)
    }
    
    if (!session) {
      throw new Error('User must be authenticated to create reports')
    }

    // Call backend API to create report (bypasses RLS)
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        reason
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to create report: ${response.status}`)
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}