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
    'new age spirituality', 'universe prayer',
    // Prayer directed to Mary or saints (non-Protestant practices)
    'pray to mary', 'hail mary', 'mother mary pray for us',
    'mary queen of heaven', 'pray to saint', 'saint pray for us',
    // Other deities and religious figures
    'mother goddess', 'divine feminine', 'goddess prayer',
    'ra the sun god', 'egyptian gods', 'celtic gods',
    'native american spirits', 'ancestral deities',
    'bahai prayer', 'zoroastrian prayer', 'sikh prayer'
  ],
  
  // Terms that boost Christian content confidence
  christianTerms: [
    'jesus', 'christ', 'lord jesus', 'savior',
    'god', 'lord', 'almighty', 'creator',
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