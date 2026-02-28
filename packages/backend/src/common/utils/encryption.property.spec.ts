import * as fc from 'fast-check'
import { EncryptionUtil } from './encryption.util'

/**
 * Property-Based Tests for Encryption System
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the encryption system, ensuring correctness and security at scale.
 */
describe('Encryption System - Property Tests', () => {
  beforeAll(() => {
    // Set test encryption keys
    process.env.ENCRYPTION_SECRET = 'test-secret-key-for-property-tests'
    process.env.ENCRYPTION_SALT = 'test-salt-for-property-tests'
  })

  // Generators for property testing
  const plaintextGen = fc.string({ minLength: 1, maxLength: 1000 })
  const sensitiveDataGen = fc.oneof(
    fc.string({ minLength: 10, maxLength: 100 }), // Regular strings
    fc.emailAddress(), // Email addresses
    fc.hexaString({ minLength: 16, maxLength: 32 }), // Credit card-like numbers
    fc.uuid(), // UUIDs
    fc.string({ minLength: 1, maxLength: 500 }).map(s => s + '!@#$%^&*()') // Special chars
  )
  const unicodeGen = fc.fullUnicodeString({ minLength: 1, maxLength: 100 })

  /**
   * **Property 41: Hassas Veri Şifreleme (Sensitive Data Encryption)**
   *
   * **Validates: Requirement 14.1**
   *
   * For any sensitive data (password, payment info), the value stored in the database
   * must be encrypted. This property ensures that encryption maintains data integrity
   * through the encrypt-decrypt cycle.
   */
  describe('Property 41: Hassas Veri Şifreleme', () => {
    /**
     * Property 41.1: Encryption Round-Trip
     * Any sensitive data that is encrypted can be decrypted back to the original value
     */
    it('should encrypt and decrypt data correctly (round-trip) for any plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          // Encrypt the plaintext
          const encrypted = EncryptionUtil.encrypt(plaintext)

          // Property: Encrypted data must be different from plaintext
          expect(encrypted).not.toBe(plaintext)
          expect(encrypted).toBeDefined()

          // Property: Encrypted data must have the correct format (iv:authTag:encryptedData)
          const parts = encrypted.split(':')
          expect(parts).toHaveLength(3)

          // Decrypt the encrypted data
          const decrypted = EncryptionUtil.decrypt(encrypted)

          // Property: Decrypted data must equal original plaintext
          expect(decrypted).toBe(plaintext)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.2: Encryption Uniqueness
     * Encrypting the same data twice produces different ciphertext (due to random IV)
     */
    it('should produce different ciphertext for same plaintext (encryption uniqueness)', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          // Encrypt the same plaintext twice
          const encrypted1 = EncryptionUtil.encrypt(plaintext)
          const encrypted2 = EncryptionUtil.encrypt(plaintext)

          // Property: Two encryptions of the same plaintext must produce different ciphertext
          expect(encrypted1).not.toBe(encrypted2)

          // Property: Both must have valid format
          expect(encrypted1.split(':')).toHaveLength(3)
          expect(encrypted2.split(':')).toHaveLength(3)

          // Property: IVs must be different
          const iv1 = encrypted1.split(':')[0]
          const iv2 = encrypted2.split(':')[0]
          expect(iv1).not.toBe(iv2)

          // Property: Both must decrypt to the same original plaintext
          const decrypted1 = EncryptionUtil.decrypt(encrypted1)
          const decrypted2 = EncryptionUtil.decrypt(encrypted2)
          expect(decrypted1).toBe(plaintext)
          expect(decrypted2).toBe(plaintext)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.3: Tamper Detection
     * Modifying encrypted data should cause decryption to fail or produce incorrect output
     */
    it('should detect tampering with encrypted data', async () => {
      await fc.assert(
        fc.asyncProperty(
          plaintextGen,
          fc.integer({ min: 0, max: 2 }), // Which part to tamper (iv, authTag, or ciphertext)
          async (plaintext: string, tamperPart: number) => {
            // Encrypt the plaintext
            const encrypted = EncryptionUtil.encrypt(plaintext)
            const parts = encrypted.split(':')

            // Tamper with one part of the encrypted data
            const tamperedParts = [...parts]
            const originalPart = tamperedParts[tamperPart]

            // Modify the selected part (change last character)
            if (originalPart.length > 0) {
              const lastChar = originalPart[originalPart.length - 1]
              const newChar = lastChar === 'A' ? 'B' : 'A'
              tamperedParts[tamperPart] =
                originalPart.substring(0, originalPart.length - 1) + newChar
            }

            const tamperedEncrypted = tamperedParts.join(':')

            // Property: Tampered data must either throw error or produce different output
            try {
              const decrypted = EncryptionUtil.decrypt(tamperedEncrypted)
              // If decryption succeeds, the output must be different from original
              expect(decrypted).not.toBe(plaintext)
            } catch (error) {
              // Decryption failure is expected and acceptable
              expect(error).toBeDefined()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.4: Sensitive Data Types
     * Encryption must work correctly for various types of sensitive data
     */
    it('should handle various sensitive data types correctly', async () => {
      await fc.assert(
        fc.asyncProperty(sensitiveDataGen, async (sensitiveData: string) => {
          // Encrypt the sensitive data
          const encrypted = EncryptionUtil.encrypt(sensitiveData)

          // Property: Encrypted data must not contain the original plaintext
          expect(encrypted).not.toContain(sensitiveData)

          // Property: Encrypted data must be base64-encoded parts
          const parts = encrypted.split(':')
          parts.forEach(part => {
            expect(part).toMatch(/^[A-Za-z0-9+/=]+$/)
          })

          // Property: Decryption must recover original data
          const decrypted = EncryptionUtil.decrypt(encrypted)
          expect(decrypted).toBe(sensitiveData)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.5: Unicode Support
     * Encryption must correctly handle Unicode characters
     */
    it('should handle Unicode characters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(unicodeGen, async (unicodeText: string) => {
          // Encrypt the Unicode text
          const encrypted = EncryptionUtil.encrypt(unicodeText)

          // Property: Encrypted data must have valid format
          expect(encrypted.split(':')).toHaveLength(3)

          // Property: Decryption must preserve Unicode characters
          const decrypted = EncryptionUtil.decrypt(encrypted)
          expect(decrypted).toBe(unicodeText)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.6: Empty and Null Handling
     * Encryption must handle edge cases (empty, null, undefined) gracefully
     */
    it('should handle empty, null, and undefined inputs correctly', () => {
      // Property: Empty string should return empty string
      expect(EncryptionUtil.encrypt('')).toBe('')
      expect(EncryptionUtil.decrypt('')).toBe('')

      // Property: Null should return null
      expect(EncryptionUtil.encrypt(null as any)).toBe(null)
      expect(EncryptionUtil.decrypt(null as any)).toBe(null)

      // Property: Undefined should return undefined
      expect(EncryptionUtil.encrypt(undefined as any)).toBe(undefined)
      expect(EncryptionUtil.decrypt(undefined as any)).toBe(undefined)
    })

    /**
     * Property 41.7: Encryption Format Validation
     * Encrypted data must always follow the format: iv:authTag:encryptedData
     */
    it('should always produce correctly formatted encrypted data', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          const encrypted = EncryptionUtil.encrypt(plaintext)

          // Property: Must have exactly 3 parts separated by colons
          const parts = encrypted.split(':')
          expect(parts).toHaveLength(3)

          const [iv, authTag, ciphertext] = parts

          // Property: Each part must be non-empty base64 string
          expect(iv).toBeTruthy()
          expect(authTag).toBeTruthy()
          expect(ciphertext).toBeTruthy()

          expect(iv).toMatch(/^[A-Za-z0-9+/=]+$/)
          expect(authTag).toMatch(/^[A-Za-z0-9+/=]+$/)
          expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/)

          // Property: isEncrypted must return true for encrypted data
          expect(EncryptionUtil.isEncrypted(encrypted)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property 41.8: Invalid Format Rejection
     * Decryption must reject data with invalid format
     */
    it('should reject invalid encrypted data formats', async () => {
      const invalidFormats = [
        'only-one-part',
        'only:two-parts',
        'four:parts:are:invalid',
        'invalid-base64-chars-!@#$:valid:valid',
        ':empty-first:valid',
        'valid::empty-second',
        'valid:valid:',
      ]

      invalidFormats.forEach(invalidFormat => {
        // Property: Invalid formats must throw error
        expect(() => EncryptionUtil.decrypt(invalidFormat)).toThrow()
      })
    })
  })

  /**
   * Property 41.9: Field Encryption
   * Entity fields marked with @Encrypted() are automatically encrypted before saving
   */
  describe('Property 41.9: Field Encryption', () => {
    it('should encrypt specified fields in any object', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            creditCard: fc.hexaString({ minLength: 16, maxLength: 16 }),
            ssn: fc.string({ minLength: 9, maxLength: 11 }),
            age: fc.integer({ min: 18, max: 100 }),
          }),
          fc.array(fc.constantFrom('email', 'creditCard', 'ssn'), { minLength: 1, maxLength: 3 }),
          async (obj: any, fieldsToEncrypt: string[]) => {
            // Store original values
            const originalValues: Record<string, any> = {}
            fieldsToEncrypt.forEach(field => {
              originalValues[field] = obj[field]
            })

            // Encrypt specified fields
            const encrypted = EncryptionUtil.encryptFields(obj, fieldsToEncrypt)

            // Property: Encrypted fields must be different from original
            fieldsToEncrypt.forEach(field => {
              expect(encrypted[field]).not.toBe(originalValues[field])
              expect(EncryptionUtil.isEncrypted(encrypted[field])).toBe(true)
            })

            // Property: Non-encrypted fields must remain unchanged
            const nonEncryptedFields = Object.keys(obj).filter(
              key => !fieldsToEncrypt.includes(key)
            )
            nonEncryptedFields.forEach(field => {
              expect(encrypted[field]).toBe(obj[field])
            })

            // Property: Original object must not be modified
            fieldsToEncrypt.forEach(field => {
              expect(obj[field]).toBe(originalValues[field])
            })

            // Property: Decryption must recover original values
            const decrypted = EncryptionUtil.decryptFields(encrypted, fieldsToEncrypt)
            fieldsToEncrypt.forEach(field => {
              expect(decrypted[field]).toBe(originalValues[field])
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle objects with no fields to encrypt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string(),
            age: fc.integer(),
          }),
          async (obj: any) => {
            // Property: Empty fields array should return unchanged object
            const encrypted = EncryptionUtil.encryptFields(obj, [])
            expect(encrypted).toEqual(obj)

            const decrypted = EncryptionUtil.decryptFields(obj, [])
            expect(decrypted).toEqual(obj)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should skip non-existent fields gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string(),
            email: fc.emailAddress(),
          }),
          async (obj: any) => {
            // Property: Non-existent fields should be ignored
            const encrypted = EncryptionUtil.encryptFields(obj, ['email', 'nonExistent' as any])

            expect(EncryptionUtil.isEncrypted(encrypted.email)).toBe(true)
            expect(encrypted.name).toBe(obj.name)
            expect(encrypted.nonExistent).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should skip non-string fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string(),
            age: fc.integer(),
            active: fc.boolean(),
          }),
          async (obj: any) => {
            // Property: Non-string fields should not be encrypted
            const encrypted = EncryptionUtil.encryptFields(obj, ['age', 'active'])

            expect(encrypted.age).toBe(obj.age)
            expect(encrypted.active).toBe(obj.active)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 41.10: Encryption Idempotency
   * Encrypting already encrypted data should not cause issues
   */
  describe('Property 41.10: Encryption Idempotency', () => {
    it('should handle double encryption gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          // First encryption
          const encrypted1 = EncryptionUtil.encrypt(plaintext)

          // Second encryption (encrypting already encrypted data)
          const encrypted2 = EncryptionUtil.encrypt(encrypted1)

          // Property: Double encryption should work
          expect(encrypted2).toBeDefined()
          expect(encrypted2.split(':')).toHaveLength(3)

          // Property: Double decryption should recover first encryption
          const decrypted1 = EncryptionUtil.decrypt(encrypted2)
          expect(decrypted1).toBe(encrypted1)

          // Property: Final decryption should recover original plaintext
          const decrypted2 = EncryptionUtil.decrypt(decrypted1)
          expect(decrypted2).toBe(plaintext)
        }),
        { numRuns: 100 }
      )
    })

    it('should not decrypt already decrypted data', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          // Property: isEncrypted should return false for plaintext
          expect(EncryptionUtil.isEncrypted(plaintext)).toBe(false)

          // Property: decryptFields should skip non-encrypted fields
          const obj = { data: plaintext }
          const decrypted = EncryptionUtil.decryptFields(obj, ['data'])
          expect(decrypted.data).toBe(plaintext)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 41.11: Encryption Performance
   * Encryption should handle various data sizes efficiently
   */
  describe('Property 41.11: Encryption Performance', () => {
    it('should handle various data sizes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 10000 }), async (length: number) => {
          const plaintext = 'a'.repeat(length)

          // Encrypt
          const encrypted = EncryptionUtil.encrypt(plaintext)

          // Property: Encrypted data must have valid format
          expect(encrypted.split(':')).toHaveLength(3)

          // Property: Decryption must recover original data
          const decrypted = EncryptionUtil.decrypt(encrypted)
          expect(decrypted).toBe(plaintext)
          expect(decrypted.length).toBe(length)
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 41.12: Encryption Security Properties
   * Verify security properties of the encryption system
   */
  describe('Property 41.12: Encryption Security Properties', () => {
    it('should use unique IV for each encryption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(plaintextGen, { minLength: 2, maxLength: 10 }),
          async (plaintexts: string[]) => {
            // Encrypt all plaintexts
            const encrypted = plaintexts.map(p => EncryptionUtil.encrypt(p))

            // Extract IVs
            const ivs = encrypted.map(e => e.split(':')[0])

            // Property: All IVs must be unique
            const uniqueIvs = new Set(ivs)
            expect(uniqueIvs.size).toBe(ivs.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce ciphertext that does not reveal plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          const encrypted = EncryptionUtil.encrypt(plaintext)
          const ciphertext = encrypted.split(':')[2]

          // Property: Ciphertext should not contain plaintext
          expect(ciphertext).not.toContain(plaintext)

          // Property: Ciphertext should be base64 encoded
          expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/)
        }),
        { numRuns: 100 }
      )
    })

    it('should use authentication tag for integrity verification', async () => {
      await fc.assert(
        fc.asyncProperty(plaintextGen, async (plaintext: string) => {
          const encrypted = EncryptionUtil.encrypt(plaintext)
          const parts = encrypted.split(':')
          const authTag = parts[1]

          // Property: Auth tag must exist and be non-empty
          expect(authTag).toBeTruthy()
          expect(authTag.length).toBeGreaterThan(0)

          // Property: Auth tag must be base64 encoded
          expect(authTag).toMatch(/^[A-Za-z0-9+/=]+$/)
        }),
        { numRuns: 100 }
      )
    })
  })
})
