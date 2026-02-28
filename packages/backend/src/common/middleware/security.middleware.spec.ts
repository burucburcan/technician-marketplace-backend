import { SecurityMiddleware } from './security.middleware'
import { Request, Response, NextFunction } from 'express'

describe('Security Middleware Unit Tests', () => {
  let middleware: SecurityMiddleware
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    middleware = new SecurityMiddleware()
    mockRequest = {}
    mockResponse = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      getHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    mockNext = jest.fn()
  })

  describe('Middleware Initialization', () => {
    it('should create middleware instance', () => {
      expect(middleware).toBeDefined()
      expect(middleware.use).toBeDefined()
    })

    it('should have helmet middleware configured', () => {
      expect(middleware['helmetMiddleware']).toBeDefined()
    })
  })

  describe('Middleware Execution', () => {
    it('should call next function', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Helmet middleware should eventually call next
      expect(mockNext).toHaveBeenCalled()
    })

    it('should apply security headers through helmet', () => {
      const setHeaderSpy = jest.spyOn(mockResponse as any, 'setHeader')

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      // Helmet should set various security headers
      expect(setHeaderSpy).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })
  })
})
