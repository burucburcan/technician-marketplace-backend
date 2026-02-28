import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for encryption
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly AUTH_TAG_LENGTH = 16
  private static readonly SALT_LENGTH = 64

  /**
   * Get encryption key from environment variable
   * In production, this should be stored in a secure key management service
   */
  private static getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production'
    const salt = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production'

    // Derive a key using scrypt
    return scryptSync(secret, salt, this.KEY_LENGTH)
  }

  /**
   * Encrypt sensitive data
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: iv:authTag:encryptedData (all base64 encoded)
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext
    }

    try {
      const key = this.getEncryptionKey()
      const iv = randomBytes(this.IV_LENGTH)

      const cipher = createCipheriv(this.ALGORITHM, key, iv)

      let encrypted = cipher.update(plaintext, 'utf8', 'base64')
      encrypted += cipher.final('base64')

      const authTag = cipher.getAuthTag()

      // Return format: iv:authTag:encryptedData
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - The encrypted data in format: iv:authTag:encryptedData
   * @returns Decrypted plaintext
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData) {
      return encryptedData
    }

    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const [ivBase64, authTagBase64, encrypted] = parts

      const key = this.getEncryptionKey()
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')

      const decipher = createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
  }

  /**
   * Check if a string is encrypted (has the expected format)
   * @param data - The data to check
   * @returns True if the data appears to be encrypted
   */
  static isEncrypted(data: string): boolean {
    if (!data) {
      return false
    }

    const parts = data.split(':')
    return parts.length === 3
  }

  /**
   * Encrypt an object's sensitive fields
   * @param obj - The object containing sensitive data
   * @param fields - Array of field names to encrypt
   * @returns New object with encrypted fields
   */
  static encryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    // Create a new object with the same prototype to preserve class type
    const result = Object.create(Object.getPrototypeOf(obj))
    Object.assign(result, obj)

    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string) as any
      }
    }

    return result
  }

  /**
   * Decrypt an object's encrypted fields
   * @param obj - The object containing encrypted data
   * @param fields - Array of field names to decrypt
   * @returns New object with decrypted fields
   */
  static decryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    // Create a new object with the same prototype to preserve class type
    const result = Object.create(Object.getPrototypeOf(obj))
    Object.assign(result, obj)

    for (const field of fields) {
      if (
        result[field] &&
        typeof result[field] === 'string' &&
        this.isEncrypted(result[field] as string)
      ) {
        result[field] = this.decrypt(result[field] as string) as any
      }
    }

    return result
  }
}
