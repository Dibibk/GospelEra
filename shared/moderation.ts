// Faith Alignment Moderation Configuration
export interface ModerationConfig {
  blockedTerms: string[]
  christianTerms: string[]
  contextualAllowedPhrases: string[]
}

export const moderationConfig: ModerationConfig = {
  // Terms that indicate non-Christian religious practices
  blockedTerms: [
    'allah', 'muhammad', 'quran', 'mosque',
    'vishnu', 'shiva', 'krishna', 'brahma', 'hindu gods',
    'buddha as deity', 'buddhist prayer', 'dharma prayer',
    'athena', 'zeus', 'thor', 'odin', 'apollo',
    'gaia worship', 'mother earth prayer', 'nature deity',
    'tarot reading', 'horoscope prayer', 'astrology prayer',
    'ouija', 'séance', 'spirit guide',
    'witchcraft', 'spell casting', 'magic ritual',
    'occult invocation', 'pagan ritual', 'wiccan prayer',
    'ancestral worship', 'ancestor spirits',
    'chakra alignment prayer', 'crystal healing prayer',
    'new age spirituality', 'universe prayer'
  ],
  
  // Terms that boost Christian content confidence
  christianTerms: [
    'jesus', 'christ', 'lord jesus', 'savior',
    'god the father', 'heavenly father', 'abba father',
    'holy spirit', 'holy ghost', 'comforter',
    'bible', 'scripture', 'word of god',
    'matthew', 'mark', 'luke', 'john', 'psalms', 'proverbs',
    'romans', 'corinthians', 'ephesians', 'philippians',
    'christian', 'christianity', 'gospel', 'salvation',
    'cross', 'crucifixion', 'resurrection', 'easter',
    'christmas', 'nativity', 'bethlehem', 'calvary',
    'church', 'pastor', 'minister', 'congregation',
    'baptism', 'communion', 'eucharist',
    'prayer in jesus name', 'amen', 'hallelujah', 'praise god'
  ],
  
  // Phrases that are allowed even if they mention other religions (educational/testimonial)
  contextualAllowedPhrases: [
    'came from islam to christ',
    'left hinduism for jesus',
    'testimony about leaving',
    'discussion about other religions',
    'sharing the gospel with',
    'missionary work among',
    'converted from',
    'used to practice but now'
  ]
}

export interface ModerationResult {
  allowed: boolean
  reason?: string
  confidence: number
}

export function moderateContent(text: string): ModerationResult {
  const lowerText = text.toLowerCase()
  
  // Check for contextual allowances first
  const hasContextualAllowance = moderationConfig.contextualAllowedPhrases.some(phrase => 
    lowerText.includes(phrase.toLowerCase())
  )
  
  if (hasContextualAllowance) {
    return { allowed: true, confidence: 0.8 }
  }
  
  // Check for blocked terms
  const foundBlockedTerms = moderationConfig.blockedTerms.filter(term => 
    lowerText.includes(term.toLowerCase())
  )
  
  if (foundBlockedTerms.length > 0) {
    return {
      allowed: false,
      reason: "This community is Christ-centered. Please direct prayers to Jesus.",
      confidence: 0.9
    }
  }
  
  // Check for Christian terms to boost confidence
  const foundChristianTerms = moderationConfig.christianTerms.filter(term => 
    lowerText.includes(term.toLowerCase())
  )
  
  // Base confidence for content without specific indicators
  let confidence = 0.5
  
  // Boost confidence for Christian content
  if (foundChristianTerms.length > 0) {
    confidence = Math.min(0.95, 0.5 + (foundChristianTerms.length * 0.1))
  }
  
  return { allowed: true, confidence }
}

// Helper function to check if content should be flagged for review
export function requiresReview(result: ModerationResult): boolean {
  return result.confidence < 0.6 && result.allowed
}