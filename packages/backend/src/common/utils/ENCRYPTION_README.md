# Data Encryption System

## Overview

This encryption system provides comprehensive data protection for sensitive information in the technician marketplace platform. It implements AES-256-GCM encryption for data at rest and includes automatic encryption/decryption capabilities through decorators and middleware.

## Components

### 1. EncryptionUtil (`encryption.util.ts`)

Core utility class for encrypting and decrypting sensitive data.

**Features:**
- AES-256-GCM encryption algorithm
- Authenticated encryption with GCM mode
- Random IV (Initialization Vector) for each encryption
- Key derivation using scrypt
- Support for encrypting individual strings or object fields

**Usage:**

```typescript
import { EncryptionUtil } from './encryption.util'

// Encrypt a string
const encrypted = EncryptionUtil.encrypt('sensitive-data')

// Decrypt a string
const decrypted = EncryptionUtil.decrypt(encrypted)

// Encrypt specific fields in an object
const user = { name: 'John', ssn: '123-45-6789' }
const encrypted = EncryptionUtil.encryptFields(user, ['ssn'])

// Decrypt specific fields
const decrypted = EncryptionUtil.decryptFields(encrypted, ['ssn'])

// Check if data is encrypted
const isEncrypted = EncryptionUtil.isEncrypted(data)
```

### 2. Encrypted Decorator (`encrypted.decorator.ts`)

Decorator for marking entity fields that should be automatically encrypted.

**Usage:**

```typescript
import { Entity, Column } from 'typeorm'
import { Encrypted } from '../common/decorators/encrypted.decorator'

@Entity()
class User {
  @Column()
  name: string

  @Encrypted()
  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string
}
```

### 3. EncryptionSubscriber (`encryption.subscriber.ts`)

TypeORM subscriber that automatically encrypts fields before saving and decrypts after loading.

**Features:**
- Automatic encryption before insert/update
- Automatic decryption after load
- Works with any entity using the `@Encrypted()` decorator

**Setup:**

Add the subscriber to your TypeORM configuration:

```typescript
import { EncryptionSubscriber } from './common/subscribers/encryption.subscriber'

TypeOrmModule.forRoot({
  // ... other config
  subscribers: [EncryptionSubscriber],
})
```

### 4. EncryptionMiddleware (`encryption.middleware.ts`)

Express middleware for automatically encrypting sensitive fields in request bodies.

**Sensitive Fields:**
- creditCardNumber
- cvv
- bankAccountNumber
- taxId
- ssn
- nationalId

**Usage:**

```typescript
import { EncryptionMiddleware } from './common/middleware/encryption.middleware'

// Apply to specific routes
app.use('/api/payments', new EncryptionMiddleware().use)

// Or apply globally in NestJS
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(EncryptionMiddleware)
      .forRoutes('payments', 'invoices')
  }
}
```

## Configuration

### Environment Variables

Set these environment variables for encryption:

```bash
# Encryption secret (REQUIRED in production)
ENCRYPTION_SECRET=your-secret-key-min-32-chars

# Encryption salt (REQUIRED in production)
ENCRYPTION_SALT=your-salt-min-16-chars
```

**Security Notes:**
- Never commit encryption keys to version control
- Use a secure key management service (AWS KMS, Azure Key Vault, etc.) in production
- Rotate keys periodically
- Use different keys for different environments

## Encrypted Data Format

Encrypted data is stored in the format: `iv:authTag:encryptedData`

- **iv**: Initialization Vector (16 bytes, base64 encoded)
- **authTag**: Authentication Tag (16 bytes, base64 encoded)
- **encryptedData**: Encrypted ciphertext (base64 encoded)

Example: `xyXAE7C1caqJWlGB4WeA5g==:BH68gKPVrlOZ/lihn6sY/w==:ePFOP9LtZYYK/xc=`

## Security Features

1. **AES-256-GCM**: Industry-standard encryption algorithm
2. **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity
3. **Random IV**: Each encryption uses a unique random IV
4. **Key Derivation**: Uses scrypt for secure key derivation from password
5. **Tamper Detection**: Authentication tag detects any tampering with encrypted data

## Best Practices

### 1. Mark Sensitive Fields

Always use the `@Encrypted()` decorator for sensitive fields:

```typescript
@Entity()
class Invoice {
  @Encrypted()
  @Column({ name: 'customer_tax_id', nullable: true })
  customerTaxId: string
}
```

### 2. Use Middleware for API Endpoints

Apply encryption middleware to routes handling sensitive data:

```typescript
consumer
  .apply(EncryptionMiddleware)
  .forRoutes('payments', 'invoices', 'users')
```

### 3. Never Log Decrypted Data

```typescript
// BAD
console.log('User SSN:', user.ssn)

// GOOD
console.log('User SSN: [ENCRYPTED]')
```

### 4. Validate Before Encryption

```typescript
// Validate data before encrypting
if (!isValidCreditCard(creditCard)) {
  throw new Error('Invalid credit card')
}
const encrypted = EncryptionUtil.encrypt(creditCard)
```

## Testing

The encryption system includes comprehensive unit tests:

```bash
# Run encryption utility tests
npm test -- encryption.util.spec.ts

# Run middleware tests
npm test -- encryption.middleware.spec.ts

# Run decorator tests
npm test -- encrypted.decorator.spec.ts
```

## Entities with Encrypted Fields

The following entities have encrypted fields:

### User Entity
- `twoFactorSecret`: Two-factor authentication secret

### Invoice Entity
- `customerTaxId`: Customer tax identification number

## Migration Guide

### Encrypting Existing Data

If you have existing unencrypted data in the database:

```typescript
import { EncryptionUtil } from './common/utils/encryption.util'

async function encryptExistingData() {
  const users = await userRepository.find()
  
  for (const user of users) {
    if (user.twoFactorSecret && !EncryptionUtil.isEncrypted(user.twoFactorSecret)) {
      user.twoFactorSecret = EncryptionUtil.encrypt(user.twoFactorSecret)
      await userRepository.save(user)
    }
  }
}
```

### Key Rotation

To rotate encryption keys:

1. Generate new keys
2. Decrypt data with old keys
3. Re-encrypt with new keys
4. Update environment variables

```typescript
async function rotateKeys(oldSecret: string, newSecret: string) {
  // Temporarily use old key
  process.env.ENCRYPTION_SECRET = oldSecret
  const decrypted = EncryptionUtil.decrypt(encryptedData)
  
  // Switch to new key
  process.env.ENCRYPTION_SECRET = newSecret
  const reencrypted = EncryptionUtil.encrypt(decrypted)
  
  return reencrypted
}
```

## Troubleshooting

### Decryption Fails

**Cause**: Wrong encryption key or corrupted data

**Solution**: 
- Verify ENCRYPTION_SECRET and ENCRYPTION_SALT are correct
- Check if data format is valid (should have 3 parts separated by colons)

### Performance Issues

**Cause**: Encrypting large amounts of data

**Solution**:
- Only encrypt truly sensitive fields
- Consider encrypting at application level instead of database level for frequently accessed data
- Use caching for decrypted data (with appropriate TTL)

### Data Migration Issues

**Cause**: Mixing encrypted and unencrypted data

**Solution**:
- Use `EncryptionUtil.isEncrypted()` to check before decrypting
- Run migration script to encrypt all existing data
- Add validation to ensure all new data is encrypted

## Compliance

This encryption system helps meet compliance requirements for:

- **GDPR**: Data protection and encryption at rest
- **PCI DSS**: Credit card data encryption
- **HIPAA**: Protected health information encryption
- **SOC 2**: Data security controls

## Performance Considerations

- Encryption/decryption adds ~1-2ms per operation
- Use connection pooling to minimize overhead
- Consider caching decrypted data for read-heavy workloads
- Encrypt only truly sensitive fields

## Future Enhancements

Potential improvements:

1. **Field-level encryption keys**: Different keys for different field types
2. **Automatic key rotation**: Scheduled key rotation with zero downtime
3. **Encryption at rest**: Database-level encryption
4. **Audit logging**: Track all encryption/decryption operations
5. **Hardware security modules**: Integration with HSM for key storage
