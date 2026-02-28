# Internationalization (i18n) Infrastructure

This directory contains the internationalization infrastructure for the Technician Marketplace Platform.

## Overview

The platform supports multiple languages to serve users in Mexico and South America. Currently supported languages:
- **Spanish (es)** - Primary/Default language
- **English (en)** - American English, secondary language

## Language Priority

The application is designed with the following language priority:

1. **Primary Language**: Spanish (es) - Default for all users
2. **Secondary Language**: American English (en-US) - Alternative language option

All translations, error messages, and user-facing content default to Spanish unless explicitly changed by the user. English translations follow American English conventions (e.g., "color" not "colour", "organize" not "organise").

## Architecture

### Components

1. **I18nService** (`i18n.service.ts`)
   - Core service for translation management
   - Loads translation files from the `translations/` directory
   - Provides `translate()` method for key-based translations
   - Supports nested keys (e.g., `user.profile`)

2. **I18nModule** (`i18n.module.ts`)
   - Global module that exports I18nService
   - Automatically available in all modules

3. **Language Decorator** (`decorators/language.decorator.ts`)
   - Custom parameter decorator to extract language from requests
   - Priority order:
     1. Query parameter (`?lang=es`)
     2. Accept-Language header
     3. User profile language preference
     4. Default to 'es'

4. **Translation Files** (`translations/`)
   - `es.json` - Spanish translations
   - `en.json` - English translations

## Usage

### In Controllers

```typescript
import { Language } from '../i18n';
import { I18nService } from '../i18n';

@Controller('example')
export class ExampleController {
  constructor(private readonly i18nService: I18nService) {}

  @Get()
  async example(@Language() lang: string) {
    const message = this.i18n Service.translate('common.welcome', lang);
    return { message };
  }
}
```

### In Services

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

### User Language Preference

Users can set their preferred language through the preferences endpoint:

```bash
PUT /users/:id/preferences
{
  "language": "en"
}
```

The language preference is stored in the `user_profiles` table and automatically applied to all subsequent requests when the user is authenticated.

## Language Validation

Language input is validated at multiple levels:

1. **DTO Validation** - `UpdatePreferencesDto` ensures only 'es' or 'en' are accepted
2. **Service Validation** - `I18nService.isLanguageSupported()` checks language validity
3. **Database Constraint** - The `language` column has a default value of 'es'

## Adding New Languages

To add support for a new language:

1. Create a new translation file in `translations/` (e.g., `pt.json` for Portuguese)
2. Update `supportedLanguages` array in `I18nService`
3. Update validation in `UpdatePreferencesDto`
4. Add translations for all existing keys

## Translation File Structure

Translation files use nested JSON structure:

```json
{
  "category": {
    "subcategory": {
      "key": "Translation text"
    }
  }
}
```

Access translations using dot notation: `category.subcategory.key`

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 2.1**: Platform supports Spanish and English language options
- **Requirement 2.2**: When a user selects a language, the platform displays all interface texts in the selected language
- **Requirement 2.3**: When a user creates a profile, the platform saves the preferred language to user settings

## Future Enhancements

Consider migrating to `nestjs-i18n` package for:
- Advanced features (pluralization, interpolation, formatting)
- Better TypeScript support
- Automatic translation loading
- Integration with frontend i18n libraries

To install:
```bash
npm install nestjs-i18n
```

## Testing

Language preference functionality is tested in:
- Unit tests: `user.service.spec.ts`
- Property-based tests: Task 5.10 (to be implemented)
- E2E tests: Verify language switching across the application
