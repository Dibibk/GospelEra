// Faith Alignment Moderation Configuration
export interface ModerationConfig {
  blockedTerms: string[]
  christianTerms: string[]
  contextualAllowedPhrases: string[]
}

export interface AIModerationResult {
  allowed: boolean
  reason?: string
  confidence: number
  analysis?: string
}

export const moderationConfig: ModerationConfig = {
  // Terms that indicate non-Christian religious practices
  // NOTE: Only block explicit non-Christian religious invocations
  // Let AI handle nuanced cases like legitimate Christian mentions of Mary
  blockedTerms: [
    'pray to allah', 'in the name of allah', 'muhammad is the prophet',
    'praise vishnu', 'om shiva', 'hare krishna mantra',
    'buddha bless', 'buddhist mantra', 'dharma blessing',
    'praise zeus', 'invoke thor', 'call upon odin',
    'worship gaia', 'mother earth goddess', 'nature deity worship',
    'tarot blessing', 'horoscope ritual', 'astrology spell',
    'ouija spirit', 'séance prayer', 'channel spirits',
    'witchcraft spell', 'wiccan ritual', 'magic incantation',
    'occult ceremony', 'pagan offering', 'ancestral worship ritual',
    'chakra prayer', 'crystal energy prayer', 'universe manifest',
    // Only block explicit prayers TO Mary/saints, not mentions OF them
    'pray to mary', 'hail mary full of grace', 'mary intercede for us',
    'saint michael protect us', 'saint joseph pray for',
  ],
  
  // Terms that boost Christian content confidence
  christianTerms: [
    'jesus', 'christ', 'lord jesus', 'savior',
    'god', 'lord', 'almighty', 'creator',
    'prayer', 'pray', 'praying', 'prayers', 'prayed',
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
    'used to practice but now',
    // Allow proper Christian references to Mary
    'mary mother of jesus',
    'mary gave birth to jesus',
    'mary and joseph',
    'virgin mary bore jesus',
    'mary the mother of our lord',
    'jesus born of mary'
  ]
}

export interface ModerationResult {
  allowed: boolean
  reason?: string
  confidence: number
}

// Enhanced faith validation interface
export interface FaithValidationResult {
  isValid: boolean
  reason?: string
  confidence: number
  hasChristianTerms: boolean
  hasBibleReference: boolean
  meetsMinLength: boolean
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

// Bible reference regex patterns
const bibleReferencePatterns = [
  // Book Chapter:Verse (e.g., "John 3:16", "1 John 1:9")
  /\b(?:\d\s*)?(?:Genesis|Gen|Exodus|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|Ruth|1\s*Samuel|2\s*Samuel|1\s*Sam|2\s*Sam|1\s*Kings|2\s*Kings|1\s*Chron|2\s*Chron|Ezra|Nehemiah|Neh|Esther|Est|Job|Psalms?|Ps|Proverbs?|Prov|Ecclesiastes|Eccl|Song of Songs|Song|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Jon|Micah|Mic|Nahum|Nah|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mark|Luke|John|Acts|Romans|Rom|1\s*Corinthians|2\s*Corinthians|1\s*Cor|2\s*Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|1\s*Thessalonians|2\s*Thessalonians|1\s*Thess|2\s*Thess|1\s*Timothy|2\s*Timothy|1\s*Tim|2\s*Tim|Titus|Tit|Philemon|Phlm|Hebrews|Heb|James|Jas|1\s*Peter|2\s*Peter|1\s*Pet|2\s*Pet|1\s*John|2\s*John|3\s*John|Jude|Revelation|Rev)\s+\d+:\d+(?:-\d+)?(?:\s*,\s*\d+:\d+(?:-\d+)?)*\b/gi,
  // Short forms (e.g., "Ps 23", "Rom 8:28")
  /\b(?:Gen|Ex|Lev|Num|Deut|Josh|Judg|1Sam|2Sam|1Kgs|2Kgs|1Chr|2Chr|Neh|Est|Ps|Prov|Eccl|Isa|Jer|Lam|Ezek|Dan|Hos|Amos|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mk|Lk|Jn|Acts|Rom|1Cor|2Cor|Gal|Eph|Phil|Col|1Thess|2Thess|1Tim|2Tim|Tit|Phlm|Heb|Jas|1Pet|2Pet|1Jn|2Jn|3Jn|Jude|Rev)\s*\d+(?::\d+(?:-\d+)?)?/gi
]

// Check if text contains Bible references
function hasBibleReference(text: string): boolean {
  return bibleReferencePatterns.some(pattern => pattern.test(text))
}

// Enhanced faith validation function
export function validateFaithContent(text: string): FaithValidationResult {
  const trimmedText = text.trim()
  const lowerText = trimmedText.toLowerCase()
  
  // Check minimum length (6 characters)
  const meetsMinLength = trimmedText.length >= 6
  if (!meetsMinLength) {
    return {
      isValid: false,
      reason: "Content must be at least 6 characters long.",
      confidence: 0,
      hasChristianTerms: false,
      hasBibleReference: false,
      meetsMinLength: false
    }
  }
  
  // Run standard moderation check
  const moderationResult = moderateContent(trimmedText)
  if (!moderationResult.allowed) {
    return {
      isValid: false,
      reason: moderationResult.reason || "Please keep your content centered on Jesus or Scripture.",
      confidence: moderationResult.confidence,
      hasChristianTerms: false,
      hasBibleReference: false,
      meetsMinLength: true
    }
  }
  
  // Check for Christian terms
  const hasChristianTerms = moderationConfig.christianTerms.some(term => 
    lowerText.includes(term.toLowerCase())
  )
  
  // Check for Bible references
  const hasBibleRef = hasBibleReference(trimmedText)
  
  // Faith validation: must have either Christian terms OR Bible reference
  const passesFaithCheck = hasChristianTerms || hasBibleRef
  
  if (!passesFaithCheck) {
    return {
      isValid: false,
      reason: "Please keep your content centered on Jesus or Scripture.",
      confidence: moderationResult.confidence,
      hasChristianTerms: false,
      hasBibleReference: false,
      meetsMinLength: true
    }
  }
  
  return {
    isValid: true,
    confidence: moderationResult.confidence,
    hasChristianTerms,
    hasBibleReference: hasBibleRef,
    meetsMinLength: true
  }
}

// Helper function to check if content should be flagged for review
export function requiresReview(result: ModerationResult): boolean {
  return result.confidence < 0.6 && result.allowed
}

// AI-based content validation (server-side only)
export async function validateContentWithAI(text: string): Promise<AIModerationResult> {
  // This function should only be called server-side where OpenAI client is available
  // It will be implemented in the server routes
  throw new Error('This function must be called from server-side code')
}