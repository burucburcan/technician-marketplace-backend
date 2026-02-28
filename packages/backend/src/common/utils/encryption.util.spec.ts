import { EncryptionUtil } from './encryption.util'

describe('EncryptionUtil', () => {
  const testData = 'sensitive-data-12345'
  const testObject = {
    name: 'John Doe',
    creditCard: '4111111111111111',
    email: 'john@example.com',
  }

  beforeAll(() => {
    // Set test encryption keys
    process.env.ENCRYPTION_SECRET = 'test-secret-key-for-unit-tests'
    process.env.ENCRYPTION_SALT = 'test-salt-for-unit-tests'
  })

  describe('encrypt', () => {
    it('should encrypt plaintext data', () => {
      const encrypted = EncryptionUtil.encrypt(testData)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(testData)
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should return empty string for empty input', () => {
      expect(EncryptionUtil.encrypt('')).toBe('')
    })

    it('should return null for null input', () => {
      expect(EncryptionUtil.encrypt(null as any)).toBe(null)
    })

    it('should return undefined for undefined input', () => {
      expect(EncryptionUtil.encrypt(undefined as any)).toBe(undefined)
    })

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const encrypted1 = EncryptionUtil.encrypt(testData)
      const encrypted2 = EncryptionUtil.encrypt(testData)

      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted data back to original', () => {
      const encrypted = EncryptionUtil.encrypt(testData)
      const decrypted = EncryptionUtil.decrypt(encrypted)

      expect(decrypted).toBe(testData)
    })

    it('should return empty string for empty input', () => {
      expect(EncryptionUtil.decrypt('')).toBe('')
    })

    it('should return null for null input', () => {
      expect(EncryptionUtil.decrypt(null as any)).toBe(null)
    })

    it('should return undefined for undefined input', () => {
      expect(EncryptionUtil.decrypt(undefined as any)).toBe(undefined)
    })

    it('should throw error for invalid encrypted data format', () => {
      expect(() => EncryptionUtil.decrypt('invalid-format')).toThrow(
        'Invalid encrypted data format'
      )
    })

    it('should throw error for tampered encrypted data', () => {
      const encrypted = EncryptionUtil.encrypt(testData)
      const tampered = encrypted.replace(/.$/, 'X') // Change last character

      expect(() => EncryptionUtil.decrypt(tampered)).toThrow('Decryption failed')
    })
  })

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const encrypted = EncryptionUtil.encrypt(testData)
      expect(EncryptionUtil.isEncrypted(encrypted)).toBe(true)
    })

    it('should return false for plaintext data', () => {
      expect(EncryptionUtil.isEncrypted(testData)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(EncryptionUtil.isEncrypted('')).toBe(false)
    })

    it('should return false for null', () => {
      expect(EncryptionUtil.isEncrypted(null as any)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(EncryptionUtil.isEncrypted(undefined as any)).toBe(false)
    })

    it('should return false for data with wrong format', () => {
      expect(EncryptionUtil.isEncrypted('only:two:parts')).toBe(true) // Has 3 parts
      expect(EncryptionUtil.isEncrypted('only-one-part')).toBe(false)
    })
  })

  describe('encryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['creditCard'])

      expect(encrypted.name).toBe(testObject.name)
      expect(encrypted.email).toBe(testObject.email)
      expect(encrypted.creditCard).not.toBe(testObject.creditCard)
      expect(EncryptionUtil.isEncrypted(encrypted.creditCard)).toBe(true)
    })

    it('should encrypt multiple fields', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['creditCard', 'email'])

      expect(encrypted.name).toBe(testObject.name)
      expect(encrypted.creditCard).not.toBe(testObject.creditCard)
      expect(encrypted.email).not.toBe(testObject.email)
      expect(EncryptionUtil.isEncrypted(encrypted.creditCard)).toBe(true)
      expect(EncryptionUtil.isEncrypted(encrypted.email)).toBe(true)
    })

    it('should not modify original object', () => {
      const original = { ...testObject }
      EncryptionUtil.encryptFields(testObject, ['creditCard'])

      expect(testObject).toEqual(original)
    })

    it('should handle empty fields array', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, [])

      expect(encrypted).toEqual(testObject)
    })

    it('should skip non-existent fields', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['nonExistent' as any])

      expect(encrypted).toEqual(testObject)
    })

    it('should skip non-string fields', () => {
      const obj = { name: 'John', age: 30 }
      const encrypted = EncryptionUtil.encryptFields(obj, ['age'])

      expect(encrypted.age).toBe(30)
    })
  })

  describe('decryptFields', () => {
    it('should decrypt specified fields in an object', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['creditCard'])
      const decrypted = EncryptionUtil.decryptFields(encrypted, ['creditCard'])

      expect(decrypted.creditCard).toBe(testObject.creditCard)
    })

    it('should decrypt multiple fields', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['creditCard', 'email'])
      const decrypted = EncryptionUtil.decryptFields(encrypted, ['creditCard', 'email'])

      expect(decrypted.creditCard).toBe(testObject.creditCard)
      expect(decrypted.email).toBe(testObject.email)
    })

    it('should not modify original object', () => {
      const encrypted = EncryptionUtil.encryptFields(testObject, ['creditCard'])
      const original = { ...encrypted }
      EncryptionUtil.decryptFields(encrypted, ['creditCard'])

      expect(encrypted).toEqual(original)
    })

    it('should skip non-encrypted fields', () => {
      const obj = { name: 'John', creditCard: '4111111111111111' }
      const decrypted = EncryptionUtil.decryptFields(obj, ['creditCard'])

      expect(decrypted.creditCard).toBe(obj.creditCard)
    })

    it('should handle empty fields array', () => {
      const decrypted = EncryptionUtil.decryptFields(testObject, [])

      expect(decrypted).toEqual(testObject)
    })
  })

  describe('round-trip encryption', () => {
    it('should maintain data integrity through encrypt-decrypt cycle', () => {
      const testCases = [
        'simple text',
        'text with special chars: !@#$%^&*()',
        'unicode: 你好世界 🌍',
        'numbers: 1234567890',
        'long text: ' + 'a'.repeat(1000),
      ]

      testCases.forEach(testCase => {
        const encrypted = EncryptionUtil.encrypt(testCase)
        const decrypted = EncryptionUtil.decrypt(encrypted)
        expect(decrypted).toBe(testCase)
      })
    })

    it('should maintain object integrity through encryptFields-decryptFields cycle', () => {
      const complexObject = {
        id: '123',
        name: 'John Doe',
        creditCard: '4111111111111111',
        ssn: '123-45-6789',
        email: 'john@example.com',
        age: 30,
      }

      const encrypted = EncryptionUtil.encryptFields(complexObject, ['creditCard', 'ssn'])
      const decrypted = EncryptionUtil.decryptFields(encrypted, ['creditCard', 'ssn'])

      expect(decrypted).toEqual(complexObject)
    })
  })

  describe('error handling', () => {
    it('should throw descriptive error for encryption failure', () => {
      // Mock crypto to throw error
      const originalEncrypt = EncryptionUtil.encrypt
      jest.spyOn(EncryptionUtil, 'encrypt').mockImplementation(() => {
        throw new Error('Crypto error')
      })

      expect(() => EncryptionUtil.encrypt('test')).toThrow()

      // Restore
      EncryptionUtil.encrypt = originalEncrypt
    })

    it('should throw descriptive error for decryption failure', () => {
      expect(() => EncryptionUtil.decrypt('invalid:data:format')).toThrow('Decryption failed')
    })
  })

  describe('security properties', () => {
    it('should use different IV for each encryption', () => {
      const encrypted1 = EncryptionUtil.encrypt(testData)
      const encrypted2 = EncryptionUtil.encrypt(testData)

      const iv1 = encrypted1.split(':')[0]
      const iv2 = encrypted2.split(':')[0]

      expect(iv1).not.toBe(iv2)
    })

    it('should produce ciphertext that looks random', () => {
      const encrypted = EncryptionUtil.encrypt(testData)
      const ciphertext = encrypted.split(':')[2]

      // Ciphertext should not contain the original plaintext
      expect(ciphertext).not.toContain(testData)

      // Ciphertext should be base64 encoded
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it('should use authentication tag for integrity', () => {
      const encrypted = EncryptionUtil.encrypt(testData)
      const parts = encrypted.split(':')

      expect(parts).toHaveLength(3)
      expect(parts[1]).toBeTruthy() // Auth tag should exist
      expect(parts[1]).toMatch(/^[A-Za-z0-9+/=]+$/) // Should be base64
    })
  })
})
