/**
 * Scripture utilities for daily verses and biblical content
 */

/**
 * Gets a daily verse from Bible-API.com
 * Uses their random verse endpoint to provide variety each day
 * @returns {Promise<{reference: string, text: string}>}
 */
export async function getDailyVerse() {
  try {
    // Use Bible-API.com for free scripture access
    const response = await fetch('https://bible-api.com/random')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Format the response to match our expected structure
    return {
      reference: data.reference,
      text: data.text.trim()
    }
  } catch (error) {
    console.error('Failed to fetch daily verse:', error)
    
    // Fallback to a hardcoded verse if API fails
    return {
      reference: "Psalm 119:105",
      text: "Your word is a lamp for my feet, a light on my path."
    }
  }
}