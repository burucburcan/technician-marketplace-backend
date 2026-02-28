# Language Preference Management Implementation

## Overview

This document describes the implementation of Task 5.9: Language Preference Management for the Technician Marketplace Platform.

## Requirements Fulfilled

- **Requirement 2.2**: When a user selects a language, the platform displays all interface texts in the selected language
- **Requirement 2.3**: When a user creates a profile, the platform saves the preferred language to user settings

## Implementation Details

### 1. API Endpoint

**Endpoint**: `PUT /users/:id/preferences`

**Request Body**:
```json
{
  "language": "en",
  "emailNotifications": false,
  "smsNotifications": true,
  "pushNotifications": true,
  "currency": "USD"
}
```

**Response**:
```json
{
  "id": "profile-uuid",
  "userId": "user-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "language": "en",
  "location": { ... },
  "preferences": {
    "emailNotifications": false,
    "smsNotifications": true,
    "pushNotifications": true,
    "currency": "USD"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. DTO Validation

**File**: `packages/backend/src/modules/user/dto/update-preferences.dto.ts`

The DTO validates:
- Language must be either 'es' or 'en'
- All fields are optional
- Boolean validation for notification preferences
- Currency must be either 'MXN' or 'USD'

### 3. Service Implementation

**File**: `packages/backend/src/modules/user/user.service.ts`

**Method**: `updatePreferences(userId, updatePreferencesDto, requestingUserId)`

Features:
- Authorization check (users can only update their own preferences)
- Separate handling for language and other preferences
- Merges new preferences with existing ones
- Activity logging for audit trail
- Returns updated profile

### 4. i18n Infrastructure

**Location**: `packages/backend/src/i18n/`

#### Components:

1. **I18nService** (`i18n.service.ts`)
   - Loads translation files from `translations/` directory
   - Provides `translate(key, lang)` method
   - Supports nested keys (e.g., 'user.profile')
   - Fallback to default language (Spanish)

2. **I18nModule** (`i18n.module.ts`)
   - Global module exported to all other modules
   - Automatically available throughout the application

3. **Language Decorator** (`decorators/language.decorator.ts`)
   - Extracts language from request
   - Priority order:
     1. Query parameter (?lang=es)
     2. Accept-Language header
     3. User profile language preference
     4. Default to 'es'

4. **Translation Files** (`translations/`)
   - `es.json` - Spanish translations
   - `en.json` - English translations

#### Translation File Structure:

```json
{
  "common": {
    "welcome": "Welcome",
    "error": "Error"
  },
  "user": {
    "profile": "Profile",
    "preferences": "Preferences"
  }
}
```

### 5. Usage Examples

#### In Controllers:

```typescript
import { Language } from '../i18n';
import { I18nService } from '../i18n';

@Controller('example')
export class ExampleController {
  constructor(private readonly i18nService: I18nService) {}

  @Get()
  async example(@Language() lang: string) {
    const message = this.i18nService.translate('common.welcome', lang);
    return { message };
  }
}
```

#### In Services:

```typescript
import { I18nService } from '../i18n';

@Injectable()
export class ExampleService {
  constructor(private readonly i18nService: I18nService) {}

  async doSomething(lang: string) {
    const errorMessage = this.i18nService.translate('common.error', lang);
    throw new BadRequestException(errorMessage);
  }
}
```

### 6. Database Schema

The language preference is stored in the `user_profiles` table:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  language VARCHAR(2) NOT NULL DEFAULT 'es',
  location JSONB NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 7. Testing

#### Unit Tests:

**File**: `packages/backend/src/modules/user/user.service.spec.ts`

Tests cover:
- Updating language and preferences together
- Updating only language
- Updating only preferences
- Authorization checks
- Error handling (profile not found)

**File**: `packages/backend/src/i18n/i18n.service.spec.ts`

Tests cover:
- Translation in Spanish (default)
- Translation in English
- Nested key translation
- Fallback for missing translations
- Fallback for unsupported languages
- Language support validation

#### Integration Tests:

**File**: `packages/backend/src/modules/user/user.integration.spec.ts`

Tests cover:
- PUT /users/:id/preferences endpoint
- Language preference update
- Notification preferences update
- Combined updates
- Invalid language validation
- Authorization checks

#### Controller Tests:

**File**: `packages/backend/src/modules/user/user.controller.spec.ts`

Tests cover:
- Controller method invocation
- Service method calls with correct parameters

### 8. Security Considerations

1. **Authorization**: Users can only update their own preferences
2. **Validation**: Language input is validated at DTO level
3. **Activity Logging**: All preference updates are logged for audit trail
4. **Data Integrity**: Preferences are merged, not replaced, to prevent data loss

### 9. API Documentation

#### Update User Preferences

**Endpoint**: `PUT /users/:id/preferences`

**Authentication**: Required (JWT Bearer token)

**Authorization**: User can only update their own preferences

**Request Parameters**:
- `id` (path parameter): User ID (UUID)

**Request Body** (all fields optional):
```typescript
{
  language?: 'es' | 'en';
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  currency?: 'MXN' | 'USD';
}
```

**Success Response** (200 OK):
```json
{
  "id": "string",
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "avatarUrl": "string",
  "language": "es" | "en",
  "location": { ... },
  "preferences": {
    "emailNotifications": boolean,
    "smsNotifications": boolean,
    "pushNotifications": boolean,
    "currency": "MXN" | "USD"
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid language or validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User trying to update another user's preferences
- `404 Not Found`: User profile not found

### 10. Future Enhancements

Consider migrating to `nestjs-i18n` package for:
- Advanced features (pluralization, interpolation, formatting)
- Better TypeScript support
- Automatic translation loading
- Integration with frontend i18n libraries

To install:
```bash
npm install nestjs-i18n
```

### 11. Supported Languages

Currently supported:
- **Spanish (es)** - Default language
- **English (en)**

To add a new language:
1. Create translation file in `src/i18n/translations/` (e.g., `pt.json`)
2. Update `supportedLanguages` array in `I18nService`
3. Update validation in `UpdatePreferencesDto`
4. Add all required translations

### 12. Activity Logging

All preference updates are logged with:
- User ID
- Action: 'preferences_updated'
- Resource: 'user_profile'
- Metadata: Profile ID and updated fields

Example log entry:
```json
{
  "userId": "user-uuid",
  "action": "preferences_updated",
  "resource": "user_profile",
  "metadata": {
    "profileId": "profile-uuid",
    "updatedFields": ["language", "emailNotifications"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Conclusion

The language preference management feature is fully implemented with:
- ✅ PUT /users/:id/preferences endpoint
- ✅ i18n infrastructure with Spanish and English support
- ✅ Translation service with nested key support
- ✅ Language decorator for automatic language detection
- ✅ Comprehensive unit, integration, and controller tests
- ✅ Activity logging for audit trail
- ✅ Security and authorization checks
- ✅ Input validation

The implementation fulfills Requirements 2.2 and 2.3 from the specification.
