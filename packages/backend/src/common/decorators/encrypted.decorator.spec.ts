import 'reflect-metadata'
import {
  Encrypted,
  getEncryptedFields,
  encryptEntityFields,
  decryptEntityFields,
  ENCRYPTED_FIELDS_KEY,
} from './encrypted.decorator'
import { EncryptionUtil } from '../utils/encryption.util'

describe('Encrypted Decorator', () => {
  beforeAll(() => {
    // Set test encryption keys
    process.env.ENCRYPTION_SECRET = 'test-secret-key-for-unit-tests'
    process.env.ENCRYPTION_SALT = 'test-salt-for-unit-tests'
  })

  describe('@Encrypted decorator', () => {
    it('should mark a field as encrypted', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string
      }

      const fields = getEncryptedFields(TestEntity)
      expect(fields).toContain('sensitiveField')
    })

    it('should mark multiple fields as encrypted', () => {
      class TestEntity {
        @Encrypted()
        field1: string

        @Encrypted()
        field2: string

        normalField: string
      }

      const fields = getEncryptedFields(TestEntity)
      expect(fields).toContain('field1')
      expect(fields).toContain('field2')
      expect(fields).not.toContain('normalField')
    })

    it('should not duplicate fields in metadata', () => {
      class TestEntity {
        @Encrypted()
        @Encrypted() // Applied twice
        sensitiveField: string
      }

      const fields = getEncryptedFields(TestEntity)
      expect(fields.filter(f => f === 'sensitiveField')).toHaveLength(1)
    })

    it('should store metadata on the class constructor', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string
      }

      const metadata = Reflect.getMetadata(ENCRYPTED_FIELDS_KEY, TestEntity)
      expect(metadata).toBeDefined()
      expect(metadata).toContain('sensitiveField')
    })
  })

  describe('getEncryptedFields', () => {
    it('should return empty array for class without encrypted fields', () => {
      class TestEntity {
        normalField: string
      }

      const fields = getEncryptedFields(TestEntity)
      expect(fields).toEqual([])
    })

    it('should return array of encrypted field names', () => {
      class TestEntity {
        @Encrypted()
        field1: string

        @Encrypted()
        field2: string
      }

      const fields = getEncryptedFields(TestEntity)
      expect(fields).toEqual(['field1', 'field2'])
    })

    it('should work with inheritance', () => {
      class BaseEntity {
        @Encrypted()
        baseField: string
      }

      class DerivedEntity extends BaseEntity {
        @Encrypted()
        derivedField: string
      }

      const baseFields = getEncryptedFields(BaseEntity)
      const derivedFields = getEncryptedFields(DerivedEntity)

      expect(baseFields).toContain('baseField')
      expect(derivedFields).toContain('derivedField')
    })
  })

  describe('encryptEntityFields', () => {
    it('should encrypt marked fields in an entity', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string

        normalField: string
      }

      const entity = new TestEntity()
      entity.sensitiveField = 'secret-data'
      entity.normalField = 'public-data'

      const encrypted = encryptEntityFields(entity)

      expect(encrypted.normalField).toBe('public-data')
      expect(encrypted.sensitiveField).not.toBe('secret-data')
      expect(EncryptionUtil.isEncrypted(encrypted.sensitiveField)).toBe(true)
    })

    it('should not modify entity without encrypted fields', () => {
      class TestEntity {
        normalField: string
      }

      const entity = new TestEntity()
      entity.normalField = 'public-data'

      const encrypted = encryptEntityFields(entity)

      expect(encrypted).toEqual(entity)
    })

    it('should handle multiple encrypted fields', () => {
      class TestEntity {
        @Encrypted()
        field1: string

        @Encrypted()
        field2: string

        normalField: string
      }

      const entity = new TestEntity()
      entity.field1 = 'secret1'
      entity.field2 = 'secret2'
      entity.normalField = 'public'

      const encrypted = encryptEntityFields(entity)

      expect(EncryptionUtil.isEncrypted(encrypted.field1)).toBe(true)
      expect(EncryptionUtil.isEncrypted(encrypted.field2)).toBe(true)
      expect(encrypted.normalField).toBe('public')
    })

    it('should not modify original entity', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string
      }

      const entity = new TestEntity()
      entity.sensitiveField = 'secret-data'
      const original = entity.sensitiveField

      encryptEntityFields(entity)

      expect(entity.sensitiveField).toBe(original)
    })
  })

  describe('decryptEntityFields', () => {
    it('should decrypt marked fields in an entity', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string

        normalField: string
      }

      const entity = new TestEntity()
      entity.sensitiveField = 'secret-data'
      entity.normalField = 'public-data'

      const encrypted = encryptEntityFields(entity)
      const decrypted = decryptEntityFields(encrypted)

      expect(decrypted.sensitiveField).toBe('secret-data')
      expect(decrypted.normalField).toBe('public-data')
    })

    it('should not modify entity without encrypted fields', () => {
      class TestEntity {
        normalField: string
      }

      const entity = new TestEntity()
      entity.normalField = 'public-data'

      const decrypted = decryptEntityFields(entity)

      expect(decrypted).toEqual(entity)
    })

    it('should handle multiple encrypted fields', () => {
      class TestEntity {
        @Encrypted()
        field1: string

        @Encrypted()
        field2: string
      }

      const entity = new TestEntity()
      entity.field1 = 'secret1'
      entity.field2 = 'secret2'

      const encrypted = encryptEntityFields(entity)
      const decrypted = decryptEntityFields(encrypted)

      expect(decrypted.field1).toBe('secret1')
      expect(decrypted.field2).toBe('secret2')
    })

    it('should not modify original entity', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string
      }

      const entity = new TestEntity()
      entity.sensitiveField = EncryptionUtil.encrypt('secret-data')
      const original = entity.sensitiveField

      decryptEntityFields(entity)

      expect(entity.sensitiveField).toBe(original)
    })

    it('should skip non-encrypted fields', () => {
      class TestEntity {
        @Encrypted()
        sensitiveField: string
      }

      const entity = new TestEntity()
      entity.sensitiveField = 'plain-text' // Not encrypted

      const decrypted = decryptEntityFields(entity)

      expect(decrypted.sensitiveField).toBe('plain-text')
    })
  })

  describe('round-trip encryption', () => {
    it('should maintain data integrity through encrypt-decrypt cycle', () => {
      class TestEntity {
        @Encrypted()
        creditCard: string

        @Encrypted()
        ssn: string

        name: string
      }

      const entity = new TestEntity()
      entity.creditCard = '4111111111111111'
      entity.ssn = '123-45-6789'
      entity.name = 'John Doe'

      const encrypted = encryptEntityFields(entity)
      const decrypted = decryptEntityFields(encrypted)

      expect(decrypted.creditCard).toBe(entity.creditCard)
      expect(decrypted.ssn).toBe(entity.ssn)
      expect(decrypted.name).toBe(entity.name)
    })

    it('should handle special characters and unicode', () => {
      class TestEntity {
        @Encrypted()
        data: string
      }

      const testCases = [
        'special chars: !@#$%^&*()',
        'unicode: 你好世界 🌍',
        'newlines:\nand\ttabs',
      ]

      testCases.forEach(testCase => {
        const entity = new TestEntity()
        entity.data = testCase

        const encrypted = encryptEntityFields(entity)
        const decrypted = decryptEntityFields(encrypted)

        expect(decrypted.data).toBe(testCase)
      })
    })
  })
})
