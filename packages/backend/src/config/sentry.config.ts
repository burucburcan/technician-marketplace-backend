// Stub implementation of Sentry configuration
// This provides the same API as the real Sentry integration but logs to console instead
// Replace with actual @sentry/node implementation when ready to use Sentry

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

interface Breadcrumb {
  message?: string
  category?: string
  level?: SeverityLevel
  type?: string
  data?: Record<string, unknown>
  timestamp?: number
}

interface User {
  id: string
  email?: string
  role?: string
}

export const initSentry = (): void => {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled (stub mode)')
    return
  }

  console.log('Sentry stub initialized - logging to console only')
}

export const captureException = (error: Error, context?: Record<string, unknown>): void => {
  console.error('[Sentry Stub] Exception captured:', {
    message: error.message,
    stack: error.stack,
    context,
  })
}

export const captureMessage = (message: string, level: SeverityLevel = 'info'): void => {
  const logMethod =
    level === 'error' || level === 'fatal' ? 'error' : level === 'warning' ? 'warn' : 'log'
  console[logMethod](`[Sentry Stub] Message (${level}):`, message)
}

export const setUser = (user: User): void => {
  console.log('[Sentry Stub] User set:', {
    id: user.id,
    email: user.email,
    role: user.role,
  })
}

export const addBreadcrumb = (breadcrumb: Breadcrumb): void => {
  console.debug('[Sentry Stub] Breadcrumb added:', breadcrumb)
}

// Export a stub Sentry object for compatibility
export const Sentry = {
  init: initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
}
