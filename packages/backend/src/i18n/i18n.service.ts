import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class I18nService {
  private translations: Map<string, any> = new Map()
  private defaultLanguage = 'es'
  private supportedLanguages = ['es', 'en']

  constructor() {
    this.loadTranslations()
  }

  private loadTranslations() {
    const translationsDir = path.join(__dirname, 'translations')

    // Check if translations directory exists
    if (!fs.existsSync(translationsDir)) {
      console.warn('Translations directory not found. I18n will return keys as-is.')
      return
    }

    for (const lang of this.supportedLanguages) {
      const filePath = path.join(translationsDir, `${lang}.json`)
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          this.translations.set(lang, JSON.parse(content))
        } else {
          console.warn(`Translation file not found for ${lang}: ${filePath}`)
        }
      } catch (error) {
        console.error(`Failed to load translations for ${lang}:`, error)
      }
    }

    if (this.translations.size === 0) {
      console.warn('No translations loaded. I18n will return keys as-is.')
    }
  }

  translate(key: string, lang: string = this.defaultLanguage): string {
    const language = this.supportedLanguages.includes(lang) ? lang : this.defaultLanguage
    const translations = this.translations.get(language)

    if (!translations) {
      return key
    }

    // Support nested keys like 'user.profile'
    const keys = key.split('.')
    let value = translations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }

    return typeof value === 'string' ? value : key
  }

  getSupportedLanguages(): string[] {
    return this.supportedLanguages
  }

  isLanguageSupported(lang: string): boolean {
    return this.supportedLanguages.includes(lang)
  }
}
