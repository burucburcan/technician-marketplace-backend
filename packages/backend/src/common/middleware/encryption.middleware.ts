import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { EncryptionUtil } from '../utils/encryption.util'

/**
 * Middleware to automatically encrypt sensitive fields in request body
 * This middleware should be applied to routes that handle sensitive data
 */
@Injectable()
export class EncryptionMiddleware implements NestMiddleware {
  // Define sensitive fields that should be encrypted
  private readonly sensitiveFields = [
    'creditCardNumber',
    'cvv',
    'bankAccountNumber',
    'taxId',
    'ssn',
    'nationalId',
  ]

  use(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
      this.encryptSensitiveFields(req.body)
    }

    next()
  }

  /**
   * Recursively encrypt sensitive fields in an object
   */
  private encryptSensitiveFields(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key]

        // Check if this is a sensitive field
        if (this.sensitiveFields.includes(key) && typeof value === 'string' && value) {
          // Only encrypt if not already encrypted
          if (!EncryptionUtil.isEncrypted(value)) {
            obj[key] = EncryptionUtil.encrypt(value)
          }
        }

        // Recursively process nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => this.encryptSensitiveFields(item))
          } else {
            this.encryptSensitiveFields(value)
          }
        }
      }
    }
  }
}
