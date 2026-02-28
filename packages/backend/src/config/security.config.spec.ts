import { getSecurityConfig } from './security.config'

describe('Security Configuration Tests', () => {
  describe('getSecurityConfig', () => {
    it('should return security configuration', () => {
      const config = getSecurityConfig()

      expect(config).toBeDefined()
      expect(config.cors).toBeDefined()
      expect(config.helmet).toBeDefined()
      expect(config.rateLimit).toBeDefined()
    })

    it('should configure CORS with default origins', () => {
      const config = getSecurityConfig()

      expect(config.cors.origin).toEqual(['http://localhost:3000', 'http://localhost:3001'])
      expect(config.cors.credentials).toBe(true)
    })

    it('should configure CORS with allowed methods', () => {
      const config = getSecurityConfig()

      expect(config.cors.methods).toContain('GET')
      expect(config.cors.methods).toContain('POST')
      expect(config.cors.methods).toContain('PUT')
      expect(config.cors.methods).toContain('DELETE')
      expect(config.cors.methods).toContain('PATCH')
      expect(config.cors.methods).toContain('OPTIONS')
    })

    it('should configure CORS with allowed headers', () => {
      const config = getSecurityConfig()

      expect(config.cors.allowedHeaders).toContain('Content-Type')
      expect(config.cors.allowedHeaders).toContain('Authorization')
      expect(config.cors.allowedHeaders).toContain('X-Requested-With')
      expect(config.cors.allowedHeaders).toContain('Accept')
      expect(config.cors.allowedHeaders).toContain('Origin')
    })

    it('should configure Helmet with CSP directives', () => {
      const config = getSecurityConfig()

      expect(config.helmet.contentSecurityPolicy).toBeDefined()
      expect(config.helmet.contentSecurityPolicy.directives).toBeDefined()
      expect(config.helmet.contentSecurityPolicy.directives.defaultSrc).toContain("'self'")
      expect(config.helmet.contentSecurityPolicy.directives.objectSrc).toContain("'none'")
    })

    it('should configure HSTS with proper settings', () => {
      const config = getSecurityConfig()

      expect(config.helmet.hsts.maxAge).toBe(31536000) // 1 year
      expect(config.helmet.hsts.includeSubDomains).toBe(true)
      expect(config.helmet.hsts.preload).toBe(true)
    })

    it('should configure rate limiting for auth endpoints', () => {
      const config = getSecurityConfig()

      expect(config.rateLimit.auth.ttl).toBe(900000) // 15 minutes
      expect(config.rateLimit.auth.limit).toBe(5)
    })

    it('should configure rate limiting for API endpoints', () => {
      const config = getSecurityConfig()

      expect(config.rateLimit.api.ttl).toBe(60000) // 1 minute
      expect(config.rateLimit.api.limit).toBe(100)
    })

    it('should configure rate limiting for public endpoints', () => {
      const config = getSecurityConfig()

      expect(config.rateLimit.public.ttl).toBe(60000) // 1 minute
      expect(config.rateLimit.public.limit).toBe(20)
    })

    it('should parse CORS_ORIGIN from environment variable', () => {
      const originalEnv = process.env.CORS_ORIGIN
      process.env.CORS_ORIGIN = 'https://example.com,https://app.example.com'

      const config = getSecurityConfig()

      expect(config.cors.origin).toEqual(['https://example.com', 'https://app.example.com'])

      // Restore original env
      if (originalEnv) {
        process.env.CORS_ORIGIN = originalEnv
      } else {
        delete process.env.CORS_ORIGIN
      }
    })
  })
})
