import { EncryptionMiddleware } from './encryption.middleware'
import { EncryptionUtil } from '../utils/encryption.util'
import { Request, Response, NextFunction } from 'express'

describe('EncryptionMiddleware', () => {
  let middleware: EncryptionMiddleware
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    middleware = new EncryptionMiddleware()
    mockRequest = {}
    mockResponse = {}
    mockNext = jest.fn()

    // Set test encryption keys
    process.env.ENCRYPTION_SECRET = 'test-secret-key-for-unit-tests'
    process.env.ENCRYPTION_SALT = 'test-salt-for-unit-tests'
  })

  describe('use', () => {
    it('should call next() without modifying request when body is empty', () => {
      mockRequest.body = undefined

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should encrypt sensitive fields in request body', () => {
      mockRequest.body = {
        name: 'John Doe',
        creditCardNumber: '4111111111111111',
        email: 'john@example.com',
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.name).toBe('John Doe')
      expect(mockRequest.body.email).toBe('john@example.com')
      expect(mockRequest.body.creditCardNumber).not.toBe('4111111111111111')
      expect(EncryptionUtil.isEncrypted(mockRequest.body.creditCardNumber)).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should encrypt multiple sensitive fields', () => {
      mockRequest.body = {
        creditCardNumber: '4111111111111111',
        cvv: '123',
        bankAccountNumber: '1234567890',
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(EncryptionUtil.isEncrypted(mockRequest.body.creditCardNumber)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.cvv)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.bankAccountNumber)).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle nested objects', () => {
      mockRequest.body = {
        user: {
          name: 'John Doe',
          taxId: '123-45-6789',
        },
        payment: {
          creditCardNumber: '4111111111111111',
        },
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.user.name).toBe('John Doe')
      expect(EncryptionUtil.isEncrypted(mockRequest.body.user.taxId)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.payment.creditCardNumber)).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle arrays of objects', () => {
      mockRequest.body = {
        payments: [
          { creditCardNumber: '4111111111111111' },
          { creditCardNumber: '5500000000000004' },
        ],
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(EncryptionUtil.isEncrypted(mockRequest.body.payments[0].creditCardNumber)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.payments[1].creditCardNumber)).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should not encrypt already encrypted fields', () => {
      const alreadyEncrypted = EncryptionUtil.encrypt('4111111111111111')
      mockRequest.body = {
        creditCardNumber: alreadyEncrypted,
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.creditCardNumber).toBe(alreadyEncrypted)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should skip null and undefined values', () => {
      mockRequest.body = {
        creditCardNumber: null,
        cvv: undefined,
        bankAccountNumber: '',
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.creditCardNumber).toBeNull()
      expect(mockRequest.body.cvv).toBeUndefined()
      expect(mockRequest.body.bankAccountNumber).toBe('')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should skip non-string values', () => {
      mockRequest.body = {
        creditCardNumber: 4111111111111111, // number instead of string
        cvv: 123,
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.creditCardNumber).toBe(4111111111111111)
      expect(mockRequest.body.cvv).toBe(123)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle all defined sensitive fields', () => {
      mockRequest.body = {
        creditCardNumber: '4111111111111111',
        cvv: '123',
        bankAccountNumber: '1234567890',
        taxId: '123-45-6789',
        ssn: '123-45-6789',
        nationalId: 'ABC123456',
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(EncryptionUtil.isEncrypted(mockRequest.body.creditCardNumber)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.cvv)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.bankAccountNumber)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.taxId)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.ssn)).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.nationalId)).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should not encrypt non-sensitive fields', () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St',
        phone: '555-1234',
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.body.name).toBe('John Doe')
      expect(mockRequest.body.email).toBe('john@example.com')
      expect(mockRequest.body.address).toBe('123 Main St')
      expect(mockRequest.body.phone).toBe('555-1234')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle complex nested structures', () => {
      mockRequest.body = {
        user: {
          profile: {
            taxId: '123-45-6789',
          },
        },
        payments: [
          {
            method: 'card',
            details: {
              creditCardNumber: '4111111111111111',
              cvv: '123',
            },
          },
        ],
      }

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext)

      expect(EncryptionUtil.isEncrypted(mockRequest.body.user.profile.taxId)).toBe(true)
      expect(
        EncryptionUtil.isEncrypted(mockRequest.body.payments[0].details.creditCardNumber)
      ).toBe(true)
      expect(EncryptionUtil.isEncrypted(mockRequest.body.payments[0].details.cvv)).toBe(true)
      expect(mockRequest.body.payments[0].method).toBe('card')
      expect(mockNext).toHaveBeenCalled()
    })
  })
})
