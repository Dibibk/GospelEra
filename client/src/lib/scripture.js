/**
 * Scripture utilities for daily verses and biblical content
 */

/**
 * Gets the daily verse - currently returns a hardcoded verse
 * TODO: Replace with actual API call or dynamic verse selection
 * @returns {Promise<{reference: string, text: string}>}
 */
export async function getDailyVerse() {
  // Hardcoded verse for now - will be replaced with API call later
  return {
    reference: "John 3:16",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
  }
}