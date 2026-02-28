/**
 * Basic inappropriate content filter
 * Checks for common inappropriate words and patterns
 */
export class ContentFilter {
  // List of inappropriate words (basic implementation)
  private static readonly INAPPROPRIATE_WORDS = [
    // Profanity (English)
    'fuck',
    'shit',
    'damn',
    'bitch',
    'asshole',
    'bastard',
    // Profanity (Spanish)
    'puto',
    'puta',
    'mierda',
    'pendejo',
    'cabrón',
    'chingar',
    'verga',
    'coño',
    // Offensive terms
    'idiot',
    'stupid',
    'moron',
    'idiota',
    'estúpido',
    // Spam patterns
    'click here',
    'buy now',
    'visit',
    'http://',
    'https://',
    'www.',
  ]

  /**
   * Check if content contains inappropriate words or patterns
   * @param content The text content to check
   * @returns true if inappropriate content is detected
   */
  static containsInappropriateContent(content: string): boolean {
    if (!content) {
      return false
    }

    const lowerContent = content.toLowerCase()

    // Check for inappropriate words
    for (const word of this.INAPPROPRIATE_WORDS) {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(lowerContent)) {
        return true
      }
    }

    // Check for excessive capitalization (potential spam)
    const capitalRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capitalRatio > 0.5 && content.length > 20) {
      return true
    }

    // Check for excessive punctuation (potential spam)
    const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length / content.length
    if (punctuationRatio > 0.1) {
      return true
    }

    return false
  }

  /**
   * Get a list of detected inappropriate words in the content
   * @param content The text content to check
   * @returns Array of detected inappropriate words
   */
  static getInappropriateWords(content: string): string[] {
    if (!content) {
      return []
    }

    const lowerContent = content.toLowerCase()
    const detected: string[] = []

    for (const word of this.INAPPROPRIATE_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(lowerContent)) {
        detected.push(word)
      }
    }

    return detected
  }
}
