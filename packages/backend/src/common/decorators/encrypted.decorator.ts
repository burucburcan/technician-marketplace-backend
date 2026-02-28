import { EncryptionUtil } from '../utils/encryption.util'

/**
 * Metadata key for encrypted fields
 */
export const ENCRYPTED_FIELDS_KEY = Symbol('encryptedFields')

/**
 * Decorator to mark entity fields as encrypted
 * This decorator can be used with TypeORM entities to automatically
 * encrypt/decrypt fields when saving/loading from database
 *
 * @example
 * class Payment {
 *   @Encrypted()
 *   @Column()
 *   creditCardNumber: string
 * }
 */
export function Encrypted(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    // Get existing encrypted fields or initialize empty array
    const encryptedFields = Reflect.getMetadata(ENCRYPTED_FIELDS_KEY, target.constructor) || []

    // Add this field to the list if not already present
    if (!encryptedFields.includes(propertyKey)) {
      encryptedFields.push(propertyKey)
    }

    // Store the updated list
    Reflect.defineMetadata(ENCRYPTED_FIELDS_KEY, encryptedFields, target.constructor)
  }
}

/**
 * Get list of encrypted fields for an entity class
 */
export function getEncryptedFields(entityClass: any): string[] {
  return Reflect.getMetadata(ENCRYPTED_FIELDS_KEY, entityClass) || []
}

/**
 * Helper function to encrypt entity fields before saving
 */
export function encryptEntityFields<T extends object>(entity: T): T {
  const encryptedFields = getEncryptedFields((entity as any).constructor)

  if (encryptedFields.length === 0) {
    return entity
  }

  return EncryptionUtil.encryptFields(entity as any, encryptedFields) as T
}

/**
 * Helper function to decrypt entity fields after loading
 */
export function decryptEntityFields<T extends object>(entity: T): T {
  const encryptedFields = getEncryptedFields((entity as any).constructor)

  if (encryptedFields.length === 0) {
    return entity
  }

  return EncryptionUtil.decryptFields(entity as any, encryptedFields) as T
}
