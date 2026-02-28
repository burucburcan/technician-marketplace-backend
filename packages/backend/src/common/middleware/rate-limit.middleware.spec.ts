import { RateLimitMiddleware, RateLimitConfig } from './rate-limit.middleware'
import { Request, Response, NextFunction } from 'express'

describe('Rate Limit Middleware Unit Tests', () => {
  let middleware: RateLimitMiddleware
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let config: RateLimitConfig

  beforeEach(() => {
    config = {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
      keyPrefix: 'test-rate-limit',
    }

    mockRequest = {
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
      headers: {},
      get: jest.fn(),
    }

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    mockNext = jest.fn()
  })

  afterEach(async () => {
    if (middleware) {
      await middleware.onModuleDestroy()
    }
  })

  describe('Middleware Initialization', () => {
    it('should create middleware instance with config', () => {
      middleware = new RateLimitMiddleware(config)
      expect(middleware).toBeDefined()
      expect(middleware.use).toBeDefined()
    })

    it('should use default key prefix if not provided', () => {
      const configWithoutPrefix = {
        windowMs: 60000,
        maxRequests: 10,
      }
      middleware = new RateLimitMiddleware(configWithoutPrefix)
      expect(middleware['config'].keyPrefix).toBe('rate-limit')
    })
  })

  describe('Rate Limit Headers', () => {
    it('should set rate limit headers', async () => {
      middleware = new RateLimitMiddleware(config)

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String))
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String)
      )
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
    })
  })

  describe('Identifier Extraction', () => {
    it('should use IP address as identifier when user is not authenticated', async () => {
      middleware = new RateLimitMiddleware(config)

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Should proceed without error
      expect(mockNext).toHaveBeenCalled()
    })

    it('should use user ID as identifier when user is authenticated', async () => {
      middleware = new RateLimitMiddleware(config)
      mockRequest = {
        ...mockRequest,
        user: { id: 'user-123' },
      } as any

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Should proceed without error
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle X-Forwarded-For header', async () => {
      middleware = new RateLimitMiddleware(config)
      mockRequest.headers = {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      }

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Should proceed without error
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should allow request to proceed if Redis is not available', async () => {
      middleware = new RateLimitMiddleware(config)
      // Redis connection will fail in test environment

      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Should still call next even if Redis is unavailable
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should respect custom window and limit settings', () => {
      const customConfig: RateLimitConfig = {
        windowMs: 900000, // 15 minutes
        maxRequests: 5,
        keyPrefix: 'auth-rate-limit',
      }

      middleware = new RateLimitMiddleware(customConfig)
      expect(middleware['config'].windowMs).toBe(900000)
      expect(middleware['config'].maxRequests).toBe(5)
      expect(middleware['config'].keyPrefix).toBe('auth-rate-limit')
    })
  })
})
