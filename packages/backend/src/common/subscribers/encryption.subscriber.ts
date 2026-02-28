import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  LoadEvent,
} from 'typeorm'
import { getEncryptedFields } from '../decorators/encrypted.decorator'
import { EncryptionUtil } from '../utils/encryption.util'

/**
 * TypeORM subscriber to automatically encrypt/decrypt entity fields
 * This subscriber listens to entity lifecycle events and handles encryption/decryption
 */
@EventSubscriber()
export class EncryptionSubscriber implements EntitySubscriberInterface {
  /**
   * Called before entity is inserted into the database
   */
  beforeInsert(event: InsertEvent<any>) {
    this.encryptFields(event.entity)
  }

  /**
   * Called before entity is updated in the database
   */
  beforeUpdate(event: UpdateEvent<any>) {
    if (event.entity) {
      this.encryptFields(event.entity)
    }
  }

  /**
   * Called after entity is loaded from the database
   */
  afterLoad(entity: any, event?: LoadEvent<any>) {
    this.decryptFields(entity)
  }

  /**
   * Encrypt sensitive fields in an entity
   */
  private encryptFields(entity: any): void {
    if (!entity) {
      return
    }

    const encryptedFields = getEncryptedFields(entity.constructor)

    if (encryptedFields.length === 0) {
      return
    }

    for (const field of encryptedFields) {
      const value = entity[field]

      if (value && typeof value === 'string' && !EncryptionUtil.isEncrypted(value)) {
        entity[field] = EncryptionUtil.encrypt(value)
      }
    }
  }

  /**
   * Decrypt encrypted fields in an entity
   */
  private decryptFields(entity: any): void {
    if (!entity) {
      return
    }

    const encryptedFields = getEncryptedFields(entity.constructor)

    if (encryptedFields.length === 0) {
      return
    }

    for (const field of encryptedFields) {
      const value = entity[field]

      if (value && typeof value === 'string' && EncryptionUtil.isEncrypted(value)) {
        try {
          entity[field] = EncryptionUtil.decrypt(value)
        } catch (error) {
          // Log error but don't throw to prevent breaking the application
          console.error(`Failed to decrypt field ${field}:`, error.message)
        }
      }
    }
  }
}
