/**
 * Content filtering utility for messaging
 * Validates: Requirement 11.6
 */

// List of inappropriate words/phrases (can be expanded)
const INAPPROPRIATE_WORDS = [
  // Add inappropriate words here
  // This is a basic implementation - in production, use a more comprehensive list
  'spam',
  'scam',
  'fraud',
]

// Patterns for detecting suspicious content
const SUSPICIOUS_PATTERNS = [
  /\b\d{16}\b/g, // Credit card numbers (16 digits)
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email addresses (might be phishing)
]

export interface ContentFilterResult {
  isClean: boolean
  reason?: string
  filteredContent?: string
}

/**
 * Filter message content for inappropriate or suspicious content
 */
export function filterMessageContent(content: string): ContentFilterResult {
  if (!content || content.trim().length === 0) {
    return { isClean: true }
  }

  const lowerContent = content.toLowerCase()

  // Check for inappropriate words
  for (const word of INAPPROPRIATE_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        isClean: false,
        reason: 'Content contains inappropriate language',
      }
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      // Mask the suspicious content
      const filteredContent = content.replace(pattern, '[REDACTED]')
      return {
        isClean: true,
        filteredContent,
        reason: 'Sensitive information was automatically redacted',
      }
    }
  }

  return { isClean: true }
}

/**
 * Check if content should be flagged for moderation
 */
export function shouldFlagForModeration(content: string): boolean {
  if (!content) return false

  // Flag if content is excessively long (potential spam)
  if (content.length > 5000) {
    return true
  }

  // Flag if content has excessive repetition
  const words = content.split(/\s+/)
  const uniqueWords = new Set(words)
  if (words.length > 20 && uniqueWords.size / words.length < 0.3) {
    return true // Less than 30% unique words
  }

  // Flag if content has excessive URLs
  const urlPattern = /https?:\/\/[^\s]+/gi
  const urls = content.match(urlPattern)
  if (urls && urls.length > 3) {
    return true
  }

  return false
}

/**
 * Sanitize content by removing potentially harmful elements
 */
export function sanitizeContent(content: string): string {
  if (!content) return ''

  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '')

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  return sanitized
}
