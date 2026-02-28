import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Language = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()

  // Try to get language from:
  // 1. Query parameter (?lang=es)
  // 2. Header (Accept-Language)
  // 3. User profile (if authenticated)
  // 4. Default to 'es'

  const queryLang = request.query?.lang
  if (queryLang && ['es', 'en'].includes(queryLang)) {
    return queryLang
  }

  const headerLang = request.headers['accept-language']
  if (headerLang) {
    const lang = headerLang.split(',')[0].split('-')[0]
    if (['es', 'en'].includes(lang)) {
      return lang
    }
  }

  // If user is authenticated and has a profile with language preference
  if (request.user?.profile?.language) {
    return request.user.profile.language
  }

  return 'es' // Default language
})
